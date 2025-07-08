// 初始化 SQLite 数据库
const { initializeDatabase, closeDatabase } = require('./src/lib/sqlite.ts');

async function init() {
  try {
    console.log('🔧 初始化 SQLite 数据库...');
    initializeDatabase();
    console.log('✅ 数据库初始化完成!');
    
    // 显示数据库文件位置
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'data', 'app.db');
    console.log('📍 数据库文件位置:', dbPath);
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
  } finally {
    closeDatabase();
  }
}

init();
