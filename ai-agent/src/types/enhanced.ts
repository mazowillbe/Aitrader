export type MarketRegime = 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' | 'BREAKOUT';

export type TradingSession = 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP' | 'OFF_HOURS';

export type TradingStrategy =
  | 'TREND_FOLLOWING'
  | 'MEAN_REVERSION'
  | 'BREAKOUT'
  | 'MOMENTUM'
  | 'RANGE_TRADING'
  | 'HOLD';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeframeData {
  timeframe: '1H' | '4H' | 'D' | 'W';
  candles: OHLCV[];
  ema_20: number;
  ema_50: number;
  ema_200: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  rsi: number;
  atr: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  trend: 'bullish' | 'bearish' | 'sideways';
  volume_trend: 'increasing' | 'decreasing' | 'neutral';
}

export interface MultiTimeframeAnalysis {
  symbol: string;
  timestamp: string;
  timeframes: TimeframeData[];
  confluence_score: number;
  trend_alignment: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  key_support_levels: number[];
  key_resistance_levels: number[];
  recommended_direction: 'BUY' | 'SELL' | 'NEUTRAL';
}

export interface RegimeAnalysis {
  regime: MarketRegime;
  adx: number;
  atr_percentile: number;
  volatility_ratio: number;
  is_ranging: boolean;
  is_trending: boolean;
  trend_strength: 'weak' | 'moderate' | 'strong';
  recommended_strategy: TradingStrategy;
  position_size_multiplier: number;
  confidence_adjustment: number;
}

export interface SessionInfo {
  current_session: TradingSession;
  session_start_utc: string;
  session_end_utc: string;
  hours_until_next_session: number;
  next_session: TradingSession;
  typical_volatility: 'low' | 'medium' | 'high' | 'very_high';
  recommended_strategy: TradingStrategy;
  asian_range_high?: number;
  asian_range_low?: number;
}

export interface EconomicEvent {
  id: string;
  datetime: string;
  currency: string;
  event_name: string;
  impact: 'low' | 'medium' | 'high';
  forecast?: string;
  previous?: string;
  actual?: string;
  hours_until_event: number;
}

export interface EconomicCalendarData {
  upcoming_events: EconomicEvent[];
  high_impact_within_4h: EconomicEvent[];
  affected_currencies: string[];
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  position_size_reduction: number;
  should_avoid_trading: boolean;
}

export interface PerformanceInsight {
  period: string;
  win_rate_by_regime: Record<MarketRegime, number>;
  win_rate_by_session: Record<TradingSession, number>;
  win_rate_by_strategy: Record<TradingStrategy, number>;
  best_performing_regime: MarketRegime;
  best_performing_session: TradingSession;
  avg_r_multiple: number;
  expectancy: number;
  sharpe_ratio: number;
  consecutive_losses: number;
  recommendations: string[];
  confidence_threshold_adjustment: number;
}

export interface EnhancedTradeInstruction {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  volume: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  reasoning?: string;
  market_regime?: MarketRegime;
  strategy_used?: TradingStrategy;
  session?: TradingSession;
  confluence_score?: number;
  timeframe_alignment?: string;
  economic_events?: string;
  r_multiple_target?: number;
  trailing_stop?: boolean;
  trailing_stop_distance?: number;
}
