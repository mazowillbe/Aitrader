import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tradesRouter } from './routes/trades';
import { accountRouter } from './routes/account';
import { logsRouter } from './routes/logs';
import { configRouter } from './routes/config';
import { initDatabase } from './services/database';
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

// Routes
app.use('/api/trades', tradesRouter);
app.use('/api/account', accountRouter);
app.use('/api/logs', logsRouter);
app.use('/api/config', configRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.TRADING_MODE || 'DEMO' });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Trading Mode: ${process.env.TRADING_MODE || 'DEMO'}`);
});
