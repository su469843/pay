import { Pool, PoolConfig, PoolClient } from 'pg'

// 环境变量验证
function validateEnvironment(): void {
  const required = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// 结构化日志
const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      service: 'database',
      ...meta
    }))
  },
  error: (message: string, error?: Error, meta?: object) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      service: 'database',
      ...meta
    }))
  },
  warn: (message: string, meta?: object) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      service: 'database',
      ...meta
    }))
  }
}

// 验证环境变量
validateEnvironment()

// 检测是否为Neon数据库
const isNeonDatabase = (process.env.PGHOST?.includes('neon.tech') || process.env.DATABASE_URL?.includes('neon.tech')) || false

// 优化的数据库配置
const dbConfig: PoolConfig = process.env.PGHOST ? {
  // 使用PostgreSQL环境变量
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432'),
  
  // 优化的SSL配置
  ssl: isNeonDatabase ? {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined,
    secureProtocol: 'TLSv1_2_method'
  } : (process.env.PGSSLMODE === 'require'),
  
  // 优化的连接池配置
  max: 3, // 减少并发连接数
  min: 1, // 保持最小连接
  idleTimeoutMillis: 60000, // 60秒
  connectionTimeoutMillis: 60000, // 60秒
  acquireTimeoutMillis: 60000, // 60秒
  
  // 连接保活设置
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
} : {
  // 回退到连接字符串
  connectionString: process.env.DATABASE_URL,
  ssl: isNeonDatabase ? {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined,
    secureProtocol: 'TLSv1_2_method'
  } : false,
  max: 3,
  min: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 60000,
  acquireTimeoutMillis: 60000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
}

// 创建连接池
const pool = new Pool(dbConfig)

// 连接池事件监听
pool.on('connect', (client: PoolClient) => {
  const connectionInfo = process.env.PGHOST 
    ? `Host: ${process.env.PGHOST}, Database: ${process.env.PGDATABASE}`
    : process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@') || 'Unknown'
  
  logger.info('Database connection established', { connectionInfo })
})

pool.on('error', (err: any) => {
  logger.error('Database pool error', err, {
    code: err.code,
    severity: err.severity,
    detail: err.detail,
    hint: err.hint
  })
})

pool.on('acquire', () => {
  logger.info('Client acquired from pool')
})

pool.on('release', () => {
  logger.info('Client released back to pool')
})

// 查询性能监控
export const query = async (text: string, params?: any[]) => {
  const start = Date.now()
  const queryId = Math.random().toString(36).substr(2, 9)
  
  try {
    logger.info('Executing query', { queryId, text: text.substring(0, 100) })
    
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    
    if (duration > 1000) {
      logger.warn('Slow query detected', { 
        queryId, 
        duration, 
        text: text.substring(0, 100),
        rowCount: result.rowCount 
      })
    } else {
      logger.info('Query completed', { 
        queryId, 
        duration, 
        rowCount: result.rowCount 
      })
    }
    
    return result
  } catch (error: any) {
    const duration = Date.now() - start
    logger.error('Query failed', error, { 
      queryId, 
      duration, 
      text: text.substring(0, 100),
      params: params?.length || 0
    })
    throw error
  }
}

// 导出事务函数
export const getClient = async (): Promise<PoolClient> => {
  try {
    const client = await pool.connect()
    logger.info('Database client acquired for transaction')
    return client
  } catch (error: any) {
    logger.error('Failed to acquire database client', error)
    throw error
  }
}

// 健康检查
export async function healthCheck(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1 as health_check')
    client.release()
    logger.info('Database health check passed')
    return true
  } catch (error: any) {
    logger.error('Database health check failed', error)
    return false
  }
}

// 改进的连接测试
export async function testConnection(): Promise<boolean> {
  try {
    logger.info('Starting database connection test')
    
    if (process.env.PGHOST) {
      logger.info('Using PostgreSQL environment variables', {
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        sslMode: process.env.PGSSLMODE
      })
    } else {
      logger.info('Using DATABASE_URL', {
        url: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@')
      })
    }
    
    const client = await pool.connect()
    logger.info('Client connected successfully')
    
    const result = await client.query('SELECT 1 as test, NOW() as current_time, version() as pg_version')
    logger.info('Test query executed successfully', {
      result: result.rows[0],
      connectionInfo: {
        processID: (client as any).processID,
        secretKey: (client as any).secretKey ? 'present' : 'absent'
      }
    })
    
    client.release()
    logger.info('Database connection test completed successfully')
    return true
  } catch (error: any) {
    logger.error('Database connection test failed', error, {
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      severity: error.severity
    })
    return false
  }
}

// 重试机制优化
async function retryOperation<T>(
  operation: () => Promise<T>, 
  maxRetries = 3, 
  initialDelay = 1000,
  backoffMultiplier = 2
): Promise<T> {
  let delay = initialDelay
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      if (i === maxRetries - 1) {
        logger.error('Max retries exceeded', error, { attempt: i + 1, maxRetries })
        throw error
      }
      
      logger.warn('Operation failed, retrying', {
        attempt: i + 1,
        maxRetries,
        delay,
        error: error.message
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= backoffMultiplier
    }
  }
  
  throw new Error('Max retries exceeded')
}

// 优化的数据库初始化
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Starting database initialization')
    
    // 首先测试连接
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('Cannot establish database connection')
    }
    
    // 使用重试机制创建表
    await retryOperation(async () => {
      logger.info('Creating database tables')
      
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
      
      logger.info('Creating database indexes')
      
      // 创建索引
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
        'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code)',
        'CREATE INDEX IF NOT EXISTS idx_discounts_status ON discounts(status)',
        'CREATE INDEX IF NOT EXISTS idx_payment_records_order_id ON payment_records(order_id)',
        'CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_payment_records_paid_at ON payment_records(paid_at)'
      ]
      
      for (const indexQuery of indexes) {
        await query(indexQuery)
      }
    }, 3, 2000) // 3次重试，2秒初始延迟
    
    logger.info('Database initialization completed successfully')
  } catch (error: any) {
    logger.error('Database initialization failed', error)
    throw error
  }
}

// 定期健康检查（可选）
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    const isHealthy = await healthCheck()
    if (!isHealthy) {
      logger.warn('Database health check failed - connection may be unstable')
    }
  }, 30000) // 每30秒检查一次
}

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database pool')
  await pool.end()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database pool')
  await pool.end()
  process.exit(0)
})

// 导出连接池（用于高级用例）
export { pool }

// 导出默认实例
const databaseImproved = {
  query,
  getClient,
  testConnection,
  healthCheck,
  initializeDatabase,
  pool
}

export default databaseImproved