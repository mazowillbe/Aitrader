// Multi-Timeframe Analysis Types
export type Timeframe = '1H' | '4H' | 'D1' | 'W1';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeframeData {
  timeframe: Timeframe;
  symbol: string;
  ohlcv: OHLCV[];
  indicators: TimeframeIndicators;
}

export interface TimeframeIndicators {
  ema_20: number;
  ema_50: number;
  ema_200: number;
  sma_20: number;
  sma_50: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  rsi: number;
  atr: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  volumeProfile: {
    poc: number; // Point of Control
    vah: number; // Value Area High
    val: number; // Value Area Low
  };
  trend: 'bullish' | 'bearish' | 'sideways';
  momentum: 'strong_up' | 'weak_up' | 'neutral' | 'weak_down' | 'strong_down';
}

export interface MultiTimeframeAnalysis {
  symbol: string;
  timeframes: TimeframeData[];
  confluence: {
    score: number; // 0-1, higher = more confluence
    trendAlignment: 'aligned_bullish' | 'aligned_bearish' | 'mixed' | 'conflicting';
    bullishTimeframes: Timeframe[];
    bearishTimeframes: Timeframe[];
  };
  keyLevels: {
    support: number[];
    resistance: number[];
    pivot: number;
  };
  recommendation: {
    bias: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0-1
    timeframe: Timeframe; // Primary timeframe for execution
  };
}

// Market Regime Detection Types
export type MarketRegime = 
  | 'TRENDING_UP'
  | 'TRENDING_DOWN'
  | 'RANGING'
  | 'VOLATILE'
  | 'BREAKOUT'
  | 'REVERSAL';

export interface RegimeAnalysis {
  regime: MarketRegime;
  confidence: number; // 0-1
  indicators: {
    adx: number; // Average Directional Index
    adxTrendStrength: 'weak' | 'moderate' | 'strong';
    volatilityRank: number; // Percentile rank of current volatility
    volatilityRegime: 'low' | 'normal' | 'high' | 'extreme';
    bbSqueeze: boolean; // Bollinger Band squeeze detected
    volumeSpike: boolean; // Volume significantly above average
    momentumDecay: boolean; // Momentum is decaying
  };
  duration: number; // Estimated bars in current regime
  transitionProbability: number; // Probability of regime change
}

export interface RegimeHistory {
  timestamp: number;
  regime: MarketRegime;
  confidence: number;
}

// Strategy Types
export type StrategyType = 
  | 'trend_following'
  | 'mean_reversion'
  | 'breakout'
  | 'momentum'
  | 'range_trading'
  | 'scalping'
  | 'swing_trading';

export interface Strategy {
  name: StrategyType;
  description: string;
  optimalRegimes: MarketRegime[];
  riskMultiplier: number; // Adjust position size
  stopLossATR: number; // Stop loss in ATR multiples
  takeProfitATR: number; // Take profit in ATR multiples
  minConfluence: number; // Minimum confluence score required
  sessionPreference: TradingSession[];
}

// Economic Calendar Types
export interface EconomicEvent {
  id: string;
  name: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
  datetime: Date;
  timestamp: number;
  isPast: boolean;
}

export interface EventRisk {
  hasHighImpactEvent: boolean;
  nextEventMinutes: number;
  affectedCurrencies: string[];
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: 'none' | 'reduce_size' | 'close_positions' | 'avoid_trading';
}

// Session Types
export type TradingSession = 'asian' | 'london' | 'new_york' | 'london_ny_overlap' | 'closed';

export interface SessionInfo {
  current: TradingSession;
  next: TradingSession;
  minutesToNext: number;
  isOverlap: boolean;
  volatilityRating: 'low' | 'medium' | 'high' | 'very_high';
  liquidityRating: 'low' | 'medium' | 'high' | 'very_high';
  recommendedStrategies: StrategyType[];
  activeMarkets: string[];
}

export interface SessionPerformance {
  session: TradingSession;
  trades: number;
  winRate: number;
  avgRMultiple: number;
  profitFactor: number;
}

// Position Management Types
export interface PositionUpdate {
  tradeId: number;
  currentPrice: number;
  unrealizedPnl: number;
  currentStop: number;
  trailingActive: boolean;
  partialExits: PartialExit[];
  maxAdverseExcursion: number;
  maxFavorableExcursion: number;
  holdTime: number; // in seconds
}

export interface PartialExit {
  level: number; // 1R, 2R, etc.
  percentage: number;
  price: number;
  executed: boolean;
  executedAt?: Date;
}

export interface TrailingStopConfig {
  type: 'atr' | 'percentage' | 'chandelier';
  atrMultiplier?: number;
  percentage?: number;
  activateAt: number; // R multiple to activate trailing
}

// Risk Management Types
export interface RiskMetrics {
  kellyFraction: number;
  kellyAdjusted: number; // Conservative (half Kelly or quarter Kelly)
  portfolioHeat: number; // Total risk as % of account
  maxPortfolioHeat: number;
  currentDrawdown: number;
  maxDrawdown: number;
  maxDrawdownDate?: Date;
  dailyRiskUsed: number;
  dailyRiskLimit: number;
  correlationRisk: number; // Risk from correlated positions
  volatilityAdjustment: number; // Position size adjustment based on volatility
}

export interface CorrelationMatrix {
  [symbol1: string]: {
    [symbol2: string]: number; // Correlation coefficient -1 to 1
  };
}

// Trading Journal Types
export interface TradeContext {
  tradeId: number;
  marketRegime: MarketRegime;
  confluenceScore: number;
  timeframeAlignment: string;
  session: TradingSession;
  strategy: StrategyType;
  economicEvents: EconomicEvent[];
  newsSentiment: 'positive' | 'negative' | 'neutral';
  aiConfidence: number;
  volumeRank: number; // Percentile rank of entry volume
  timeOfDay: string;
  dayOfWeek: string;
}

export interface TradeOutcome {
  tradeId: number;
  rMultiple: number;
  maxAdverseExcursion: number;
  maxFavorableExcursion: number;
  holdTime: number;
  exitReason: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'manual' | 'time_exit' | 'signal_reversal';
  profitLoss: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgRMultiple: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
  recoveryFactor: number;
  
  // By breakdown
  byRegime: Record<MarketRegime, SessionPerformance>;
  bySession: Record<TradingSession, SessionPerformance>;
  byStrategy: Record<StrategyType, SessionPerformance>;
}

export interface AIInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'warning' | 'improvement';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: 'strategy' | 'risk' | 'execution' | 'psychology';
  data?: any;
  createdAt: Date;
}

// Configuration Types
export interface FeatureFlags {
  enableMultiTimeframe: boolean;
  enableRegimeDetection: boolean;
  enablePositionManagement: boolean;
  enableEconomicCalendar: boolean;
  enableSessionLogic: boolean;
  enableSelfImprovement: boolean;
  enableCorrelationTracking: boolean;
  enableKellySizing: boolean;
}

export interface SystemConfig {
  features: FeatureFlags;
  risk: {
    kellyFractionMax: number;
    maxPortfolioHeat: number;
    maxCorrelation: number;
    drawdownProtectionThreshold: number;
    maxDailyRisk: number;
    maxTradeSize: number;
  };
  strategies: {
    [key in StrategyType]?: Partial<Strategy>;
  };
  sessions: {
    [key in TradingSession]?: {
      enabled: boolean;
      preferredSymbols: string[];
      riskMultiplier: number;
    };
  };
}
