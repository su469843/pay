import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database'
import { StatsService } from '@/lib/storage'

// 确保数据库已初始化
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase()
    dbInitialized = true
  }
}

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()
    
    const stats = await StatsService.getStats()
    
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}