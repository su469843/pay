import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database'
import { OrderService, DiscountService, PaymentRecordService } from '@/lib/storage'

// 确保数据库已初始化
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase()
    dbInitialized = true
  }
}

// POST - 处理支付
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    
    const body = await request.json()
    const { orderId, discountCode, paymentMethod, userId } = body
    
    // 验证必填字段
    if (!orderId || !paymentMethod || !userId) {
      return NextResponse.json(
        { success: false, error: 'OrderId, paymentMethod and userId are required' },
        { status: 400 }
      )
    }
    
    // 获取订单信息
    const order = await OrderService.getOrder(orderId)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // 检查订单状态
    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Order is not pending' },
        { status: 400 }
      )
    }
    
    // 检查用户权限
    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    let discountAmount = 0
    let discount = null
    let finalAmount = order.amount
    
    // 处理优惠码
    if (discountCode && discountCode.trim()) {
      const validation = await DiscountService.validateDiscount(discountCode.trim(), order.amount)
      
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.message || 'Invalid discount code'
        }, { status: 400 })
      }
      
      discount = validation.discount!
      
      if (discount.isFullDiscount) {
        // 全额优惠
        discountAmount = Math.min(discount.balance, order.amount)
        finalAmount = Math.max(0, order.amount - discountAmount)
      } else {
        // 固定金额优惠
        discountAmount = Math.min(discount.balance, order.amount)
        finalAmount = Math.max(0, order.amount - discountAmount)
      }
      
      // 使用优惠码
      await DiscountService.applyDiscount(discount.discountId)
    }
    
    // 模拟支付处理（在实际应用中，这里会调用真实的支付网关）
    const paymentSuccess = await simulatePayment(paymentMethod, finalAmount)
    
    if (!paymentSuccess) {
      return NextResponse.json(
        { success: false, error: 'Payment failed' },
        { status: 400 }
      )
    }
    
    // 更新订单状态
    const updatedOrder = await OrderService.updateOrder(orderId, {
      status: 'paid',
      paymentMethod,
      balance: finalAmount
    })
    
    // 创建支付记录
    const paymentRecord = await PaymentRecordService.createPaymentRecord({
      paymentId: order.paymentId,
      orderId: order.orderId,
      amount: order.amount,
      paidAmount: finalAmount,
      discountAmount,
      paymentMethod,
      userId,
      discountId: discount?.discountId || '',
      discountCode: discountCode?.trim() || '',
      orderDescription: order.description || ''
    })
    
    return NextResponse.json({
      success: true,
      data: {
        order: updatedOrder,
        paymentRecord,
        discount,
        originalAmount: order.amount,
        discountAmount,
        finalAmount,
        savings: discountAmount
      }
    })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}

// 模拟支付处理
async function simulatePayment(paymentMethod: string, amount: number): Promise<boolean> {
  // 模拟支付延迟
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 模拟支付成功率（95%）
  const success = Math.random() > 0.05
  
  console.log(`Simulated payment: ${paymentMethod}, Amount: ${amount}, Success: ${success}`)
  
  return success
}