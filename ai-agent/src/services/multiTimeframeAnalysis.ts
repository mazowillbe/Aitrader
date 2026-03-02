import type { MultiTimeframeAnalysis, TimeframeData, OHLCV } from '../types/enhanced';

export class MultiTimeframeAnalysisService {
  private cache: Map<string, { data: MultiTimeframeAnalysis; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000;

  async analyze(symbol: string, currentPrice: number): Promise<MultiTimeframeAnalysis> {
    const cacheKey = symbol;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const timeframes = this.generateMultiTimeframeData(symbol, currentPrice);
    const confluenceScore = this.calculateConfluenceScore(timeframes);
    const trendAlignment = this.determineTrendAlignment(timeframes);
    const levels = this.extractKeyLevels(timeframes, currentPrice);

    const result: MultiTimeframeAnalysis = {
      symbol,
      timestamp: new Date().toISOString(),
      timeframes,
      confluence_score: confluenceScore,
      trend_alignment: trendAlignment,
      key_support_levels: levels.support,
      key_resistance_levels: levels.resistance,
      recommended_direction: this.getRecommendedDirection(trendAlignment, confluenceScore)
    };

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  private generateMultiTimeframeData(symbol: string, currentPrice: number): TimeframeData[] {
    const timeframes: Array<'1H' | '4H' | 'D' | 'W'> = ['1H', '4H', 'D', 'W'];

    return timeframes.map((tf) => {
      const candles = this.generateRealisticCandles(currentPrice, tf);
      return this.buildTimeframeData(tf, candles);
    });
  }

  private generateRealisticCandles(currentPrice: number, timeframe: string): OHLCV[] {
    const count = 50;
    const volatilityMap: Record<string, number> = {
      '1H': 0.003,
      '4H': 0.008,
      D: 0.02,
      W: 0.05
    };
    const volatility = volatilityMap[timeframe] || 0.01;

    const candles: OHLCV[] = [];
    let price = currentPrice * (0.9 + Math.random() * 0.2);

    const now = Date.now();
    const intervalMs: Record<string, number> = {
      '1H': 3600000,
      '4H': 14400000,
      D: 86400000,
      W: 604800000
    };
    const interval = intervalMs[timeframe] || 3600000;

    for (let i = count - 1; i >= 0; i--) {
      const change = (Math.random() - 0.48) * volatility;
      const open = price;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

      candles.push({
        timestamp: now - i * interval,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000000 * (1 + Math.abs(change) * 10)
      });

      price = close;
    }

    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      lastCandle.close = currentPrice;
      lastCandle.high = Math.max(lastCandle.high, currentPrice);
      lastCandle.low = Math.min(lastCandle.low, currentPrice);
    }

    return candles;
  }

  private buildTimeframeData(timeframe: '1H' | '4H' | 'D' | 'W', candles: OHLCV[]): TimeframeData {
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, Math.min(200, closes.length));
    const macd = this.calculateMACD(closes);
    const rsi = this.calculateRSI(closes, 14);
    const atr = this.calculateATR(highs, lows, closes, 14);
    const bollinger = this.calculateBollinger(closes, 20);

    const currentClose = closes[closes.length - 1];
    const trend = this.determineTrend(currentClose, ema20, ema50);
    const volumeTrend = this.determineVolumeTrend(volumes);

    return {
      timeframe,
      candles: candles.slice(-10),
      ema_20: ema20,
      ema_50: ema50,
      ema_200: ema200,
      macd,
      rsi,
      atr,
      bollinger,
      trend,
      volume_trend: volumeTrend
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    const macdValues = prices.slice(-26).map((_, i) => {
      const slice = prices.slice(0, prices.length - 26 + i + 1);
      return this.calculateEMA(slice, 12) - this.calculateEMA(slice, 26);
    });

    const signal = this.calculateEMA(macdValues, 9);
    return { macd: macdLine, signal, histogram: macdLine - signal };
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    const changes = prices.slice(-period - 1).map((p, i, arr) => (i > 0 ? p - arr[i - 1] : 0)).slice(1);
    const gains = changes.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
    const losses = Math.abs(changes.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period;
    if (losses === 0) return 100;
    return 100 - 100 / (1 + gains / losses);
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    const trueRanges: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(hl, hc, lc));
    }
    const recent = trueRanges.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  private calculateBollinger(
    prices: number[],
    period: number
  ): { upper: number; middle: number; lower: number; bandwidth: number } {
    const recent = prices.slice(-period);
    const middle = recent.reduce((a, b) => a + b, 0) / period;
    const variance = recent.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = middle + 2 * stdDev;
    const lower = middle - 2 * stdDev;
    const bandwidth = (upper - lower) / middle;
    return { upper, middle, lower, bandwidth };
  }

  private determineTrend(
    currentPrice: number,
    ema20: number,
    ema50: number
  ): 'bullish' | 'bearish' | 'sideways' {
    if (currentPrice > ema20 && ema20 > ema50) return 'bullish';
    if (currentPrice < ema20 && ema20 < ema50) return 'bearish';
    return 'sideways';
  }

  private determineVolumeTrend(volumes: number[]): 'increasing' | 'decreasing' | 'neutral' {
    const recent5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const prior5 = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    if (recent5 > prior5 * 1.1) return 'increasing';
    if (recent5 < prior5 * 0.9) return 'decreasing';
    return 'neutral';
  }

  private calculateConfluenceScore(timeframes: TimeframeData[]): number {
    const signals = timeframes.map((tf) => {
      let score = 0;
      if (tf.trend === 'bullish') score++;
      else if (tf.trend === 'bearish') score--;
      if (tf.macd.histogram > 0) score += 0.5;
      else if (tf.macd.histogram < 0) score -= 0.5;
      if (tf.rsi > 50 && tf.rsi < 70) score += 0.3;
      else if (tf.rsi < 50 && tf.rsi > 30) score -= 0.3;
      return score;
    });

    const totalAbsScore = signals.reduce((a, b) => a + Math.abs(b), 0);
    const maxPossible = timeframes.length * 1.8;
    return Math.min(totalAbsScore / maxPossible, 1);
  }

  private determineTrendAlignment(
    timeframes: TimeframeData[]
  ): 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' {
    const bullishCount = timeframes.filter((tf) => tf.trend === 'bullish').length;
    const bearishCount = timeframes.filter((tf) => tf.trend === 'bearish').length;
    const total = timeframes.length;

    if (bullishCount === total) return 'STRONG_BULLISH';
    if (bearishCount === total) return 'STRONG_BEARISH';
    if (bullishCount >= total * 0.75) return 'BULLISH';
    if (bearishCount >= total * 0.75) return 'BEARISH';
    return 'NEUTRAL';
  }

  private extractKeyLevels(
    timeframes: TimeframeData[],
    currentPrice: number
  ): { support: number[]; resistance: number[] } {
    const support: number[] = [];
    const resistance: number[] = [];

    for (const tf of timeframes) {
      support.push(tf.bollinger.lower);
      support.push(tf.ema_50);
      resistance.push(tf.bollinger.upper);
      resistance.push(tf.ema_20);
    }

    return {
      support: support
        .filter((l) => l < currentPrice)
        .sort((a, b) => b - a)
        .slice(0, 3),
      resistance: resistance
        .filter((l) => l > currentPrice)
        .sort((a, b) => a - b)
        .slice(0, 3)
    };
  }

  private getRecommendedDirection(
    alignment: string,
    confluenceScore: number
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    if (confluenceScore < 0.4) return 'NEUTRAL';
    if (alignment === 'STRONG_BULLISH' || alignment === 'BULLISH') return 'BUY';
    if (alignment === 'STRONG_BEARISH' || alignment === 'BEARISH') return 'SELL';
    return 'NEUTRAL';
  }
}
