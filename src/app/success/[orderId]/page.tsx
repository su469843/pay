'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Order } from '@/lib/storage'

interface SuccessPageProps {}

export default function SuccessPage({}: SuccessPageProps) {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
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
        if (result.data.status === 'pending') {
          router.push(`/payment/${orderId}`)
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
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 成功图标和标题 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">支付成功！</h1>
          <p className="text-gray-600">您的订单已完成支付，感谢您的购买</p>
        </div>
        
        {/* 订单详情 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">订单详情</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">订单号</span>
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{order.orderId}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">支付方式</span>
              <span className="capitalize">
                {order.paymentMethod === 'alipay' && '支付宝'}
                {order.paymentMethod === 'wechat' && '微信支付'}
                {order.paymentMethod === 'bank' && '银行卡'}
                {!['alipay', 'wechat', 'bank'].includes(order.paymentMethod) && order.paymentMethod}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">订单描述</span>
              <span>{order.description || '无描述'}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">原价</span>
              <span>¥{order.amount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">实付金额</span>
              <span className="text-xl font-bold text-green-600">¥{order.balance.toFixed(2)}</span>
            </div>
            
            {order.amount > order.balance && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">节省金额</span>
                <span className="text-green-600 font-semibold">¥{(order.amount - order.balance).toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">支付时间</span>
              <span>{order.updatedAt ? new Date(order.updatedAt).toLocaleString('zh-CN') : '刚刚'}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">订单状态</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                已支付
              </span>
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              返回首页
            </button>
            
            <button
              onClick={() => window.print()}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              打印订单
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              如有问题，请联系客服或保存此页面作为支付凭证
            </p>
          </div>
        </div>
        
        {/* 温馨提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-1">温馨提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 请保存此页面或截图作为支付凭证</li>
                <li>• 如需发票，请联系客服提供订单号</li>
                <li>• 支付完成后，相关服务将在24小时内开通</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}