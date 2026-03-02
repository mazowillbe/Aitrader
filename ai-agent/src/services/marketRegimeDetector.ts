import type { OHLCV } from '../types/enhanced';
import type { 
  MarketRegime, 
  RegimeAnalysis, 
  RegimeHistory 
} from '../types/enhanced';

/**
 * Market Regime Detection Service
 * 
 * Detects current market conditions to optimize strategy selection:
 * - Trend strength via ADX
 * - Volatility regime via ATR percentile
 * - Range detection via Bollinger Bands
 * - Breakout conditions
 */
export class MarketRegimeDetector {
  private history: Map<string, RegimeHistory[]> = new Map();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.ENABLE_REGIME_DETECTION !== 'false';
    if (!this.isEnabled) {
      console.log('⚠️ Market Regime Detection disabled');
    }
  }

  /**
   * Detect current market regime
   */
  detectRegime(ohlcv: OHLCV[]): RegimeAnalysis | null {
    if (!this.isEnabled || ohlcv.length < 50) return null;

    try {
      const indicators = this.calculateRegimeIndicators(ohlcv);
      const regime = this.classifyRegime(indicators);
      const confidence = this.calculateConfidence(indicators);
      const duration = this.estimateDuration(ohlcv, regime);

      return {
        regime,
        confidence,
        indicators,
        duration,
        transitionProbability: this.estimateTransitionProbability(indicators)
      };
    } catch (error) {
      console.error('Regime detection failed:', error);
      return null;
    }
  }

  /**
   * Calculate all regime indicators
   */
  private calculateRegimeIndicators(ohlcv: OHLCV[]): RegimeAnalysis['indicators'] {
    const closes = ohlcv.map(c => c.close);
    const highs = ohlcv.map(c => c.high);
    const lows = ohlcv.map(c => c.low);
    const volumes = ohlcv.map(c => c.volume);

    // ADX for trend strength
    const adx = this.calculateADX(highs, lows, closes, 14);
    const adxTrendStrength = this.classifyADX(adx);

    // Volatility analysis
    const atr = this.calculateATR(ohlcv, 14);
    const atrHistory = this.calculateATRHistory(ohlcv, 14);
    const volatilityRank = this.calculatePercentileRank(atrHistory, atr);
    const volatilityRegime = this.classifyVolatility(volatilityRank);

    // Bollinger Band squeeze
    const bbSqueeze = this.detectBollingerSqueeze(closes);

    // Volume spike
    const volumeSpike = this.detectVolumeSpike(volumes);

    // Momentum decay
    const momentumDecay = this.detectMomentumDecay(closes);

    return {
      adx,
      adxTrendStrength,
      volatilityRank,
      volatilityRegime,
      bbSqueeze,
      volumeSpike,
      momentumDecay
    };
  }

  /**
   * Calculate ADX (Average Directional Index)
   */
  private calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
    if (closes.length < period * 2) return 25; // Default neutral

    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

      tr.push(Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      ));
    }

    // Smooth the values
    const smoothTR = this.calculateWilderSmooth(tr, period);
    const smoothPlusDM = this.calculateWilderSmooth(plusDM, period);
    const smoothMinusDM = this.calculateWilderSmooth(minusDM, period);

    // Calculate DI
    const plusDI = smoothPlusDM.map((v, i) => (smoothTR[i] > 0 ? (v / smoothTR[i]) * 100 : 0));
    const minusDI = smoothMinusDM.map((v, i) => (smoothTR[i] > 0 ? (v / smoothTR[i]) * 100 : 0));

    // Calculate DX and ADX
    const dx = plusDI.map((pdi, i) => {
      const sum = pdi + minusDI[i];
      return sum > 0 ? (Math.abs(pdi - minusDI[i]) / sum) * 100 : 0;
    });

    // Return smoothed ADX
    return this.calculateWilderSmooth(dx, period).pop() || 25;
  }

  /**
   * Wilder's smoothing method
   */
  private calculateWilderSmooth(values: number[], period: number): number[] {
    const smoothed: number[] = [];
    
    // First value is simple average
    const firstAvg = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    smoothed.push(firstAvg);

    // Subsequent values use Wilder's smoothing
    for (let i = period; i < values.length; i++) {
      const next = smoothed[smoothed.length - 1] - (smoothed[smoothed.length - 1] / period) + values[i];
      smoothed.push(next);
    }

    return smoothed;
  }

  /**
   * Classify ADX strength
   */
  private classifyADX(adx: number): 'weak' | 'moderate' | 'strong' {
    if (adx >= 40) return 'strong';
    if (adx >= 25) return 'moderate';
    return 'weak';
  }

  /**
   * Calculate ATR
   */
  private calculateATR(ohlcv: OHLCV[], period: number): number {
    if (ohlcv.length < period + 1) return 0;

    const trValues: number[] = [];
    for (let i = 1; i < ohlcv.length; i++) {
      trValues.push(Math.max(
        ohlcv[i].high - ohlcv[i].low,
        Math.abs(ohlcv[i].high - ohlcv[i - 1].close),
        Math.abs(ohlcv[i].low - ohlcv[i - 1].close)
      ));
    }

    return trValues.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate ATR history for percentile ranking
   */
  private calculateATRHistory(ohlcv: OHLCV[], period: number): number[] {
    const atrValues: number[] = [];
    const lookback = Math.min(ohlcv.length, 100);

    for (let i = period + 1; i < lookback; i++) {
      const slice = ohlcv.slice(i - period, i);
      atrValues.push(this.calculateATR(slice, period));
    }

    return atrValues;
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentileRank(values: number[], current: number): number {
    if (values.length === 0) return 50;
    
    const sorted = [...values].sort((a, b) => a - b);
    let rank = 0;
    
    for (const v of sorted) {
      if (v <= current) rank++;
    }

    return (rank / sorted.length) * 100;
  }

  /**
   * Classify volatility regime
   */
  private classifyVolatility(rank: number): 'low' | 'normal' | 'high' | 'extreme' {
    if (rank >= 90) return 'extreme';
    if (rank >= 70) return 'high';
    if (rank >= 30) return 'normal';
    return 'low';
  }

  /**
   * Detect Bollinger Band squeeze
   */
  private detectBollingerSqueeze(closes: number[]): boolean {
    if (closes.length < 20) return false;

    const period = 20;
    const recent = closes.slice(-period * 2);
    const currentBBW = this.calculateBBW(closes.slice(-period));
    const historicalBBW: number[] = [];

    for (let i = period; i < recent.length; i++) {
      historicalBBW.push(this.calculateBBW(recent.slice(i - period, i)));
    }

    // Squeeze if current bandwidth is in bottom 20% of historical
    const sorted = [...historicalBBW].sort((a, b) => a - b);
    const threshold = sorted[Math.floor(sorted.length * 0.2)];

    return currentBBW < threshold;
  }

  /**
   * Calculate Bollinger Band Width
   */
  private calculateBBW(closes: number[]): number {
    const sma = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance = closes.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / closes.length;
    const stdDev = Math.sqrt(variance);

    return (2 * stdDev) / sma * 100;
  }

  /**
   * Detect volume spike
   */
  private detectVolumeSpike(volumes: number[]): boolean {
    if (volumes.length < 20) return false;

    const recent = volumes[volumes.length - 1];
    const avg = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    return recent > avg * 1.5;
  }

  /**
   * Detect momentum decay
   */
  private detectMomentumDecay(closes: number[]): boolean {
    if (closes.length < 10) return false;

    const recentReturns = [];
    for (let i = closes.length - 5; i < closes.length; i++) {
      recentReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const earlierReturns = [];
    for (let i = closes.length - 10; i < closes.length - 5; i++) {
      earlierReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const recentMomentum = Math.abs(recentReturns.reduce((a, b) => a + b, 0));
    const earlierMomentum = Math.abs(earlierReturns.reduce((a, b) => a + b, 0));

    return recentMomentum < earlierMomentum * 0.5;
  }

  /**
   * Classify market regime
   */
  private classifyRegime(indicators: RegimeAnalysis['indicators']): MarketRegime {
    // Breakout: High volume + Bollinger squeeze + volatility expansion
    if (indicators.bbSqueeze && indicators.volumeSpike && indicators.volatilityRegime === 'high') {
      return 'BREAKOUT';
    }

    // Reversal: Momentum decay + extreme ADX
    if (indicators.momentumDecay && indicators.adx > 50) {
      return 'REVERSAL';
    }

    // Volatile: Extreme volatility
    if (indicators.volatilityRegime === 'extreme' || indicators.volatilityRegime === 'high') {
      return 'VOLATILE';
    }

    // Trending: Strong ADX
    if (indicators.adxTrendStrength === 'strong') {
      // Direction determined separately, here we return general trending
      return indicators.adx > 50 ? 'TRENDING_UP' : 'TRENDING_DOWN';
    }

    // Check for trend via price action
    // This is a simplified approach; in production, use the direction from price action
    return this.determineTrendDirection(indicators);
  }

  /**
   * Determine trend direction from indicators
   */
  private determineTrendDirection(indicators: RegimeAnalysis['indicators']): MarketRegime {
    // If ADX shows moderate trend, use volatility to decide
    if (indicators.adxTrendStrength === 'moderate') {
      return indicators.volatilityRank > 50 ? 'TRENDING_UP' : 'TRENDING_DOWN';
    }

    // Default to ranging for weak ADX
    if (indicators.bbSqueeze) {
      return 'RANGING';
    }

    // Low volatility usually means ranging
    if (indicators.volatilityRegime === 'low') {
      return 'RANGING';
    }

    return 'RANGING';
  }

  /**
   * Calculate confidence in regime classification
   */
  private calculateConfidence(indicators: RegimeAnalysis['indicators']): number {
    let confidence = 0.5;

    // ADX gives strong signal
    if (indicators.adxTrendStrength === 'strong') confidence += 0.2;
    else if (indicators.adxTrendStrength === 'moderate') confidence += 0.1;

    // Volatility extremes are clear signals
    if (indicators.volatilityRegime === 'extreme') confidence += 0.15;
    else if (indicators.volatilityRegime === 'high') confidence += 0.1;
    else if (indicators.volatilityRegime === 'low') confidence += 0.1;

    // Volume spike confirms breakout
    if (indicators.volumeSpike) confidence += 0.1;

    // Bollinger squeeze confirms ranging
    if (indicators.bbSqueeze) confidence += 0.1;

    // Momentum decay adds uncertainty
    if (indicators.momentumDecay) confidence -= 0.1;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Estimate duration of current regime
   */
  private estimateDuration(ohlcv: OHLCV[], currentRegime: MarketRegime): number {
    // Count consecutive bars in same regime
    let duration = 1;

    // Simplified: estimate based on typical regime durations
    const typicalDurations: Record<MarketRegime, number> = {
      'TRENDING_UP': 20,
      'TRENDING_DOWN': 20,
      'RANGING': 15,
      'VOLATILE': 5,
      'BREAKOUT': 3,
      'REVERSAL': 5
    };

    return typicalDurations[currentRegime] || 10;
  }

  /**
   * Estimate probability of regime transition
   */
  private estimateTransitionProbability(indicators: RegimeAnalysis['indicators']): number {
    // High volatility suggests transition
    if (indicators.volatilityRegime === 'extreme') return 0.7;
    if (indicators.volatilityRegime === 'high') return 0.5;

    // Momentum decay suggests transition
    if (indicators.momentumDecay) return 0.4;

    // Squeeze suggests breakout imminent
    if (indicators.bbSqueeze) return 0.3;

    // Strong ADX suggests regime persistence
    if (indicators.adxTrendStrength === 'strong') return 0.1;

    return 0.2;
  }

  /**
   * Update regime history for a symbol
   */
  updateHistory(symbol: string, regime: MarketRegime, confidence: number): void {
    if (!this.history.has(symbol)) {
      this.history.set(symbol, []);
    }

    const history = this.history.get(symbol)!;
    history.push({
      timestamp: Date.now(),
      regime,
      confidence
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get regime history for a symbol
   */
  getHistory(symbol: string): RegimeHistory[] {
    return this.history.get(symbol) || [];
  }
}
