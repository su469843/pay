require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const tls = require('tls');
const https = require('https');

console.log('🔧 Windows TLS 修复工具');
console.log('======================\n');

const host = process.env.PGHOST;
const port = 5432;
const database = process.env.PGDATABASE;
const user = process.env.PGUSER;
const password = process.env.PGPASSWORD;

// 1. 测试不同的 TLS 版本
async function testTLSVersions() {
  console.log('🔄 测试 1: 不同 TLS 版本');
  
  const tlsVersions = [
    { name: 'TLSv1.3', version: 'TLSv1.3' },
    { name: 'TLSv1.2', version: 'TLSv1.2' },
    { name: 'TLSv1.1', version: 'TLSv1.1' },
    { name: 'TLSv1', version: 'TLSv1' }
  ];
  
  for (const { name, version } of tlsVersions) {
    console.log(`\n   测试 ${name}...`);
    
    try {
      const client = new Client({
        host,
        port,
        database,
        user,
        password,
        ssl: {
          rejectUnauthorized: false,
          secureProtocol: version + '_method',
          checkServerIdentity: () => undefined
        },
        connectionTimeoutMillis: 10000
      });
      
      await client.connect();
      console.log(`   ✅ ${name} 连接成功!`);
      
      const result = await client.query('SELECT NOW()');
      console.log(`   ✅ 查询成功:`, result.rows[0]);
      
      await client.end();
      return { success: true, version: name };
    } catch (error) {
      console.log(`   ❌ ${name} 失败:`, error.message);
    }
  }
  
  return { success: false };
}

// 2. 测试不同的密码套件
async function testCipherSuites() {
  console.log('\n🔄 测试 2: 不同密码套件');
  
  const cipherSuites = [
    {
      name: '现代密码套件',
      ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS'
    },
    {
      name: '兼容密码套件',
      ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
    },
    {
      name: '宽松密码套件',
      ciphers: 'ALL:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5'
    }
  ];
  
  for (const { name, ciphers } of cipherSuites) {
    console.log(`\n   测试 ${name}...`);
    
    try {
      const client = new Client({
        host,
        port,
        database,
        user,
        password,
        ssl: {
          rejectUnauthorized: false,
          ciphers: ciphers,
          checkServerIdentity: () => undefined
        },
        connectionTimeoutMillis: 10000
      });
      
      await client.connect();
      console.log(`   ✅ ${name} 连接成功!`);
      
      await client.end();
      return { success: true, ciphers: name };
    } catch (error) {
      console.log(`   ❌ ${name} 失败:`, error.message);
    }
  }
  
  return { success: false };
}

// 3. 测试 Windows 特定的 TLS 设置
async function testWindowsSpecific() {
  console.log('\n🔄 测试 3: Windows 特定设置');
  
  const configs = [
    {
      name: 'Windows 兼容模式',
      ssl: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT
      }
    },
    {
      name: '禁用 SNI',
      ssl: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        servername: undefined
      }
    },
    {
      name: '强制 IPv4',
      ssl: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined
      },
      family: 4
    },
    {
      name: '最小 TLS 设置',
      ssl: {
        rejectUnauthorized: false,
        requestCert: false,
        agent: false
      }
    }
  ];
  
  for (const { name, ssl, ...otherOptions } of configs) {
    console.log(`\n   测试 ${name}...`);
    
    try {
      const client = new Client({
        host,
        port,
        database,
        user,
        password,
        ssl,
        connectionTimeoutMillis: 10000,
        ...otherOptions
      });
      
      await client.connect();
      console.log(`   ✅ ${name} 连接成功!`);
      
      await client.end();
      return { success: true, config: name };
    } catch (error) {
      console.log(`   ❌ ${name} 失败:`, error.message);
    }
  }
  
  return { success: false };
}

// 4. 测试原生 TLS 连接
async function testNativeTLS() {
  console.log('\n🔄 测试 4: 原生 TLS 连接');
  
  return new Promise((resolve) => {
    const options = {
      host: host,
      port: port,
      rejectUnauthorized: false,
      timeout: 10000,
      checkServerIdentity: () => undefined
    };
    
    console.log('   尝试原生 TLS 连接...');
    
    const socket = tls.connect(options, () => {
      console.log('   ✅ 原生 TLS 连接成功!');
      console.log('   协议:', socket.getProtocol());
      console.log('   密码套件:', socket.getCipher()?.name || 'Unknown');
      
      // 尝试发送 PostgreSQL 启动消息
      const startupMessage = Buffer.alloc(8);
      startupMessage.writeInt32BE(8, 0); // 消息长度
      startupMessage.writeInt32BE(196608, 4); // 协议版本 3.0
      
      socket.write(startupMessage);
      
      socket.on('data', (data) => {
        console.log('   ✅ 收到服务器响应:', data.length, '字节');
        socket.destroy();
        resolve({ success: true });
      });
      
      setTimeout(() => {
        console.log('   ❌ 服务器响应超时');
        socket.destroy();
        resolve({ success: false });
      }, 5000);
    });
    
    socket.on('error', (error) => {
      console.log('   ❌ 原生 TLS 连接失败:', error.message);
      resolve({ success: false });
    });
    
    socket.on('timeout', () => {
      console.log('   ❌ 原生 TLS 连接超时');
      socket.destroy();
      resolve({ success: false });
    });
  });
}

// 5. 测试 HTTPS 连接到 Supabase API
async function testSupabaseAPI() {
  console.log('\n🔄 测试 5: Supabase API 连接');
  
  // 从数据库主机推断 API 端点
  const apiHost = host.replace('db.', 'api.');
  const apiUrl = `https://${apiHost}/rest/v1/`;
  
  console.log(`   测试 API 端点: ${apiUrl}`);
  
  return new Promise((resolve) => {
    const req = https.get(apiUrl, {
      timeout: 10000,
      rejectUnauthorized: false
    }, (res) => {
      console.log('   ✅ HTTPS API 连接成功!');
      console.log('   状态码:', res.statusCode);
      console.log('   TLS 版本:', res.socket?.getProtocol?.());
      resolve({ success: true });
    });
    
    req.on('error', (error) => {
      console.log('   ❌ HTTPS API 连接失败:', error.message);
      resolve({ success: false });
    });
    
    req.on('timeout', () => {
      console.log('   ❌ HTTPS API 连接超时');
      req.destroy();
      resolve({ success: false });
    });
  });
}

// 6. 生成修复建议
function generateFixSuggestions(results) {
  console.log('\n💡 修复建议:');
  console.log('============');
  
  if (results.tlsVersions.success) {
    console.log(`✅ 使用 ${results.tlsVersions.version} 可以连接`);
    console.log('   建议在应用中固定使用此 TLS 版本');
  }
  
  if (results.cipherSuites.success) {
    console.log(`✅ 使用 ${results.cipherSuites.ciphers} 可以连接`);
    console.log('   建议在应用中使用此密码套件配置');
  }
  
  if (results.windowsSpecific.success) {
    console.log(`✅ 使用 ${results.windowsSpecific.config} 可以连接`);
    console.log('   建议在应用中使用此 Windows 特定配置');
  }
  
  if (!results.tlsVersions.success && !results.cipherSuites.success && !results.windowsSpecific.success) {
    console.log('❌ 所有 TLS 配置都失败了');
    console.log('\n可能的解决方案:');
    console.log('1. 更新 Windows 系统和证书');
    console.log('2. 检查企业防火墙或代理设置');
    console.log('3. 尝试使用 VPN 或不同的网络');
    console.log('4. 联系系统管理员检查 TLS 策略');
    console.log('5. 考虑使用 Supabase 的连接池或 API 替代直连');
  }
  
  if (results.supabaseAPI.success && !results.nativeTLS.success) {
    console.log('\n🔍 特殊情况: HTTPS API 可用但数据库 TLS 不可用');
    console.log('   建议: 考虑使用 Supabase 的 REST API 或 GraphQL API');
    console.log('   而不是直接的 PostgreSQL 连接');
  }
}

// 主函数
async function runTLSFix() {
  console.log('🚀 开始 Windows TLS 修复...\n');
  
  const results = {
    tlsVersions: await testTLSVersions(),
    cipherSuites: await testCipherSuites(),
    windowsSpecific: await testWindowsSpecific(),
    nativeTLS: await testNativeTLS(),
    supabaseAPI: await testSupabaseAPI()
  };
  
  console.log('\n📊 测试结果汇总:');
  console.log('==================');
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    const detail = result.version || result.ciphers || result.config || '';
    console.log(`${test}: ${status} ${detail}`);
  });
  
  generateFixSuggestions(results);
  
  // 如果找到可用的配置，生成示例代码
  const workingConfigs = Object.entries(results)
    .filter(([_, result]) => result.success)
    .map(([test, result]) => ({ test, ...result }));
  
  if (workingConfigs.length > 0) {
    console.log('\n📝 可用的配置示例:');
    console.log('==================');
    
    workingConfigs.forEach(config => {
      console.log(`\n// ${config.test} 配置`);
      console.log('const client = new Client({');
      console.log('  host: process.env.PGHOST,');
      console.log('  port: 5432,');
      console.log('  database: process.env.PGDATABASE,');
      console.log('  user: process.env.PGUSER,');
      console.log('  password: process.env.PGPASSWORD,');
      
      if (config.version) {
        console.log('  ssl: {');
        console.log('    rejectUnauthorized: false,');
        console.log(`    secureProtocol: '${config.version}_method',`);
        console.log('    checkServerIdentity: () => undefined');
        console.log('  },');
      } else if (config.ciphers) {
        console.log('  ssl: {');
        console.log('    rejectUnauthorized: false,');
        console.log(`    ciphers: '${config.ciphers}',`);
        console.log('    checkServerIdentity: () => undefined');
        console.log('  },');
      }
      
      console.log('  connectionTimeoutMillis: 10000');
      console.log('});');
    });
  }
}

runTLSFix().catch(console.error);