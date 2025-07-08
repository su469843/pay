// Tailwind CSS 工具类和样式组合

// 按钮样式
export const buttonStyles = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
  success: 'bg-success-600 hover:bg-success-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2',
  warning: 'bg-warning-600 hover:bg-warning-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2',
  error: 'bg-error-600 hover:bg-error-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2',
  outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  ghost: 'text-primary-600 hover:bg-primary-50 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  disabled: 'bg-gray-300 text-gray-500 font-semibold py-2 px-4 rounded-lg cursor-not-allowed'
}

// 卡片样式
export const cardStyles = {
  base: 'bg-white rounded-lg shadow-card border border-gray-200',
  hover: 'bg-white rounded-lg shadow-card hover:shadow-card-hover border border-gray-200 transition-shadow duration-200',
  interactive: 'bg-white rounded-lg shadow-card hover:shadow-card-hover border border-gray-200 transition-all duration-200 cursor-pointer hover:border-primary-300'
}

// 输入框样式
export const inputStyles = {
  base: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200',
  error: 'w-full px-3 py-2 border border-error-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-error-500 focus:border-transparent transition-colors duration-200',
  success: 'w-full px-3 py-2 border border-success-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-success-500 focus:border-transparent transition-colors duration-200'
}

// 状态标签样式
export const badgeStyles = {
  pending: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-600 border border-warning-200',
  paid: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-600 border border-success-200',
  cancelled: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-50 text-error-600 border border-error-200',
  active: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-600 border border-primary-200',
  used: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200',
  expired: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-300'
}

// 警告框样式
export const alertStyles = {
  success: 'bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg',
  error: 'bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg',
  warning: 'bg-warning-50 border border-warning-200 text-warning-700 px-4 py-3 rounded-lg',
  info: 'bg-primary-50 border border-primary-200 text-primary-700 px-4 py-3 rounded-lg'
}

// 加载动画样式
export const loadingStyles = {
  spinner: 'animate-spin rounded-full border-b-2 border-primary-600',
  pulse: 'animate-pulse-slow',
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up'
}

// 布局样式
export const layoutStyles = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-8 sm:py-12 lg:py-16',
  grid: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between'
}

// 响应式文本样式
export const textStyles = {
  h1: 'text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900',
  h2: 'text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900',
  h3: 'text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900',
  h4: 'text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900',
  body: 'text-base text-gray-700',
  small: 'text-sm text-gray-600',
  caption: 'text-xs text-gray-500'
}

// 工具函数：组合多个样式类
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// 工具函数：根据状态获取对应的样式
export function getStatusStyle(status: string): string {
  const statusMap: Record<string, string> = {
    pending: badgeStyles.pending,
    paid: badgeStyles.paid,
    cancelled: badgeStyles.cancelled,
    active: badgeStyles.active,
    used: badgeStyles.used,
    expired: badgeStyles.expired
  }
  return statusMap[status] || badgeStyles.active
}

// 工具函数：根据类型获取按钮样式
export function getButtonStyle(variant: keyof typeof buttonStyles, disabled = false): string {
  if (disabled) return buttonStyles.disabled
  return buttonStyles[variant] || buttonStyles.primary
}