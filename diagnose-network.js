require('dotenv').config({ path: '.env.local' })
const net = require('net')
const tls = require('tls')
const { URL } = require('url')

// 网络诊断工具
class NetworkDiagnostics {
  constructor() {
    this.host = process.env.PGHOST
    this.port = parseInt(process.env.PGPORT || '5432')
    this.database = process.env.PGDATABASE
    this.user = process.env.PGUSER
    this.password = process.env.PGPASSWORD
  }

  // 测试基本TCP连接
  async testTcpConnection() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Testing TCP connection to ${this.host}:${this.port}...`)
      
      const socket = new net.Socket()
      const timeout = setTimeout(() => {
        socket.destroy()
        reject(new Error('TCP connection timeout'))
      }, 10000)

      socket.connect(this.port, this.host, () => {
        clearTimeout(timeout)
        console.log('✅ TCP connection successful')
        socket.destroy()
        resolve(true)
      })

      socket.on('error', (error) => {
        clearTimeout(timeout)
        console.error('❌ TCP connection failed:', error.message)
        reject(error)
      })
    })
  }

  // 测试TLS连接
  async testTlsConnection() {
    return new Promise((resolve, reject) => {
      console.log(`🔐 Testing TLS connection to ${this.host}:${this.port}...`)
      
      const options = {
        host: this.host,
        port: this.port,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        secureProtocol: 'TLSv1_2_method'
      }

      const timeout = setTimeout(() => {
        reject(new Error('TLS connection timeout'))
      }, 15000)

      const socket = tls.connect(options, () => {
        clearTimeout(timeout)
        console.log('✅ TLS connection successful')
        console.log('  - Protocol:', socket.getProtocol())
        console.log('  - Cipher:', socket.getCipher())
        socket.destroy()
        resolve(true)
      })

      socket.on('error', (error) => {
        clearTimeout(timeout)
        console.error('❌ TLS connection failed:', error.message)
        reject(error)
      })
    })
  }

  // 测试DNS解析
  async testDnsResolution() {
    const dns = require('dns').promises
    
    try {
      console.log(`🌐 Testing DNS resolution for ${this.host}...`)
      const addresses = await dns.lookup(this.host, { all: true })
      console.log('✅ DNS resolution successful:')
      addresses.forEach((addr, index) => {
        console.log(`  ${index + 1}. ${addr.address} (${addr.family})`)
      })
      return true
    } catch (error) {
      console.error('❌ DNS resolution failed:', error.message)
      return false
    }
  }

  // 使用原生pg客户端测试
  async testWithNativePg() {
    const { Client } = require('pg')
    
    const configs = [
      // 配置1: 基本配置
      {
        name: 'Basic Config',
        config: {
          host: this.host,
          database: this.database,
          user: this.user,
          password: this.password,
          port: this.port,
          ssl: { rejectUnauthorized: false }
        }
      },
      // 配置2: 增强SSL配置
      {
        name: 'Enhanced SSL Config',
        config: {
          host: this.host,
          database: this.database,
          user: this.user,
          password: this.password,
          port: this.port,
          ssl: {
            rejectUnauthorized: false,
            checkServerIdentity: () => undefined,
            secureProtocol: 'TLSv1_2_method'
          }
        }
      },
      // 配置3: 使用连接字符串
      {
        name: 'Connection String',
        config: {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        }
      }
    ]

    for (const { name, config } of configs) {
      try {
        console.log(`\n🧪 Testing with ${name}...`)
        const client = new Client(config)
        
        await client.connect()
        console.log('✅ Connection successful')
        
        const result = await client.query('SELECT version()')
        console.log('✅ Query successful:', result.rows[0].version.split(' ')[0])
        
        await client.end()
        console.log('✅ Disconnection successful')
        
        return { success: true, config: name }
      } catch (error) {
        console.error(`❌ ${name} failed:`, error.message)
        console.error('  Error code:', error.code)
        console.error('  Error detail:', error.detail)
      }
    }
    
    return { success: false }
  }

  // 测试不同的pg版本兼容性
  async testPgVersionCompatibility() {
    console.log('\n📦 Checking pg module version...')
    try {
      const pgPackage = require('pg/package.json')
      console.log('✅ pg version:', pgPackage.version)
      
      // 检查是否有原生绑定
      try {
        require('pg-native')
        console.log('✅ pg-native available')
      } catch {
        console.log('ℹ️ pg-native not available (using pure JS)')
      }
      
      return true
    } catch (error) {
      console.error('❌ Error checking pg version:', error.message)
      return false
    }
  }

  // 运行完整诊断
  async runFullDiagnostics() {
    console.log('🔍 Starting comprehensive network diagnostics...\n')
    console.log('Target:', {
      host: this.host,
      port: this.port,
      database: this.database,
      user: this.user
    })
    console.log('\n' + '='.repeat(60))

    const results = {
      dns: false,
      tcp: false,
      tls: false,
      pgVersion: false,
      pgConnection: { success: false }
    }

    try {
      // 1. DNS解析测试
      results.dns = await this.testDnsResolution()
      console.log('\n' + '-'.repeat(40))

      // 2. TCP连接测试
      if (results.dns) {
        results.tcp = await this.testTcpConnection()
      } else {
        console.log('⏭️ Skipping TCP test due to DNS failure')
      }
      console.log('\n' + '-'.repeat(40))

      // 3. TLS连接测试
      if (results.tcp) {
        results.tls = await this.testTlsConnection()
      } else {
        console.log('⏭️ Skipping TLS test due to TCP failure')
      }
      console.log('\n' + '-'.repeat(40))

      // 4. pg版本检查
      results.pgVersion = await this.testPgVersionCompatibility()
      console.log('\n' + '-'.repeat(40))

      // 5. PostgreSQL连接测试
      if (results.tls) {
        results.pgConnection = await this.testWithNativePg()
      } else {
        console.log('⏭️ Skipping PostgreSQL test due to TLS failure')
      }

    } catch (error) {
      console.error('🚨 Diagnostic error:', error.message)
    }

    // 生成诊断报告
    this.generateReport(results)
    return results
  }

  generateReport(results) {
    console.log('\n' + '='.repeat(60))
    console.log('📋 DIAGNOSTIC REPORT')
    console.log('='.repeat(60))
    
    console.log('\n🔍 Test Results:')
    console.log(`  DNS Resolution: ${results.dns ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  TCP Connection: ${results.tcp ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  TLS Connection: ${results.tls ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  pg Module: ${results.pgVersion ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  PostgreSQL Connection: ${results.pgConnection.success ? '✅ PASS' : '❌ FAIL'}`)
    
    if (results.pgConnection.success) {
      console.log(`    Working config: ${results.pgConnection.config}`)
    }

    console.log('\n💡 Recommendations:')
    
    if (!results.dns) {
      console.log('  - Check internet connection')
      console.log('  - Verify hostname spelling')
      console.log('  - Try using IP address instead')
    } else if (!results.tcp) {
      console.log('  - Check firewall settings')
      console.log('  - Verify port 5432 is accessible')
      console.log('  - Check if VPN is required')
    } else if (!results.tls) {
      console.log('  - SSL/TLS configuration issue')
      console.log('  - Try different SSL protocols')
      console.log('  - Check certificate validity')
    } else if (!results.pgConnection.success) {
      console.log('  - PostgreSQL authentication issue')
      console.log('  - Check username/password')
      console.log('  - Verify database name')
      console.log('  - Check Neon database status')
    } else {
      console.log('  - All tests passed! Connection should work.')
    }
    
    console.log('\n' + '='.repeat(60))
  }
}

// 运行诊断
const diagnostics = new NetworkDiagnostics()
diagnostics.runFullDiagnostics()
  .then(results => {
    const allPassed = Object.values(results).every(r => 
      typeof r === 'boolean' ? r : r.success
    )
    process.exit(allPassed ? 0 : 1)
  })
  .catch(error => {
    console.error('🚨 Diagnostic failed:', error)
    process.exit(1)
  })

// 超时保护
setTimeout(() => {
  console.error('\n⏰ Diagnostic timeout after 3 minutes')
  process.exit(1)
}, 180000)