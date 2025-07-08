// API 中间件库

import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database'
import { AppError, ValidationError, NotFoundError, UnauthorizedError } from '@/types'

// 数据库初始化状态
let dbInitialized = false

// 确保数据库已初始化
export async function ensureDbInitialized(): Promise<void> {
  if (!dbInitialized) {
    await initializeDatabase()
    dbInitialized = true
  }
}

// API 路由包装器类型
export type ApiHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse>

// 错误处理中间件
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API Error:', error)
      
      // 处理自定义错误
      if (error instanceof AppError) {
        return NextResponse.json(
          { success: false, error: error.message, code: error.code },
          { status: error.statusCode }
        )
      }
      
      // 处理验证错误
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { success: false, error: error.message, field: error.field },
          { status: 400 }
        )
      }
      
      // 处理未找到错误
      if (error instanceof NotFoundError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        )
      }
      
      // 处理未授权错误
      if (error instanceof UnauthorizedError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 401 }
        )
      }
      
      // 处理数据库约束错误
      if (error instanceof Error && error.message.includes('duplicate key')) {
        return NextResponse.json(
          { success: false, error: '数据已存在' },
          { status: 400 }
        )
      }
      
      // 处理其他错误
      return NextResponse.json(
        { success: false, error: '服务器内部错误' },
        { status: 500 }
      )
    }
  }
}

// 数据库初始化中间件
export function withDatabase(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    await ensureDbInitialized()
    return handler(request, context)
  }
}

// 请求验证中间件
export function withValidation(
  schema: (body: any) => { isValid: boolean; errors: string[] },
  handler: ApiHandler
): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      try {
        const body = await request.json()
        const validation = schema(body)
        
        if (!validation.isValid) {
          return NextResponse.json(
            { success: false, error: validation.errors[0] || '请求数据无效' },
            { status: 400 }
          )
        }
        
        // 将验证后的数据添加到请求中
        ;(request as any).validatedBody = body
      } catch (error) {
        return NextResponse.json(
          { success: false, error: '请求数据格式错误' },
          { status: 400 }
        )
      }
    }
    
    return handler(request, context)
  }
}

// CORS 中间件
export function withCors(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    const response = await handler(request, context)
    
    // 添加 CORS 头
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  }
}

// 速率限制中间件（简单实现）
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  maxRequests = 100,
  windowMs = 60000 // 1分钟
) {
  return function(handler: ApiHandler): ApiHandler {
    return async (request: NextRequest, context?: any) => {
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
      const now = Date.now()
      
      const requestData = requestCounts.get(ip)
      
      if (!requestData || now > requestData.resetTime) {
        // 重置计数
        requestCounts.set(ip, { count: 1, resetTime: now + windowMs })
      } else {
        requestData.count++
        
        if (requestData.count > maxRequests) {
          return NextResponse.json(
            { success: false, error: '请求过于频繁，请稍后再试' },
            { status: 429 }
          )
        }
      }
      
      return handler(request, context)
    }
  }
}

// 日志中间件
export function withLogging(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    const start = Date.now()
    const method = request.method
    const url = request.url
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - 开始处理`)
    
    const response = await handler(request, context)
    
    const duration = Date.now() - start
    const status = response.status
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status} (${duration}ms)`)
    
    return response
  }
}

// 组合中间件
export function compose(...middlewares: ((handler: ApiHandler) => ApiHandler)[]): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

// 常用中间件组合
export const withStandardMiddleware = compose(
  withErrorHandling,
  withDatabase,
  withCors,
  withLogging
)

// 带验证的标准中间件
export function withStandardValidation(
  schema: (body: any) => { isValid: boolean; errors: string[] }
) {
  return compose(
    withErrorHandling,
    withDatabase,
    withValidation(schema),
    withCors,
    withLogging
  )
}

// 带速率限制的标准中间件
export function withStandardRateLimit(
  maxRequests = 100,
  windowMs = 60000
) {
  return compose(
    withErrorHandling,
    withDatabase,
    withRateLimit(maxRequests, windowMs),
    withCors,
    withLogging
  )
}

// 请求体验证辅助函数
export const validators = {
  // 订单创建验证
  createOrder: (body: any) => {
    const errors: string[] = []
    
    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      errors.push('订单金额必须大于0')
    }
    
    if (!body.userId || typeof body.userId !== 'string') {
      errors.push('用户ID不能为空')
    }
    
    return { isValid: errors.length === 0, errors }
  },
  
  // 优惠码创建验证
  createDiscount: (body: any) => {
    const errors: string[] = []
    
    if (!body.code || typeof body.code !== 'string' || body.code.trim().length < 3) {
      errors.push('优惠码长度至少3个字符')
    }
    
    if (body.balance === undefined || typeof body.balance !== 'number' || body.balance < 0) {
      errors.push('优惠金额不能小于0')
    }
    
    return { isValid: errors.length === 0, errors }
  },
  
  // 优惠码验证请求验证
  validateDiscount: (body: any) => {
    const errors: string[] = []
    
    if (!body.code || typeof body.code !== 'string') {
      errors.push('优惠码不能为空')
    }
    
    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      errors.push('订单金额必须大于0')
    }
    
    return { isValid: errors.length === 0, errors }
  },
  
  // 支付请求验证
  processPayment: (body: any) => {
    const errors: string[] = []
    
    if (!body.orderId || typeof body.orderId !== 'string') {
      errors.push('订单ID不能为空')
    }
    
    if (!body.paymentMethod || typeof body.paymentMethod !== 'string') {
      errors.push('支付方式不能为空')
    }
    
    if (!body.userId || typeof body.userId !== 'string') {
      errors.push('用户ID不能为空')
    }
    
    return { isValid: errors.length === 0, errors }
  }
}