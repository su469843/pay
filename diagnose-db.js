// 数据库连接诊断脚本
const { Pool } = require('pg');
const net = require('net');
require('dotenv').config({ path: '.env.local' });

// 诊断结果类
class DiagnosticResult {
  constructor(test, status, message, details = null) {
    this.test = test;
    this.status = status; // 'pass', 'fail', 'warning'
    this.message = message;
    this.details = details;
  }
}

// 数据库诊断类
class DatabaseDiagnostics {
  constructor() {
    this.results = [];
  }

  // 运行所有诊断测试
  async runDiagnostics() {
    this.results = [];
    
    await this.checkEnvironmentVariables();
    await this.checkConnectionString();
    await this.checkNetworkConnectivity();
    await this.checkDatabaseConnection();
    await this.checkDatabasePermissions();
    
    return this.results;
  }

  // 检查环境变量
  async checkEnvironmentVariables() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      this.addResult('Environment Variables', 'fail', 'DATABASE_URL 环境变量未设置');
      return;
    }
    
    if (!databaseUrl.startsWith('postgresql://')) {
      this.addResult('Environment Variables', 'fail', 'DATABASE_URL 格式不正确，应以 postgresql:// 开头');
      return;
    }
    
    this.addResult('Environment Variables', 'pass', 'DATABASE_URL 环境变量已正确设置');
  }

  // 检查连接字符串格式
  async checkConnectionString() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return;
    
    try {
      const url = new URL(databaseUrl);
      
      const details = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1),
        username: url.username,
        hasPassword: !!url.password,
        searchParams: Object.fromEntries(url.searchParams)
      };
      
      // 检查必要的参数
      if (!url.hostname) {
        this.addResult('Connection String', 'fail', '缺少主机名', details);
        return;
      }
      
      if (!url.username) {
        this.addResult('Connection String', 'fail', '缺少用户名', details);
        return;
      }
      
      if (!url.password) {
        this.addResult('Connection String', 'warning', '缺少密码', details);
        return;
      }
      
      if (!url.pathname || url.pathname === '/') {
        this.addResult('Connection String', 'fail', '缺少数据库名', details);
        return;
      }
      
      // 检查SSL配置
      const sslMode = url.searchParams.get('sslmode');
      if (!sslMode) {
        this.addResult('Connection String', 'warning', '未指定SSL模式，建议添加 sslmode=require', details);
      } else if (sslMode === 'require') {
        this.addResult('Connection String', 'pass', '连接字符串格式正确，SSL已启用', details);
      } else {
        this.addResult('Connection String', 'warning', `SSL模式为 ${sslMode}，建议使用 require`, details);
      }
      
    } catch (error) {
      this.addResult('Connection String', 'fail', `连接字符串格式错误: ${error.message}`, { error: error.message });
    }
  }

  // 检查网络连接
  async checkNetworkConnectivity() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return;
    
    try {
      const url = new URL(databaseUrl);
      const hostname = url.hostname;
      const port = parseInt(url.port || '5432');
      
      // 尝试TCP连接
      const socket = new net.Socket();
      
      const connectPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 10000); // 10秒超时
        
        socket.connect(port, hostname, () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(true);
        });
        
        socket.on('error', (error) => {
          clearTimeout(timeout);
          console.log('Socket error:', error.message);
          resolve(false);
        });
      });
      
      const isConnectable = await connectPromise;
      
      if (isConnectable) {
        this.addResult('Network Connectivity', 'pass', `成功连接到 ${hostname}:${port}`);
      } else {
        this.addResult('Network Connectivity', 'fail', `无法连接到 ${hostname}:${port}，请检查网络或防火墙设置`);
      }
      
    } catch (error) {
      this.addResult('Network Connectivity', 'fail', `网络连接测试失败: ${error.message}`, { error: error.message });
    }
  }

  // 检查数据库连接
  async checkDatabaseConnection() {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
        max: 1
      });
      
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      
      this.addResult('Database Connection', 'pass', '数据库连接成功');
      
    } catch (error) {
      this.addResult('Database Connection', 'fail', `数据库连接失败: ${error.message}`, { 
        error: error.message,
        code: error.code,
        severity: error.severity
      });
    }
  }

  // 检查数据库权限
  async checkDatabasePermissions() {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
        max: 1
      });
      
      const client = await pool.connect();
      
      try {
        // 测试基本查询权限
        const versionResult = await client.query('SELECT version()');
        this.addResult('Database Permissions', 'pass', '具有基本查询权限', {
          version: versionResult.rows[0].version
        });
        
        // 测试创建表权限
        await client.query('CREATE TABLE IF NOT EXISTS test_permissions_check (id SERIAL PRIMARY KEY)');
        await client.query('DROP TABLE IF EXISTS test_permissions_check');
        this.addResult('Database Permissions', 'pass', '具有创建和删除表权限');
        
      } catch (error) {
        this.addResult('Database Permissions', 'fail', `权限检查失败: ${error.message}`, { 
          error: error.message,
          code: error.code
        });
      } finally {
        client.release();
        await pool.end();
      }
      
    } catch (error) {
      this.addResult('Database Permissions', 'fail', `无法连接数据库进行权限检查: ${error.message}`, { 
        error: error.message 
      });
    }
  }

  // 添加诊断结果
  addResult(test, status, message, details = null) {
    this.results.push(new DiagnosticResult(test, status, message, details));
  }

  // 生成诊断报告
  static generateReport(results) {
    let report = '\n🔍 数据库连接诊断报告\n';
    report += '='.repeat(50) + '\n\n';
    
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    
    report += `📊 总结: ${passCount} 通过, ${failCount} 失败, ${warningCount} 警告\n\n`;
    
    results.forEach((result, index) => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      report += `${index + 1}. ${icon} ${result.test}\n`;
      report += `   ${result.message}\n`;
      
      if (result.details) {
        report += `   详细信息: ${JSON.stringify(result.details, null, 2)}\n`;
      }
      
      report += '\n';
    });
    
    // 添加建议
    if (failCount > 0) {
      report += '💡 建议:\n';
      report += '- 检查网络连接和防火墙设置\n';
      report += '- 验证数据库连接字符串是否正确\n';
      report += '- 确认数据库服务器是否正在运行\n';
      report += '- 检查用户名和密码是否正确\n';
      report += '- 验证数据库名称是否存在\n';
      report += '- 如果使用Neon数据库，确认项目未暂停\n';
    }
    
    return report;
  }
}

// 主函数
async function main() {
  console.log('🔍 开始数据库连接诊断...');
  console.log(`📂 当前目录: ${process.cwd()}`);
  console.log(`🔧 DATABASE_URL: ${process.env.DATABASE_URL ? '已设置' : '未设置'}\n`);
  
  try {
    const diagnostics = new DatabaseDiagnostics();
    const results = await diagnostics.runDiagnostics();
    const report = DatabaseDiagnostics.generateReport(results);
    
    console.log(report);
    
    // 保存报告到文件
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'db-diagnostic-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 报告已保存到: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ 诊断过程中出现错误:', error);
  }
}

// 运行诊断
main();