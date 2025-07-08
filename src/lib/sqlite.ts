// SQLite 数据库配置
import Database from 'better-sqlite3';
import path from 'path';

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

// 确保数据目录存在
const dataDir = path.dirname(DB_PATH);
if (!require('fs').existsSync(dataDir)) {
  require('fs').mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    
    // 启用 WAL 模式以提高性能
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 1000000');
    db.pragma('temp_store = memory');
    
    console.log('✅ SQLite 数据库连接已建立:', DB_PATH);
  }
  
  return db;
}

// 关闭数据库连接
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✅ SQLite 数据库连接已关闭');
  }
}

// 初始化数据库表
export function initializeDatabase(): void {
  const database = getDatabase();
  
  // 创建用户表
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 创建支付记录表
  database.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      transaction_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // 创建产品表
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 插入示例数据
  const insertProduct = database.prepare(`
    INSERT OR IGNORE INTO products (name, description, price) 
    VALUES (?, ?, ?)
  `);
  
  insertProduct.run('基础套餐', '基础功能套餐', 9.99);
  insertProduct.run('专业套餐', '专业功能套餐', 19.99);
  insertProduct.run('企业套餐', '企业级功能套餐', 49.99);
  
  console.log('✅ 数据库表初始化完成');
}

// 数据库操作辅助函数
export const dbHelpers = {
  // 用户操作
  createUser: (email: string, name?: string) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
    return stmt.run(email, name);
  },
  
  getUserByEmail: (email: string) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },
  
  // 支付操作
  createPayment: (userId: number, amount: number, currency = 'USD') => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO payments (user_id, amount, currency, transaction_id) 
      VALUES (?, ?, ?, ?)
    `);
    const transactionId = 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    return stmt.run(userId, amount, currency, transactionId);
  },
  
  getPaymentById: (id: number) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM payments WHERE id = ?');
    return stmt.get(id);
  },
  
  updatePaymentStatus: (id: number, status: string) => {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(status, id);
  },
  
  // 产品操作
  getAllProducts: () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY price');
    return stmt.all();
  },
  
  getProductById: (id: number) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1');
    return stmt.get(id);
  }
};

export default {
  getDatabase,
  closeDatabase,
  initializeDatabase,
  dbHelpers
};
