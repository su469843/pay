'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Order, Discount } from '@/lib/storage'

interface Stats {
  totalOrders: number
  totalRevenue: number
  totalDiscounts: number
  totalPayments: number
}

export default function HomePage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalRevenue: 0, totalDiscounts: 0, totalPayments: 0 })
  const [orders, setOrders] = useState<Order[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  // 管理员密码
  const ADMIN_PASSWORD = 'admin@20204.xyz'
  
  // 订单表单
  const [orderForm, setOrderForm] = useState({
    amount: '',
    description: '',
    userId: 'user_demo_123'
  })
  
  // 优惠码表单
  const [discountForm, setDiscountForm] = useState({
    code: '',
    balance: '',
    isFullDiscount: false,
    description: '',
    maxUsage: '',
    minAmount: '',
    isOneTime: false
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 订单和优惠码操作结果状态
  const [orderResult, setOrderResult] = useState({ message: '', type: '' })
  const [discountResult, setDiscountResult] = useState({ message: '', type: '' })
  
  // 模拟用户ID（在实际应用中应该从认证系统获取）
  const userId = 'user_demo_123'
  
  useEffect(() => {
    // 检查是否已经认证过（从localStorage获取）
    const savedAuth = localStorage.getItem('adminAuthenticated')
    if (savedAuth === 'true') {
      setIsAuthenticated(true)
      loadData()
    } else {
      setLoading(false)
    }
  }, [])
  
  // 管理员认证
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setAuthError('')
      localStorage.setItem('adminAuthenticated', 'true')
      loadData()
    } else {
      setAuthError('密码错误，请重试')
    }
  }
  
  // 退出登录
  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('adminAuthenticated')
    setPassword('')
  }
  
  const loadData = async () => {
    try {
      setLoading(true)
      
      // 并行加载所有数据
      const [statsRes, ordersRes, discountsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch(`/api/orders?userId=${userId}&limit=10`),
        fetch('/api/discounts?limit=10')
      ])
      
      const [statsData, ordersData, discountsData] = await Promise.all([
        statsRes.json(),
        ordersRes.json(),
        discountsRes.json()
      ])
      
      if (statsData.success) setStats(statsData.data)
      if (ordersData.success) setOrders(ordersData.data)
      if (discountsData.success) setDiscounts(discountsData.data)
      
    } catch (err) {
      setOrderResult({ message: '加载数据失败', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orderForm.amount) {
      setOrderResult({ message: '请填写订单金额', type: 'error' })
      return
    }
    
    try {
      setSubmitting(true)
      setOrderResult({ message: '', type: '' })
      setDiscountResult({ message: '', type: '' })
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(orderForm.amount),
          description: orderForm.description,
          userId
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setOrderResult({ message: `订单创建成功！订单号: ${result.data.orderId}`, type: 'success' })
        setOrderForm({ amount: '', description: '', userId: 'user_demo_123' })
        loadData() // 重新加载数据
        
        // 3秒后跳转到支付页面
        setTimeout(() => {
          router.push(`/payment/${result.data.orderId}`)
        }, 2000)
      } else {
        setOrderResult({ message: result.error || '创建订单失败', type: 'error' })
      }
    } catch (err) {
      setOrderResult({ message: '网络错误，请重试', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const createDiscount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!discountForm.code || !discountForm.balance) {
      setDiscountResult({ message: '请填写优惠码和优惠金额', type: 'error' })
      return
    }
    
    try {
      setSubmitting(true)
      setOrderResult({ message: '', type: '' })
      setDiscountResult({ message: '', type: '' })
      
      const response = await fetch('/api/discounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: discountForm.code,
          balance: parseFloat(discountForm.balance),
          description: discountForm.description,
          isFullDiscount: discountForm.isFullDiscount,
          maxUsage: discountForm.maxUsage ? parseInt(discountForm.maxUsage) : undefined,
          minAmount: discountForm.minAmount ? parseFloat(discountForm.minAmount) : undefined
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setDiscountResult({ message: `优惠码创建成功！代码: ${result.data.code}`, type: 'success' })
        setDiscountForm({ code: '', balance: '', description: '', isFullDiscount: false, maxUsage: '', minAmount: '', isOneTime: false })
        loadData() // 重新加载数据
      } else {
        setDiscountResult({ message: result.error || '创建优惠码失败', type: 'error' })
      }
    } catch (err) {
      setDiscountResult({ message: '网络错误，请重试', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // 复制优惠码
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setDiscountResult({ message: '优惠码已复制到剪贴板', type: 'success' })
    setTimeout(() => setDiscountResult({ message: '', type: '' }), 2000)
  }
  
  // 状态翻译
  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }
  
  // 优惠码状态翻译
  const translateDiscountStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '有效',
      used: '已使用',
      expired: '已过期',
      disabled: '已禁用'
    }
    return statusMap[status] || status
  }
  
  // 格式化日期
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('zh-CN')
  }
  
  // 如果未认证，显示登录界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              管理员登录
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              请输入管理员密码访问订单管理系统
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleAuth}>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="请输入管理员密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {authError && (
              <div className="text-red-600 text-sm text-center">
                {authError}
              </div>
            )}
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                登录
              </button>
            </div>
          </form>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">提示</h3>
            <p className="text-blue-700 text-xs">管理员密码: admin@20204.xyz</p>
            <p className="text-blue-700 text-xs mt-1">登录后可以管理订单和优惠码</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* 顶部导航栏 */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">订单管理系统</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          退出登录
        </button>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总订单数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总收入</p>
              <p className="text-2xl font-bold text-gray-900">¥{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">优惠码数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDiscounts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">支付记录</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 创建订单 */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">创建订单</h2>
          <form onSubmit={createOrder} className="space-y-4">
            <div>
              <label className="form-label">订单金额 (¥)</label>
              <input
                type="number"
                className="form-input"
                value={orderForm.amount}
                onChange={(e) => setOrderForm({...orderForm, amount: e.target.value})}
                required
                min="1"
                step="0.01"
                placeholder="请输入订单金额"
              />
            </div>
            <div>
              <label className="form-label">订单描述</label>
              <input
                type="text"
                className="form-input"
                value={orderForm.description}
                onChange={(e) => setOrderForm({...orderForm, description: e.target.value})}
                placeholder="请输入订单描述"
              />
            </div>
            <div>
              <label className="form-label">用户ID</label>
              <input
                type="text"
                className="form-input"
                value={orderForm.userId}
                onChange={(e) => setOrderForm({...orderForm, userId: e.target.value})}
                required
                placeholder="请输入用户ID"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              创建订单
            </button>
          </form>
          
          {orderResult.message && (
            <div className={`mt-4 ${orderResult.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {orderResult.message}
            </div>
          )}

          {/* 最近订单 */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">最近创建的订单</h3>
            {orders.length === 0 ? (
              <p className="text-gray-500 italic">暂无订单</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.order_id} className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <p><strong>订单ID:</strong> {order.order_id}</p>
                    <p><strong>金额:</strong> ¥{order.amount}</p>
                    <p><strong>描述:</strong> {order.description || '未描述'}</p>
                    <p><strong>状态:</strong> {translateStatus(order.status)}</p>
                    <Link 
                      href={`/payment/${order.order_id}`} 
                      className="inline-block mt-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      前往支付页面 →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">使用说明</h3>
            <p className="text-green-700 text-sm">创建订单后会自动生成对应金额的一次性优惠码，可用于支付该订单。</p>
            <p className="text-green-700 text-sm">支付系统支持优惠码支付，基于PostgreSQL数据库。</p>
          </div>
        </div>

        {/* 创建优惠码 */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">创建优惠码</h2>
          <form onSubmit={createDiscount} className="space-y-4">
            <div>
              <label className="form-label">优惠码</label>
              <input
                type="text"
                className="form-input"
                value={discountForm.code}
                onChange={(e) => setDiscountForm({...discountForm, code: e.target.value})}
                required
                placeholder="请输入优惠码"
              />
            </div>
            <div>
              <label className="form-label">优惠余额 (¥)</label>
              <input
                type="number"
                className="form-input"
                value={discountForm.balance}
                onChange={(e) => setDiscountForm({...discountForm, balance: e.target.value})}
                required
                min="1"
                step="0.01"
                placeholder="请输入优惠金额"
              />
            </div>
            <div>
              <label className="form-label">优惠码描述</label>
              <input
                type="text"
                className="form-input"
                value={discountForm.description}
                onChange={(e) => setDiscountForm({...discountForm, description: e.target.value})}
                placeholder="请输入优惠码描述"
              />
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={discountForm.isFullDiscount}
                  onChange={(e) => setDiscountForm({...discountForm, isFullDiscount: e.target.checked})}
                />
                全额优惠码
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={discountForm.isOneTime}
                  onChange={(e) => setDiscountForm({...discountForm, isOneTime: e.target.checked})}
                />
                一次性优惠码
              </label>
            </div>
            <button type="submit" className="btn-success w-full">
              创建优惠码
            </button>
          </form>
          
          {discountResult.message && (
            <div className={`mt-4 ${discountResult.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {discountResult.message}
            </div>
          )}

          {/* 已创建的优惠码 */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">已创建的优惠码</h3>
            {discounts.length === 0 ? (
              <p className="text-gray-500 italic">暂无优惠码</p>
            ) : (
              <div className="space-y-3">
                {discounts.map((discount) => (
                  <div key={discount.discount_id} className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                    <p>
                      <strong>优惠码:</strong> 
                      <span className="bg-yellow-100 border border-yellow-300 px-2 py-1 rounded font-mono text-sm ml-2">
                        {discount.code}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(discount.code)}
                        className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        复制
                      </button>
                    </p>
                    <p>
                      <strong>优惠类型:</strong> 
                      {discount.is_full_discount ? '全额优惠' : `¥${discount.balance}`}
                      {discount.max_usage ? ` （限用 ${discount.max_usage} 次）` : ''}
                    </p>
                    <p><strong>描述:</strong> {discount.description || '未描述'}</p>
                    <p><strong>状态:</strong> {translateDiscountStatus(discount.status)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}