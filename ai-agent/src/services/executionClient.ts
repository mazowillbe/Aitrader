import axios from 'axios';
import type { TradeInstruction } from '../types/trade';

interface ExecutionResult {
  success: boolean;
  tradeId?: number;
  error?: string;
}

/**
 * Trade Execution Client
 *
 * Sends trade instructions from AI agent to the backend API for execution
 */
export class TradeExecutionClient {
  private backendUrl: string;

  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  }

  /**
   * Send trade instruction to backend
   */
  async sendTradeInstruction(instruction: TradeInstruction): Promise<ExecutionResult> {
    try {
      const response = await axios.post(
        `${this.backendUrl}/api/trades/execute`,
        instruction,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Failed to send trade instruction:', error.message);
        if (error.response) {
          return {
            success: false,
            error: error.response.data.error || error.message
          };
        }
      }

      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Check backend health
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.backendUrl}/api/health`, { timeout: 3000 });
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}
