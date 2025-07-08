import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database'
import { OrderService } from '@/lib/storage'

// 确保数据库已初始化
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase()
    dbInitialized = true
  }
}

// GET - 获取单个订单
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await ensureDbInitialized()
    
    const { orderId } = params
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }
    
    const order = await OrderService.getOrder(orderId)
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PUT - 更新订单
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await ensureDbInitialized()
    
    const { orderId } = params
    const body = await request.json()
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }
    
    // 检查订单是否存在
    const existingOrder = await OrderService.getOrder(orderId)
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // 更新订单
    const updatedOrder = await OrderService.updateOrder(orderId, body)
    
    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, data: updatedOrder })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    )
  }
}