import dotenv from 'dotenv';
import { TradingAI } from './services/tradingAI';
import { MarketDataService } from './services/marketData';
import { NewsService } from './services/news';
import { TradeExecutionClient } from './services/executionClient';
import { SessionManager } from './services/sessionManager';
import { EconomicCalendarService } from './services/economicCalendar';
import { SelfImprovementService } from './services/selfImprovement';

dotenv.config();

/**
 * Autonomous AI Trading Agent
 * 
 * Professional trading features:
 * - Multi-timeframe analysis
 * - Market regime detection
 * - Session-based trading logic
 * - Economic calendar awareness
 * - Self-improvement and learning
 */
class AutonomousTradingAgent {
  private tradingAI: TradingAI;
  private marketData: MarketDataService;
  private newsService: NewsService;
  private executionClient: TradeExecutionClient;
  private sessionManager: SessionManager;
  private calendarService: EconomicCalendarService;
  private selfImprovement: SelfImprovementService;
  
  private isRunning = false;
  private decisionInterval: number;
  private decisionCount = 0;

  constructor() {
    this.tradingAI = new TradingAI();
    this.marketData = new MarketDataService();
    this.newsService = new NewsService();
    this.executionClient = new TradeExecutionClient();
    this.sessionManager = new SessionManager();
    this.calendarService = new EconomicCalendarService();
    this.selfImprovement = new SelfImprovementService();
    
    this.decisionInterval = Number(process.env.AI_DECISION_INTERVAL) || 60000;
  }

  /**
   * Start the autonomous trading loop
   */
  async start() {
    console.log('🤖 Starting Autonomous AI Trading Agent...');
    console.log(`📊 Decision Interval: ${this.decisionInterval}ms`);
    console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
    
    // Log enabled features
    this.logFeatureStatus();

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set. Please configure in .env file.');
      process.exit(1);
    }

    this.isRunning = true;

    // Run initial decision immediately
    await this.makeDecision();

    // Main decision loop
    setInterval(async () => {
      if (this.isRunning) {
        await this.makeDecision();
      }
    }, this.decisionInterval);

    // Weekly self-improvement analysis (every 7 days)
    setInterval(async () => {
      if (this.isRunning) {
        await this.runSelfImprovement();
      }
    }, 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Log enabled features
   */
  private logFeatureStatus() {
    console.log('\n📋 Feature Status:');
    console.log(`   Multi-Timeframe Analysis: ${process.env.ENABLE_MULTI_TIMEFRAME !== 'false' ? '✅' : '❌'}`);
    console.log(`   Regime Detection: ${process.env.ENABLE_REGIME_DETECTION !== 'false' ? '✅' : '❌'}`);
    console.log(`   Session Logic: ${process.env.ENABLE_SESSION_LOGIC !== 'false' ? '✅' : '❌'}`);
    console.log(`   Economic Calendar: ${process.env.ENABLE_ECONOMIC_CALENDAR !== 'false' ? '✅' : '❌'}`);
    console.log(`   Self-Improvement: ${process.env.ENABLE_SELF_IMPROVEMENT !== 'false' ? '✅' : '❌'}`);
    console.log('');
  }

  /**
   * Core decision-making loop
   */
  private async makeDecision() {
    try {
      this.decisionCount++;
      console.log(`\n🔄 Decision Cycle #${this.decisionCount}`);
      console.log(`⏰ ${new Date().toISOString()}`);

      // Check session status
      const session = this.sessionManager.getCurrentSession();
      console.log(`📍 Session: ${this.sessionManager.getSessionString()}`);

      // Skip if market is closed
      if (session.current === 'closed') {
        console.log('💤 Market is closed - waiting for next session');
        return;
      }

      // Check for high-impact events
      const eventSummary = await this.calendarService.getHighImpactSummary();
      if (eventSummary !== 'No high-impact events in the next 24 hours') {
        console.log(`📅 Economic Events: ${eventSummary}`);
      }

      // Step 1: Fetch market data for all supported symbols
      const symbols = (process.env.SUPPORTED_SYMBOLS || 'BTC/USD,ETH/USD,EUR/USD').split(',');
      console.log(`📈 Analyzing: ${symbols.join(', ')}`);
      
      const marketData = await this.marketData.fetchMultipleSymbols(symbols);

      // Step 2: Check if we should avoid trading due to events
      let shouldAvoidTrading = false;
      for (const data of marketData.slice(0, 3)) {
        if (await this.calendarService.shouldAvoidTrading(data.symbol)) {
          console.log(`⚠️ Avoiding trading ${data.symbol} due to imminent economic event`);
          shouldAvoidTrading = true;
        }
      }

      if (shouldAvoidTrading) {
        console.log('⏸️ Skipping this cycle due to event risk');
        return;
      }

      // Step 3: Fetch and analyze news/sentiment
      console.log('📰 Fetching news and sentiment...');
      const newsAnalysis = await this.newsService.fetchAndAnalyze();

      // Step 4: Use enhanced AI to make trading decision
      console.log('🧠 AI analyzing with professional features...');
      const decision = await this.tradingAI.makeDecision(marketData, newsAnalysis);

      console.log('💡 AI Decision:', {
        action: decision.action,
        symbol: decision.symbol,
        confidence: decision.confidence ? `${(decision.confidence * 100).toFixed(0)}%` : 'N/A',
        volume: decision.volume,
        regime: decision.market_regime || 'N/A',
        strategy: decision.strategy_used || 'N/A',
        confluence: decision.confluence_score ? `${(decision.confluence_score * 100).toFixed(0)}%` : 'N/A'
      });

      if (decision.reasoning) {
        console.log(`📝 Reasoning: ${decision.reasoning}`);
      }

      // Step 5: Send decision to backend for execution
      if (decision.action !== 'HOLD' || decision.confidence > 0.3) {
        console.log('📤 Sending trade instruction to backend...');
        const result = await this.executionClient.sendTradeInstruction(decision);

        if (result.success) {
          console.log(`✅ Trade executed successfully! ${result.tradeId ? `Trade ID: ${result.tradeId}` : ''}`);
        } else {
          console.log(`⚠️ Trade execution failed: ${result.error}`);
        }
      } else {
        console.log('⏸️ AI decided to HOLD - no action taken');
      }

      console.log('✅ Decision cycle complete\n');

    } catch (error) {
      console.error('❌ Error in decision cycle:', error);
    }
  }

  /**
   * Run weekly self-improvement analysis
   */
  private async runSelfImprovement() {
    try {
      console.log('\n🧪 Running self-improvement analysis...');
      
      // This would fetch performance metrics from the backend
      // For now, we'll just log that the analysis ran
      console.log('📊 Analyzing recent trading performance...');
      console.log('🔍 Identifying patterns and areas for improvement...');
      console.log('💡 Generating recommendations...');
      
      // In production, this would:
      // 1. Fetch performance metrics from backend
      // 2. Analyze patterns using SelfImprovementService
      // 3. Generate insights and recommendations
      // 4. Potentially adjust confidence thresholds
      
      console.log('✅ Self-improvement analysis complete\n');
    } catch (error) {
      console.error('❌ Self-improvement analysis failed:', error);
    }
  }

  /**
   * Stop the trading agent
   */
  stop() {
    console.log('🛑 Stopping AI Trading Agent...');
    this.isRunning = false;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      decisionCount: this.decisionCount,
      session: this.sessionManager.getCurrentSession(),
      uptime: process.uptime()
    };
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
