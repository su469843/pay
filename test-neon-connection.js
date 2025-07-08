// Neon数据库连接测试脚本
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// 专门为Neon数据库优化的配置
const neonConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    // Neon特定配置
    sslmode: 'require'
  },
  // 针对Neon的连接池配置
  max: 1, // Neon建议使用较少的连接
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 10000,
  createTimeoutMillis: 10000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
};

async function testNeonConnection() {
  console.log('🔍 测试Neon数据库连接...');
  console.log(`📂 DATABASE_URL: ${process.env.DATABASE_URL ? '已设置' : '未设置'}`);
  
  let pool;
  
  try {
    // 创建连接池
    pool = new Pool(neonConfig);
    
    console.log('⏳ 尝试连接到数据库...');
    
    // 获取客户端连接
    const client = await pool.connect();
    console.log('✅ 成功获取数据库连接');
    
    // 测试基本查询
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('✅ 基本查询成功');
    console.log('📊 数据库信息:');
    console.log(`   版本: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    console.log(`   数据库: ${result.rows[0].current_database}`);
    console.log(`   用户: ${result.rows[0].current_user}`);
    
    // 测试表创建权限
    console.log('⏳ 测试表创建权限...');
    await client.query('CREATE TABLE IF NOT EXISTS test_connection (id SERIAL PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    console.log('✅ 表创建权限正常');
    
    // 测试数据插入
    console.log('⏳ 测试数据插入...');
    await client.query('INSERT INTO test_connection DEFAULT VALUES');
    console.log('✅ 数据插入成功');
    
    // 测试数据查询
    console.log('⏳ 测试数据查询...');
    const testResult = await client.query('SELECT COUNT(*) as count FROM test_connection');
    console.log(`✅ 数据查询成功，表中有 ${testResult.rows[0].count} 条记录`);
    
    // 清理测试表
    await client.query('DROP TABLE IF EXISTS test_connection');
    console.log('✅ 测试表清理完成');
    
    // 释放连接
    client.release();
    console.log('✅ 连接已释放');
    
    console.log('\n🎉 所有测试通过！Neon数据库连接正常');
    
  } catch (error) {
    console.error('❌ 连接测试失败:');
    console.error(`   错误类型: ${error.constructor.name}`);
    console.error(`   错误消息: ${error.message}`);
    
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    
    if (error.severity) {
      console.error(`   严重程度: ${error.severity}`);
    }
    
    // 常见错误的解决建议
    if (error.message.includes('Connection terminated')) {
      console.log('\n💡 建议:');
      console.log('   - 检查Neon项目是否处于活跃状态');
      console.log('   - 验证连接字符串是否正确');
      console.log('   - 确认SSL配置是否正确');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 建议:');
      console.log('   - 增加连接超时时间');
      console.log('   - 检查网络连接');
      console.log('   - 确认防火墙设置');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 建议:');
      console.log('   - 检查用户名和密码');
      console.log('   - 验证数据库名称');
      console.log('   - 确认用户权限');
    }
    
  } finally {
    // 确保连接池关闭
    if (pool) {
      try {
        await pool.end();
        console.log('✅ 连接池已关闭');
      } catch (closeError) {
        console.error('❌ 关闭连接池时出错:', closeError.message);
      }
    }
  }
}

// 运行测试
testNeonConnection();