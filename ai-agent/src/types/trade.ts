export interface TradeInstruction {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  volume: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  reasoning?: string;
}
