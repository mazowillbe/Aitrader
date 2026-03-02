import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MarketData } from '../types/market';
import type { NewsAnalysis } from '../types/news';
import type { TradeInstruction } from '../types/trade';
import type { 
  MultiTimeframeAnalysis, 
  RegimeAnalysis, 
  SessionInfo, 
  EventRisk,
  Strategy,
  MarketRegime,
  StrategyType 
} from '../types/enhanced';
import { MultiTimeframeAnalysisService } from './multiTimeframeAnalysis';
import { MarketRegimeDetector } from './marketRegimeDetector';
import { StrategySelector } from './strategySelector';
import { SessionManager } from './sessionManager';
import { EconomicCalendarService } from './economicCalendar';

/**
 * Enhanced Trading AI powered by Gemini 3.1
 * 
 * Professional trading features:
 * - Multi-timeframe analysis
 * - Market regime detection
 * - Strategy selection
 * - Session-based logic
 * - Economic calendar awareness
 */
export class TradingAI {
  private genAI: GoogleGenerativeAI;
  private model: any;

  // Professional services
  private mtfService: MultiTimeframeAnalysisService;
  private regimeDetector: MarketRegimeDetector;
  private strategySelector: StrategySelector;
  private sessionManager: SessionManager;
  private calendarService: EconomicCalendarService;

  // Feature flags
  private enableMTF: boolean;
  private enableRegime: boolean;
  private enableSession: boolean;
  private enableCalendar: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Initialize services
    this.mtfService = new MultiTimeframeAnalysisService();
    this.regimeDetector = new MarketRegimeDetector();
    this.strategySelector = new StrategySelector();
    this.sessionManager = new SessionManager();
    this.calendarService = new EconomicCalendarService();

    // Feature flags
    this.enableMTF = process.env.ENABLE_MULTI_TIMEFRAME !== 'false';
    this.enableRegime = process.env.ENABLE_REGIME_DETECTION !== 'false';
    this.enableSession = process.env.ENABLE_SESSION_LOGIC !== 'false';
    this.enableCalendar = process.env.ENABLE_ECONOMIC_CALENDAR !== 'false';
  }

  /**
   * Make an enhanced autonomous trading decision
   */
  async makeDecision(marketData: MarketData[], newsAnalysis: NewsAnalysis): Promise<TradeInstruction> {
    try {
      // Gather all context
      const context = await this.gatherContext(marketData);

      // Check if trading should be avoided
      if (context.shouldAvoidTrading) {
        return this.createHoldDecision(context.reason || 'Risk conditions not favorable');
      }

      // Build enhanced prompt
      const prompt = this.buildEnhancedPrompt(marketData, newsAnalysis, context);

      // Get AI decision
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const decision = this.parseDecision(response);

      // Enhance decision with context
      return this.enhanceDecision(decision, context);
    } catch (error) {
      console.error('Error in AI decision making:', error);
      return this.createHoldDecision(`AI error: ${String(error)}`);
    }
  }

  /**
   * Gather all professional context
   */
  private async gatherContext(marketData: MarketData[]): Promise<{
    mtfAnalysis?: Map<string, MultiTimeframeAnalysis>;
    regimeAnalysis?: Map<string, RegimeAnalysis>;
    sessionInfo?: SessionInfo;
    eventRisk?: Map<string, EventRisk>;
    selectedStrategy?: Strategy;
    riskMultiplier: number;
    shouldAvoidTrading: boolean;
    reason?: string;
  }> {
    const context: any = {
      riskMultiplier: 1.0,
      shouldAvoidTrading: false
    };

    // Get session info
    if (this.enableSession) {
      context.sessionInfo = this.sessionManager.getCurrentSession();
      
      if (context.sessionInfo.current === 'closed') {
        context.shouldAvoidTrading = true;
        context.reason = 'Market is closed';
        return context;
      }

      context.riskMultiplier *= this.sessionManager.getSessionRiskMultiplier();
    }

    // Multi-timeframe analysis
    if (this.enableMTF && marketData.length > 0) {
      const symbols = marketData.map(m => m.symbol);
      context.mtfAnalysis = await this.mtfService.analyzeMultiple(symbols);
    }

    // Market regime detection
    if (this.enableRegime && context.mtfAnalysis) {
      context.regimeAnalysis = new Map();
      
      for (const [symbol, analysis] of context.mtfAnalysis) {
        const ohlcv = analysis.timeframes.find(t => t.timeframe === '1H')?.ohlcv || [];
        const regime = this.regimeDetector.detectRegime(ohlcv);
        
        if (regime) {
          context.regimeAnalysis.set(symbol, regime);
          this.regimeDetector.updateHistory(symbol, regime.regime, regime.confidence);
        }
      }
    }

    // Economic calendar
    if (this.enableCalendar && marketData.length > 0) {
      context.eventRisk = new Map();
      
      for (const data of marketData.slice(0, 3)) { // Check first 3 symbols
        const risk = await this.calendarService.assessEventRisk(data.symbol);
        context.eventRisk.set(data.symbol, risk);
        
        if (risk.recommendedAction === 'avoid_trading') {
          context.shouldAvoidTrading = true;
          context.reason = `High-impact event imminent for ${data.symbol}`;
          return context;
        }

        if (risk.recommendedAction === 'reduce_size') {
          context.riskMultiplier *= 0.5;
        }
      }
    }

    // Select strategy for primary symbol
    if (context.regimeAnalysis && context.sessionInfo) {
      const primarySymbol = marketData[0]?.symbol || 'BTC/USD';
      const primaryRegime = context.regimeAnalysis.get(primarySymbol);
      const primaryMTF = context.mtfAnalysis?.get(primarySymbol);

      context.selectedStrategy = this.strategySelector.selectStrategy(
        primaryRegime || null,
        primaryMTF || null,
        context.sessionInfo.current
      );

      const strategyRisk = this.strategySelector.getRiskAdjustment(
        primaryRegime || null,
        primaryMTF || null,
        context.sessionInfo.current
      );

      context.riskMultiplier *= strategyRisk;
    }

    return context;
  }

  /**
   * Build comprehensive prompt for Gemini
   */
  private buildEnhancedPrompt(
    marketData: MarketData[], 
    newsAnalysis: NewsAnalysis, 
    context: any
  ): string {
    // Build context sections
    const sessionSection = context.sessionInfo ? `
TRADING SESSION:
- Current: ${context.sessionInfo.current}
- Volatility Rating: ${context.sessionInfo.volatilityRating}
- Active Markets: ${context.sessionInfo.activeMarkets.join(', ')}
- Recommended Strategies: ${context.sessionInfo.recommendedStrategies.join(', ')}
` : '';

    const mtfSection = context.mtfAnalysis ? `
MULTI-TIMEFRAME ANALYSIS:
${this.formatMTFAnalysis(context.mtfAnalysis)}
` : '';

    const regimeSection = context.regimeAnalysis ? `
MARKET REGIME ANALYSIS:
${this.formatRegimeAnalysis(context.regimeAnalysis)}
` : '';

    const calendarSection = context.eventRisk ? `
ECONOMIC CALENDAR:
${this.formatEventRisk(context.eventRisk)}
` : '';

    const strategySection = context.selectedStrategy ? `
SELECTED STRATEGY:
- Name: ${context.selectedStrategy.name}
- Description: ${context.selectedStrategy.description}
- Stop Loss: ${context.selectedStrategy.stopLossATR}x ATR
- Take Profit: ${context.selectedStrategy.takeProfitATR}x ATR
- Min Confluence Required: ${context.selectedStrategy.minConfluence}
` : '';

    return `You are a professional autonomous trading AI with advanced market analysis capabilities.

MARKET DATA:
${JSON.stringify(marketData, null, 2)}

NEWS & SENTIMENT ANALYSIS:
${JSON.stringify(newsAnalysis, null, 2)}
${sessionSection}${mtfSection}${regimeSection}${calendarSection}${strategySection}

RISK MANAGEMENT:
- Position Size Multiplier: ${(context.riskMultiplier * 100).toFixed(0)}% of normal
- ${context.shouldAvoidTrading ? '⚠️ TRADING CURRENTLY NOT RECOMMENDED' : ''}

INSTRUCTIONS:
1. Analyze all market data using technical analysis (trends, momentum, support/resistance, volume)
2. Consider multi-timeframe alignment and confluence
3. Factor in market regime and optimal strategy
4. Account for trading session characteristics
5. Consider economic calendar risks
6. Analyze news and sentiment - IGNORE fake news, hype, and market manipulation
7. Make an autonomous trading decision (BUY, SELL, or HOLD)
8. Set appropriate stop loss and take profit levels
9. Assign a confidence score (0-1) based on signal strength

RISK MANAGEMENT RULES:
- Only trade when confidence > 0.6 and confluence > 0.5
- Stop loss should be 1.5-3x ATR from entry
- Take profit should be 1.5-3x the risk (risk/reward ratio)
- Position sizing based on volatility and regime
- Consider session-based risk adjustments

OUTPUT FORMAT (JSON ONLY):
{
  "action": "BUY|SELL|HOLD",
  "symbol": "SYMBOL",
  "volume": NUMBER (in base currency, e.g., 100 for $100 position),
  "stop_loss": NUMBER (price level),
  "take_profit": NUMBER (price level),
  "confidence": NUMBER (0-1),
  "reasoning": "Brief explanation of the decision (max 200 chars)",
  "market_regime": "DETECTED_REGIME",
  "strategy": "SELECTED_STRATEGY",
  "timeframe_bias": "TREND_DIRECTION"
}

IMPORTANT:
- Output ONLY valid JSON, no markdown, no explanations outside JSON
- Be conservative - it's okay to HOLD when uncertain
- Consider all professional analysis factors
- Respect risk multiplier adjustments

Generate your trading decision now:`;
  }

  /**
   * Format MTF analysis for prompt
   */
  private formatMTFAnalysis(mtfAnalysis: Map<string, MultiTimeframeAnalysis>): string {
    const lines: string[] = [];
    
    for (const [symbol, analysis] of mtfAnalysis) {
      lines.push(`${symbol}:`);
      lines.push(`  Confluence Score: ${(analysis.confluence.score * 100).toFixed(0)}%`);
      lines.push(`  Trend Alignment: ${analysis.confluence.trendAlignment}`);
      lines.push(`  Recommendation: ${analysis.recommendation.bias} (${(analysis.recommendation.strength * 100).toFixed(0)}% strength)`);
      
      if (analysis.keyLevels.support.length > 0) {
        lines.push(`  Key Support: ${analysis.keyLevels.support.slice(0, 2).map(s => s.toFixed(2)).join(', ')}`);
      }
      if (analysis.keyLevels.resistance.length > 0) {
        lines.push(`  Key Resistance: ${analysis.keyLevels.resistance.slice(0, 2).map(r => r.toFixed(2)).join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format regime analysis for prompt
   */
  private formatRegimeAnalysis(regimeAnalysis: Map<string, RegimeAnalysis>): string {
    const lines: string[] = [];
    
    for (const [symbol, regime] of regimeAnalysis) {
      lines.push(`${symbol}:`);
      lines.push(`  Regime: ${regime.regime}`);
      lines.push(`  Confidence: ${(regime.confidence * 100).toFixed(0)}%`);
      lines.push(`  ADX: ${regime.indicators.adx.toFixed(1)} (${regime.indicators.adxTrendStrength} trend)`);
      lines.push(`  Volatility: ${regime.indicators.volatilityRegime} (${regime.indicators.volatilityRank.toFixed(0)}th percentile)`);
      
      if (regime.indicators.bbSqueeze) {
        lines.push(`  ⚠️ Bollinger Band squeeze detected`);
      }
      if (regime.transitionProbability > 0.4) {
        lines.push(`  ℹ️ High regime change probability (${(regime.transitionProbability * 100).toFixed(0)}%)`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format event risk for prompt
   */
  private formatEventRisk(eventRisk: Map<string, EventRisk>): string {
    const lines: string[] = [];
    
    for (const [symbol, risk] of eventRisk) {
      lines.push(`${symbol}:`);
      lines.push(`  Risk Level: ${risk.riskLevel}`);
      lines.push(`  Affected Currencies: ${risk.affectedCurrencies.join(', ')}`);
      
      if (risk.hasHighImpactEvent) {
        lines.push(`  ⚠️ High-impact event in ${risk.nextEventMinutes} minutes`);
      }
      
      if (risk.recommendedAction !== 'none') {
        lines.push(`  Recommended Action: ${risk.recommendedAction}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Parse AI response and extract JSON trade instruction
   */
  private parseDecision(response: string): TradeInstruction {
    try {
      let jsonStr = response.trim();

      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }

      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const decision = JSON.parse(jsonStr);

      if (!decision.action || !decision.symbol || decision.confidence === undefined) {
        throw new Error('Missing required fields in AI response');
      }

      decision.action = decision.action.toUpperCase();

      if (!['BUY', 'SELL', 'HOLD'].includes(decision.action)) {
        throw new Error(`Invalid action: ${decision.action}`);
      }

      return decision;
    } catch (error) {
      console.error('Failed to parse AI decision:', error);
      console.error('Raw response:', response);

      return this.createHoldDecision('Failed to parse AI response');
    }
  }

  /**
   * Enhance decision with context metadata
   */
  private enhanceDecision(
    decision: TradeInstruction, 
    context: any
  ): TradeInstruction {
    // Add professional metadata
    if (context.regimeAnalysis) {
      const regime = context.regimeAnalysis.get(decision.symbol);
      if (regime) {
        decision.market_regime = regime.regime;
      }
    }

    if (context.selectedStrategy) {
      decision.strategy_used = context.selectedStrategy.name;
    }

    if (context.sessionInfo) {
      decision.session = context.sessionInfo.current;
    }

    if (context.mtfAnalysis) {
      const mtf = context.mtfAnalysis.get(decision.symbol);
      if (mtf) {
        decision.confluence_score = mtf.confluence.score;
        decision.timeframe_alignment = mtf.confluence.trendAlignment;
      }
    }

    if (context.eventRisk) {
      const risk = context.eventRisk.get(decision.symbol);
      if (risk) {
        decision.economic_event_risk = risk.riskLevel;
      }
    }

    // Adjust volume based on risk multiplier
    if (decision.action !== 'HOLD' && context.riskMultiplier !== 1) {
      decision.volume = Math.round(decision.volume * context.riskMultiplier);
      decision.position_size_percent = context.riskMultiplier * 2; // Assuming 2% base risk
    }

    // Add trailing stop configuration if strategy defined
    if (context.selectedStrategy) {
      decision.trailing_stop_type = 'atr';
      decision.partial_exits = [
        { level: 1, percentage: 25 },
        { level: 2, percentage: 25 },
        { level: 3, percentage: 25 }
      ];
    }

    return decision;
  }

  /**
   * Create a HOLD decision with reason
   */
  private createHoldDecision(reason: string): TradeInstruction {
    return {
      action: 'HOLD',
      symbol: 'BTC/USD',
      volume: 0,
      stop_loss: 0,
      take_profit: 0,
      confidence: 0,
      reasoning: reason
    };
  }

  /**
   * Get market regime for a symbol (for external use)
   */
  getMarketRegime(symbol: string): RegimeAnalysis | undefined {
    return this.regimeDetector.getHistory(symbol).slice(-1)[0] as any;
  }

  /**
   * Get current session info (for external use)
   */
  getCurrentSession(): SessionInfo {
    return this.sessionManager.getCurrentSession();
  }
}
