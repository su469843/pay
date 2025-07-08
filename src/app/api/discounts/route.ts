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

// GET - 获取优惠码列表
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const discounts = await DiscountService.getAllDiscounts(limit)
    
    return NextResponse.json({ success: true, data: discounts })
  } catch (error) {
    console.error('Error fetching discounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discounts' },
      { status: 500 }
    )
  }
}

// POST - 创建新优惠码
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    
    const body = await request.json()
    const { code, balance, isFullDiscount, description, maxUsage, minAmount } = body
    
    // 验证必填字段
    if (!code || balance === undefined) {
      return NextResponse.json(
        { success: false, error: 'Code and balance are required' },
        { status: 400 }
      )
    }
    
    // 验证优惠金额
    if (balance < 0) {
      return NextResponse.json(
        { success: false, error: 'Balance must be greater than or equal to 0' },
        { status: 400 }
      )
    }
    
    // 检查优惠码是否已存在
    const existingDiscount = await DiscountService.getDiscountByCode(code)
    if (existingDiscount) {
      return NextResponse.json(
        { success: false, error: 'Discount code already exists' },
        { status: 400 }
      )
    }
    
    // 创建优惠码数据
    const discountData = {
      code: code.trim(),
      balance: parseFloat(balance),
      isFullDiscount: Boolean(isFullDiscount),
      status: 'active' as const,
      description: description || '',
      maxUsage: maxUsage ? parseInt(maxUsage) : undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined
    }
    
    const discount = await DiscountService.createDiscount(discountData)
    
    return NextResponse.json({ success: true, data: discount })
  } catch (error) {
    console.error('Error creating discount:', error)
    
    // 处理唯一约束错误
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Discount code already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create discount' },
      { status: 500 }
    )
  }
}