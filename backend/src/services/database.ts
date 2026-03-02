import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'trading.db'));

// Enable WAL mode for better performance
db.run('PRAGMA journal_mode = WAL');

export function initDatabase() {
  // Enhanced trades table with professional features
  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      action TEXT NOT NULL,
      volume REAL NOT NULL,
      entry_price REAL,
      exit_price REAL,
      stop_loss REAL,
      take_profit REAL,
      current_stop_price REAL,
      confidence REAL NOT NULL,
      status TEXT DEFAULT 'OPEN',
      profit_loss REAL,
      ai_reasoning TEXT,
      
      -- Professional features
      market_regime TEXT,
      strategy_used TEXT,
      session TEXT,
      confluence_score REAL,
      timeframe_alignment TEXT,
      economic_events TEXT,
      trailing_stop_active INTEGER DEFAULT 0,
      trailing_stop_type TEXT,
      trailing_stop_distance REAL,
      partial_exits TEXT,
      breakeven_triggered INTEGER DEFAULT 0,
      time_exit_scheduled TEXT,
      r_multiple REAL,
      max_adverse_excursion REAL,
      max_favorable_excursion REAL,
      atr_at_entry REAL,
      risk_reward_ratio REAL,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    )
  `);

  // Create indexes for better query performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy_used)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_regime ON trades(market_regime)`);

  // Logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)`);

  // Account state table
  db.run(`
    CREATE TABLE IF NOT EXISTS account_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance REAL NOT NULL,
      equity REAL NOT NULL,
      margin_used REAL DEFAULT 0,
      daily_trades INTEGER DEFAULT 0,
      daily_risk_used REAL DEFAULT 0,
      peak_equity REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Risk metrics table
  db.run(`
    CREATE TABLE IF NOT EXISTS risk_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelly_fraction REAL NOT NULL,
      kelly_adjusted REAL NOT NULL,
      portfolio_heat REAL NOT NULL,
      max_portfolio_heat REAL DEFAULT 0.06,
      current_drawdown REAL DEFAULT 0,
      max_drawdown REAL DEFAULT 0,
      correlation_risk REAL DEFAULT 0,
      volatility_adjustment REAL DEFAULT 1.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Economic events table
  db.run(`
    CREATE TABLE IF NOT EXISTS economic_events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      impact TEXT NOT NULL,
      forecast TEXT,
      previous TEXT,
      actual TEXT,
      event_datetime DATETIME NOT NULL,
      timestamp INTEGER NOT NULL,
      is_past INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_events_datetime ON economic_events(event_datetime)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_currency ON economic_events(currency)`);

  // Performance stats table
  db.run(`
    CREATE TABLE IF NOT EXISTS performance_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_trades INTEGER DEFAULT 0,
      winning_trades INTEGER DEFAULT 0,
      losing_trades INTEGER DEFAULT 0,
      total_profit REAL DEFAULT 0,
      total_loss REAL DEFAULT 0,
      avg_win REAL DEFAULT 0,
      avg_loss REAL DEFAULT 0,
      win_rate REAL DEFAULT 0,
      profit_factor REAL DEFAULT 0,
      expectancy REAL DEFAULT 0,
      sharpe_ratio REAL DEFAULT 0,
      max_consecutive_wins INTEGER DEFAULT 0,
      max_consecutive_losses INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      by_regime TEXT,
      by_session TEXT,
      by_strategy TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // AI decisions log
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      symbol TEXT NOT NULL,
      confidence REAL NOT NULL,
      reasoning TEXT,
      market_regime TEXT,
      strategy TEXT,
      session TEXT,
      confluence_score REAL,
      event_risk TEXT,
      decision_data TEXT,
      executed INTEGER DEFAULT 0,
      outcome TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_decisions_symbol ON ai_decisions(symbol)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON ai_decisions(created_at)`);

  // Correlation matrix cache
  db.run(`
    CREATE TABLE IF NOT EXISTS correlation_matrix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol1 TEXT NOT NULL,
      symbol2 TEXT NOT NULL,
      correlation REAL NOT NULL,
      period_days INTEGER DEFAULT 20,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol1, symbol2, period_days)
    )
  `);

  // Trading journal entries
  db.run(`
    CREATE TABLE IF NOT EXISTS trading_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER NOT NULL,
      entry_context TEXT,
      exit_analysis TEXT,
      lessons_learned TEXT,
      ai_insight TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trade_id) REFERENCES trades(id)
    )
  `);

  // Initialize account state if not exists
  const accountExists = db.query('SELECT COUNT(*) as count FROM account_state').get() as any;
  if (accountExists.count === 0) {
    db.run(`
      INSERT INTO account_state (balance, equity, margin_used, daily_trades, daily_risk_used, peak_equity)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [10000, 10000, 0, 0, 0, 10000]);
  }

  // Initialize risk metrics if not exists
  const riskExists = db.query('SELECT COUNT(*) as count FROM risk_metrics').get() as any;
  if (riskExists.count === 0) {
    db.run(`
      INSERT INTO risk_metrics (kelly_fraction, kelly_adjusted, portfolio_heat)
      VALUES (?, ?, ?)
    `, [0, 0.25, 0]);
  }

  // Initialize performance stats if not exists
  const perfExists = db.query('SELECT COUNT(*) as count FROM performance_stats').get() as any;
  if (perfExists.count === 0) {
    db.run(`INSERT INTO performance_stats DEFAULT VALUES`);
  }

  console.log('✅ Database initialized with professional features');
}

export { db };
