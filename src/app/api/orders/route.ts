import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase, generateId } from '@/lib/database'
import { OrderService } from '@/lib/storage'

// 确保数据库已初始化
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase()
    dbInitialized = true
  }
}

// GET - 获取订单列表
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    let orders
    if (userId) {
      orders = await OrderService.getUserOrders(userId, limit)
    } else {
      orders = await OrderService.getAllOrders(limit)
    }
    
    return NextResponse.json({ success: true, data: orders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST - 创建新订单
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    
    const body = await request.json()
    const { amount, description, userId } = body
    
    // 验证必填字段
    if (!amount || !userId) {
      return NextResponse.json(
        { success: false, error: 'Amount and userId are required' },
        { status: 400 }
      )
    }
    
    // 验证金额
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }
    
    // 创建订单数据
    const orderData = {
      paymentId: generateId('pay_'),
      amount: parseFloat(amount),
      balance: parseFloat(amount),
      status: 'pending' as const,
      paymentMethod: 'pending',
      description: description || '',
      userId
    }
    
    const order = await OrderService.createOrder(orderData)
    
    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}