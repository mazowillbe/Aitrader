import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MarketData } from '../types/market';
import type { NewsAnalysis } from '../types/news';
import type {
  MultiTimeframeAnalysis,
  RegimeAnalysis,
  SessionInfo,
  EconomicCalendarData,
  PerformanceInsight,
  EnhancedTradeInstruction
} from '../types/enhanced';

export class TradingAI {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async makeDecision(
    marketData: MarketData[],
    newsAnalysis: NewsAnalysis,
    mtfAnalysis?: MultiTimeframeAnalysis[],
    regimeData?: RegimeAnalysis[],
    sessionInfo?: SessionInfo,
    economicCalendar?: EconomicCalendarData,
    performanceInsights?: PerformanceInsight | null
  ): Promise<EnhancedTradeInstruction> {
    try {
      const prompt = this.buildEnhancedPrompt(
        marketData,
        newsAnalysis,
        mtfAnalysis,
        regimeData,
        sessionInfo,
        economicCalendar,
        performanceInsights
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const decision = this.parseDecision(text);

      if (regimeData && regimeData.length > 0) {
        const primaryRegime = regimeData[0];
        decision.market_regime = primaryRegime.regime;
        decision.strategy_used = primaryRegime.recommended_strategy;

        if (decision.action !== 'HOLD') {
          const adjustedConfidence =
            decision.confidence + primaryRegime.confidence_adjustment;
          decision.confidence = Math.max(0, Math.min(1, adjustedConfidence));

          decision.volume = decision.volume * primaryRegime.position_size_multiplier;
        }
      }

      if (sessionInfo) {
        decision.session = sessionInfo.current_session;
      }

      if (mtfAnalysis && mtfAnalysis.length > 0) {
        decision.confluence_score = mtfAnalysis[0].confluence_score;
        decision.timeframe_alignment = mtfAnalysis[0].trend_alignment;
      }

      if (economicCalendar) {
        decision.economic_events = economicCalendar.high_impact_within_4h
          .map((e) => e.event_name)
          .join(', ');

        if (economicCalendar.should_avoid_trading && decision.action !== 'HOLD') {
          decision.action = 'HOLD';
          decision.reasoning = `Trading paused: High-impact economic event within 1 hour. ${decision.reasoning || ''}`;
          decision.confidence = 0;
          decision.volume = 0;
        } else if (economicCalendar.position_size_reduction > 0 && decision.action !== 'HOLD') {
          decision.volume *= 1 - economicCalendar.position_size_reduction;
        }
      }

      return decision;
    } catch (error) {
      console.error('Error in AI decision making:', error);
      return {
        action: 'HOLD',
        symbol: marketData[0]?.symbol || 'BTC/USD',
        volume: 0,
        stop_loss: 0,
        take_profit: 0,
        confidence: 0,
        reasoning: `AI error: ${String(error)}`
      };
    }
  }

  private buildEnhancedPrompt(
    marketData: MarketData[],
    newsAnalysis: NewsAnalysis,
    mtfAnalysis?: MultiTimeframeAnalysis[],
    regimeData?: RegimeAnalysis[],
    sessionInfo?: SessionInfo,
    economicCalendar?: EconomicCalendarData,
    performanceInsights?: PerformanceInsight | null
  ): string {
    const mtfSection = mtfAnalysis
      ? `\nMULTI-TIMEFRAME ANALYSIS:
${mtfAnalysis
  .map(
    (m) => `
  Symbol: ${m.symbol}
  Confluence Score: ${(m.confluence_score * 100).toFixed(0)}%
  Trend Alignment: ${m.trend_alignment}
  Recommended Direction: ${m.recommended_direction}
  Key Support: ${m.key_support_levels.map((l) => l.toFixed(4)).join(', ')}
  Key Resistance: ${m.key_resistance_levels.map((l) => l.toFixed(4)).join(', ')}
  Timeframes: ${m.timeframes.map((tf) => `${tf.timeframe}=${tf.trend},RSI=${tf.rsi.toFixed(0)}`).join(' | ')}`
  )
  .join('\n')}`
      : '';

    const regimeSection = regimeData
      ? `\nMARKET REGIME ANALYSIS:
${regimeData
  .map(
    (r) => `
  Regime: ${r.regime}
  ADX: ${r.adx.toFixed(0)} (Trend Strength: ${r.trend_strength})
  ATR Percentile: ${r.atr_percentile.toFixed(0)}th percentile
  Is Trending: ${r.is_trending} | Is Ranging: ${r.is_ranging}
  Recommended Strategy: ${r.recommended_strategy}
  Position Size Multiplier: ${r.position_size_multiplier}x`
  )
  .join('\n')}`
      : '';

    const sessionSection = sessionInfo
      ? `\nTRADING SESSION:
  Current Session: ${sessionInfo.current_session}
  Typical Volatility: ${sessionInfo.typical_volatility}
  Session Recommended Strategy: ${sessionInfo.recommended_strategy}
  Hours Until Next Session: ${sessionInfo.hours_until_next_session.toFixed(1)}
  ${sessionInfo.asian_range_high ? `Asian Range: ${sessionInfo.asian_range_low?.toFixed(4)} - ${sessionInfo.asian_range_high?.toFixed(4)}` : ''}`
      : '';

    const calendarSection = economicCalendar
      ? `\nECONOMIC CALENDAR:
  Calendar Risk Level: ${economicCalendar.risk_level.toUpperCase()}
  ${economicCalendar.should_avoid_trading ? '⚠️ AVOID TRADING - Major event imminent!' : ''}
  ${economicCalendar.position_size_reduction > 0 ? `Position Size Reduction: ${(economicCalendar.position_size_reduction * 100).toFixed(0)}%` : ''}
  High-Impact Events (next 4h): ${economicCalendar.high_impact_within_4h.map((e) => `${e.event_name} (${e.currency}, in ${e.hours_until_event.toFixed(1)}h)`).join('; ') || 'None'}
  Upcoming Events: ${economicCalendar.upcoming_events
    .slice(0, 5)
    .map((e) => `${e.event_name} [${e.impact.toUpperCase()}] in ${e.hours_until_event.toFixed(1)}h`)
    .join('; ')}`
      : '';

    const performanceSection = performanceInsights
      ? `\nPERFORMANCE HISTORY & SELF-LEARNING:
  Win Rate by Regime: ${Object.entries(performanceInsights.win_rate_by_regime)
    .map(([r, w]) => `${r}=${(w * 100).toFixed(0)}%`)
    .join(', ')}
  Best Session: ${performanceInsights.best_performing_session} (${(performanceInsights.win_rate_by_session[performanceInsights.best_performing_session] * 100).toFixed(0)}% win rate)
  Average R-Multiple: ${performanceInsights.avg_r_multiple.toFixed(2)}
  Consecutive Losses: ${performanceInsights.consecutive_losses}
  AI Recommendations: ${performanceInsights.recommendations.join('; ')}`
      : '';

    return `You are a professional autonomous trading AI operating like an experienced hedge fund trader. Your goal is to generate high-quality trade setups with positive expectancy.

CURRENT MARKET DATA:
${JSON.stringify(
  marketData.map((m) => ({
    symbol: m.symbol,
    price: m.price,
    change_24h: m.change_24h.toFixed(2) + '%',
    rsi: m.technical.rsi_14.toFixed(0),
    trend: m.technical.trend,
    sma20: m.technical.sma_20.toFixed(4),
    sma50: m.technical.sma_50.toFixed(4),
    volatility: m.technical.volatility.toFixed(1) + '%'
  })),
  null,
  2
)}
${mtfSection}
${regimeSection}
${sessionSection}
${calendarSection}
${performanceSection}

NEWS & MARKET SENTIMENT:
  Sentiment: ${newsAnalysis.overall_sentiment.toUpperCase()}
  Key Topics: ${newsAnalysis.key_topics.join(', ')}
  Top Headlines: ${newsAnalysis.top_headlines.slice(0, 3).join(' | ')}

PROFESSIONAL TRADING RULES:
1. Only trade when confluence score > 0.5 AND multiple timeframes align
2. AVOID trading in VOLATILE regime or during extreme economic events
3. Prefer TRENDING_UP/TRENDING_DOWN regimes for trend following
4. In RANGING regime, look for mean reversion at extremes (RSI < 35 or > 65)
5. BREAKOUT setups require volume confirmation
6. London-NY overlap is highest probability window
7. Risk/Reward must be minimum 1.5:1
8. Use ATR-based stops (1.5x ATR from entry)
9. If consecutive losses > 3, be more conservative
10. Match strategy to current market regime

RISK MANAGEMENT RULES:
- Only trade when confidence > 0.65 (adjusted by regime and performance)
- Stop loss: 1.5-3x ATR from entry price
- Take profit: minimum 1.5x risk distance
- Maximum position: $${Number(process.env.MAX_TRADE_SIZE) || 1000}

OUTPUT FORMAT (JSON ONLY):
{
  "action": "BUY|SELL|HOLD",
  "symbol": "SYMBOL",
  "volume": NUMBER (dollar position size),
  "stop_loss": NUMBER (price level),
  "take_profit": NUMBER (price level),
  "confidence": NUMBER (0-1),
  "reasoning": "Professional analysis max 250 chars",
  "r_multiple_target": NUMBER (expected R-multiple e.g. 2.0),
  "trailing_stop": BOOLEAN,
  "trailing_stop_distance": NUMBER (percentage e.g. 1.5 for 1.5%)
}

IMPORTANT:
- Output ONLY valid JSON, no markdown
- HOLD is preferred when signals are unclear or conflicting
- Be a disciplined trader - quality over quantity
- Never trade against strong multi-timeframe trend alignment
- Incorporate the economic calendar risk

Generate your professional trading decision now:`;
  }

  private parseDecision(response: string): EnhancedTradeInstruction {
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

      return {
        action: 'HOLD',
        symbol: 'BTC/USD',
        volume: 0,
        stop_loss: 0,
        take_profit: 0,
        confidence: 0,
        reasoning: 'Failed to parse AI response'
      };
    }
  }
}
