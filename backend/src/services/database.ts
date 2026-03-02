import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../data/trading.db'));

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

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
      closed_at DATETIME,
      market_regime TEXT,
      strategy_used TEXT,
      session TEXT,
      confluence_score REAL,
      timeframe_alignment TEXT,
      economic_events TEXT,
      trailing_stop_active INTEGER DEFAULT 0,
      trailing_stop_distance REAL,
      current_stop_price REAL,
      breakeven_triggered INTEGER DEFAULT 0,
      partial_exits TEXT,
      r_multiple REAL,
      max_adverse_excursion REAL,
      max_favorable_excursion REAL
    )
  `);

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS account_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance REAL NOT NULL,
      equity REAL NOT NULL,
      margin_used REAL DEFAULT 0,
      daily_trades INTEGER DEFAULT 0,
      daily_risk_used REAL DEFAULT 0,
      peak_equity REAL,
      current_drawdown REAL DEFAULT 0,
      max_drawdown REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS economic_events (
      id TEXT PRIMARY KEY,
      datetime TEXT NOT NULL,
      currency TEXT NOT NULL,
      event_name TEXT NOT NULL,
      impact TEXT NOT NULL,
      forecast TEXT,
      previous TEXT,
      actual TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS performance_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      breakdown TEXT,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      insight_type TEXT NOT NULL,
      content TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
    CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);
    CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
    CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
  `);

  const accountExists = db.prepare('SELECT COUNT(*) as count FROM account_state').get() as {
    count: number;
  };
  if (accountExists.count === 0) {
    db.prepare(`
      INSERT INTO account_state (balance, equity, margin_used, daily_trades, daily_risk_used, peak_equity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(10000, 10000, 0, 0, 0, 10000);
  }

  migrateExistingTrades();

  console.log('✅ Database initialized with enhanced schema');
}

function migrateExistingTrades() {
  const columns = db.pragma('table_info(trades)') as Array<{ name: string }>;
  const columnNames = columns.map((c) => c.name);

  const newColumns: Array<[string, string]> = [
    ['market_regime', 'TEXT'],
    ['strategy_used', 'TEXT'],
    ['session', 'TEXT'],
    ['confluence_score', 'REAL'],
    ['timeframe_alignment', 'TEXT'],
    ['economic_events', 'TEXT'],
    ['trailing_stop_active', 'INTEGER DEFAULT 0'],
    ['trailing_stop_distance', 'REAL'],
    ['current_stop_price', 'REAL'],
    ['breakeven_triggered', 'INTEGER DEFAULT 0'],
    ['partial_exits', 'TEXT'],
    ['r_multiple', 'REAL'],
    ['max_adverse_excursion', 'REAL'],
    ['max_favorable_excursion', 'REAL']
  ];

  for (const [col, type] of newColumns) {
    if (!columnNames.includes(col)) {
      try {
        db.exec(`ALTER TABLE trades ADD COLUMN ${col} ${type}`);
      } catch {
        // Column may already exist
      }
    }
  }

  const accountCols = db.pragma('table_info(account_state)') as Array<{ name: string }>;
  const accountColNames = accountCols.map((c) => c.name);

  const newAccountColumns: Array<[string, string]> = [
    ['peak_equity', 'REAL'],
    ['current_drawdown', 'REAL DEFAULT 0'],
    ['max_drawdown', 'REAL DEFAULT 0']
  ];

  for (const [col, type] of newAccountColumns) {
    if (!accountColNames.includes(col)) {
      try {
        db.exec(`ALTER TABLE account_state ADD COLUMN ${col} ${type}`);
      } catch {
        // Column may already exist
      }
    }
  }
}

export { db };
