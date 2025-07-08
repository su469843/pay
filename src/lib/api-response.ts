// API 响应标准化工具

import { NextResponse } from 'next/server'
import { ApiResponse, PaginatedResponse } from '@/types'

// 成功响应
export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  }
  
  return NextResponse.json(response, { status })
}

// 错误响应
export function errorResponse(
  error: string,
  status = 500,
  code?: string
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    ...(code && { code })
  }
  
  return NextResponse.json(response, { status })
}

// 分页响应
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): NextResponse {
  const totalPages = Math.ceil(total / limit)
  
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    message,
    pagination: {
      total,
      page,
      limit,
      totalPages
    }
  }
  
  return NextResponse.json(response)
}

// 创建响应
export function createdResponse<T>(
  data: T,
  message = '创建成功'
): NextResponse {
  return successResponse(data, message, 201)
}

// 更新响应
export function updatedResponse<T>(
  data: T,
  message = '更新成功'
): NextResponse {
  return successResponse(data, message, 200)
}

// 删除响应
export function deletedResponse(
  message = '删除成功'
): NextResponse {
  return successResponse(null, message, 200)
}

// 验证错误响应
export function validationErrorResponse(
  error: string,
  field?: string
): NextResponse {
  const response: ApiResponse & { field?: string } = {
    success: false,
    error,
    ...(field && { field })
  }
  
  return NextResponse.json(response, { status: 400 })
}

// 未找到响应
export function notFoundResponse(
  resource = '资源'
): NextResponse {
  return errorResponse(`${resource}未找到`, 404, 'NOT_FOUND')
}

// 未授权响应
export function unauthorizedResponse(
  message = '未授权访问'
): NextResponse {
  return errorResponse(message, 401, 'UNAUTHORIZED')
}

// 禁止访问响应
export function forbiddenResponse(
  message = '禁止访问'
): NextResponse {
  return errorResponse(message, 403, 'FORBIDDEN')
}

// 冲突响应
export function conflictResponse(
  message = '资源冲突'
): NextResponse {
  return errorResponse(message, 409, 'CONFLICT')
}

// 速率限制响应
export function rateLimitResponse(
  message = '请求过于频繁，请稍后再试'
): NextResponse {
  return errorResponse(message, 429, 'RATE_LIMIT_EXCEEDED')
}

// 服务器错误响应
export function serverErrorResponse(
  message = '服务器内部错误'
): NextResponse {
  return errorResponse(message, 500, 'INTERNAL_SERVER_ERROR')
}

// 响应构建器类
export class ResponseBuilder {
  private data: any = null
  private message?: string
  private status = 200
  private headers: Record<string, string> = {}
  
  // 设置数据
  setData(data: any): this {
    this.data = data
    return this
  }
  
  // 设置消息
  setMessage(message: string): this {
    this.message = message
    return this
  }
  
  // 设置状态码
  setStatus(status: number): this {
    this.status = status
    return this
  }
  
  // 设置头部
  setHeader(key: string, value: string): this {
    this.headers[key] = value
    return this
  }
  
  // 设置多个头部
  setHeaders(headers: Record<string, string>): this {
    this.headers = { ...this.headers, ...headers }
    return this
  }
  
  // 构建成功响应
  success(): NextResponse {
    const response: ApiResponse = {
      success: true,
      data: this.data,
      message: this.message
    }
    
    const nextResponse = NextResponse.json(response, { status: this.status })
    
    // 设置头部
    Object.entries(this.headers).forEach(([key, value]) => {
      nextResponse.headers.set(key, value)
    })
    
    return nextResponse
  }
  
  // 构建错误响应
  error(error: string, code?: string): NextResponse {
    const response: ApiResponse = {
      success: false,
      error,
      ...(code && { code })
    }
    
    const nextResponse = NextResponse.json(response, { status: this.status })
    
    // 设置头部
    Object.entries(this.headers).forEach(([key, value]) => {
      nextResponse.headers.set(key, value)
    })
    
    return nextResponse
  }
}

// 创建响应构建器
export function createResponse(): ResponseBuilder {
  return new ResponseBuilder()
}

// 常用状态码常量
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const

// 错误代码常量
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  DISCOUNT_ERROR: 'DISCOUNT_ERROR'
} as const

// 响应工具函数
export const ApiResponseUtils = {
  // 检查响应是否成功
  isSuccess: (response: any): boolean => {
    return response?.success === true
  },
  
  // 获取错误信息
  getError: (response: any): string | null => {
    return response?.error || null
  },
  
  // 获取数据
  getData: <T>(response: any): T | null => {
    return response?.data || null
  },
  
  // 获取消息
  getMessage: (response: any): string | null => {
    return response?.message || null
  },
  
  // 格式化错误响应
  formatError: (error: unknown): { message: string; code?: string } => {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: (error as any).code
      }
    }
    
    if (typeof error === 'string') {
      return { message: error }
    }
    
    return { message: '未知错误' }
  }
}