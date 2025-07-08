require('dotenv').config({ path: '.env.local' });
const { Client, Pool } = require('pg');

console.log('🔍 Testing Neon database connection solutions...');

// Solution 1: Direct Client connection (recommended for Neon)
async function testDirectClient() {
  console.log('\n📋 Test 1: Direct Client Connection');
  
  const client = new Client({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false
    },
    // Neon specific settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    connectionTimeoutMillis: 30000,
    query_timeout: 30000,
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query successful:', result.rows[0]);
    
    await client.end();
    console.log('✅ Connection closed properly');
    return true;
  } catch (error) {
    console.log('❌ Direct client failed:', error.message);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

// Solution 2: Pool with minimal configuration
async function testMinimalPool() {
  console.log('\n📋 Test 2: Minimal Pool Configuration');
  
  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false },
    max: 1, // Minimal pool size
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 30000
  });

  try {
    console.log('Testing pool connection...');
    const client = await pool.connect();
    console.log('✅ Pool connected successfully');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Pool query successful:', result.rows[0]);
    
    client.release();
    await pool.end();
    console.log('✅ Pool closed properly');
    return true;
  } catch (error) {
    console.log('❌ Minimal pool failed:', error.message);
    try {
      await pool.end();
    } catch (e) {}
    return false;
  }
}

// Solution 3: Connection string approach
async function testConnectionString() {
  console.log('\n📋 Test 3: Connection String Approach');
  
  // Remove problematic parameters that PgBouncer doesn't support
  const cleanUrl = process.env.DATABASE_URL
    .replace(/[?&]channel_binding=require/, '')
    .replace(/[?&]options=endpoint%3D[^&]*/, '');
  
  console.log('Using clean URL (without channel_binding and options)');
  
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    connectionTimeoutMillis: 30000
  });

  try {
    console.log('Connecting with clean URL...');
    await client.connect();
    console.log('✅ Connection string method successful');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful:', result.rows[0]);
    
    await client.end();
    console.log('✅ Connection closed properly');
    return true;
  } catch (error) {
    console.log('❌ Connection string failed:', error.message);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

// Solution 4: Non-pooled connection (direct to database)
async function testNonPooledConnection() {
  console.log('\n📋 Test 4: Non-Pooled Direct Connection');
  
  // Use non-pooled endpoint if available
  const directHost = process.env.PGHOST.replace('-pooler', '');
  console.log(`Trying direct connection to: ${directHost}`);
  
  const client = new Client({
    host: directHost,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    connectionTimeoutMillis: 30000
  });

  try {
    console.log('Connecting to non-pooled endpoint...');
    await client.connect();
    console.log('✅ Non-pooled connection successful');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful:', result.rows[0]);
    
    await client.end();
    console.log('✅ Connection closed properly');
    return true;
  } catch (error) {
    console.log('❌ Non-pooled connection failed:', error.message);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting comprehensive Neon connection tests...');
  console.log(`Database: ${process.env.PGDATABASE}`);
  console.log(`Host: ${process.env.PGHOST}`);
  console.log(`User: ${process.env.PGUSER}`);
  
  const results = {
    directClient: await testDirectClient(),
    minimalPool: await testMinimalPool(),
    connectionString: await testConnectionString(),
    nonPooled: await testNonPooledConnection()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, success]) => {
    console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'SUCCESS' : 'FAILED'}`);
  });
  
  const successfulTests = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 ${successfulTests}/4 tests passed`);
  
  if (successfulTests > 0) {
    console.log('\n🎉 Found working solution(s)! Use the successful method in your application.');
  } else {
    console.log('\n⚠️  All tests failed. This might indicate:');
    console.log('   - Network connectivity issues');
    console.log('   - Neon database is suspended (try accessing Neon console)');
    console.log('   - Incorrect credentials');
    console.log('   - Firewall blocking connections');
  }
}

runAllTests().catch(console.error);