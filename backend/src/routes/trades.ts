import { Router } from 'express';
import { db } from '../services/database';
import { tradeExecutor } from '../services/tradeExecutor';
import { logger } from '../services/logger';
import { z } from 'zod';

export const tradesRouter = Router();

// Schema validation for trade instructions from AI
const TradeInstructionSchema = z.object({
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  symbol: z.string(),
  volume: z.number().positive(),
  stop_loss: z.number(),
  take_profit: z.number(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional()
});

/**
 * POST /api/trades/execute
 * Receive trade instruction from AI agent and execute
 */
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

/**
 * GET /api/trades/active
 * Get all active (open) trades
 */
tradesRouter.get('/active', (req, res) => {
  try {
    const trades = db.prepare('SELECT * FROM trades WHERE status = "OPEN" ORDER BY created_at DESC').all();
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/trades/history
 * Get trade history with optional filters
 */
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

    const trades = db.prepare(query).all(...params);
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/trades/:id/close
 * Manually close a trade
 */
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

/**
 * GET /api/trades/stats
 * Get trading statistics
 */
tradesRouter.get('/stats', (req, res) => {
  try {
    const stats = db.prepare(`
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
