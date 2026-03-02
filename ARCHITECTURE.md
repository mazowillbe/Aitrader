# System Architecture

## Overview

The AI Trading System consists of three main components that work together autonomously:

1. **AI Agent** - Makes trading decisions using Gemini 3.1
2. **Backend API** - Executes trades and manages data
3. **Frontend Dashboard** - Displays real-time trading activity

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        AI AGENT                              │
│                     (ai-agent/)                              │
│                                                              │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │ Market Data    │  │ News Service │  │ Trading AI  │    │
│  │ Service        │  │              │  │ (Gemini)    │    │
│  │                │  │              │  │             │    │
│  │ - Crypto       │  │ - Headlines  │  │ - Analysis  │    │
│  │ - Forex        │  │ - Sentiment  │  │ - Decision  │    │
│  │ - Stocks       │  │ - Filtering  │  │ - JSON Out  │    │
│  └────────┬───────┘  └──────┬───────┘  └──────┬──────┘    │
│           │                  │                  │           │
│           └──────────────────┴──────────────────┘           │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │ Trade Instruction (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND API                            │
│                      (backend/)                              │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ REST API    │  │ Trade        │  │ Database     │      │
│  │             │  │ Executor     │  │              │      │
│  │ - Trades    │  │              │  │ - Trades     │      │
│  │ - Account   │  │ - Validation │  │ - Logs       │      │
│  │ - Logs      │  │ - Execution  │  │ - Account    │      │
│  │ - Config    │  │ - Logging    │  │              │      │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                │                  │               │
│         └────────────────┴──────────────────┘               │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND DASHBOARD                        │
│                        (/)                                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Active       │  │ Trade        │  │ System       │     │
│  │ Trades       │  │ History      │  │ Logs         │     │
│  │              │  │              │  │              │     │
│  │ - Live data  │  │ - P/L        │  │ - AI logs    │     │
│  │ - Confidence │  │ - Stats      │  │ - Filtering  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  User views only - AI operates autonomously                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. AI Decision Cycle (Every 60 seconds)

```
Market Data APIs → AI Agent ← News APIs
                      ↓
                [Gemini 3.1 Analysis]
                      ↓
                 Trade Decision
                      ↓
              JSON Trade Instruction
                      ↓
                 Backend API
```

### 2. Trade Execution Flow

```
Trade Instruction
       ↓
Risk Validation
       ↓
   [Demo Mode?]
       ↓
  Yes → Simulate Trade → Log to DB
       ↓
   No → Broker API → Real Trade → Log to DB
```

### 3. Frontend Update Flow

```
Frontend (polls every 10s)
       ↓
   Backend API
       ↓
  SQLite Database
       ↓
  Return JSON Data
       ↓
  Update Dashboard
```

## File Structure

```
ai-trading-system/
│
├── frontend/                   # React dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActiveTrades.tsx
│   │   │   ├── TradeHistory.tsx
│   │   │   ├── AccountSummary.tsx
│   │   │   └── SystemLogs.tsx
│   │   ├── lib/
│   │   │   └── api.ts          # Backend API client
│   │   └── App.tsx             # Main app
│   └── package.json
│
├── backend/                    # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── trades.ts       # Trade endpoints
│   │   │   ├── account.ts      # Account endpoints
│   │   │   ├── logs.ts         # Logging endpoints
│   │   │   └── config.ts       # Config endpoints
│   │   ├── services/
│   │   │   ├── database.ts     # SQLite setup
│   │   │   ├── tradeExecutor.ts # Trade execution
│   │   │   └── logger.ts       # Logging service
│   │   └── index.ts            # Server entry
│   ├── data/
│   │   └── trading.db          # SQLite database
│   └── package.json
│
└── ai-agent/                   # Autonomous AI
    ├── src/
    │   ├── services/
    │   │   ├── tradingAI.ts    # Gemini integration
    │   │   ├── marketData.ts   # Market data fetching
    │   │   ├── news.ts         # News analysis
    │   │   └── executionClient.ts # Backend communication
    │   ├── types/
    │   │   ├── market.ts
    │   │   ├── news.ts
    │   │   └── trade.ts
    │   └── index.ts            # Agent loop
    └── package.json
```

## Database Schema

### trades
```sql
CREATE TABLE trades (
  id INTEGER PRIMARY KEY,
  symbol TEXT,
  action TEXT,              -- BUY, SELL, HOLD
  volume REAL,
  entry_price REAL,
  stop_loss REAL,
  take_profit REAL,
  confidence REAL,          -- 0-1
  status TEXT,              -- OPEN, CLOSED
  exit_price REAL,
  profit_loss REAL,
  ai_reasoning TEXT,
  created_at DATETIME,
  closed_at DATETIME
);
```

### logs
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY,
  level TEXT,               -- info, warn, error, debug
  category TEXT,            -- trade, ai, system, api
  message TEXT,
  data TEXT,                -- JSON data
  created_at DATETIME
);
```

### account_state
```sql
CREATE TABLE account_state (
  id INTEGER PRIMARY KEY,
  balance REAL,
  equity REAL,
  margin_used REAL,
  daily_trades INTEGER,
  daily_risk_used REAL,
  updated_at DATETIME
);
```

## API Endpoints

### Trades
- `POST /api/trades/execute` - Execute trade from AI
- `GET /api/trades/active` - Get open positions
- `GET /api/trades/history?limit=50` - Get trade history
- `GET /api/trades/stats` - Get trading statistics
- `POST /api/trades/:id/close` - Close a trade

### Account
- `GET /api/account/balance` - Get account balance
- `GET /api/account/risk-summary` - Get risk metrics
- `POST /api/account/reset` - Reset demo account

### Logs
- `GET /api/logs?limit=100&category=ai` - Get filtered logs
- `DELETE /api/logs/old?days=7` - Clear old logs

### Config
- `GET /api/config` - Get system configuration

## AI Decision Making

### Input Data
1. **Market Data**
   - Current price, volume, 24h change
   - High/Low, timestamp
   - Technical indicators (SMA, RSI, trend, volatility)

2. **News Analysis**
   - Overall sentiment (positive/negative/neutral)
   - Top headlines (filtered for fake news)
   - Key topics (monetary policy, crypto, regulation, etc.)

### Processing
Gemini 3.1 analyzes:
- Technical patterns and momentum
- News impact and sentiment
- Risk/reward ratios
- Market manipulation signals

### Output
JSON trade instruction:
```json
{
  "action": "BUY|SELL|HOLD",
  "symbol": "BTC/USD",
  "volume": 250,
  "stop_loss": 41500,
  "take_profit": 43000,
  "confidence": 0.75,
  "reasoning": "Strong bullish momentum + positive sentiment"
}
```

## Security Features

1. **Environment Variables** - API keys stored securely
2. **Risk Limits** - Max trade size and daily risk caps
3. **Demo Mode** - Default safe mode with no real money
4. **Validation** - All trades validated before execution
5. **Logging** - Complete audit trail of all decisions

## Performance Considerations

1. **Polling Intervals**
   - AI decisions: 60 seconds (configurable)
   - Frontend updates: 10 seconds
   - Market data cache: 30 seconds

2. **Database**
   - SQLite for simplicity and portability
   - Indexed queries for performance
   - Automatic cleanup of old logs

3. **API Rate Limits**
   - Gemini: Built-in retry logic
   - Market data: Cached responses
   - News: Batch fetching

## Extensibility

### Add New AI Strategies
Create new classes in `ai-agent/src/services/`:
```typescript
export class MomentumStrategy {
  async analyze(data: MarketData): Promise<TradeInstruction> {
    // Your strategy logic
  }
}
```

### Add New Brokers
Create new executors in `backend/src/services/brokers/`:
```typescript
export class BinanceExecutor {
  async executeTrade(instruction: TradeInstruction) {
    // Binance API calls
  }
}
```

### Add New Data Sources
Create new providers in `ai-agent/src/services/dataProviders/`:
```typescript
export class AlphaVantageProvider {
  async fetchStockData(symbol: string) {
    // Alpha Vantage API
  }
}
```

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **AI**: Google Gemini 3.1 (via @google/generative-ai)
- **Runtime**: Bun (or Node.js)
- **Validation**: Zod
- **HTTP Client**: Axios

## Monitoring & Debugging

1. **Frontend Console** - React errors and API calls
2. **Backend Logs** - Express server output
3. **AI Agent Logs** - Decision-making process
4. **System Logs Tab** - In-app log viewer
5. **Database Queries** - Direct SQLite access if needed

```bash
# View database directly
sqlite3 backend/data/trading.db
> SELECT * FROM trades ORDER BY created_at DESC LIMIT 10;
```

---

For detailed usage instructions, see README.md and GETTING_STARTED.md
