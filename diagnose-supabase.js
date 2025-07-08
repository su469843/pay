require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const net = require('net');
const tls = require('tls');
const dns = require('dns').promises;

console.log('🔍 Supabase 连接诊断工具');
console.log('========================\n');

const host = process.env.PGHOST;
const port = 5432;
const database = process.env.PGDATABASE;
const user = process.env.PGUSER;
const password = process.env.PGPASSWORD;

console.log('📋 连接信息:');
console.log(`主机: ${host}`);
console.log(`端口: ${port}`);
console.log(`数据库: ${database}`);
console.log(`用户: ${user}`);
console.log(`密码: ${password ? '已设置 (' + password.length + ' 字符)' : '未设置'}`);
console.log('');

// 1. DNS 解析测试
async function testDNS() {
  console.log('🔄 测试 1: DNS 解析');
  try {
    const addresses = await dns.lookup(host);
    console.log('✅ DNS 解析成功:', addresses.address);
    return true;
  } catch (error) {
    console.log('❌ DNS 解析失败:', error.message);
    return false;
  }
}

// 2. TCP 连接测试
async function testTCP() {
  console.log('\n🔄 测试 2: TCP 连接');
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log('❌ TCP 连接超时 (10秒)');
      resolve(false);
    }, 10000);
    
    socket.connect(port, host, () => {
      clearTimeout(timeout);
      console.log('✅ TCP 连接成功');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ TCP 连接失败:', error.message);
      resolve(false);
    });
  });
}

// 3. TLS 连接测试
async function testTLS() {
  console.log('\n🔄 测试 3: TLS/SSL 连接');
  return new Promise((resolve) => {
    const options = {
      host: host,
      port: port,
      rejectUnauthorized: false,
      timeout: 10000
    };
    
    const socket = tls.connect(options, () => {
      console.log('✅ TLS 连接成功');
      console.log('   协议:', socket.getProtocol());
      console.log('   密码套件:', socket.getCipher()?.name || 'Unknown');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', (error) => {
      console.log('❌ TLS 连接失败:', error.message);
      resolve(false);
    });
    
    socket.on('timeout', () => {
      console.log('❌ TLS 连接超时');
      socket.destroy();
      resolve(false);
    });
  });
}

// 4. PostgreSQL 协议测试
async function testPostgreSQL() {
  console.log('\n🔄 测试 4: PostgreSQL 协议连接');
  
  const configs = [
    {
      name: '标准配置',
      config: {
        host,
        port,
        database,
        user,
        password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
        query_timeout: 10000
      }
    },
    {
      name: '无 SSL',
      config: {
        host,
        port,
        database,
        user,
        password,
        ssl: false,
        connectionTimeoutMillis: 15000
      }
    },
    {
      name: '宽松 SSL',
      config: {
        host,
        port,
        database,
        user,
        password,
        ssl: {
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined
        },
        connectionTimeoutMillis: 15000
      }
    },
    {
      name: '最小配置',
      config: {
        host,
        port,
        database,
        user,
        password,
        connectionTimeoutMillis: 30000
      }
    }
  ];
  
  for (const { name, config } of configs) {
    console.log(`\n   测试配置: ${name}`);
    const client = new Client(config);
    
    try {
      console.log('   连接中...');
      await client.connect();
      console.log('   ✅ 连接成功!');
      
      // 测试简单查询
      const result = await client.query('SELECT NOW() as current_time');
      console.log('   ✅ 查询成功:', result.rows[0].current_time);
      
      await client.end();
      console.log('   ✅ 连接正常关闭');
      return { success: true, config: name };
    } catch (error) {
      console.log('   ❌ 失败:', error.message);
      if (error.code) {
        console.log('   错误代码:', error.code);
      }
      try {
        await client.end();
      } catch (e) {}
    }
  }
  
  return { success: false };
}

// 5. 网络诊断
async function networkDiagnostics() {
  console.log('\n🔄 测试 5: 网络诊断');
  
  // 测试到 Google DNS 的连接
  console.log('   测试外网连接 (8.8.8.8:53)...');
  const googleTest = await new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);
    
    socket.connect(53, '8.8.8.8', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
  
  if (googleTest) {
    console.log('   ✅ 外网连接正常');
  } else {
    console.log('   ❌ 外网连接失败 - 可能存在防火墙或网络问题');
  }
  
  // 测试到其他 PostgreSQL 服务的连接
  console.log('   测试到 PostgreSQL 官方服务器的连接...');
  const pgTest = await new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);
    
    socket.connect(5432, 'postgresql.org', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
  
  if (pgTest) {
    console.log('   ✅ PostgreSQL 端口访问正常');
  } else {
    console.log('   ❌ PostgreSQL 端口可能被阻止');
  }
}

// 6. 环境检查
function checkEnvironment() {
  console.log('\n🔄 测试 6: 环境检查');
  
  console.log('   Node.js 版本:', process.version);
  
  try {
    const pgVersion = require('pg/package.json').version;
    console.log('   pg 模块版本:', pgVersion);
  } catch (e) {
    console.log('   ❌ 无法获取 pg 模块版本');
  }
  
  console.log('   操作系统:', process.platform);
  console.log('   架构:', process.arch);
  
  // 检查环境变量
  const requiredEnvs = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  
  if (missingEnvs.length === 0) {
    console.log('   ✅ 所有必需的环境变量都已设置');
  } else {
    console.log('   ❌ 缺少环境变量:', missingEnvs.join(', '));
  }
}

// 主函数
async function runDiagnostics() {
  console.log('🚀 开始 Supabase 连接诊断...\n');
  
  const results = {
    dns: await testDNS(),
    tcp: await testTCP(),
    tls: await testTLS(),
    postgresql: await testPostgreSQL()
  };
  
  await networkDiagnostics();
  checkEnvironment();
  
  console.log('\n📊 诊断结果汇总:');
  console.log('==================');
  console.log(`DNS 解析: ${results.dns ? '✅ 成功' : '❌ 失败'}`);
  console.log(`TCP 连接: ${results.tcp ? '✅ 成功' : '❌ 失败'}`);
  console.log(`TLS 连接: ${results.tls ? '✅ 成功' : '❌ 失败'}`);
  console.log(`PostgreSQL: ${results.postgresql.success ? '✅ 成功 (' + results.postgresql.config + ')' : '❌ 失败'}`);
  
  console.log('\n🔍 问题分析:');
  
  if (!results.dns) {
    console.log('❌ DNS 解析失败 - 检查网络连接或 DNS 设置');
  } else if (!results.tcp) {
    console.log('❌ TCP 连接失败 - 可能是防火墙阻止或服务器不可达');
  } else if (!results.tls) {
    console.log('❌ TLS 连接失败 - SSL/TLS 配置问题');
  } else if (!results.postgresql.success) {
    console.log('❌ PostgreSQL 协议失败 - 可能是认证问题或服务器配置');
  } else {
    console.log('✅ 所有测试通过 - 连接应该正常工作');
  }
  
  console.log('\n💡 建议:');
  if (!results.dns || !results.tcp) {
    console.log('1. 检查网络连接');
    console.log('2. 检查防火墙设置');
    console.log('3. 尝试使用不同的网络 (如手机热点)');
  }
  
  if (results.tcp && !results.tls) {
    console.log('1. 检查 SSL 证书');
    console.log('2. 尝试禁用 SSL 连接');
    console.log('3. 更新 Node.js 和 pg 模块');
  }
  
  if (results.tls && !results.postgresql.success) {
    console.log('1. 验证数据库凭据');
    console.log('2. 检查 Supabase 项目状态');
    console.log('3. 确认 IP 白名单设置');
    console.log('4. 联系 Supabase 支持');
  }
}

runDiagnostics().catch(console.error);