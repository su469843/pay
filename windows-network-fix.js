require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');
const { Client } = require('pg');
const https = require('https');
const http = require('http');

console.log('🔧 Windows 网络连接修复工具');
console.log('============================\n');

// 1. 检查系统代理设置
function checkProxySettings() {
  console.log('🔄 检查 1: 系统代理设置');
  
  try {
    // 检查环境变量中的代理设置
    const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy'];
    const foundProxies = proxyVars.filter(varName => process.env[varName]);
    
    if (foundProxies.length > 0) {
      console.log('   ⚠️  发现代理设置:');
      foundProxies.forEach(varName => {
        console.log(`     ${varName}: ${process.env[varName]}`);
      });
      console.log('   💡 建议: 尝试临时禁用代理或配置代理例外');
    } else {
      console.log('   ✅ 未发现环境变量代理设置');
    }
    
    // 检查 Windows 系统代理
    try {
      const proxyInfo = execSync('netsh winhttp show proxy', { encoding: 'utf8' });
      console.log('   Windows 系统代理信息:');
      console.log('  ', proxyInfo.replace(/\n/g, '\n   '));
    } catch (e) {
      console.log('   ❌ 无法获取 Windows 代理信息');
    }
    
  } catch (error) {
    console.log('   ❌ 检查代理设置时出错:', error.message);
  }
}

// 2. 检查防火墙设置
function checkFirewallSettings() {
  console.log('\n🔄 检查 2: 防火墙设置');
  
  try {
    // 检查 Windows 防火墙状态
    const firewallStatus = execSync('netsh advfirewall show allprofiles state', { encoding: 'utf8' });
    console.log('   Windows 防火墙状态:');
    console.log('  ', firewallStatus.replace(/\n/g, '\n   '));
    
    // 检查端口 5432 是否被阻止
    try {
      const portCheck = execSync('netstat -an | findstr :5432', { encoding: 'utf8' });
      if (portCheck.trim()) {
        console.log('   ✅ 端口 5432 有活动连接');
        console.log('  ', portCheck.replace(/\n/g, '\n   '));
      } else {
        console.log('   ⚠️  端口 5432 无活动连接');
      }
    } catch (e) {
      console.log('   ⚠️  端口 5432 无活动连接');
    }
    
  } catch (error) {
    console.log('   ❌ 检查防火墙设置时出错:', error.message);
  }
}

// 3. 检查 DNS 设置
function checkDNSSettings() {
  console.log('\n🔄 检查 3: DNS 设置');
  
  try {
    // 检查当前 DNS 服务器
    const dnsInfo = execSync('nslookup db.xvdllqhvqltrvkbhatyq.supabase.co', { encoding: 'utf8' });
    console.log('   DNS 解析结果:');
    console.log('  ', dnsInfo.replace(/\n/g, '\n   '));
    
    // 尝试使用不同的 DNS 服务器
    console.log('\n   测试不同 DNS 服务器:');
    const dnsServers = ['8.8.8.8', '1.1.1.1', '208.67.222.222'];
    
    for (const dns of dnsServers) {
      try {
        const result = execSync(`nslookup db.xvdllqhvqltrvkbhatyq.supabase.co ${dns}`, { encoding: 'utf8' });
        console.log(`   ✅ ${dns}: 解析成功`);
      } catch (e) {
        console.log(`   ❌ ${dns}: 解析失败`);
      }
    }
    
  } catch (error) {
    console.log('   ❌ 检查 DNS 设置时出错:', error.message);
  }
}

// 4. 测试无代理连接
async function testWithoutProxy() {
  console.log('\n🔄 检查 4: 无代理连接测试');
  
  // 临时清除代理环境变量
  const originalProxies = {};
  const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];
  
  proxyVars.forEach(varName => {
    if (process.env[varName]) {
      originalProxies[varName] = process.env[varName];
      delete process.env[varName];
    }
  });
  
  try {
    console.log('   临时禁用代理设置...');
    
    // 测试 HTTPS 连接
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      timeout: 10000
    });
    
    const testUrl = 'https://www.google.com';
    console.log(`   测试 HTTPS 连接到 ${testUrl}...`);
    
    const httpsTest = await new Promise((resolve) => {
      const req = https.get(testUrl, { agent: httpsAgent, timeout: 10000 }, (res) => {
        console.log('   ✅ HTTPS 连接成功 (状态码:', res.statusCode, ')');
        resolve(true);
      });
      
      req.on('error', (error) => {
        console.log('   ❌ HTTPS 连接失败:', error.message);
        resolve(false);
      });
      
      req.on('timeout', () => {
        console.log('   ❌ HTTPS 连接超时');
        req.destroy();
        resolve(false);
      });
    });
    
    if (httpsTest) {
      // 如果 HTTPS 连接成功，尝试数据库连接
      console.log('   测试数据库连接...');
      
      const client = new Client({
        host: process.env.PGHOST,
        port: 5432,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 15000
      });
      
      try {
        await client.connect();
        console.log('   ✅ 数据库连接成功!');
        
        const result = await client.query('SELECT NOW()');
        console.log('   ✅ 查询成功:', result.rows[0]);
        
        await client.end();
        return { success: true, method: '无代理连接' };
      } catch (error) {
        console.log('   ❌ 数据库连接失败:', error.message);
      }
    }
    
  } finally {
    // 恢复原始代理设置
    Object.entries(originalProxies).forEach(([varName, value]) => {
      process.env[varName] = value;
    });
  }
  
  return { success: false };
}

// 5. 测试使用 HTTP 隧道
async function testHTTPTunnel() {
  console.log('\n🔄 检查 5: HTTP 隧道连接');
  
  try {
    // 创建 HTTP 代理隧道到 PostgreSQL
    const tunnelAgent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
      timeout: 15000
    });
    
    console.log('   尝试通过 HTTP 隧道连接...');
    
    const client = new Client({
      host: process.env.PGHOST,
      port: 5432,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        agent: tunnelAgent
      },
      connectionTimeoutMillis: 20000
    });
    
    await client.connect();
    console.log('   ✅ HTTP 隧道连接成功!');
    
    await client.end();
    return { success: true, method: 'HTTP 隧道' };
    
  } catch (error) {
    console.log('   ❌ HTTP 隧道连接失败:', error.message);
    return { success: false };
  }
}

// 6. 系统级修复建议
function generateSystemFixes() {
  console.log('\n💡 系统级修复建议:');
  console.log('==================');
  
  console.log('\n1. 🔧 Windows 网络重置:');
  console.log('   netsh winsock reset');
  console.log('   netsh int ip reset');
  console.log('   ipconfig /flushdns');
  console.log('   重启计算机');
  
  console.log('\n2. 🔧 TLS/SSL 修复:');
  console.log('   sfc /scannow');
  console.log('   dism /online /cleanup-image /restorehealth');
  
  console.log('\n3. 🔧 证书存储修复:');
  console.log('   certlm.msc (检查证书)');
  console.log('   清理过期或无效证书');
  
  console.log('\n4. 🔧 防火墙例外:');
  console.log('   添加 Node.js 到防火墙例外');
  console.log('   允许端口 5432 出站连接');
  
  console.log('\n5. 🔧 代理配置:');
  console.log('   如果使用企业代理，配置代理例外:');
  console.log('   *.supabase.co');
  console.log('   db.xvdllqhvqltrvkbhatyq.supabase.co');
  
  console.log('\n6. 🔧 替代方案:');
  console.log('   考虑使用 Supabase JavaScript 客户端');
  console.log('   通过 REST API 而不是直接 PostgreSQL 连接');
  console.log('   使用 Supabase 的连接池服务');
}

// 7. 生成临时解决方案
function generateWorkarounds() {
  console.log('\n🚀 临时解决方案:');
  console.log('================');
  
  console.log('\n方案 1: 使用 Supabase JavaScript 客户端');
  console.log('```javascript');
  console.log('import { createClient } from \'@supabase/supabase-js\'');
  console.log('');
  console.log('const supabaseUrl = \'https://xvdllqhvqltrvkbhatyq.supabase.co\'');
  console.log('const supabaseKey = \'your-anon-key\'');
  console.log('const supabase = createClient(supabaseUrl, supabaseKey)');
  console.log('');
  console.log('// 使用 Supabase 客户端进行数据库操作');
  console.log('const { data, error } = await supabase');
  console.log('  .from(\'your_table\')');
  console.log('  .select(\'*\')');
  console.log('```');
  
  console.log('\n方案 2: 使用本地 SQLite 开发');
  console.log('```javascript');
  console.log('// 安装: npm install sqlite3');
  console.log('const sqlite3 = require(\'sqlite3\').verbose();');
  console.log('const db = new sqlite3.Database(\'./dev.db\');');
  console.log('```');
  
  console.log('\n方案 3: 使用 Docker PostgreSQL');
  console.log('```bash');
  console.log('docker run --name postgres-dev -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres');
  console.log('```');
}

// 主函数
async function runNetworkFix() {
  console.log('🚀 开始 Windows 网络诊断和修复...\n');
  
  // 运行所有检查
  checkProxySettings();
  checkFirewallSettings();
  checkDNSSettings();
  
  const results = {
    withoutProxy: await testWithoutProxy(),
    httpTunnel: await testHTTPTunnel()
  };
  
  console.log('\n📊 测试结果汇总:');
  console.log('==================');
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    const method = result.method || '';
    console.log(`${test}: ${status} ${method}`);
  });
  
  const successfulMethods = Object.values(results).filter(r => r.success);
  
  if (successfulMethods.length > 0) {
    console.log('\n🎉 找到可用的连接方法!');
    successfulMethods.forEach(method => {
      console.log(`✅ ${method.method} 可以正常工作`);
    });
  } else {
    console.log('\n❌ 所有连接方法都失败了');
    generateSystemFixes();
    generateWorkarounds();
  }
}

runNetworkFix().catch(console.error);