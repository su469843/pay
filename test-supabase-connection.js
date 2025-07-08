require('dotenv').config({ path: '.env.local' });
const { Client, Pool } = require('pg');

console.log('🔍 Testing Supabase PostgreSQL connection...');

// Check if password is set
if (process.env.PGPASSWORD === '[YOUR-PASSWORD]') {
  console.log('❌ Please update the PGPASSWORD in .env.local with your actual Supabase password');
  console.log('   Current value: [YOUR-PASSWORD]');
  console.log('   You need to replace this with your real Supabase database password');
  process.exit(1);
}

async function testSupabaseConnection() {
  console.log('\n📋 Connection Details:');
  console.log(`Host: ${process.env.PGHOST}`);
  console.log(`Database: ${process.env.PGDATABASE}`);
  console.log(`User: ${process.env.PGUSER}`);
  console.log(`SSL Mode: ${process.env.PGSSLMODE}`);
  console.log(`Channel Binding: ${process.env.PGCHANNELBINDING}`);
  
  // Test 1: Direct Client Connection
  console.log('\n🔄 Test 1: Direct Client Connection');
  const client = new Client({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 30000
  });
  
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query successful:');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
    
    // Test table creation (to verify write permissions)
    console.log('\n🔄 Testing table operations...');
    
    // Drop table if exists
    await client.query('DROP TABLE IF EXISTS connection_test');
    
    // Create test table
    await client.query(`
      CREATE TABLE connection_test (
        id SERIAL PRIMARY KEY,
        test_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table created successfully');
    
    // Insert test data
    await client.query(
      'INSERT INTO connection_test (test_message) VALUES ($1)',
      ['Supabase connection test successful!']
    );
    console.log('✅ Data inserted successfully');
    
    // Query test data
    const testResult = await client.query('SELECT * FROM connection_test');
    console.log('✅ Data queried successfully:', testResult.rows[0]);
    
    // Clean up
    await client.query('DROP TABLE connection_test');
    console.log('✅ Test table cleaned up');
    
    await client.end();
    console.log('✅ Connection closed properly');
    
    return true;
  } catch (error) {
    console.log('❌ Direct client connection failed:', error.message);
    if (error.code) {
      console.log('   Error code:', error.code);
    }
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

// Test 2: Connection Pool
async function testSupabasePool() {
  console.log('\n🔄 Test 2: Connection Pool');
  
  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000
  });
  
  try {
    console.log('Testing pool connection...');
    const client = await pool.connect();
    console.log('✅ Pool connected successfully');
    
    const result = await client.query('SELECT NOW() as pool_test_time');
    console.log('✅ Pool query successful:', result.rows[0]);
    
    client.release();
    await pool.end();
    console.log('✅ Pool closed properly');
    
    return true;
  } catch (error) {
    console.log('❌ Pool connection failed:', error.message);
    try {
      await pool.end();
    } catch (e) {}
    return false;
  }
}

// Test 3: Connection String Method
async function testConnectionString() {
  console.log('\n🔄 Test 3: Connection String Method');
  
  const connectionString = process.env.DATABASE_URL.replace('[YOUR-PASSWORD]', process.env.PGPASSWORD);
  console.log('Using connection string (password hidden)');
  
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 30000
  });
  
  try {
    console.log('Connecting with connection string...');
    await client.connect();
    console.log('✅ Connection string method successful');
    
    const result = await client.query('SELECT NOW() as conn_str_test');
    console.log('✅ Query successful:', result.rows[0]);
    
    await client.end();
    console.log('✅ Connection closed properly');
    
    return true;
  } catch (error) {
    console.log('❌ Connection string method failed:', error.message);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Supabase PostgreSQL connection tests...');
  
  const results = {
    directClient: await testSupabaseConnection(),
    connectionPool: await testSupabasePool(),
    connectionString: await testConnectionString()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, success]) => {
    console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'SUCCESS' : 'FAILED'}`);
  });
  
  const successfulTests = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 ${successfulTests}/3 tests passed`);
  
  if (successfulTests > 0) {
    console.log('\n🎉 Supabase connection is working! You can now use this database.');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your application to use the new Supabase database');
    console.log('   2. Run your application to test the integration');
    console.log('   3. Consider migrating any existing data if needed');
  } else {
    console.log('\n❌ All Supabase connection tests failed.');
    console.log('\n🔍 Please check:');
    console.log('   1. Your Supabase password is correct');
    console.log('   2. Your Supabase project is active');
    console.log('   3. Your IP is allowed in Supabase settings');
    console.log('   4. The connection string format is correct');
  }
}

runAllTests().catch(console.error);