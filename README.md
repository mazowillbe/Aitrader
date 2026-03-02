# 🤖 Autonomous AI Trading System

A fully autonomous AI trading system powered by **Gemini 3.1** that analyzes markets, makes trading decisions, and executes trades without human intervention.

## 🌟 Features

### AI Agent (Gemini 3.1)
- ✅ Fetches live market data (crypto, forex, stocks)
- ✅ Analyzes news and social sentiment
- ✅ Filters fake news, noise, and market manipulation
- ✅ Makes autonomous trading decisions using technical + fundamental analysis
- ✅ Outputs structured JSON trade instructions
- ✅ Operates continuously without human confirmation

### Backend (Node.js + TypeScript)
- ✅ Receives AI trade instructions via REST API
- ✅ Executes trades (demo mode with simulated execution)
- ✅ Logs all trades, AI decisions, and outcomes to SQLite database
- ✅ Provides endpoints for frontend data retrieval
- ✅ Risk management with configurable limits

### Frontend (React + Vite + TypeScript + Tailwind)
- ✅ Real-time dashboard displaying active trades
- ✅ Account balance and equity tracking
- ✅ Risk summary and daily limits
- ✅ Trade history with P/L analytics
- ✅ System logs showing AI decisions
- ✅ View-only interface (AI is fully autonomous)

### Safety & Security
- ✅ Demo mode enabled by default (no real money at risk)
- ✅ Configurable max trade size and daily risk limits
- ✅ Secure environment variable storage for API keys
- ✅ Trade validation and risk checks before execution

## 📁 Project Structure

```
ai-trading-system/
├── frontend/              # React + Vite dashboard
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── lib/         # API client
│   │   └── App.tsx      # Main app
│
├── backend/              # Express + TypeScript API
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── services/    # Trade executor, database, logger
│   │   └── index.ts     # Server entry
│
├── ai-agent/             # Autonomous AI trading agent
│   ├── src/
│   │   ├── services/    # Gemini AI, market data, news
│   │   ├── types/       # TypeScript types
│   │   └── index.ts     # Agent loop
│
└── README.md            # This file
```

## 🚀 Quick Start (Demo Mode)

### Prerequisites
- **Node.js** 18+ or **Bun**
- **Gemini API Key** (get free at https://aistudio.google.com/app/apikey)

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
bun install  # or npm install

# Install AI agent dependencies
cd ../ai-agent
bun install  # or npm install

# Install frontend dependencies
cd ..
bun install  # or npm install
```

### 2. Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
# Edit .env - defaults are fine for demo mode
```

**AI Agent (.env):**
```bash
cd ai-agent
cp .env.example .env
# IMPORTANT: Add your Gemini API key
nano .env  # or use your editor
```

Set your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Start the System

**Terminal 1 - Backend:**
```bash
cd backend
bun run dev  # or npm run dev
```

**Terminal 2 - AI Agent:**
```bash
cd ai-agent
bun run dev  # or npm run dev
```

**Terminal 3 - Frontend:**
```bash
bun run dev  # or npm run dev
```

### 4. Open Dashboard

Navigate to: **http://localhost:5173**

You'll see:
- Real-time account balance ($10,000 demo)
- Active trades as AI makes decisions
- Trade history and P/L
- System logs showing AI reasoning
- Risk management metrics

## 🧠 How It Works

### The Autonomous Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     AI AGENT (Gemini 3.1)                    │
│                                                              │
│  1. Fetch Market Data (crypto, forex, stocks)               │
│  2. Fetch News & Sentiment                                  │
│  3. Filter Noise & Fake News                                │
│  4. Analyze with Technical + Fundamental Indicators         │
│  5. Make Decision (BUY/SELL/HOLD)                           │
│  6. Output JSON Trade Instruction                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API                             │
│                                                              │
│  1. Receive Trade Instruction                               │
│  2. Validate Against Risk Limits                            │
│  3. Execute Trade (Demo or Live)                            │
│  4. Log to Database                                         │
│  5. Update Account State                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND DASHBOARD                        │
│                                                              │
│  • Display Active Trades                                    │
│  • Show Account Balance & P/L                               │
│  • Log AI Decisions                                         │
│  • Monitor Risk Metrics                                     │
└─────────────────────────────────────────────────────────────┘
```

### AI Decision Making

The AI agent runs every 60 seconds and:

1. **Gathers Data**
   - Market prices, volume, trends
   - Technical indicators (SMA, RSI, volatility)
   - News headlines and sentiment

2. **Filters Noise**
   - Removes clickbait and fake news
   - Ignores obvious market manipulation
   - Focuses on reliable sources

3. **Analyzes**
   - Technical analysis (trends, support/resistance)
   - Fundamental analysis (news impact)
   - Risk/reward calculation

4. **Decides**
   - BUY if bullish signals + high confidence
   - SELL if bearish signals + high confidence
   - HOLD if uncertain or low confidence

5. **Executes**
   - Sets stop loss (2-5% from entry)
   - Sets take profit (1.5-3x risk)
   - Only trades if confidence > 60%

### Trade Instruction Format

```json
{
  "action": "BUY",
  "symbol": "BTC/USD",
  "volume": 250,
  "stop_loss": 41500,
  "take_profit": 43000,
  "confidence": 0.75,
  "reasoning": "Strong bullish momentum + positive news sentiment"
}
```

## ⚙️ Configuration

### Backend Settings (.env)

```env
PORT=3001                      # Backend API port
TRADING_MODE=DEMO              # DEMO or LIVE
MAX_TRADE_SIZE=1000            # Maximum $ per trade
MAX_DAILY_RISK=500             # Maximum $ daily risk
SUPPORTED_SYMBOLS=BTC/USD,ETH/USD,EUR/USD,AAPL,TSLA
```

### AI Agent Settings (.env)

```env
GEMINI_API_KEY=your_key        # Required: Your Gemini API key
BACKEND_URL=http://localhost:3001
AI_DECISION_INTERVAL=60000     # Decision frequency (ms)
SUPPORTED_SYMBOLS=BTC/USD,ETH/USD,EUR/USD,AAPL,TSLA

# Optional: Real market data APIs
COINGECKO_API_KEY=             # CoinGecko for crypto
ALPHA_VANTAGE_API_KEY=         # Alpha Vantage for stocks
NEWS_API_KEY=                  # NewsAPI for news
```

## 🔄 Switching to LIVE Mode

⚠️ **WARNING: Live mode executes real trades with real money!**

1. **Configure Broker API**
   - Get MT5 or broker API credentials
   - Add to backend/.env:
   ```env
   TRADING_MODE=LIVE
   MT5_API_KEY=your_mt5_key
   MT5_API_URL=https://your-mt5-api.com
   ```

2. **Implement Broker Integration**
   - Edit `backend/src/services/tradeExecutor.ts`
   - Uncomment and complete the `executeLiveTrade()` function
   - Add your broker's API calls

3. **Test Thoroughly**
   - Start with minimal trade sizes
   - Monitor closely for the first few days
   - Verify all trades execute correctly

4. **Set Conservative Limits**
   ```env
   MAX_TRADE_SIZE=100          # Start small
   MAX_DAILY_RISK=50           # Limit daily exposure
   ```

## 📊 API Endpoints

### Backend API (Port 3001)

**Trades:**
- `POST /api/trades/execute` - Execute trade instruction from AI
- `GET /api/trades/active` - Get open positions
- `GET /api/trades/history` - Get trade history
- `GET /api/trades/stats` - Get trading statistics

**Account:**
- `GET /api/account/balance` - Get account balance
- `GET /api/account/risk-summary` - Get risk metrics
- `POST /api/account/reset` - Reset demo account

**Logs:**
- `GET /api/logs` - Get system logs
- `GET /api/logs?category=ai` - Filter by category

**Config:**
- `GET /api/config` - Get system configuration

## 🧩 Extending the System

### Add New AI Sub-agents

Create specialized agents for different strategies:

```typescript
// ai-agent/src/services/momentumAgent.ts
export class MomentumAgent {
  async analyze(marketData: MarketData[]): Promise<TradeInstruction> {
    // Your momentum strategy
  }
}
```

### Add New Brokers

Implement new broker integrations:

```typescript
// backend/src/services/brokers/binance.ts
export class BinanceExecutor {
  async executeTrade(instruction: TradeInstruction) {
    // Binance API implementation
  }
}
```

### Add New Data Sources

Integrate additional market data:

```typescript
// ai-agent/src/services/dataProviders/polygon.ts
export class PolygonDataProvider {
  async fetchStockData(symbol: string) {
    // Polygon.io API
  }
}
```

## 🐛 Troubleshooting

### AI Agent Not Starting
- ✅ Check Gemini API key is set in `.env`
- ✅ Verify backend is running on port 3001
- ✅ Check logs for connection errors

### No Trades Being Made
- ✅ AI may be in HOLD mode due to low confidence
- ✅ Check system logs for AI reasoning
- ✅ Market conditions may not meet criteria

### Frontend Not Connecting
- ✅ Ensure backend is running
- ✅ Check CORS settings if frontend is on different port
- ✅ Verify API endpoints in browser console

### Database Errors
- ✅ Delete `backend/data/trading.db` to reset
- ✅ Restart backend to reinitialize database

## 📈 Performance Tips

1. **Reduce Decision Interval** (for faster trading):
   ```env
   AI_DECISION_INTERVAL=30000  # 30 seconds
   ```

2. **Add Real Market Data APIs** for better accuracy:
   - CoinGecko for crypto
   - Alpha Vantage for stocks
   - NewsAPI for news

3. **Fine-tune AI Prompt** in `ai-agent/src/services/tradingAI.ts`

4. **Adjust Risk Parameters** for your risk tolerance

## 🔒 Security Best Practices

- ✅ Never commit `.env` files to git
- ✅ Use environment-specific API keys
- ✅ Rotate API keys regularly
- ✅ Monitor trade logs for anomalies
- ✅ Set reasonable risk limits
- ✅ Use read-only API keys when possible

## 📝 License

MIT License - Educational purposes only. Not financial advice.

## ⚠️ Disclaimer

This system is for **educational and demonstration purposes only**.

- Trading involves substantial risk of loss
- Past performance does not guarantee future results
- Always test thoroughly before using real money
- The AI may make incorrect decisions
- You are responsible for all trading outcomes

**USE AT YOUR OWN RISK. NOT FINANCIAL ADVICE.**

## 🤝 Contributing

Contributions welcome! Feel free to:
- Add new AI strategies
- Improve technical indicators
- Add broker integrations
- Enhance the UI
- Fix bugs

## 📧 Support

For issues or questions:
1. Check the logs in the System Logs tab
2. Review this README
3. Check the code comments for details

---

**Built with ❤️ using Gemini 3.1, TypeScript, React, and Node.js**
