# 🚀 Getting Started with AI Trading System

## Quick Start (5 minutes)

### Step 1: Get Your Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

### Step 2: Configure AI Agent

```bash
cd ai-trading-system/ai-agent
nano .env  # or use your preferred editor
```

Update the file:
```env
GEMINI_API_KEY=paste_your_actual_key_here
```

Save and exit.

### Step 3: Start All Services

Open **3 separate terminals**:

**Terminal 1 - Backend:**
```bash
cd ai-trading-system/backend
bun run dev
```
Wait for: `🚀 Backend server running on port 3001`

**Terminal 2 - AI Agent:**
```bash
cd ai-trading-system/ai-agent
bun run dev
```
Wait for: `🤖 Starting Autonomous AI Trading Agent...`

**Terminal 3 - Frontend:**
```bash
cd ai-trading-system
bun run dev
```
Wait for: `Local: http://localhost:5173/`

### Step 4: Open Dashboard

1. Navigate to: **http://localhost:5173**
2. You should see:
   - Account balance: $10,000 (demo)
   - System status: Active
   - Demo mode badge

### Step 5: Watch It Trade!

The AI agent will:
- Analyze markets every 60 seconds
- Make autonomous trading decisions
- Execute trades automatically
- Display results in the dashboard

**Check the "System Logs" tab** to see the AI's reasoning in real-time!

## What You'll See

### Active Trades Tab
- Open positions the AI has taken
- Entry prices and stop loss/take profit levels
- AI confidence percentage
- Reasoning for each trade

### History Tab
- All past trades
- Profit/Loss for each trade
- Win/loss statistics

### Account Tab
- Current balance and equity
- Risk management metrics
- Daily trade limits
- AI configuration details

### System Logs Tab
- Real-time AI decisions
- Market analysis
- Trade execution logs
- Filter by category (AI, Trade, System)

## Troubleshooting

### "Backend not responding"
- Make sure Terminal 1 shows the backend is running
- Check port 3001 is not used by another service

### "AI Agent not making trades"
- Verify your Gemini API key is set correctly in `ai-agent/.env`
- Check the System Logs for AI reasoning (it may be choosing to HOLD)
- The AI only trades when confidence > 60%

### "No data on dashboard"
- Ensure the backend is running BEFORE opening the frontend
- Refresh the page (Ctrl+R or Cmd+R)

## Demo Features

✅ **Safe to Use** - No real money involved
✅ **$10,000 Starting Balance** - Virtual funds for testing
✅ **Realistic Market Data** - Simulated crypto, forex, and stock prices
✅ **Full AI Autonomy** - Gemini 3.1 makes all decisions
✅ **Reset Anytime** - Click "Reset Account" to start over

## Next Steps

1. **Monitor Performance** - Watch how the AI performs over time
2. **Read System Logs** - Understand the AI's decision-making process
3. **Adjust Settings** - Modify risk limits in `backend/.env`
4. **Add Real Data** - Configure market data APIs (see README)

## Going Live (Advanced)

⚠️ **NOT RECOMMENDED** until thoroughly tested!

See the main README.md for instructions on:
- Connecting to real broker APIs
- Switching to LIVE mode
- Setting conservative limits

---

**Questions?** Check the comprehensive README.md file for details.

**Enjoy autonomous AI trading!** 🤖📈
