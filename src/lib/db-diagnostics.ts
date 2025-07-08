// 数据库连接诊断工具

import { Pool } from 'pg'
import { testConnection } from './database'

// 诊断结果接口
export interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

// 数据库诊断类
export class DatabaseDiagnostics {
  private results: DiagnosticResult[] = []

  // 运行所有诊断测试
  async runDiagnostics(): Promise<DiagnosticResult[]> {
    this.results = []
    
    await this.checkEnvironmentVariables()
    await this.checkConnectionString()
    await this.checkNetworkConnectivity()
    await this.checkDatabaseConnection()
    await this.checkDatabasePermissions()
    
    return this.results
  }

  // 检查环境变量
  private async checkEnvironmentVariables() {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      this.addResult('Environment Variables', 'fail', 'DATABASE_URL 环境变量未设置')
      return
    }
    
    if (!databaseUrl.startsWith('postgresql://')) {
      this.addResult('Environment Variables', 'fail', 'DATABASE_URL 格式不正确，应以 postgresql:// 开头')
      return
    }
    
    this.addResult('Environment Variables', 'pass', 'DATABASE_URL 环境变量已正确设置')
  }

  // 检查连接字符串格式
  private async checkConnectionString() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) return
    
    try {
      const url = new URL(databaseUrl)
      
      const details = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1),
        username: url.username,
        hasPassword: !!url.password,
        searchParams: Object.fromEntries(url.searchParams)
      }
      
      // 检查必要的参数
      if (!url.hostname) {
        this.addResult('Connection String', 'fail', '缺少主机名', details)
        return
      }
      
      if (!url.username) {
        this.addResult('Connection String', 'fail', '缺少用户名', details)
        return
      }
      
      if (!url.password) {
        this.addResult('Connection String', 'warning', '缺少密码', details)
        return
      }
      
      if (!url.pathname || url.pathname === '/') {
        this.addResult('Connection String', 'fail', '缺少数据库名', details)
        return
      }
      
      // 检查SSL配置
      const sslMode = url.searchParams.get('sslmode')
      if (!sslMode) {
        this.addResult('Connection String', 'warning', '未指定SSL模式，建议添加 sslmode=require', details)
      } else if (sslMode === 'require') {
        this.addResult('Connection String', 'pass', '连接字符串格式正确，SSL已启用', details)
      } else {
        this.addResult('Connection String', 'warning', `SSL模式为 ${sslMode}，建议使用 require`, details)
      }
      
    } catch (error) {
      this.addResult('Connection String', 'fail', `连接字符串格式错误: ${error}`, { error: error.message })
    }
  }

  // 检查网络连接
  private async checkNetworkConnectivity() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) return
    
    try {
      const url = new URL(databaseUrl)
      const hostname = url.hostname
      const port = parseInt(url.port || '5432')
      
      // 尝试TCP连接
      const net = require('net')
      const socket = new net.Socket()
      
      const connectPromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          socket.destroy()
          resolve(false)
        }, 10000) // 10秒超时
        
        socket.connect(port, hostname, () => {
          clearTimeout(timeout)
          socket.destroy()
          resolve(true)
        })
        
        socket.on('error', () => {
          clearTimeout(timeout)
          resolve(false)
        })
      })
      
      const isConnectable = await connectPromise
      
      if (isConnectable) {
        this.addResult('Network Connectivity', 'pass', `成功连接到 ${hostname}:${port}`)
      } else {
        this.addResult('Network Connectivity', 'fail', `无法连接到 ${hostname}:${port}，请检查网络或防火墙设置`)
      }
      
    } catch (error) {
      this.addResult('Network Connectivity', 'fail', `网络连接测试失败: ${error}`, { error: error.message })
    }
  }

  // 检查数据库连接
  private async checkDatabaseConnection() {
    try {
      const isConnected = await testConnection()
      
      if (isConnected) {
        this.addResult('Database Connection', 'pass', '数据库连接成功')
      } else {
        this.addResult('Database Connection', 'fail', '数据库连接失败')
      }
      
    } catch (error) {
      this.addResult('Database Connection', 'fail', `数据库连接测试失败: ${error}`, { error: error.message })
    }
  }

  // 检查数据库权限
  private async checkDatabasePermissions() {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      })
      
      const client = await pool.connect()
      
      try {
        // 测试基本查询权限
        await client.query('SELECT version()')
        this.addResult('Database Permissions', 'pass', '具有基本查询权限')
        
        // 测试创建表权限
        await client.query('CREATE TABLE IF NOT EXISTS test_permissions_check (id SERIAL PRIMARY KEY)')
        await client.query('DROP TABLE IF EXISTS test_permissions_check')
        this.addResult('Database Permissions', 'pass', '具有创建和删除表权限')
        
      } catch (error) {
        this.addResult('Database Permissions', 'fail', `权限检查失败: ${error}`, { error: error.message })
      } finally {
        client.release()
        await pool.end()
      }
      
    } catch (error) {
      this.addResult('Database Permissions', 'fail', `无法连接数据库进行权限检查: ${error}`, { error: error.message })
    }
  }

  // 添加诊断结果
  private addResult(test: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    this.results.push({ test, status, message, details })
  }

  // 生成诊断报告
  static generateReport(results: DiagnosticResult[]): string {
    let report = '\n🔍 数据库连接诊断报告\n'
    report += '='.repeat(50) + '\n\n'
    
    const passCount = results.filter(r => r.status === 'pass').length
    const failCount = results.filter(r => r.status === 'fail').length
    const warningCount = results.filter(r => r.status === 'warning').length
    
    report += `📊 总结: ${passCount} 通过, ${failCount} 失败, ${warningCount} 警告\n\n`
    
    results.forEach((result, index) => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
      report += `${index + 1}. ${icon} ${result.test}\n`
      report += `   ${result.message}\n`
      
      if (result.details) {
        report += `   详细信息: ${JSON.stringify(result.details, null, 2)}\n`
      }
      
      report += '\n'
    })
    
    // 添加建议
    if (failCount > 0) {
      report += '💡 建议:\n'
      report += '- 检查网络连接和防火墙设置\n'
      report += '- 验证数据库连接字符串是否正确\n'
      report += '- 确认数据库服务器是否正在运行\n'
      report += '- 检查用户名和密码是否正确\n'
      report += '- 验证数据库名称是否存在\n'
    }
    
    return report
  }
}

// 快速诊断函数
export async function quickDiagnostics(): Promise<string> {
  const diagnostics = new DatabaseDiagnostics()
  const results = await diagnostics.runDiagnostics()
  return DatabaseDiagnostics.generateReport(results)
}