// 改进的订单API路由示例
// 展示如何使用中间件和标准化响应

import { NextRequest } from 'next/server'
import { OrderService } from '@/lib/storage'
import { generateId } from '@/lib/database'
import { withStandardMiddleware, withStandardValidation, validators } from '@/lib/middleware'
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  notFoundResponse,
  paginatedResponse
} from '@/lib/api-response'
import { CreateOrderRequest, UpdateOrderRequest } from '@/types'

// GET - 获取订单列表
export const GET = withStandardMiddleware(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = (page - 1) * limit
  
  // 验证分页参数
  if (page < 1 || limit < 1 || limit > 100) {
    return validationErrorResponse('分页参数无效')
  }
  
  let orders: any[]
  let total: number
  
  if (userId) {
    // 获取用户订单
    orders = await OrderService.getUserOrders(userId, limit, offset)
    total = await OrderService.getUserOrdersCount(userId)
  } else {
    // 获取所有订单
    orders = await OrderService.getAllOrders(limit, offset)
    total = await OrderService.getTotalOrdersCount()
  }
  
  return paginatedResponse(orders, total, page, limit, '获取订单列表成功')
})

// POST - 创建新订单
export const POST = withStandardValidation(validators.createOrder)(
  async (request: NextRequest) => {
    const body = (request as any).validatedBody as CreateOrderRequest
    
    // 创建订单数据
    const orderData = {
      paymentId: generateId('pay_'),
      amount: body.amount,
      balance: body.amount,
      status: 'pending' as const,
      paymentMethod: 'pending',
      description: body.description || '',
      userId: body.userId
    }
    
    const order = await OrderService.createOrder(orderData)
    
    return createdResponse(order, '订单创建成功')
  }
)

// PUT - 更新订单（动态路由版本）
export const PUT = withStandardMiddleware(
  async (request: NextRequest, { params }: { params: { orderId: string } }) => {
    const { orderId } = params
    
    if (!orderId) {
      return validationErrorResponse('订单ID不能为空')
    }
    
    // 检查订单是否存在
    const existingOrder = await OrderService.getOrder(orderId)
    if (!existingOrder) {
      return notFoundResponse('订单')
    }
    
    let body: UpdateOrderRequest
    try {
      body = await request.json()
    } catch {
      return validationErrorResponse('请求数据格式错误')
    }
    
    // 验证更新数据
    const allowedFields = ['status', 'paymentMethod', 'description']
    const updateData: Partial<UpdateOrderRequest> = {}
    
    Object.keys(body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key as keyof UpdateOrderRequest] = body[key as keyof UpdateOrderRequest]
      }
    })
    
    if (Object.keys(updateData).length === 0) {
      return validationErrorResponse('没有有效的更新字段')
    }
    
    // 验证状态值
    if (updateData.status && !['pending', 'paid', 'cancelled'].includes(updateData.status)) {
      return validationErrorResponse('无效的订单状态')
    }
    
    const updatedOrder = await OrderService.updateOrder(orderId, updateData)
    
    return successResponse(updatedOrder, '订单更新成功')
  }
)

// DELETE - 删除订单（软删除）
export const DELETE = withStandardMiddleware(
  async (request: NextRequest, { params }: { params: { orderId: string } }) => {
    const { orderId } = params
    
    if (!orderId) {
      return validationErrorResponse('订单ID不能为空')
    }
    
    // 检查订单是否存在
    const existingOrder = await OrderService.getOrder(orderId)
    if (!existingOrder) {
      return notFoundResponse('订单')
    }
    
    // 检查订单状态，只允许删除待支付的订单
    if (existingOrder.status !== 'pending') {
      return validationErrorResponse('只能删除待支付的订单')
    }
    
    // 软删除：更新状态为已取消
    await OrderService.updateOrder(orderId, { status: 'cancelled' })
    
    return successResponse(null, '订单删除成功')
  }
)

// 订单统计API
export const getOrderStats = withStandardMiddleware(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const stats = await OrderService.getOrderStats({
      userId: userId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    })
    
    return successResponse(stats, '获取订单统计成功')
  }
)

// 批量操作API
export const batchUpdate = withStandardMiddleware(
  async (request: NextRequest) => {
    let body: { orderIds: string[]; updates: UpdateOrderRequest }
    
    try {
      body = await request.json()
    } catch {
      return validationErrorResponse('请求数据格式错误')
    }
    
    const { orderIds, updates } = body
    
    // 验证订单ID列表
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return validationErrorResponse('订单ID列表不能为空')
    }
    
    if (orderIds.length > 100) {
      return validationErrorResponse('批量操作最多支持100个订单')
    }
    
    // 验证更新数据
    if (!updates || Object.keys(updates).length === 0) {
      return validationErrorResponse('更新数据不能为空')
    }
    
    const results = await OrderService.batchUpdateOrders(orderIds, updates)
    
    return successResponse(results, `成功更新${results.length}个订单`)
  }
)