import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tradesRouter } from './routes/trades';
import { accountRouter } from './routes/account';
import { logsRouter } from './routes/logs';
import { configRouter } from './routes/config';
import { analyticsRouter } from './routes/analytics';
import { positionsRouter } from './routes/positions';
import { initDatabase } from './services/database';
import { positionManager } from './services/positionManager';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initDatabase();

positionManager.start();

app.use('/api/trades', tradesRouter);
app.use('/api/account', accountRouter);
app.use('/api/logs', logsRouter);
app.use('/api/config', configRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/positions', positionsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.TRADING_MODE || 'DEMO',
    features: {
      multi_timeframe: true,
      regime_detection: true,
      session_logic: true,
      economic_calendar: true,
      position_management: true,
      risk_management: true,
      performance_analytics: true,
      self_improvement: true
    }
  });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Trading Mode: ${process.env.TRADING_MODE || 'DEMO'}`);
  console.log('🔬 Professional features: Position Mgmt ✓ | Risk Mgmt ✓ | Analytics ✓');
});

process.on('SIGTERM', () => {
  positionManager.stop();
  server.close();
});
