require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

// 改进的数据库配置（基于新的最佳实践）
const isNeonDatabase = (process.env.PGHOST?.includes('neon.tech') || process.env.DATABASE_URL?.includes('neon.tech')) || false

const dbConfig = {
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
}

console.log('🔧 Testing improved database configuration...')
console.log('Configuration:', {
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  sslMode: process.env.PGSSLMODE,
  isNeon: isNeonDatabase,
  poolConfig: {
    max: dbConfig.max,
    min: dbConfig.min,
    connectionTimeout: dbConfig.connectionTimeoutMillis,
    idleTimeout: dbConfig.idleTimeoutMillis
  }
})

async function testImprovedConnection() {
  const pool = new Pool(dbConfig)
  
  try {
    console.log('\n📡 Attempting to connect with improved configuration...')
    
    // 测试连接
    const client = await pool.connect()
    console.log('✅ Connection established successfully')
    
    // 测试基本查询
    const result = await client.query('SELECT 1 as test, NOW() as current_time, version() as pg_version')
    console.log('✅ Test query executed successfully:')
    console.log('  - Test value:', result.rows[0].test)
    console.log('  - Current time:', result.rows[0].current_time)
    console.log('  - PostgreSQL version:', result.rows[0].pg_version.split(' ')[0])
    
    // 测试表创建（简单测试）
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_time TIMESTAMP DEFAULT NOW(),
        message TEXT
      )
    `)
    console.log('✅ Test table created successfully')
    
    // 插入测试数据
    const insertResult = await client.query(
      'INSERT INTO connection_test (message) VALUES ($1) RETURNING id, test_time',
      ['Connection test successful']
    )
    console.log('✅ Test data inserted:', insertResult.rows[0])
    
    // 查询测试数据
    const selectResult = await client.query(
      'SELECT * FROM connection_test ORDER BY test_time DESC LIMIT 1'
    )
    console.log('✅ Test data retrieved:', selectResult.rows[0])
    
    // 清理测试数据
    await client.query('DROP TABLE IF EXISTS connection_test')
    console.log('✅ Test table cleaned up')
    
    client.release()
    console.log('✅ Connection released successfully')
    
    await pool.end()
    console.log('✅ Pool closed successfully')
    
    console.log('\n🎉 All tests passed! The improved configuration works correctly.')
    return true
    
  } catch (error) {
    console.error('\n❌ Connection test failed:')
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('Error detail:', error.detail)
    console.error('Error hint:', error.hint)
    console.error('Error stack:', error.stack)
    
    try {
      await pool.end()
    } catch (closeError) {
      console.error('Error closing pool:', closeError.message)
    }
    
    return false
  }
}

// 运行测试
testImprovedConnection()
  .then(success => {
    if (success) {
      console.log('\n✨ Database connection test completed successfully!')
      process.exit(0)
    } else {
      console.log('\n💥 Database connection test failed!')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('\n🚨 Unexpected error:', error)
    process.exit(1)
  })

// 超时保护
setTimeout(() => {
  console.error('\n⏰ Test timeout after 2 minutes')
  process.exit(1)
}, 120000)