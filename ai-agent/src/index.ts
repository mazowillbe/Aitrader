import dotenv from 'dotenv';
import { TradingAI } from './services/tradingAI';
import { MarketDataService } from './services/marketData';
import { NewsService } from './services/news';
import { TradeExecutionClient } from './services/executionClient';
import { MultiTimeframeAnalysisService } from './services/multiTimeframeAnalysis';
import { MarketRegimeDetector } from './services/marketRegimeDetector';
import { SessionManager } from './services/sessionManager';
import { EconomicCalendarService } from './services/economicCalendar';
import { SelfImprovementService } from './services/selfImprovement';
import type { MultiTimeframeAnalysis, RegimeAnalysis } from './types/enhanced';

dotenv.config();

class AutonomousTradingAgent {
  private tradingAI: TradingAI;
  private marketData: MarketDataService;
  private newsService: NewsService;
  private executionClient: TradeExecutionClient;
  private mtfService: MultiTimeframeAnalysisService;
  private regimeDetector: MarketRegimeDetector;
  private sessionManager: SessionManager;
  private calendarService: EconomicCalendarService;
  private selfImprovement: SelfImprovementService;
  private isRunning = false;
  private decisionInterval: number;

  constructor() {
    this.tradingAI = new TradingAI();
    this.marketData = new MarketDataService();
    this.newsService = new NewsService();
    this.executionClient = new TradeExecutionClient();
    this.mtfService = new MultiTimeframeAnalysisService();
    this.regimeDetector = new MarketRegimeDetector();
    this.sessionManager = new SessionManager();
    this.calendarService = new EconomicCalendarService();
    this.selfImprovement = new SelfImprovementService();
    this.decisionInterval = Number(process.env.AI_DECISION_INTERVAL) || 60000;
  }

  async start() {
    console.log('🤖 Starting Professional AI Trading Agent...');
    console.log(`📊 Decision Interval: ${this.decisionInterval}ms`);
    console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
    console.log('🔬 Features: Multi-Timeframe Analysis ✓ | Regime Detection ✓ | Session Logic ✓ | Economic Calendar ✓ | Self-Improvement ✓');

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set. Please configure in .env file.');
      process.exit(1);
    }

    this.isRunning = true;

    await this.makeDecision();

    setInterval(async () => {
      if (this.isRunning) {
        await this.makeDecision();
      }
    }, this.decisionInterval);
  }

  private async makeDecision() {
    try {
      console.log('\n🔄 Starting professional decision cycle...');

      const symbols = (process.env.SUPPORTED_SYMBOLS || 'BTC/USD,ETH/USD,EUR/USD').split(',');
      console.log(`📈 Fetching market data for: ${symbols.join(', ')}`);
      const marketDataList = await this.marketData.fetchMultipleSymbols(symbols);

      console.log('📰 Fetching news and sentiment...');
      const newsAnalysis = await this.newsService.fetchAndAnalyze();

      console.log('🕐 Detecting trading session...');
      const sessionInfo = this.sessionManager.getCurrentSession();
      console.log(`   Session: ${sessionInfo.current_session} | Volatility: ${sessionInfo.typical_volatility}`);

      for (const md of marketDataList) {
        this.sessionManager.updateAsianRange(md.symbol, md.price);
      }

      console.log('🔬 Running multi-timeframe analysis...');
      const mtfAnalysisList: MultiTimeframeAnalysis[] = await Promise.all(
        marketDataList.map((md) => this.mtfService.analyze(md.symbol, md.price))
      );

      console.log('📊 Detecting market regimes...');
      const regimeDataList: RegimeAnalysis[] = marketDataList.map((md) =>
        this.regimeDetector.detect(md)
      );

      regimeDataList.forEach((r, i) => {
        console.log(`   ${marketDataList[i]?.symbol}: ${r.regime} (ADX: ${r.adx.toFixed(0)}, Strategy: ${r.recommended_strategy})`);
      });

      console.log('📅 Checking economic calendar...');
      const economicCalendar = await this.calendarService.getCalendarData(symbols);
      if (economicCalendar.risk_level !== 'low') {
        console.log(`   ⚠️ Calendar Risk: ${economicCalendar.risk_level.toUpperCase()} | Events: ${economicCalendar.high_impact_within_4h.length} high-impact within 4h`);
      }

      console.log('📈 Fetching performance insights...');
      const performanceInsights = await this.selfImprovement.getPerformanceInsights();

      if (sessionInfo.current_session === 'OFF_HOURS') {
        console.log('🌙 Off-hours session - skipping new trade entry (position management continues)');
        return;
      }

      console.log('🧠 AI analyzing all data and making professional decision...');
      const decision = await this.tradingAI.makeDecision(
        marketDataList,
        newsAnalysis,
        mtfAnalysisList,
        regimeDataList,
        sessionInfo,
        economicCalendar,
        performanceInsights
      );

      console.log('💡 AI Professional Decision:', {
        action: decision.action,
        symbol: decision.symbol,
        confidence: `${(decision.confidence * 100).toFixed(0)}%`,
        regime: decision.market_regime,
        strategy: decision.strategy_used,
        session: decision.session,
        confluence: decision.confluence_score ? `${(decision.confluence_score * 100).toFixed(0)}%` : 'N/A'
      });

      const confidenceThreshold = 0.65 + (this.selfImprovement.getConfidenceAdjustment(performanceInsights));

      if (decision.action !== 'HOLD' && decision.confidence >= confidenceThreshold) {
        console.log(`📤 Sending enhanced trade instruction (confidence: ${(decision.confidence * 100).toFixed(0)}% >= ${(confidenceThreshold * 100).toFixed(0)}%)...`);
        const result = await this.executionClient.sendTradeInstruction(decision);

        if (result.success) {
          console.log(`✅ Trade executed! ${result.tradeId ? `Trade ID: ${result.tradeId}` : ''} | Regime: ${decision.market_regime} | Session: ${decision.session}`);
        } else {
          console.log(`⚠️ Trade execution failed: ${result.error}`);
        }
      } else if (decision.action === 'HOLD') {
        console.log('⏸️ AI decided to HOLD - no action taken');
      } else {
        console.log(`⏸️ Confidence too low: ${(decision.confidence * 100).toFixed(0)}% < ${(confidenceThreshold * 100).toFixed(0)}% threshold`);
      }

      console.log('✅ Professional decision cycle complete\n');

    } catch (error) {
      console.error('❌ Error in decision cycle:', error);
    }
  }

  stop() {
    console.log('🛑 Stopping AI Trading Agent...');
    this.isRunning = false;
  }
}

const agent = new AutonomousTradingAgent();
agent.start();

process.on('SIGINT', () => {
  agent.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  agent.stop();
  process.exit(0);
});
