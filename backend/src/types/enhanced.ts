// Enhanced types for backend services

export type MarketRegime = 
  | 'TRENDING_UP'
  | 'TRENDING_DOWN'
  | 'RANGING'
  | 'VOLATILE'
  | 'BREAKOUT'
  | 'REVERSAL';

export type StrategyType = 
  | 'trend_following'
  | 'mean_reversion'
  | 'breakout'
  | 'momentum'
  | 'range_trading'
  | 'scalping'
  | 'swing_trading';

export type TradingSession = 'asian' | 'london' | 'new_york' | 'london_ny_overlap' | 'closed';

export interface RiskMetrics {
  kellyFraction: number;
  kellyAdjusted: number;
  portfolioHeat: number;
  maxPortfolioHeat: number;
  currentDrawdown: number;
  maxDrawdown: number;
  dailyRiskUsed: number;
  dailyRiskLimit: number;
  correlationRisk: number;
  volatilityAdjustment: number;
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
  byRegime: Record<string, SessionPerformance>;
  bySession: Record<string, SessionPerformance>;
  byStrategy: Record<string, SessionPerformance>;
}

export interface SessionPerformance {
  session: string;
  trades: number;
  winRate: number;
  avgRMultiple: number;
  profitFactor: number;
}

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
  volumeRank: number;
  timeOfDay: string;
  dayOfWeek: string;
}

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

export interface PositionUpdate {
  tradeId: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  currentStop: number;
  distanceToStop: number;
  distanceToTarget: number;
  rMultiple: number;
  maxAdverseExcursion: number;
  maxFavorableExcursion: number;
  holdTimeSeconds: number;
  trailingActive: boolean;
  action: 'none' | 'move_stop' | 'close_partial' | 'close_full';
  actionReason: string;
}

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
