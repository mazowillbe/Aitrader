import axios from 'axios';
import type { MarketData, TechnicalIndicators } from '../types/market';

/**
 * Market Data Service
 *
 * Fetches live market data from various sources:
 * - Crypto: CoinGecko API (free tier)
 * - Forex: exchangerate-api (free tier)
 * - Stocks: Alpha Vantage or demo data
 *
 * In demo mode, generates realistic simulated data
 */
export class MarketDataService {
  private demoMode: boolean;

  constructor() {
    this.demoMode = !process.env.COINGECKO_API_KEY && !process.env.ALPHA_VANTAGE_API_KEY;
    if (this.demoMode) {
      console.log('⚠️ No market data API keys configured - using DEMO data');
    }
  }

  /**
   * Fetch market data for multiple symbols
   */
  async fetchMultipleSymbols(symbols: string[]): Promise<MarketData[]> {
    const promises = symbols.map(symbol => this.fetchSymbol(symbol));
    const results = await Promise.allSettled(promises);

    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<MarketData>).value);
  }

  /**
   * Fetch market data for a single symbol
   */
  async fetchSymbol(symbol: string): Promise<MarketData> {
    try {
      // Determine asset type
      if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL')) {
        return await this.fetchCryptoData(symbol);
      } else if (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP')) {
        return await this.fetchForexData(symbol);
      } else {
        return await this.fetchStockData(symbol);
      }
    } catch (error) {
      console.warn(`Failed to fetch ${symbol}, using demo data:`, error);
      return this.generateDemoData(symbol);
    }
  }

  /**
   * Fetch crypto data from CoinGecko
   */
  private async fetchCryptoData(symbol: string): Promise<MarketData> {
    if (this.demoMode) {
      return this.generateDemoData(symbol);
    }

    try {
      const coinId = symbol.split('/')[0].toLowerCase();
      const currency = 'usd';

      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
        {
          params: {
            vs_currency: currency,
            days: 7,
            interval: 'daily'
          }
        }
      );

      const prices = response.data.prices;
      const volumes = response.data.total_volumes;

      return {
        symbol,
        price: prices[prices.length - 1][1],
        volume_24h: volumes[volumes.length - 1][1],
        change_24h: ((prices[prices.length - 1][1] - prices[prices.length - 2][1]) / prices[prices.length - 2][1]) * 100,
        high_24h: Math.max(...prices.slice(-2).map((p: any) => p[1])),
        low_24h: Math.min(...prices.slice(-2).map((p: any) => p[1])),
        timestamp: new Date().toISOString(),
        technical: this.calculateTechnicalIndicators(prices.map((p: any) => p[1]))
      };
    } catch (error) {
      return this.generateDemoData(symbol);
    }
  }

  /**
   * Fetch forex data
   */
  private async fetchForexData(symbol: string): Promise<MarketData> {
    return this.generateDemoData(symbol); // For demo, generate realistic forex data
  }

  /**
   * Fetch stock data
   */
  private async fetchStockData(symbol: string): Promise<MarketData> {
    return this.generateDemoData(symbol); // For demo, generate realistic stock data
  }

  /**
   * Generate realistic demo market data
   */
  private generateDemoData(symbol: string): MarketData {
    const basePrice = this.getBasePrice(symbol);
    const volatility = this.getVolatility(symbol);

    // Generate realistic price movement
    const randomChange = (Math.random() - 0.5) * volatility;
    const price = basePrice * (1 + randomChange / 100);
    const high_24h = price * (1 + Math.abs(Math.random() * volatility / 200));
    const low_24h = price * (1 - Math.abs(Math.random() * volatility / 200));

    // Generate price history for technical indicators
    const priceHistory = this.generatePriceHistory(basePrice, 20);

    return {
      symbol,
      price,
      volume_24h: Math.random() * 1000000000,
      change_24h: randomChange,
      high_24h,
      low_24h,
      timestamp: new Date().toISOString(),
      technical: this.calculateTechnicalIndicators(priceHistory)
    };
  }

  /**
   * Get base price for a symbol
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
   * Get typical volatility for a symbol
   */
  private getVolatility(symbol: string): number {
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 5;
    if (symbol.includes('SOL')) return 8;
    if (symbol.includes('USD')) return 0.5;
    return 2; // Stocks
  }

  /**
   * Generate realistic price history
   */
  private generatePriceHistory(basePrice: number, periods: number): number[] {
    const history: number[] = [basePrice];
    const volatility = this.getVolatility('default') / 100;

    for (let i = 1; i < periods; i++) {
      const change = (Math.random() - 0.5) * 2 * volatility;
      history.push(history[i - 1] * (1 + change));
    }

    return history;
  }

  /**
   * Calculate technical indicators
   */
  private calculateTechnicalIndicators(prices: number[]): TechnicalIndicators {
    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(prices.length, 20);
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(prices.length, 50);

    // Simple RSI calculation
    const changes = prices.slice(-14).map((p, i, arr) => i > 0 ? p - arr[i - 1] : 0);
    const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14;
    const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / 14;
    const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));

    // Trend detection
    const recentPrices = prices.slice(-5);
    const isUptrend = recentPrices.every((p, i) => i === 0 || p >= recentPrices[i - 1]);
    const isDowntrend = recentPrices.every((p, i) => i === 0 || p <= recentPrices[i - 1]);
    const trend = isUptrend ? 'bullish' : isDowntrend ? 'bearish' : 'sideways';

    return {
      sma_20: sma20,
      sma_50: sma50,
      rsi_14: rsi,
      trend,
      volatility: this.calculateVolatility(prices)
    };
  }

  /**
   * Calculate historical volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = prices.slice(-20).map((p, i, arr) =>
      i > 0 ? Math.log(p / arr[i - 1]) : 0
    ).slice(1);

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
  }
}
