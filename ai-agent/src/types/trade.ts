import type { 
  MarketRegime, 
  StrategyType, 
  TradingSession,
  Timeframe 
} from './enhanced';

export interface TradeInstruction {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  volume: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  reasoning?: string;
  
  // Enhanced fields for professional trading
  market_regime?: MarketRegime;
  strategy_used?: StrategyType;
  session?: TradingSession;
  confluence_score?: number;
  timeframe_alignment?: string;
  economic_event_risk?: string;
  atr?: number;
  risk_reward_ratio?: number;
  position_size_percent?: number;
  trailing_stop_type?: 'atr' | 'percentage' | 'chandelier';
  partial_exits?: Array<{
    level: number;
    percentage: number;
  }>;
}

export interface EnhancedTradeContext {
  basic: TradeInstruction;
  multiTimeframe?: any;
  regime?: any;
  session?: any;
  eventRisk?: any;
  strategy?: any;
}
