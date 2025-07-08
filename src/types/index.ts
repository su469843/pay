// 全局类型定义文件

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 分页相关类型
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// 表单相关类型
export interface FormState {
  loading: boolean
  error: string | null
  success: string | null
}

export interface ValidationError {
  field: string
  message: string
}

// 订单相关扩展类型
export interface CreateOrderRequest {
  amount: number
  description?: string
  userId: string
}

export interface UpdateOrderRequest {
  status?: 'pending' | 'paid' | 'cancelled'
  paymentMethod?: string
  description?: string
}

// 优惠码相关扩展类型
export interface CreateDiscountRequest {
  code: string
  balance: number
  isFullDiscount?: boolean
  description?: string
  maxUsage?: number
  minAmount?: number
}

export interface ValidateDiscountRequest {
  code: string
  amount: number
}

export interface DiscountValidationResult {
  discount: any
  originalAmount: number
  discountAmount: number
  finalAmount: number
  savings: number
}

// 支付相关类型
export interface PaymentRequest {
  orderId: string
  discountCode?: string
  paymentMethod: 'alipay' | 'wechat' | 'bank' | string
  userId: string
}

export interface PaymentResult {
  order: any
  paymentRecord: any
  discount?: any
  originalAmount: number
  discountAmount: number
  finalAmount: number
  savings: number
}

// 统计数据类型
export interface StatsData {
  totalOrders: number
  totalRevenue: number
  totalDiscounts: number
  totalPayments: number
}

// 组件 Props 类型
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export interface InputProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  required?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  className?: string
}

export interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  hover?: boolean
  interactive?: boolean
}

export interface BadgeProps {
  status: 'pending' | 'paid' | 'cancelled' | 'active' | 'used' | 'expired'
  children: React.ReactNode
  className?: string
}

export interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

// 路由参数类型
export interface PageParams {
  orderId: string
}

export interface SearchParams {
  [key: string]: string | string[] | undefined
}

// 环境变量类型
export interface EnvironmentVariables {
  DATABASE_URL: string
  DB_HOST: string
  DB_PORT: string
  DB_NAME: string
  DB_USER: string
  DB_PASSWORD: string
  DB_SSL: string
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string
}

// 数据库查询选项
export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
  filters?: Record<string, any>
}

// 错误类型
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}