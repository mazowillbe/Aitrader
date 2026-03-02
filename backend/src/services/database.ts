import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../data/trading.db'));

export function initDatabase() {
  // Create trades table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      action TEXT NOT NULL,
      volume REAL NOT NULL,
      entry_price REAL,
      stop_loss REAL,
      take_profit REAL,
      confidence REAL NOT NULL,
      status TEXT DEFAULT 'OPEN',
      exit_price REAL,
      profit_loss REAL,
      ai_reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    )
  `);

  // Create logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create account_state table
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance REAL NOT NULL,
      equity REAL NOT NULL,
      margin_used REAL DEFAULT 0,
      daily_trades INTEGER DEFAULT 0,
      daily_risk_used REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initialize account state if not exists
  const accountExists = db.prepare('SELECT COUNT(*) as count FROM account_state').get() as { count: number };
  if (accountExists.count === 0) {
    db.prepare(`
      INSERT INTO account_state (balance, equity, margin_used, daily_trades, daily_risk_used)
      VALUES (?, ?, ?, ?, ?)
    `).run(10000, 10000, 0, 0, 0); // Start with $10,000 demo balance
  }

  console.log('✅ Database initialized');
}

export { db };
