import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "trading.db");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database;

try {
  db = new Database(dbPath);
} catch (err) {
  console.error("⚠️ Database corrupted. Recreating...");
  
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  db = new Database(dbPath);
}

// Safer SQLite settings for cloud
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

export function initDatabase() {
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
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS account_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance REAL NOT NULL,
      equity REAL NOT NULL,
      margin_used REAL DEFAULT 0,
      daily_trades INTEGER DEFAULT 0,
      daily_risk_used REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const accountExists = db
    .prepare("SELECT COUNT(*) as count FROM account_state")
    .get() as { count: number };

  if (accountExists.count === 0) {
    db.prepare(`
      INSERT INTO account_state 
      (balance, equity, margin_used, daily_trades, daily_risk_used)
      VALUES (?, ?, ?, ?, ?)
    `).run(10000, 10000, 0, 0, 0);
  }

  console.log("✅ Database initialized");
}

export { db };
