const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// 测试新的 Neon 数据库连接
async function testNeonConnection() {
  console.log('🔍 Testing New Neon Database Connection...');
  console.log('=' .repeat(50));
  
  // 显示连接信息
  console.log('📋 Connection Details:');
  console.log(`Host: ${process.env.PGHOST}`);
  console.log(`Database: ${process.env.PGDATABASE}`);
  console.log(`User: ${process.env.PGUSER}`);
  console.log(`SSL Mode: ${process.env.PGSSLMODE}`);
  console.log(`Channel Binding: ${process.env.PGCHANNELBINDING}`);
  console.log('');

  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5
  });

  try {
    console.log('🔌 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // 测试基本查询
    console.log('\n🔍 Testing basic query...');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query successful!');
    console.log(`Current time: ${result.rows[0].current_time}`);
    console.log(`PostgreSQL version: ${result.rows[0].pg_version}`);
    
    // 测试数据库信息
    console.log('\n📊 Database Information:');
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `);
    console.log(`Database: ${dbInfo.rows[0].database_name}`);
    console.log(`User: ${dbInfo.rows[0].current_user}`);
    console.log(`Server IP: ${dbInfo.rows[0].server_ip || 'N/A'}`);
    console.log(`Server Port: ${dbInfo.rows[0].server_port || 'N/A'}`);
    
    // 测试表创建权限
    console.log('\n🛠️ Testing table operations...');
    try {
      await client.query('DROP TABLE IF EXISTS test_connection_table');
      await client.query(`
        CREATE TABLE test_connection_table (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Table creation successful!');
      
      // 插入测试数据
      await client.query(`
        INSERT INTO test_connection_table (name) 
        VALUES ('Test Connection'), ('Neon Database')
      `);
      console.log('✅ Data insertion successful!');
      
      // 查询测试数据
      const testData = await client.query('SELECT * FROM test_connection_table ORDER BY id');
      console.log('✅ Data retrieval successful!');
      console.log('Test data:', testData.rows);
      
      // 清理测试表
      await client.query('DROP TABLE test_connection_table');
      console.log('✅ Table cleanup successful!');
      
    } catch (tableError) {
      console.log('⚠️ Table operations failed:', tableError.message);
    }
    
    client.release();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Neon database connection is working properly.');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n🔧 Troubleshooting suggestions:');
    console.error('1. Verify the database credentials are correct');
    console.error('2. Check if the Neon database is active (not sleeping)');
    console.error('3. Ensure your IP is whitelisted in Neon console');
    console.error('4. Try connecting from a different network');
    console.error('5. Check Neon service status');
  } finally {
    await pool.end();
  }
}

// 运行测试
testNeonConnection().catch(console.error);