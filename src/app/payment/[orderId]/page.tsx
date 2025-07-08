'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Order } from '@/lib/storage'

interface PaymentPageProps {}

interface DiscountValidation {
  discount: any
  originalAmount: number
  discountAmount: number
  finalAmount: number
  savings: number
}

export default function PaymentPage({}: PaymentPageProps) {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [discountValidation, setDiscountValidation] = useState<DiscountValidation | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('alipay')
  const [validatingDiscount, setValidatingDiscount] = useState(false)
  
  // 获取订单信息
  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])
  
  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      const result = await response.json()
      
      if (result.success) {
        setOrder(result.data)
        if (result.data.status !== 'pending') {
          router.push(`/success/${orderId}`)
        }
      } else {
        setError(result.error || '订单不存在')
      }
    } catch (err) {
      setError('获取订单信息失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 验证优惠码
  const validateDiscount = async () => {
    if (!discountCode.trim() || !order) return
    
    try {
      setValidatingDiscount(true)
      setError('')
      
      const response = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: discountCode.trim(),
          amount: order.amount
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setDiscountValidation(result.data)
      } else {
        setError(result.error || '优惠码验证失败')
        setDiscountValidation(null)
      }
    } catch (err) {
      setError('验证优惠码时发生错误')
      setDiscountValidation(null)
    } finally {
      setValidatingDiscount(false)
    }
  }
  
  // 处理支付
  const handlePayment = async () => {
    if (!order) return
    
    try {
      setProcessing(true)
      setError('')
      
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.orderId,
          discountCode: discountCode.trim(),
          paymentMethod,
          userId: order.userId
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 支付成功，跳转到成功页面
        router.push(`/success/${orderId}`)
      } else {
        setError(result.error || '支付失败')
      }
    } catch (err) {
      setError('支付处理时发生错误')
    } finally {
      setProcessing(false)
    }
  }
  
  // 清除优惠码
  const clearDiscount = () => {
    setDiscountCode('')
    setDiscountValidation(null)
    setError('')
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载订单信息...</p>
        </div>
      </div>
    )
  }
  
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">订单不存在</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }
  
  const finalAmount = discountValidation ? discountValidation.finalAmount : order.amount
  const savings = discountValidation ? discountValidation.savings : 0
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 订单信息 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">订单支付</h1>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">订单号:</span>
              <span className="font-mono text-sm">{order.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">订单描述:</span>
              <span>{order.description || '无描述'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">原价:</span>
              <span className="font-semibold">¥{order.amount.toFixed(2)}</span>
            </div>
            {savings > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>优惠金额:</span>
                  <span>-¥{savings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-red-600">
                  <span>实付金额:</span>
                  <span>¥{finalAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            {savings === 0 && (
              <div className="flex justify-between text-xl font-bold">
                <span>支付金额:</span>
                <span>¥{finalAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 优惠码 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">优惠码</h2>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="请输入优惠码"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={processing || validatingDiscount}
            />
            <button
              onClick={validateDiscount}
              disabled={!discountCode.trim() || processing || validatingDiscount}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {validatingDiscount ? '验证中...' : '验证'}
            </button>
            {discountValidation && (
              <button
                onClick={clearDiscount}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                清除
              </button>
            )}
          </div>
          
          {discountValidation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-semibold">优惠码有效</span>
              </div>
              <p className="text-green-700 text-sm">
                {discountValidation.discount.description || '优惠码已应用'}
              </p>
              <p className="text-green-700 text-sm mt-1">
                节省: ¥{savings.toFixed(2)}
              </p>
            </div>
          )}
        </div>
        
        {/* 支付方式 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">支付方式</h2>
          
          <div className="space-y-3">
            {[
              { value: 'alipay', label: '支付宝', icon: '💰' },
              { value: 'wechat', label: '微信支付', icon: '💚' },
              { value: 'bank', label: '银行卡', icon: '💳' }
            ].map((method) => (
              <label key={method.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={paymentMethod === method.value}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3"
                />
                <span className="text-2xl mr-3">{method.icon}</span>
                <span className="font-medium">{method.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}
        
        {/* 支付按钮 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={handlePayment}
            disabled={processing || finalAmount <= 0}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                处理中...
              </div>
            ) : (
              `立即支付 ¥${finalAmount.toFixed(2)}`
            )}
          </button>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-800 underline"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}