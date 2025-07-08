import { query, generateId } from './database'

// 数据类型定义
export interface Order {
  orderId: string
  paymentId: string
  amount: number
  balance: number
  status: 'pending' | 'paid' | 'cancelled'
  paymentMethod: string
  description?: string
  userId: string
  createdAt: Date
  updatedAt?: Date
}

export interface Discount {
  discountId: string
  code: string
  balance: number
  isFullDiscount: boolean
  status: 'active' | 'used' | 'expired'
  description?: string
  usageCount: number
  maxUsage?: number
  minAmount?: number
  createdAt: Date
}

export interface PaymentRecord {
  recordId: string
  paymentId: string
  orderId: string
  amount: number
  paidAmount: number
  discountAmount: number
  paymentMethod: string
  userId: string
  discountId: string
  discountCode: string
  paidAt: Date
  orderDescription?: string
}

// 订单相关操作
export class OrderService {
  // 创建订单
  static async createOrder(orderData: Omit<Order, 'orderId' | 'createdAt'>): Promise<Order> {
    const orderId = generateId('order_')
    const createdAt = new Date()
    
    const result = await query(
      `INSERT INTO orders (order_id, payment_id, amount, balance, status, payment_method, description, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [orderId, orderData.paymentId, orderData.amount, orderData.balance, orderData.status, 
       orderData.paymentMethod, orderData.description, orderData.userId, createdAt]
    )
    
    return this.mapRowToOrder(result.rows[0])
  }
  
  // 获取订单
  static async getOrder(orderId: string): Promise<Order | null> {
    const result = await query('SELECT * FROM orders WHERE order_id = $1', [orderId])
    return result.rows.length > 0 ? this.mapRowToOrder(result.rows[0]) : null
  }
  
  // 更新订单
  static async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order | null> {
    const updatedAt = new Date()
    const setClause = []
    const values = []
    let paramIndex = 1
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'orderId' && key !== 'createdAt' && value !== undefined) {
        const dbKey = this.camelToSnake(key)
        setClause.push(`${dbKey} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    })
    
    if (setClause.length === 0) return null
    
    setClause.push(`updated_at = $${paramIndex}`)
    values.push(updatedAt)
    values.push(orderId)
    
    const result = await query(
      `UPDATE orders SET ${setClause.join(', ')} WHERE order_id = $${paramIndex + 1} RETURNING *`,
      values
    )
    
    return result.rows.length > 0 ? this.mapRowToOrder(result.rows[0]) : null
  }
  
  // 获取用户订单列表
  static async getUserOrders(userId: string, limit = 10): Promise<Order[]> {
    const result = await query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    )
    return result.rows.map(row => this.mapRowToOrder(row))
  }
  
  // 获取所有订单
  static async getAllOrders(limit = 50): Promise<Order[]> {
    const result = await query(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1',
      [limit]
    )
    return result.rows.map(row => this.mapRowToOrder(row))
  }
  
  private static mapRowToOrder(row: any): Order {
    return {
      orderId: row.order_id,
      paymentId: row.payment_id,
      amount: parseFloat(row.amount),
      balance: parseFloat(row.balance),
      status: row.status,
      paymentMethod: row.payment_method,
      description: row.description,
      userId: row.user_id,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    }
  }
  
  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }
}

// 优惠码相关操作
export class DiscountService {
  // 创建优惠码
  static async createDiscount(discountData: Omit<Discount, 'discountId' | 'createdAt' | 'usageCount'>): Promise<Discount> {
    const discountId = generateId('discount_')
    const createdAt = new Date()
    
    const result = await query(
      `INSERT INTO discounts (discount_id, code, balance, is_full_discount, status, description, usage_count, max_usage, min_amount, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [discountId, discountData.code, discountData.balance, discountData.isFullDiscount,
       discountData.status, discountData.description, 0, discountData.maxUsage, discountData.minAmount, createdAt]
    )
    
    return this.mapRowToDiscount(result.rows[0])
  }
  
  // 根据代码获取优惠码
  static async getDiscountByCode(code: string): Promise<Discount | null> {
    const result = await query('SELECT * FROM discounts WHERE code = $1', [code])
    return result.rows.length > 0 ? this.mapRowToDiscount(result.rows[0]) : null
  }
  
  // 验证优惠码
  static async validateDiscount(code: string, orderAmount: number): Promise<{ valid: boolean; discount?: Discount; message?: string }> {
    const discount = await this.getDiscountByCode(code)
    
    if (!discount) {
      return { valid: false, message: '优惠码不存在' }
    }
    
    if (discount.status !== 'active') {
      return { valid: false, message: '优惠码已失效' }
    }
    
    if (discount.maxUsage && discount.usageCount >= discount.maxUsage) {
      return { valid: false, message: '优惠码使用次数已达上限' }
    }
    
    if (discount.minAmount && orderAmount < discount.minAmount) {
      return { valid: false, message: `订单金额需满${discount.minAmount}元` }
    }
    
    return { valid: true, discount }
  }
  
  // 使用优惠码
  static async applyDiscount(discountId: string): Promise<void> {
    await query(
      'UPDATE discounts SET usage_count = usage_count + 1 WHERE discount_id = $1',
      [discountId]
    )
  }
  
  // 获取所有优惠码
  static async getAllDiscounts(limit = 50): Promise<Discount[]> {
    const result = await query(
      'SELECT * FROM discounts ORDER BY created_at DESC LIMIT $1',
      [limit]
    )
    return result.rows.map(row => this.mapRowToDiscount(row))
  }
  
  private static mapRowToDiscount(row: any): Discount {
    return {
      discountId: row.discount_id,
      code: row.code,
      balance: parseFloat(row.balance),
      isFullDiscount: row.is_full_discount,
      status: row.status,
      description: row.description,
      usageCount: row.usage_count,
      maxUsage: row.max_usage,
      minAmount: row.min_amount ? parseFloat(row.min_amount) : undefined,
      createdAt: new Date(row.created_at)
    }
  }
}

// 支付记录相关操作
export class PaymentRecordService {
  // 创建支付记录
  static async createPaymentRecord(recordData: Omit<PaymentRecord, 'recordId' | 'paidAt'>): Promise<PaymentRecord> {
    const recordId = generateId('payment_')
    const paidAt = new Date()
    
    const result = await query(
      `INSERT INTO payment_records (record_id, payment_id, order_id, amount, paid_amount, discount_amount, payment_method, user_id, discount_id, discount_code, paid_at, order_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [recordId, recordData.paymentId, recordData.orderId, recordData.amount, recordData.paidAmount,
       recordData.discountAmount, recordData.paymentMethod, recordData.userId, recordData.discountId,
       recordData.discountCode, paidAt, recordData.orderDescription]
    )
    
    return this.mapRowToPaymentRecord(result.rows[0])
  }
  
  // 获取订单的支付记录
  static async getPaymentRecordsByOrder(orderId: string): Promise<PaymentRecord[]> {
    const result = await query(
      'SELECT * FROM payment_records WHERE order_id = $1 ORDER BY paid_at DESC',
      [orderId]
    )
    return result.rows.map(row => this.mapRowToPaymentRecord(row))
  }
  
  // 获取用户的支付记录
  static async getUserPaymentRecords(userId: string, limit = 20): Promise<PaymentRecord[]> {
    const result = await query(
      'SELECT * FROM payment_records WHERE user_id = $1 ORDER BY paid_at DESC LIMIT $2',
      [userId, limit]
    )
    return result.rows.map(row => this.mapRowToPaymentRecord(row))
  }
  
  // 获取所有支付记录
  static async getAllPaymentRecords(limit = 100): Promise<PaymentRecord[]> {
    const result = await query(
      'SELECT * FROM payment_records ORDER BY paid_at DESC LIMIT $1',
      [limit]
    )
    return result.rows.map(row => this.mapRowToPaymentRecord(row))
  }
  
  private static mapRowToPaymentRecord(row: any): PaymentRecord {
    return {
      recordId: row.record_id,
      paymentId: row.payment_id,
      orderId: row.order_id,
      amount: parseFloat(row.amount),
      paidAmount: parseFloat(row.paid_amount),
      discountAmount: parseFloat(row.discount_amount),
      paymentMethod: row.payment_method,
      userId: row.user_id,
      discountId: row.discount_id,
      discountCode: row.discount_code,
      paidAt: new Date(row.paid_at),
      orderDescription: row.order_description
    }
  }
}

// 统计相关操作
export class StatsService {
  // 获取统计数据
  static async getStats(): Promise<{
    totalOrders: number
    totalRevenue: number
    totalDiscounts: number
    totalPayments: number
  }> {
    const [ordersResult, revenueResult, discountsResult, paymentsResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM orders'),
      query('SELECT SUM(paid_amount) as total FROM payment_records'),
      query('SELECT COUNT(*) as count FROM discounts'),
      query('SELECT COUNT(*) as count FROM payment_records')
    ])
    
    return {
      totalOrders: parseInt(ordersResult.rows[0].count),
      totalRevenue: parseFloat(revenueResult.rows[0].total || '0'),
      totalDiscounts: parseInt(discountsResult.rows[0].count),
      totalPayments: parseInt(paymentsResult.rows[0].count)
    }
  }
}

// 状态翻译
export function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    cancelled: '已取消',
    active: '有效',
    used: '已使用',
    expired: '已过期'
  }
  return statusMap[status] || status
}