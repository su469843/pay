import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database'
import { DiscountService } from '@/lib/storage'

// 确保数据库已初始化
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase()
    dbInitialized = true
  }
}

// POST - 验证优惠码
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    
    const body = await request.json()
    const { code, amount } = body
    
    // 验证必填字段
    if (!code || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Code and amount are required' },
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
    
    // 验证优惠码
    const validation = await DiscountService.validateDiscount(code.trim(), parseFloat(amount))
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.message || 'Invalid discount code'
      }, { status: 400 })
    }
    
    // 计算优惠后金额
    const discount = validation.discount!
    let discountAmount = 0
    let finalAmount = parseFloat(amount)
    
    if (discount.isFullDiscount) {
      // 全额优惠
      discountAmount = Math.min(discount.balance, finalAmount)
      finalAmount = Math.max(0, finalAmount - discountAmount)
    } else {
      // 固定金额优惠
      discountAmount = Math.min(discount.balance, finalAmount)
      finalAmount = Math.max(0, finalAmount - discountAmount)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        discount,
        originalAmount: parseFloat(amount),
        discountAmount,
        finalAmount,
        savings: discountAmount
      }
    })
  } catch (error) {
    console.error('Error validating discount:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate discount' },
      { status: 500 }
    )
  }
}