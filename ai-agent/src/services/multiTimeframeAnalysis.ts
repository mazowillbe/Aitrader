import axios from 'axios';
import type { 
  Timeframe, 
  TimeframeData, 
  OHLCV, 
  TimeframeIndicators, 
  MultiTimeframeAnalysis 
} from '../types/enhanced';

/**
 * Multi-Timeframe Analysis Service
 * 
 * Fetches and analyzes market data across multiple timeframes to:
 * - Identify trend alignment
 * - Calculate confluence scores
 * - Detect key support/resistance levels
 * - Provide execution recommendations
 */
export class MultiTimeframeAnalysisService {
  private cache: Map<string, { data: TimeframeData[]; timestamp: number }> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes
  
  // Feature flag check
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.ENABLE_MULTI_TIMEFRAME !== 'false';
    if (!this.isEnabled) {
      console.log('⚠️ Multi-Timeframe Analysis disabled');
    }
  }

  /**
   * Perform multi-timeframe analysis for a symbol
   */
  async analyze(symbol: string): Promise<MultiTimeframeAnalysis | null> {
    if (!this.isEnabled) return null;

    try {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return this.buildAnalysis(symbol, cached.data);
      }

      // Fetch all timeframes
      const timeframes: Timeframe[] = ['1H', '4H', 'D1', 'W1'];
      const timeframeData = await this.fetchAllTimeframes(symbol, timeframes);

      // Cache results
      this.cache.set(symbol, { data: timeframeData, timestamp: Date.now() });

      return this.buildAnalysis(symbol, timeframeData);
    } catch (error) {
      console.error(`Multi-timeframe analysis failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Analyze multiple symbols
   */
  async analyzeMultiple(symbols: string[]): Promise<Map<string, MultiTimeframeAnalysis>> {
    const results = new Map<string, MultiTimeframeAnalysis>();
    
    await Promise.all(symbols.map(async (symbol) => {
      const analysis = await this.analyze(symbol);
      if (analysis) {
        results.set(symbol, analysis);
      }
    }));

    return results;
  }

  /**
   * Fetch data for all timeframes
   */
  private async fetchAllTimeframes(symbol: string, timeframes: Timeframe[]): Promise<TimeframeData[]> {
    const data = await Promise.all(
      timeframes.map(tf => this.fetchTimeframeData(symbol, tf))
    );

    return data.filter(d => d !== null) as TimeframeData[];
  }

  /**
   * Fetch OHLCV data for a specific timeframe
   */
  private async fetchTimeframeData(symbol: string, timeframe: Timeframe): Promise<TimeframeData | null> {
    try {
      // Try real API first, fall back to demo
      const ohlcv = await this.fetchOHLCV(symbol, timeframe);
      
      if (!ohlcv || ohlcv.length === 0) {
        return null;
      }

      const indicators = this.calculateIndicators(ohlcv);

      return {
        timeframe,
        symbol,
        ohlcv: ohlcv.slice(-100), // Keep last 100 candles
        indicators
      };
    } catch (error) {
      console.warn(`Failed to fetch ${timeframe} data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch OHLCV data (real API or demo)
   */
  private async fetchOHLCV(symbol: string, timeframe: Timeframe): Promise<OHLCV[]> {
    // Generate demo data if no API configured
    if (!process.env.COINGECKO_API_KEY && !process.env.ALPHA_VANTAGE_API_KEY) {
      return this.generateDemoOHLCV(symbol, timeframe);
    }

    // Try CoinGecko for crypto
    if (this.isCrypto(symbol)) {
      return await this.fetchCryptoOHLCV(symbol, timeframe);
    }

    // Try Alpha Vantage for stocks/forex
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      return await this.fetchAlphaVantageOHLCV(symbol, timeframe);
    }

    return this.generateDemoOHLCV(symbol, timeframe);
  }

  /**
   * Fetch crypto OHLCV from CoinGecko
   */
  private async fetchCryptoOHLCV(symbol: string, timeframe: Timeframe): Promise<OHLCV[]> {
    const coinId = symbol.split('/')[0].toLowerCase();
    
    const days = {
      '1H': 1,
      '4H': 3,
      'D1': 30,
      'W1': 90
    }[timeframe] || 30;

    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`,
        { params: { vs_currency: 'usd', days } }
      );

      return response.data.map((candle: number[]) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: 0 // CoinGecko OHLCV doesn't include volume
      }));
    } catch (error) {
      return this.generateDemoOHLCV(symbol, timeframe);
    }
  }

  /**
   * Fetch OHLCV from Alpha Vantage
   */
  private async fetchAlphaVantageOHLCV(symbol: string, timeframe: Timeframe): Promise<OHLCV[]> {
    const functionMap: Record<Timeframe, string> = {
      '1H': 'TIME_SERIES_INTRADAY',
      '4H': 'TIME_SERIES_INTRADAY',
      'D1': 'TIME_SERIES_DAILY',
      'W1': 'TIME_SERIES_WEEKLY'
    };

    const interval = timeframe === '1H' ? '60min' : timeframe === '4H' ? '60min' : undefined;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    try {
      const params: Record<string, string> = {
        function: functionMap[timeframe],
        symbol: symbol.replace('/', ''),
        apikey: apiKey!
      };

      if (interval) {
        params.interval = interval;
      }

      const response = await axios.get(
        'https://www.alphavantage.co/query',
        { params }
      );

      // Parse Alpha Vantage response
      const key = Object.keys(response.data).find(k => k.includes('Time Series'));
      if (!key) return this.generateDemoOHLCV(symbol, timeframe);

      const series = response.data[key];
      return Object.entries(series).map(([date, values]: [string, any]) => ({
        timestamp: new Date(date).getTime(),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseFloat(values['5. volume'] || '0')
      })).reverse();
    } catch (error) {
      return this.generateDemoOHLCV(symbol, timeframe);
    }
  }

  /**
   * Generate realistic demo OHLCV data
   */
  private generateDemoOHLCV(symbol: string, timeframe: Timeframe): OHLCV[] {
    const basePrice = this.getBasePrice(symbol);
    const volatility = this.getVolatility(symbol, timeframe);
    
    const candles: OHLCV[] = [];
    const now = Date.now();
    const intervals = {
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      'D1': 24 * 60 * 60 * 1000,
      'W1': 7 * 24 * 60 * 60 * 1000
    };

    const intervalMs = intervals[timeframe];
    const numCandles = timeframe === 'W1' ? 52 : timeframe === 'D1' ? 90 : timeframe === '4H' ? 168 : 168;

    let price = basePrice;
    let trend = (Math.random() - 0.5) * 0.001; // Small trend bias

    for (let i = numCandles; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      
      // Random walk with trend
      const change = (Math.random() - 0.5) * volatility + trend;
      trend += (Math.random() - 0.5) * 0.0001; // Trend can change slowly
      
      const open = price;
      const close = price * (1 + change / 100);
      const high = Math.max(open, close) * (1 + Math.random() * volatility / 200);
      const low = Math.min(open, close) * (1 - Math.random() * volatility / 200);
      const volume = Math.random() * 1000000000;

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });

      price = close;
    }

    return candles;
  }

  /**
   * Calculate technical indicators for a timeframe
   */
  private calculateIndicators(ohlcv: OHLCV[]): TimeframeIndicators {
    const closes = ohlcv.map(c => c.close);
    const highs = ohlcv.map(c => c.high);
    const lows = ohlcv.map(c => c.low);
    const volumes = ohlcv.map(c => c.volume);

    // EMAs
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, 200);

    // SMAs
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);

    // MACD
    const macd = this.calculateMACD(closes);

    // RSI
    const rsi = this.calculateRSI(closes, 14);

    // ATR
    const atr = this.calculateATR(ohlcv, 14);

    // Bollinger Bands
    const bollingerBands = this.calculateBollingerBands(closes, 20);

    // Volume Profile
    const volumeProfile = this.calculateVolumeProfile(ohlcv);

    // Trend
    const trend = this.determineTrend(closes, ema20, ema50, ema200);

    // Momentum
    const momentum = this.determineMomentum(closes, rsi, macd);

    return {
      ema_20: ema20,
      ema_50: ema50,
      ema_200: ema200,
      sma_20: sma20,
      sma_50: sma50,
      macd,
      rsi,
      atr,
      bollingerBands,
      volumeProfile,
      trend,
      momentum
    };
  }

  /**
   * Calculate EMA
   */
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate SMA
   */
  private calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  /**
   * Calculate MACD
   */
  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMAArray(prices, 12);
    const ema26 = this.calculateEMAArray(prices, 26);
    
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = this.calculateEMAArray(macdLine, 9);
    
    const macd = macdLine[macdLine.length - 1];
    const signal = signalLine[signalLine.length - 1];
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * Calculate EMA array
   */
  private calculateEMAArray(prices: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const ema: number[] = [prices[0]];

    for (let i = 1; i < prices.length; i++) {
      ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }

    return ema;
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate ATR
   */
  private calculateATR(ohlcv: OHLCV[], period: number): number {
    if (ohlcv.length < period + 1) return 0;

    const trueRanges: number[] = [];
    
    for (let i = 1; i < ohlcv.length; i++) {
      const tr = Math.max(
        ohlcv[i].high - ohlcv[i].low,
        Math.abs(ohlcv[i].high - ohlcv[i - 1].close),
        Math.abs(ohlcv[i].low - ohlcv[i - 1].close)
      );
      trueRanges.push(tr);
    }

    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(prices: number[], period: number): { upper: number; middle: number; lower: number; bandwidth: number } {
    const slice = prices.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const upper = middle + 2 * stdDev;
    const lower = middle - 2 * stdDev;
    const bandwidth = (upper - lower) / middle * 100;

    return { upper, middle, lower, bandwidth };
  }

  /**
   * Calculate Volume Profile
   */
  private calculateVolumeProfile(ohlcv: OHLCV[]): { poc: number; vah: number; val: number } {
    const volumeByPrice: Map<number, number> = new Map();

    ohlcv.forEach(candle => {
      const midPrice = Math.round((candle.high + candle.low) / 2);
      const existing = volumeByPrice.get(midPrice) || 0;
      volumeByPrice.set(midPrice, existing + candle.volume);
    });

    // Find POC (Point of Control - highest volume price)
    let maxVolume = 0;
    let poc = 0;
    volumeByPrice.forEach((volume, price) => {
      if (volume > maxVolume) {
        maxVolume = volume;
        poc = price;
      }
    });

    // Calculate Value Area (70% of volume)
    const totalVolume = Array.from(volumeByPrice.values()).reduce((a, b) => a + b, 0);
    const targetVolume = totalVolume * 0.7;

    // Simplified value area calculation
    const sortedPrices = Array.from(volumeByPrice.entries())
      .sort((a, b) => Math.abs(a[0] - poc) - Math.abs(b[0] - poc));

    let accumulatedVolume = 0;
    let vah = poc;
    let val = poc;

    for (const [price, volume] of sortedPrices) {
      accumulatedVolume += volume;
      if (price > vah) vah = price;
      if (price < val) val = price;
      if (accumulatedVolume >= targetVolume) break;
    }

    return { poc, vah, val };
  }

  /**
   * Determine trend direction
   */
  private determineTrend(closes: number[], ema20: number, ema50: number, ema200: number): 'bullish' | 'bearish' | 'sideways' {
    const lastPrice = closes[closes.length - 1];
    
    // Strong bullish: price > EMA20 > EMA50 > EMA200
    if (lastPrice > ema20 && ema20 > ema50 && ema50 > ema200) {
      return 'bullish';
    }
    
    // Strong bearish: price < EMA20 < EMA50 < EMA200
    if (lastPrice < ema20 && ema20 < ema50 && ema50 < ema200) {
      return 'bearish';
    }

    // Check recent price action
    const recentCloses = closes.slice(-10);
    const avgRecent = recentCloses.reduce((a, b) => a + b, 0) / 10;
    
    if (avgRecent > ema50) return 'bullish';
    if (avgRecent < ema50) return 'bearish';
    
    return 'sideways';
  }

  /**
   * Determine momentum
   */
  private determineMomentum(closes: number[], rsi: number, macd: { histogram: number }): 'strong_up' | 'weak_up' | 'neutral' | 'weak_down' | 'strong_down' {
    const recentChange = (closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5] * 100;
    
    // Strong momentum conditions
    if (rsi > 70 && macd.histogram > 0 && recentChange > 2) return 'strong_up';
    if (rsi < 30 && macd.histogram < 0 && recentChange < -2) return 'strong_down';
    
    // Weak momentum conditions
    if (rsi > 55 && macd.histogram > 0) return 'weak_up';
    if (rsi < 45 && macd.histogram < 0) return 'weak_down';
    
    return 'neutral';
  }

  /**
   * Build the complete multi-timeframe analysis
   */
  private buildAnalysis(symbol: string, timeframeData: TimeframeData[]): MultiTimeframeAnalysis {
    const confluence = this.calculateConfluence(timeframeData);
    const keyLevels = this.identifyKeyLevels(timeframeData);
    const recommendation = this.generateRecommendation(timeframeData, confluence);

    return {
      symbol,
      timeframes: timeframeData,
      confluence,
      keyLevels,
      recommendation
    };
  }

  /**
   * Calculate confluence score
   */
  private calculateConfluence(timeframeData: TimeframeData[]): MultiTimeframeAnalysis['confluence'] {
    const bullishTimeframes: Timeframe[] = [];
    const bearishTimeframes: Timeframe[] = [];
    let scoreSum = 0;

    timeframeData.forEach(tf => {
      // Weight by timeframe importance (higher = more important)
      const weights: Record<Timeframe, number> = { 'W1': 4, 'D1': 3, '4H': 2, '1H': 1 };
      const weight = weights[tf.timeframe];

      if (tf.indicators.trend === 'bullish') {
        bullishTimeframes.push(tf.timeframe);
        scoreSum += weight;
      } else if (tf.indicators.trend === 'bearish') {
        bearishTimeframes.push(tf.timeframe);
        scoreSum -= weight;
      }

      // Add momentum factor
      if (tf.indicators.momentum === 'strong_up') scoreSum += weight * 0.5;
      if (tf.indicators.momentum === 'strong_down') scoreSum -= weight * 0.5;
    });

    const totalWeight = timeframeData.reduce((sum, tf) => sum + ({
      'W1': 4, 'D1': 3, '4H': 2, '1H': 1
    }[tf.timeframe] || 1), 0);

    const score = Math.abs(scoreSum) / totalWeight;

    let trendAlignment: MultiTimeframeAnalysis['confluence']['trendAlignment'];
    if (bullishTimeframes.length === timeframeData.length) {
      trendAlignment = 'aligned_bullish';
    } else if (bearishTimeframes.length === timeframeData.length) {
      trendAlignment = 'aligned_bearish';
    } else if (Math.abs(bullishTimeframes.length - bearishTimeframes.length) <= 1) {
      trendAlignment = 'conflicting';
    } else {
      trendAlignment = 'mixed';
    }

    return {
      score,
      trendAlignment,
      bullishTimeframes,
      bearishTimeframes
    };
  }

  /**
   * Identify key support and resistance levels
   */
  private identifyKeyLevels(timeframeData: TimeframeData[]): MultiTimeframeAnalysis['keyLevels'] {
    const allHighs: number[] = [];
    const allLows: number[] = [];
    let pivot = 0;

    timeframeData.forEach(tf => {
      // Get recent highs/lows
      const recent = tf.ohlcv.slice(-20);
      allHighs.push(...recent.map(c => c.high));
      allLows.push(...recent.map(c => c.low));

      // Use latest close as pivot approximation
      pivot = tf.ohlcv[tf.ohlcv.length - 1].close;
    });

    // Find cluster points (potential S/R levels)
    const findClusters = (prices: number[], numLevels: number = 3): number[] => {
      if (prices.length === 0) return [];
      
      const sorted = [...prices].sort((a, b) => a - b);
      const clusters: number[] = [];
      const threshold = (sorted[sorted.length - 1] - sorted[0]) / 10;

      let currentCluster = [sorted[0]];
      
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - currentCluster[currentCluster.length - 1] < threshold) {
          currentCluster.push(sorted[i]);
        } else {
          if (currentCluster.length >= 3) {
            clusters.push(currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length);
          }
          currentCluster = [sorted[i]];
        }
      }

      return clusters.slice(-numLevels);
    };

    const support = findClusters(allLows);
    const resistance = findClusters(allHighs);

    // Add indicator-based levels
    const daily = timeframeData.find(tf => tf.timeframe === 'D1');
    if (daily) {
      support.push(daily.indicators.bollingerBands.lower);
      resistance.push(daily.indicators.bollingerBands.upper);
      pivot = daily.indicators.volumeProfile.poc;
    }

    return {
      support: [...new Set(support)].sort((a, b) => b - a).slice(0, 5),
      resistance: [...new Set(resistance)].sort((a, b) => a - b).slice(0, 5),
      pivot
    };
  }

  /**
   * Generate trading recommendation
   */
  private generateRecommendation(
    timeframeData: TimeframeData[], 
    confluence: MultiTimeframeAnalysis['confluence']
  ): MultiTimeframeAnalysis['recommendation'] {
    if (timeframeData.length === 0) {
      return { bias: 'neutral', strength: 0, timeframe: '1H' };
    }

    // Determine bias
    let bias: 'bullish' | 'bearish' | 'neutral';
    if (confluence.trendAlignment === 'aligned_bullish' || 
        (confluence.trendAlignment === 'mixed' && confluence.bullishTimeframes.length > confluence.bearishTimeframes.length)) {
      bias = 'bullish';
    } else if (confluence.trendAlignment === 'aligned_bearish' || 
        (confluence.trendAlignment === 'mixed' && confluence.bearishTimeframes.length > confluence.bullishTimeframes.length)) {
      bias = 'bearish';
    } else {
      bias = 'neutral';
    }

    // Strength is based on confluence score
    const strength = confluence.score;

    // Use the lowest timeframe that aligns with the bias for execution
    let executionTimeframe: Timeframe = '1H';
    if (bias === 'bullish' && confluence.bullishTimeframes.includes('1H')) {
      executionTimeframe = '1H';
    } else if (bias === 'bullish' && confluence.bullishTimeframes.includes('4H')) {
      executionTimeframe = '4H';
    } else if (bias === 'bearish' && confluence.bearishTimeframes.includes('1H')) {
      executionTimeframe = '1H';
    } else if (bias === 'bearish' && confluence.bearishTimeframes.includes('4H')) {
      executionTimeframe = '4H';
    }

    return {
      bias,
      strength,
      timeframe: executionTimeframe
    };
  }

  /**
   * Check if symbol is cryptocurrency
   */
  private isCrypto(symbol: string): boolean {
    return ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX'].some(
      crypto => symbol.includes(crypto)
    );
  }

  /**
   * Get base price for demo data
   */
  private getBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'BTC/USD': 42000,
      'ETH/USD': 2200,
      'SOL/USD': 100,
      'EUR/USD': 1.08,
      'GBP/USD': 1.27,
      'USD/JPY': 148,
      'AAPL': 185,
      'TSLA': 240,
      'GOOGL': 140,
      'MSFT': 380
    };
    return basePrices[symbol] || 100;
  }

  /**
   * Get volatility for timeframe
   */
  private getVolatility(symbol: string, timeframe: Timeframe): number {
    const baseVolatility = {
      'BTC/USD': 5,
      'ETH/USD': 4,
      'SOL/USD': 8,
      'EUR/USD': 0.5,
      'GBP/USD': 0.5,
      'AAPL': 2,
      'TSLA': 4
    }[symbol] || 2;

    const timeframeMultiplier = {
      '1H': 0.3,
      '4H': 0.5,
      'D1': 1,
      'W1': 2
    }[timeframe];

    return baseVolatility * timeframeMultiplier;
  }
}
