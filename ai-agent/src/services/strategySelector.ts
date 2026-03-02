import type { 
  MarketRegime, 
  StrategyType, 
  Strategy, 
  TradingSession,
  RegimeAnalysis,
  MultiTimeframeAnalysis 
} from '../types/enhanced';

/**
 * Strategy Selector Service
 * 
 * Maps market regimes to optimal trading strategies:
 * - Selects strategy based on current market conditions
 * - Adjusts risk parameters by regime
 * - Considers session and time of day
 */
export class StrategySelector {
  private isEnabled: boolean;

  // Strategy definitions with optimal conditions
  private strategies: Record<StrategyType, Strategy> = {
    trend_following: {
      name: 'trend_following',
      description: 'Follow established trends using momentum and moving averages',
      optimalRegimes: ['TRENDING_UP', 'TRENDING_DOWN'],
      riskMultiplier: 1.0,
      stopLossATR: 2.0,
      takeProfitATR: 4.0,
      minConfluence: 0.6,
      sessionPreference: ['london', 'new_york', 'london_ny_overlap']
    },
    mean_reversion: {
      name: 'mean_reversion',
      description: 'Trade bounces from support/resistance in ranging markets',
      optimalRegimes: ['RANGING'],
      riskMultiplier: 0.8,
      stopLossATR: 1.5,
      takeProfitATR: 2.0,
      minConfluence: 0.5,
      sessionPreference: ['asian', 'london', 'new_york']
    },
    breakout: {
      name: 'breakout',
      description: 'Trade breakouts from consolidation patterns',
      optimalRegimes: ['BREAKOUT', 'RANGING'],
      riskMultiplier: 1.2,
      stopLossATR: 1.5,
      takeProfitATR: 3.0,
      minConfluence: 0.7,
      sessionPreference: ['london', 'london_ny_overlap']
    },
    momentum: {
      name: 'momentum',
      description: 'Trade strong directional moves with volume confirmation',
      optimalRegimes: ['TRENDING_UP', 'TRENDING_DOWN', 'BREAKOUT'],
      riskMultiplier: 1.1,
      stopLossATR: 2.5,
      takeProfitATR: 3.5,
      minConfluence: 0.65,
      sessionPreference: ['london', 'new_york', 'london_ny_overlap']
    },
    range_trading: {
      name: 'range_trading',
      description: 'Buy at support, sell at resistance in defined ranges',
      optimalRegimes: ['RANGING'],
      riskMultiplier: 0.7,
      stopLossATR: 1.0,
      takeProfitATR: 1.5,
      minConfluence: 0.5,
      sessionPreference: ['asian']
    },
    scalping: {
      name: 'scalping',
      description: 'Quick trades capturing small price movements',
      optimalRegimes: ['RANGING', 'VOLATILE'],
      riskMultiplier: 0.5,
      stopLossATR: 0.5,
      takeProfitATR: 0.75,
      minConfluence: 0.4,
      sessionPreference: ['london_ny_overlap']
    },
    swing_trading: {
      name: 'swing_trading',
      description: 'Multi-day positions capturing swing moves',
      optimalRegimes: ['TRENDING_UP', 'TRENDING_DOWN'],
      riskMultiplier: 1.0,
      stopLossATR: 3.0,
      takeProfitATR: 6.0,
      minConfluence: 0.7,
      sessionPreference: ['london', 'new_york']
    }
  };

  constructor() {
    this.isEnabled = process.env.ENABLE_REGIME_DETECTION !== 'false';
    if (!this.isEnabled) {
      console.log('⚠️ Strategy Selector disabled');
    }
  }

  /**
   * Select optimal strategy for current conditions
   */
  selectStrategy(
    regimeAnalysis: RegimeAnalysis | null,
    mtfAnalysis: MultiTimeframeAnalysis | null,
    session: TradingSession
  ): Strategy {
    if (!this.isEnabled || !regimeAnalysis) {
      // Default to trend following when disabled
      return this.strategies.trend_following;
    }

    // Score each strategy
    const scores = new Map<StrategyType, number>();

    for (const [type, strategy] of Object.entries(this.strategies)) {
      let score = 0;

      // Regime match (most important)
      if (strategy.optimalRegimes.includes(regimeAnalysis.regime)) {
        score += 40 * regimeAnalysis.confidence;
      }

      // Session preference
      if (strategy.sessionPreference.includes(session)) {
        score += 20;
      }

      // Confluence consideration
      if (mtfAnalysis) {
        if (mtfAnalysis.confluence.score >= strategy.minConfluence) {
          score += 15;
        }

        // Trend-following gets bonus for aligned trends
        if (type === 'trend_following' && 
            (mtfAnalysis.confluence.trendAlignment === 'aligned_bullish' || 
             mtfAnalysis.confluence.trendAlignment === 'aligned_bearish')) {
          score += 15;
        }

        // Mean reversion gets bonus for mixed/conflicting trends
        if (type === 'mean_reversion' && mtfAnalysis.confluence.trendAlignment === 'mixed') {
          score += 15;
        }
      }

      // Regime-specific bonuses
      score += this.getRegimeBonus(type as StrategyType, regimeAnalysis);

      scores.set(type as StrategyType, score);
    }

    // Select strategy with highest score
    let bestStrategy: StrategyType = 'trend_following';
    let bestScore = 0;

    for (const [type, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = type;
      }
    }

    return this.strategies[bestStrategy];
  }

  /**
   * Get regime-specific bonus for strategy
   */
  private getRegimeBonus(strategy: StrategyType, regime: RegimeAnalysis): number {
    let bonus = 0;

    // Volatile regime - prefer conservative strategies
    if (regime.regime === 'VOLATILE') {
      if (strategy === 'range_trading' || strategy === 'scalping') {
        bonus += 10;
      } else if (strategy === 'breakout' || strategy === 'momentum') {
        bonus -= 15; // Risky in volatile conditions
      }
    }

    // Breakout regime - prefer breakout strategy
    if (regime.regime === 'BREAKOUT') {
      if (strategy === 'breakout') {
        bonus += 20;
      }
    }

    // Reversal regime - reduce risk
    if (regime.regime === 'REVERSAL') {
      if (strategy === 'mean_reversion') {
        bonus += 15;
      }
    }

    // Strong trend - prefer trend following
    if (regime.indicators.adxTrendStrength === 'strong') {
      if (strategy === 'trend_following') {
        bonus += 15;
      }
    }

    return bonus;
  }

  /**
   * Get risk adjustment for current conditions
   */
  getRiskAdjustment(
    regimeAnalysis: RegimeAnalysis | null,
    mtfAnalysis: MultiTimeframeAnalysis | null,
    session: TradingSession
  ): number {
    let multiplier = 1.0;

    if (!regimeAnalysis) return multiplier;

    // Reduce size in volatile conditions
    if (regimeAnalysis.regime === 'VOLATILE') {
      multiplier *= 0.5;
    }

    // Reduce size during reversal
    if (regimeAnalysis.regime === 'REVERSAL') {
      multiplier *= 0.7;
    }

    // Increase size for strong trends
    if (regime.indicators.adxTrendStrength === 'strong') {
      multiplier *= 1.1;
    }

    // Adjust for volatility rank
    if (regimeAnalysis.indicators.volatilityRank > 80) {
      multiplier *= 0.7;
    } else if (regimeAnalysis.indicators.volatilityRank < 30) {
      multiplier *= 1.2;
    }

    // Session adjustments
    const sessionMultipliers: Record<TradingSession, number> = {
      'london_ny_overlap': 1.1,
      'london': 1.0,
      'new_york': 1.0,
      'asian': 0.8,
      'closed': 0
    };
    multiplier *= sessionMultipliers[session] || 1.0;

    // Confluence adjustment
    if (mtfAnalysis) {
      if (mtfAnalysis.confluence.score > 0.8) {
        multiplier *= 1.1;
      } else if (mtfAnalysis.confluence.score < 0.4) {
        multiplier *= 0.8;
      }
    }

    // Transition probability adjustment
    if (regimeAnalysis.transitionProbability > 0.5) {
      multiplier *= 0.8;
    }

    return Math.max(0.3, Math.min(1.5, multiplier));
  }

  /**
   * Get strategy by name
   */
  getStrategy(name: StrategyType): Strategy {
    return this.strategies[name] || this.strategies.trend_following;
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): Record<StrategyType, Strategy> {
    return { ...this.strategies };
  }

  /**
   * Calculate stop loss distance based on strategy and ATR
   */
  calculateStopLoss(
    strategy: Strategy,
    atr: number,
    entryPrice: number,
    direction: 'buy' | 'sell'
  ): number {
    const distance = atr * strategy.stopLossATR;
    return direction === 'buy' ? entryPrice - distance : entryPrice + distance;
  }

  /**
   * Calculate take profit distance based on strategy and ATR
   */
  calculateTakeProfit(
    strategy: Strategy,
    atr: number,
    entryPrice: number,
    direction: 'buy' | 'sell'
  ): number {
    const distance = atr * strategy.takeProfitATR;
    return direction === 'buy' ? entryPrice + distance : entryPrice - distance;
  }
}
