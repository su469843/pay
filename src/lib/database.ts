import { Pool, PoolConfig } from 'pg'

// 检测是否为Neon数据库
const isNeonDatabase = (process.env.PGHOST?.includes('neon.tech') || process.env.DATABASE_URL?.includes('neon.tech')) || false;

// 数据库配置 - 优先使用环境变量
const dbConfig: PoolConfig = process.env.PGHOST ? {
  // 使用PostgreSQL环境变量
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432'),
  // Neon数据库SSL配置
  ssl: isNeonDatabase ? {
    rejectUnauthorized: false
  } : (process.env.PGSSLMODE === 'require'),
  // 针对Neon优化的连接池配置
  max: isNeonDatabase ? 5 : 20,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
} : {
  // 回退到连接字符串
  connectionString: process.env.DATABASE_URL,
  // Neon数据库SSL配置
  ssl: isNeonDatabase ? {
    rejectUnauthorized: false
  } : false,
  // 针对Neon优化的连接池配置
  max: isNeonDatabase ? 5 : 20,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
}

// 创建连接池
const pool = new Pool(dbConfig)

// 测试数据库连接
pool.on('connect', (client) => {
  console.log('✅ Connected to PostgreSQL database')
  const connectionInfo = process.env.PGHOST 
    ? `Host: ${process.env.PGHOST}, Database: ${process.env.PGDATABASE}`
    : process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@') || 'Unknown'
  console.log('Connection info:', connectionInfo)
})

pool.on('error', (err: any) => {
  console.error('❌ Unexpected error on idle client:', err.message)
  console.error('Error code:', err.code)
  console.error('Error details:', err.detail || 'No additional details')
  console.error('Error hint:', err.hint || 'No additional hints')
  // 不要立即退出进程，让应用继续运行并重试连接
})

pool.on('acquire', () => {
  console.log('🔗 Client acquired from pool')
})

pool.on('release', () => {
  console.log('🔓 Client released back to pool')
})

// 导出查询函数
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params)
}

// 导出事务函数
export const getClient = () => {
  return pool.connect()
}

// 测试数据库连接
export async function testConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing database connection...')
    if (process.env.PGHOST) {
      console.log('Using PG environment variables:')
      console.log('PGHOST:', process.env.PGHOST)
      console.log('PGDATABASE:', process.env.PGDATABASE)
      console.log('PGUSER:', process.env.PGUSER)
      console.log('PGSSLMODE:', process.env.PGSSLMODE)
    } else {
      console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'))
    }
    
    const client = await pool.connect()
    console.log('✅ Client connected successfully')
    
    const result = await client.query('SELECT 1 as test, NOW() as current_time')
    console.log('✅ Query executed successfully:', result.rows[0])
    
    client.release()
    console.log('✅ Database connection test successful')
    return true
  } catch (error: any) {
    console.error('❌ Database connection test failed:')
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('Error stack:', error.stack)
    if (error.detail) console.error('Error detail:', error.detail)
    if (error.hint) console.error('Error hint:', error.hint)
    return false
  }
}

// 重试函数
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      console.log(`Operation failed, retrying in ${delay}ms... (${i + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // 指数退避
    }
  }
  throw new Error('Max retries exceeded')
}

// 初始化数据库表结构
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database...')
    
    // 首先测试连接
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('Cannot establish database connection')
    }
    
    // 使用重试机制创建表
     await retryOperation(async () => {
       // 创建订单表
       await query(`
         CREATE TABLE IF NOT EXISTS orders (
           order_id VARCHAR(50) PRIMARY KEY,
           payment_id VARCHAR(50) NOT NULL,
           amount DECIMAL(10,2) NOT NULL,
           balance DECIMAL(10,2) NOT NULL,
           status VARCHAR(20) NOT NULL DEFAULT 'pending',
           payment_method VARCHAR(50) DEFAULT 'pending',
           description TEXT,
           user_id VARCHAR(50) NOT NULL,
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP WITH TIME ZONE
         )
       `)
       
       // 创建优惠码表
       await query(`
         CREATE TABLE IF NOT EXISTS discounts (
           discount_id VARCHAR(50) PRIMARY KEY,
           code VARCHAR(100) UNIQUE NOT NULL,
           balance DECIMAL(10,2) NOT NULL,
           is_full_discount BOOLEAN DEFAULT FALSE,
           status VARCHAR(20) NOT NULL DEFAULT 'active',
           description TEXT,
           usage_count INTEGER DEFAULT 0,
           max_usage INTEGER,
           min_amount DECIMAL(10,2),
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
         )
       `)
       
       // 创建支付记录表
       await query(`
         CREATE TABLE IF NOT EXISTS payment_records (
           record_id VARCHAR(50) PRIMARY KEY,
           payment_id VARCHAR(50) NOT NULL,
           order_id VARCHAR(50) NOT NULL,
           amount DECIMAL(10,2) NOT NULL,
           paid_amount DECIMAL(10,2) NOT NULL,
           discount_amount DECIMAL(10,2) NOT NULL,
           payment_method VARCHAR(50) NOT NULL,
           user_id VARCHAR(50) NOT NULL,
           discount_id VARCHAR(50) NOT NULL,
           discount_code VARCHAR(100) NOT NULL,
           paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
           order_description TEXT
         )
       `)
       
       // 创建索引
       await query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)')
       await query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
       await query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)')
       await query('CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code)')
       await query('CREATE INDEX IF NOT EXISTS idx_discounts_status ON discounts(status)')
       await query('CREATE INDEX IF NOT EXISTS idx_payment_records_order_id ON payment_records(order_id)')
       await query('CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id)')
       await query('CREATE INDEX IF NOT EXISTS idx_payment_records_paid_at ON payment_records(paid_at)')
     })
    
    console.log('Database initialized successfully!')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// 生成唯一ID
export function generateId(prefix = ''): string {
  return prefix + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

export default pool