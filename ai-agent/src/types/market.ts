export interface MarketData {
  symbol: string;
  price: number;
  volume_24h: number;
  change_24h: number;
  high_24h: number;
  low_24h: number;
  timestamp: string;
  technical: TechnicalIndicators;
}

export interface TechnicalIndicators {
  sma_20: number;
  sma_50: number;
  rsi_14: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  volatility: number;
}
