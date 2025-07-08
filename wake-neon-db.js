require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const https = require('https');

console.log('🔄 Attempting to wake up Neon database...');

// Function to make multiple connection attempts with delays
async function wakeUpDatabase() {
  const maxAttempts = 5;
  const delayBetweenAttempts = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${maxAttempts} - Trying to connect...`);
    
    const client = new Client({
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: 5432,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 60000, // 60 seconds timeout
      query_timeout: 60000,
      statement_timeout: 60000
    });
    
    try {
      console.log('Connecting...');
      await client.connect();
      console.log('✅ Connected! Database is now active.');
      
      // Run a simple query to ensure everything works
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('✅ Query successful:');
      console.log('   Current time:', result.rows[0].current_time);
      console.log('   PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
      
      await client.end();
      console.log('✅ Database successfully awakened and tested!');
      return true;
      
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed:`, error.message);
      
      try {
        await client.end();
      } catch (e) {}
      
      if (attempt < maxAttempts) {
        console.log(`⏳ Waiting ${delayBetweenAttempts/1000} seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
      }
    }
  }
  
  return false;
}

// Function to try different connection configurations
async function tryAlternativeConfigurations() {
  console.log('\n🔧 Trying alternative connection configurations...');
  
  const configurations = [
    {
      name: 'Standard SSL',
      config: {
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        port: 5432,
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'No SSL',
      config: {
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        port: 5432,
        ssl: false
      }
    },
    {
      name: 'Connection String (Clean)',
      config: {
        connectionString: process.env.DATABASE_URL
          .replace(/[?&]channel_binding=require/, '')
          .replace(/[?&]options=endpoint%3D[^&]*/, ''),
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Direct Endpoint (Non-pooled)',
      config: {
        host: process.env.PGHOST.replace('-pooler', ''),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        port: 5432,
        ssl: { rejectUnauthorized: false }
      }
    }
  ];
  
  for (const { name, config } of configurations) {
    console.log(`\n📋 Testing: ${name}`);
    
    const client = new Client({
      ...config,
      connectionTimeoutMillis: 30000,
      query_timeout: 30000
    });
    
    try {
      await client.connect();
      console.log(`✅ ${name} - Connection successful!`);
      
      const result = await client.query('SELECT NOW() as test_time');
      console.log(`✅ ${name} - Query successful:`, result.rows[0].test_time);
      
      await client.end();
      console.log(`✅ ${name} - This configuration works!`);
      return { name, config };
      
    } catch (error) {
      console.log(`❌ ${name} - Failed:`, error.message);
      try {
        await client.end();
      } catch (e) {}
    }
  }
  
  return null;
}

// Function to check if we can reach the host
async function checkNetworkConnectivity() {
  console.log('\n🌐 Checking network connectivity...');
  
  const host = process.env.PGHOST;
  const port = 5432;
  
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log(`❌ Network timeout - Cannot reach ${host}:${port}`);
      resolve(false);
    }, 10000);
    
    socket.connect(port, host, () => {
      clearTimeout(timeout);
      socket.destroy();
      console.log(`✅ Network connectivity OK - Can reach ${host}:${port}`);
      resolve(true);
    });
    
    socket.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ Network error:`, error.message);
      resolve(false);
    });
  });
}

// Main execution
async function main() {
  console.log('🚀 Starting Neon database wake-up procedure...');
  console.log(`Target: ${process.env.PGHOST}`);
  console.log(`Database: ${process.env.PGDATABASE}`);
  console.log(`User: ${process.env.PGUSER}`);
  
  // Step 1: Check network connectivity
  const networkOk = await checkNetworkConnectivity();
  if (!networkOk) {
    console.log('\n❌ Network connectivity failed. Please check:');
    console.log('   - Internet connection');
    console.log('   - Firewall settings');
    console.log('   - DNS resolution');
    return;
  }
  
  // Step 2: Try to wake up the database with multiple attempts
  console.log('\n🔄 Attempting to wake up database with persistent connections...');
  const wakeUpSuccess = await wakeUpDatabase();
  
  if (wakeUpSuccess) {
    console.log('\n🎉 Success! Database is now active and ready to use.');
    return;
  }
  
  // Step 3: Try alternative configurations
  console.log('\n🔧 Standard wake-up failed. Trying alternative configurations...');
  const workingConfig = await tryAlternativeConfigurations();
  
  if (workingConfig) {
    console.log(`\n🎉 Found working configuration: ${workingConfig.name}`);
    console.log('\n📝 Recommended configuration for your application:');
    console.log(JSON.stringify(workingConfig.config, null, 2));
  } else {
    console.log('\n❌ All wake-up attempts failed.');
    console.log('\n🔍 Possible issues:');
    console.log('   1. Database credentials are incorrect');
    console.log('   2. Database is suspended and not responding to wake-up calls');
    console.log('   3. Neon service might be experiencing issues');
    console.log('   4. Your IP might be blocked');
    console.log('\n💡 Recommended actions:');
    console.log('   1. Check Neon Console (https://console.neon.tech) for database status');
    console.log('   2. Verify your connection string and credentials');
    console.log('   3. Try connecting from a different network');
    console.log('   4. Contact Neon support if the issue persists');
  }
}

main().catch(console.error);