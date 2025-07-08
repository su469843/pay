require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// 检测是否为Neon数据库
const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech') || false;
console.log('Is Neon Database:', isNeonDatabase);

// 清理DATABASE_URL
let cleanDatabaseUrl = process.env.DATABASE_URL;
if (isNeonDatabase && cleanDatabaseUrl) {
  console.log('Original URL:', cleanDatabaseUrl.replace(/:[^:@]*@/, ':***@'));
  
  // 移除channel_binding参数
  cleanDatabaseUrl = cleanDatabaseUrl.replace(/[&?]channel_binding=require/g, '');
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
  
  console.log('Cleaned URL:', cleanDatabaseUrl.replace(/:[^:@]*@/, ':***@'));
}

// 创建连接池
const pool = new Pool({
  connectionString: cleanDatabaseUrl,
  ssl: isNeonDatabase ? {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  } : false,
  max: 3,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

// 测试连接
async function testConnection() {
  try {
    console.log('\n🔍 Testing database connection...');
    
    const client = await pool.connect();
    console.log('✅ Client connected successfully');
    
    const result = await client.query('SELECT 1 as test, NOW() as current_time');
    console.log('✅ Query result:', result.rows[0]);
    
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