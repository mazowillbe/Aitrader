import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tradesRouter } from './routes/trades';
import { accountRouter } from './routes/account';
import { logsRouter } from './routes/logs';
import { configRouter } from './routes/config';
import { positionsRouter } from './routes/positions';
import { analyticsRouter } from './routes/analytics';
import { initDatabase } from './services/database';
import { positionManager } from './services/positionManager';
import { riskManager } from './services/riskManager';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Original routes
app.use('/api/trades', tradesRouter);
app.use('/api/account', accountRouter);
app.use('/api/logs', logsRouter);
app.use('/api/config', configRouter);

// New professional routes
app.use('/api/positions', positionsRouter);
app.use('/api/analytics', analyticsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: process.env.TRADING_MODE || 'DEMO',
    features: {
      multiTimeframe: process.env.ENABLE_MULTI_TIMEFRAME !== 'false',
      regimeDetection: process.env.ENABLE_REGIME_DETECTION !== 'false',
      positionManagement: process.env.ENABLE_POSITION_MANAGEMENT !== 'false',
      economicCalendar: process.env.ENABLE_ECONOMIC_CALENDAR !== 'false',
      sessionLogic: process.env.ENABLE_SESSION_LOGIC !== 'false',
      selfImprovement: process.env.ENABLE_SELF_IMPROVEMENT !== 'false'
    }
  });
});

// Feature flags endpoint
app.get('/api/features', (req, res) => {
  res.json({
    features: {
      enableMultiTimeframe: process.env.ENABLE_MULTI_TIMEFRAME !== 'false',
      enableRegimeDetection: process.env.ENABLE_REGIME_DETECTION !== 'false',
      enablePositionManagement: process.env.ENABLE_POSITION_MANAGEMENT !== 'false',
      enableEconomicCalendar: process.env.ENABLE_ECONOMIC_CALENDAR !== 'false',
      enableSessionLogic: process.env.ENABLE_SESSION_LOGIC !== 'false',
      enableSelfImprovement: process.env.ENABLE_SELF_IMPROVEMENT !== 'false',
      enableCorrelationTracking: process.env.ENABLE_CORRELATION_TRACKING !== 'false',
      enableKellySizing: process.env.ENABLE_KELLY_SIZING !== 'false'
    },
    risk: {
      kellyFractionMax: Number(process.env.KELLY_FRACTION_MAX) || 0.25,
      maxPortfolioHeat: Number(process.env.MAX_PORTFOLIO_HEAT) || 0.06,
      maxCorrelation: Number(process.env.MAX_CORRELATION) || 0.7,
      drawdownProtectionThreshold: Number(process.env.DRAWDOWN_PROTECTION_THRESHOLD) || 0.10
    }
  });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Trading Mode: ${process.env.TRADING_MODE || 'DEMO'}`);
  console.log('');
  console.log('📋 Professional Features:');
  console.log(`   Multi-Timeframe Analysis: ${process.env.ENABLE_MULTI_TIMEFRAME !== 'false' ? '✅' : '❌'}`);
  console.log(`   Regime Detection: ${process.env.ENABLE_REGIME_DETECTION !== 'false' ? '✅' : '❌'}`);
  console.log(`   Position Management: ${process.env.ENABLE_POSITION_MANAGEMENT !== 'false' ? '✅' : '❌'}`);
  console.log(`   Economic Calendar: ${process.env.ENABLE_ECONOMIC_CALENDAR !== 'false' ? '✅' : '❌'}`);
  console.log(`   Session Logic: ${process.env.ENABLE_SESSION_LOGIC !== 'false' ? '✅' : '❌'}`);
  console.log(`   Self-Improvement: ${process.env.ENABLE_SELF_IMPROVEMENT !== 'false' ? '✅' : '❌'}`);
  console.log('');

  // Start position monitoring if enabled
  if (process.env.ENABLE_POSITION_MANAGEMENT !== 'false') {
    positionManager.startMonitoring();
    console.log('🔍 Position monitoring started');
  }

  // Initialize Kelly fraction calculation
  if (process.env.ENABLE_KELLY_SIZING !== 'false') {
    riskManager.calculateKellyFraction();
    console.log('📊 Risk metrics initialized');
  }

  // Reset daily risk counters at midnight
  const resetDailyCounters = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      riskManager.resetDailyRiskCounters();
      resetDailyCounters(); // Schedule next reset
    }, msUntilMidnight);
  };

  resetDailyCounters();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  positionManager.stopMonitoring();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  positionManager.stopMonitoring();
  process.exit(0);
});
