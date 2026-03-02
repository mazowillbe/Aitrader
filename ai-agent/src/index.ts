import dotenv from 'dotenv';
import { TradingAI } from './services/tradingAI';
import { MarketDataService } from './services/marketData';
import { NewsService } from './services/news';
import { TradeExecutionClient } from './services/executionClient';

dotenv.config();

/**
 * Autonomous AI Trading Agent
 *
 * This agent runs continuously and:
 * 1. Fetches live market data
 * 2. Analyzes news and sentiment
 * 3. Makes autonomous trading decisions using Gemini 3.1
 * 4. Sends trade instructions to backend for execution
 */
class AutonomousTradingAgent {
  private tradingAI: TradingAI;
  private marketData: MarketDataService;
  private newsService: NewsService;
  private executionClient: TradeExecutionClient;
  private isRunning = false;
  private decisionInterval: number;

  constructor() {
    this.tradingAI = new TradingAI();
    this.marketData = new MarketDataService();
    this.newsService = new NewsService();
    this.executionClient = new TradeExecutionClient();
    this.decisionInterval = Number(process.env.AI_DECISION_INTERVAL) || 60000; // Default: 60 seconds
  }

  /**
   * Start the autonomous trading loop
   */
  async start() {
    console.log('🤖 Starting Autonomous AI Trading Agent...');
    console.log(`📊 Decision Interval: ${this.decisionInterval}ms`);
    console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set. Please configure in .env file.');
      process.exit(1);
    }

    this.isRunning = true;

    // Run initial decision immediately
    await this.makeDecision();

    // Then run on interval
    setInterval(async () => {
      if (this.isRunning) {
        await this.makeDecision();
      }
    }, this.decisionInterval);
  }

  /**
   * Core decision-making loop
   */
  private async makeDecision() {
    try {
      console.log('\n🔄 Starting new decision cycle...');

      // Step 1: Fetch market data for all supported symbols
      const symbols = (process.env.SUPPORTED_SYMBOLS || 'BTC/USD,ETH/USD,EUR/USD').split(',');
      console.log(`📈 Fetching market data for: ${symbols.join(', ')}`);
      const marketData = await this.marketData.fetchMultipleSymbols(symbols);

      // Step 2: Fetch and analyze news/sentiment
      console.log('📰 Fetching news and sentiment...');
      const newsAnalysis = await this.newsService.fetchAndAnalyze();

      // Step 3: Use Gemini 3.1 to make trading decision
      console.log('🧠 AI analyzing data and making decision...');
      const decision = await this.tradingAI.makeDecision(marketData, newsAnalysis);

      console.log('💡 AI Decision:', {
        action: decision.action,
        symbol: decision.symbol,
        confidence: decision.confidence,
        volume: decision.volume
      });

      // Step 4: Send decision to backend for execution
      if (decision.action !== 'HOLD' || decision.confidence > 0.3) {
        console.log('📤 Sending trade instruction to backend...');
        const result = await this.executionClient.sendTradeInstruction(decision);

        if (result.success) {
          console.log(`✅ Trade executed successfully! ${result.tradeId ? `Trade ID: ${result.tradeId}` : ''}`);
        } else {
          console.log(`⚠️ Trade execution failed: ${result.error}`);
        }
      } else {
        console.log('⏸️ AI decided to HOLD with low confidence - no action taken');
      }

      console.log('✅ Decision cycle complete\n');

    } catch (error) {
      console.error('❌ Error in decision cycle:', error);
      // Continue running despite errors
    }
  }

  /**
   * Stop the trading agent
   */
  stop() {
    console.log('🛑 Stopping AI Trading Agent...');
    this.isRunning = false;
  }
}

// Start the agent
const agent = new AutonomousTradingAgent();
agent.start();

// Graceful shutdown
process.on('SIGINT', () => {
  agent.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  agent.stop();
  process.exit(0);
});
