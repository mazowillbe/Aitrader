import { Router } from 'express';
import { db } from '../services/database';
import { tradeExecutor } from '../services/tradeExecutor';
import { logger } from '../services/logger';
import { z } from 'zod';

export const tradesRouter = Router();

const TradeInstructionSchema = z.object({
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  symbol: z.string(),
  volume: z.number().positive(),
  stop_loss: z.number(),
  take_profit: z.number(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  market_regime: z.string().optional(),
  strategy_used: z.string().optional(),
  session: z.string().optional(),
  confluence_score: z.number().optional(),
  timeframe_alignment: z.string().optional(),
  atr: z.number().optional(),
  trailing_stop_type: z.enum(['atr', 'percentage', 'chandelier']).optional(),
  partial_exits: z.array(z.object({ level: z.number(), percentage: z.number() })).optional()
});

tradesRouter.post('/execute', async (req, res) => {
  try {
    const instruction = TradeInstructionSchema.parse(req.body);
    logger.log('info', 'ai', 'Received trade instruction from AI', { instruction });
    const result = await tradeExecutor.executeTrade(instruction);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.log('error', 'api', 'Invalid trade instruction format', { error: error.errors });
      res.status(400).json({ success: false, error: 'Invalid trade instruction format', details: error.errors });
    } else {
      logger.log('error', 'api', 'Failed to execute trade', { error: String(error) });
      res.status(500).json({ success: false, error: String(error) });
    }
  }
});

tradesRouter.get('/active', (req, res) => {
  try {
    const trades = db.query(`SELECT * FROM trades WHERE status = 'OPEN' ORDER BY created_at DESC`).all();
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

tradesRouter.get('/history', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const status = req.query.status as string;
    let query = 'SELECT * FROM trades';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const trades = db.query(query).all(...params);
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

tradesRouter.post('/:id/close', (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice, reason } = req.body;
    tradeExecutor.closeTrade(Number(id), exitPrice, reason || 'Manual close');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

tradesRouter.get('/stats', (req, res) => {
  try {
    const stats = db.query(`
      SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_trades,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_trades,
        SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losing_trades,
        COALESCE(SUM(profit_loss), 0) as total_profit_loss,
        COALESCE(AVG(confidence), 0) as avg_confidence
      FROM trades
    `).get();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
