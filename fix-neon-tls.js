require('dotenv').config({ path: '.env.local' })
const { Client, Pool } = require('pg')
const tls = require('tls')

// Neon数据库TLS修复方案
class NeonTlsFixer {
  constructor() {
    this.host = process.env.PGHOST
    this.port = parseInt(process.env.PGPORT || '5432')
    this.database = process.env.PGDATABASE
    this.user = process.env.PGUSER
    this.password = process.env.PGPASSWORD
  }

  // 方案1: 禁用SSL（仅用于测试）
  async testWithoutSsl() {
    console.log('🧪 Testing without SSL (if supported)...')
    
    const client = new Client({
      host: this.host,
      database: this.database,
      user: this.user,
      password: this.password,
      port: this.port,
      ssl: false
    })

    try {
      await client.connect()
      const result = await client.query('SELECT 1 as test')
      await client.end()
      console.log('✅ Non-SSL connection successful')
      return true
    } catch (error) {
      console.log('❌ Non-SSL connection failed:', error.message)
      return false
    }
  }

  // 方案2: 最小SSL配置
  async testMinimalSsl() {
    console.log('🧪 Testing with minimal SSL config...')
    
    const client = new Client({
      host: this.host,
      database: this.database,
      user: this.user,
      password: this.password,
      port: this.port,
      ssl: true // 最简单的SSL配置
    })

    try {
      await client.connect()
      const result = await client.query('SELECT 1 as test')
      await client.end()
      console.log('✅ Minimal SSL connection successful')
      return true
    } catch (error) {
      console.log('❌ Minimal SSL connection failed:', error.message)
      return false
    }
  }

  // 方案3: 宽松SSL配置
  async testPermissiveSsl() {
    console.log('🧪 Testing with permissive SSL config...')
    
    const client = new Client({
      host: this.host,
      database: this.database,
      user: this.user,
      password: this.password,
      port: this.port,
      ssl: {
        rejectUnauthorized: false
      }
    })

    try {
      await client.connect()
      const result = await client.query('SELECT 1 as test')
      await client.end()
      console.log('✅ Permissive SSL connection successful')
      return true
    } catch (error) {
      console.log('❌ Permissive SSL connection failed:', error.message)
      return false
    }
  }

  // 方案4: 使用连接字符串（移除channel_binding）
  async testConnectionStringWithoutChannelBinding() {
    console.log('🧪 Testing connection string without channel_binding...')
    
    // 移除channel_binding参数
    const cleanUrl = process.env.DATABASE_URL
      .replace(/[?&]channel_binding=require/g, '')
      .replace(/[?&]channel_binding=prefer/g, '')
    
    console.log('Modified URL:', cleanUrl.replace(/:[^:@]*@/, ':***@'))
    
    const client = new Client({
      connectionString: cleanUrl,
      ssl: {
        rejectUnauthorized: false
      }
    })

    try {
      await client.connect()
      const result = await client.query('SELECT 1 as test')
      await client.end()
      console.log('✅ Connection string without channel_binding successful')
      return { success: true, url: cleanUrl }
    } catch (error) {
      console.log('❌ Connection string without channel_binding failed:', error.message)
      return { success: false }
    }
  }

  // 方案5: 使用不同的TLS版本
  async testDifferentTlsVersions() {
    console.log('🧪 Testing different TLS versions...')
    
    const tlsVersions = [
      'TLSv1_method',
      'TLSv1_1_method', 
      'TLSv1_2_method',
      'TLSv1_3_method'
    ]

    for (const version of tlsVersions) {
      try {
        console.log(`  Testing ${version}...`)
        
        const client = new Client({
          host: this.host,
          database: this.database,
          user: this.user,
          password: this.password,
          port: this.port,
          ssl: {
            rejectUnauthorized: false,
            secureProtocol: version
          }
        })

        await client.connect()
        const result = await client.query('SELECT 1 as test')
        await client.end()
        
        console.log(`✅ ${version} successful`)
        return { success: true, version }
      } catch (error) {
        console.log(`❌ ${version} failed: ${error.message}`)
      }
    }
    
    return { success: false }
  }

  // 方案6: 使用pg-native（如果可用）
  async testWithNative() {
    console.log('🧪 Testing with pg-native...')
    
    try {
      const { native } = require('pg')
      
      const client = new native.Client({
        host: this.host,
        database: this.database,
        user: this.user,
        password: this.password,
        port: this.port,
        ssl: {
          rejectUnauthorized: false
        }
      })

      await client.connect()
      const result = await client.query('SELECT 1 as test')
      await client.end()
      
      console.log('✅ pg-native connection successful')
      return true
    } catch (error) {
      console.log('❌ pg-native failed or not available:', error.message)
      return false
    }
  }

  // 方案7: 使用连接池而不是单个客户端
  async testWithPool() {
    console.log('🧪 Testing with connection pool...')
    
    const pool = new Pool({
      host: this.host,
      database: this.database,
      user: this.user,
      password: this.password,
      port: this.port,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1, // 只使用一个连接
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000
    })

    try {
      const client = await pool.connect()
      const result = await client.query('SELECT 1 as test')
      client.release()
      await pool.end()
      
      console.log('✅ Connection pool successful')
      return true
    } catch (error) {
      console.log('❌ Connection pool failed:', error.message)
      try {
        await pool.end()
      } catch {}
      return false
    }
  }

  // 运行所有修复方案
  async runAllFixes() {
    console.log('🔧 Starting Neon TLS fix attempts...\n')
    console.log('Target:', {
      host: this.host,
      database: this.database,
      user: this.user
    })
    console.log('\n' + '='.repeat(60))

    const fixes = [
      { name: 'Without SSL', method: () => this.testWithoutSsl() },
      { name: 'Minimal SSL', method: () => this.testMinimalSsl() },
      { name: 'Permissive SSL', method: () => this.testPermissiveSsl() },
      { name: 'No Channel Binding', method: () => this.testConnectionStringWithoutChannelBinding() },
      { name: 'Different TLS Versions', method: () => this.testDifferentTlsVersions() },
      { name: 'pg-native', method: () => this.testWithNative() },
      { name: 'Connection Pool', method: () => this.testWithPool() }
    ]

    const workingSolutions = []

    for (const fix of fixes) {
      try {
        console.log(`\n🔧 Attempting: ${fix.name}`)
        console.log('-'.repeat(40))
        
        const result = await fix.method()
        
        if (result === true || (typeof result === 'object' && result.success)) {
          workingSolutions.push({ name: fix.name, result })
          console.log(`✅ ${fix.name} - SUCCESS!`)
        } else {
          console.log(`❌ ${fix.name} - FAILED`)
        }
      } catch (error) {
        console.log(`❌ ${fix.name} - ERROR: ${error.message}`)
      }
    }

    // 生成解决方案报告
    this.generateSolutionReport(workingSolutions)
    return workingSolutions
  }

  generateSolutionReport(solutions) {
    console.log('\n' + '='.repeat(60))
    console.log('🎯 SOLUTION REPORT')
    console.log('='.repeat(60))
    
    if (solutions.length === 0) {
      console.log('\n❌ No working solutions found.')
      console.log('\n💡 Additional suggestions:')
      console.log('  - Contact Neon support')
      console.log('  - Check Neon dashboard for database status')
      console.log('  - Try connecting from a different network')
      console.log('  - Verify account permissions')
    } else {
      console.log(`\n✅ Found ${solutions.length} working solution(s):`)
      
      solutions.forEach((solution, index) => {
        console.log(`\n${index + 1}. ${solution.name}`)
        if (typeof solution.result === 'object') {
          Object.entries(solution.result).forEach(([key, value]) => {
            if (key !== 'success') {
              console.log(`   ${key}: ${value}`)
            }
          })
        }
      })
      
      console.log('\n📝 Recommended implementation:')
      const bestSolution = solutions[0]
      console.log(`   Use: ${bestSolution.name}`)
      
      if (bestSolution.name === 'No Channel Binding') {
        console.log('   Action: Remove channel_binding from DATABASE_URL')
      } else if (bestSolution.name === 'Permissive SSL') {
        console.log('   Action: Use ssl: { rejectUnauthorized: false }')
      } else if (bestSolution.result?.version) {
        console.log(`   Action: Use secureProtocol: '${bestSolution.result.version}'`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
  }
}

// 运行修复程序
const fixer = new NeonTlsFixer()
fixer.runAllFixes()
  .then(solutions => {
    process.exit(solutions.length > 0 ? 0 : 1)
  })
  .catch(error => {
    console.error('🚨 Fix attempt failed:', error)
    process.exit(1)
  })

// 超时保护
setTimeout(() => {
  console.error('\n⏰ Fix attempt timeout after 2 minutes')
  process.exit(1)
}, 120000)