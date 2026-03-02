import type { MarketData } from '../types/market';
import type { RegimeAnalysis, TradingStrategy } from '../types/enhanced';

export class MarketRegimeDetector {
  detect(marketData: MarketData): RegimeAnalysis {
    const volatility = marketData.technical.volatility;
    const rsi = marketData.technical.rsi_14;
    const trend = marketData.technical.trend;

    const adx = this.estimateADX(marketData);
    const atrPercentile = this.estimateATRPercentile(volatility);
    const bollingerBandwidth = this.estimateBBWidth(marketData);

    const isHighVolatility = atrPercentile > 75;
    const isLowVolatility = atrPercentile < 25;
    const isTrending = adx > 25;
    const isRanging = bollingerBandwidth < 0.04 || (!isTrending && isLowVolatility);
    const isBreakout = bollingerBandwidth > 0.08 && atrPercentile > 60;

    let regime: RegimeAnalysis['regime'];
    let recommendedStrategy: TradingStrategy;
    let positionSizeMultiplier: number;
    let confidenceAdjustment: number;

    if (isHighVolatility && !isTrending) {
      regime = 'VOLATILE';
      recommendedStrategy = 'HOLD';
      positionSizeMultiplier = 0.3;
      confidenceAdjustment = -0.15;
    } else if (isBreakout) {
      regime = 'BREAKOUT';
      recommendedStrategy = 'BREAKOUT';
      positionSizeMultiplier = 0.8;
      confidenceAdjustment = 0.05;
    } else if (isRanging) {
      regime = 'RANGING';
      recommendedStrategy = 'RANGE_TRADING';
      positionSizeMultiplier = 0.6;
      confidenceAdjustment = -0.05;
    } else if (trend === 'bullish' && isTrending) {
      regime = 'TRENDING_UP';
      recommendedStrategy = 'TREND_FOLLOWING';
      positionSizeMultiplier = 1.0;
      confidenceAdjustment = 0.1;
    } else if (trend === 'bearish' && isTrending) {
      regime = 'TRENDING_DOWN';
      recommendedStrategy = 'TREND_FOLLOWING';
      positionSizeMultiplier = 1.0;
      confidenceAdjustment = 0.1;
    } else {
      regime = 'RANGING';
      recommendedStrategy = 'MEAN_REVERSION';
      positionSizeMultiplier = 0.7;
      confidenceAdjustment = 0;
    }

    const trendStrength =
      adx > 40 ? 'strong' : adx > 25 ? 'moderate' : 'weak';

    return {
      regime,
      adx,
      atr_percentile: atrPercentile,
      volatility_ratio: volatility / 20,
      is_ranging: isRanging,
      is_trending: isTrending,
      trend_strength: trendStrength,
      recommended_strategy: recommendedStrategy,
      position_size_multiplier: positionSizeMultiplier,
      confidence_adjustment: confidenceAdjustment
    };
  }

  private estimateADX(marketData: MarketData): number {
    const { volatility, trend } = marketData.technical;

    let base = 20;
    if (trend === 'bullish' || trend === 'bearish') {
      base += 10 + volatility * 0.5;
    }
    const noise = (Math.random() - 0.5) * 10;
    return Math.max(0, Math.min(100, base + noise));
  }

  private estimateATRPercentile(volatility: number): number {
    const normalizedVol = Math.min(volatility / 50, 1);
    return normalizedVol * 100;
  }

  private estimateBBWidth(marketData: MarketData): number {
    const volatility = marketData.technical.volatility;
    const price = marketData.price;
    const stdDev = (price * volatility) / (100 * Math.sqrt(252));
    return (4 * stdDev) / price;
  }
}
