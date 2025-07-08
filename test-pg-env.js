require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

console.log('Testing with PostgreSQL environment variables...');
console.log('PGHOST:', process.env.PGHOST);
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGUSER:', process.env.PGUSER);
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '***' : 'undefined');
console.log('PGSSLMODE:', process.env.PGSSLMODE);
console.log('PGCHANNELBINDING:', process.env.PGCHANNELBINDING);

// 使用环境变量而不是连接字符串
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

// 测试连接
async function testConnection() {
  try {
    console.log('\n🔍 Testing database connection with PG environment variables...');
    
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
    await client.query(`INSERT INTO test_table (name) VALUES ('test_pg_env')`);
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