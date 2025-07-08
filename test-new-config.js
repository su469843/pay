require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// 检测是否为Neon数据库
const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech') || false;
console.log('Is Neon Database:', isNeonDatabase);

// 使用原始DATABASE_URL，保留所有参数
let cleanDatabaseUrl = process.env.DATABASE_URL;
if (isNeonDatabase && cleanDatabaseUrl) {
  console.log('Original URL:', cleanDatabaseUrl.replace(/:[^:@]*@/, ':***@'));
  
  // 确保包含必要的SSL模式
  if (!cleanDatabaseUrl.includes('sslmode=require')) {
    cleanDatabaseUrl += cleanDatabaseUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }
  
  // 添加endpoint参数
  const endpointMatch = cleanDatabaseUrl.match(/@(ep-[^-]+-[^-]+-[^-]+)-pooler/);
  if (endpointMatch) {
    const endpointId = endpointMatch[1];
    console.log('Extracted endpoint ID:', endpointId);
    if (!cleanDatabaseUrl.includes('options=endpoint')) {
      cleanDatabaseUrl += cleanDatabaseUrl.includes('?') ? '&options=endpoint%3D' + endpointId : '?options=endpoint%3D' + endpointId;
    }
  }
  
  console.log('Final URL:', cleanDatabaseUrl.replace(/:[^:@]*@/, ':***@'));
}

// 创建连接池
const pool = new Pool({
  connectionString: cleanDatabaseUrl,
  ssl: isNeonDatabase ? {
    rejectUnauthorized: false
  } : false,
  max: 5,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

// 测试连接
async function testConnection() {
  try {
    console.log('\n🔍 Testing database connection with new configuration...');
    
    const client = await pool.connect();
    console.log('✅ Client connected successfully');
    
    const result = await client.query('SELECT 1 as test, NOW() as current_time, version() as pg_version');
    console.log('✅ Query result:', result.rows[0]);
    
    // 测试创建表
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Test table created successfully');
    
    // 插入测试数据
    await client.query(`INSERT INTO test_table (name) VALUES ('test_connection')`);
    console.log('✅ Test data inserted successfully');
    
    // 查询测试数据
    const testResult = await client.query('SELECT * FROM test_table ORDER BY id DESC LIMIT 1');
    console.log('✅ Test data retrieved:', testResult.rows[0]);
    
    // 清理测试表
    await client.query('DROP TABLE IF EXISTS test_table');
    console.log('✅ Test table cleaned up');
    
    client.release();
    console.log('✅ Connection test successful!');
    
    await pool.end();
    console.log('✅ Pool closed');
    
  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.detail) console.error('Error detail:', error.detail);
    if (error.hint) console.error('Error hint:', error.hint);
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();