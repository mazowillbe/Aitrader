import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MarketData } from '../types/market';
import type { NewsAnalysis } from '../types/news';
import type { TradeInstruction } from '../types/trade';

/**
 * Trading AI powered by Gemini 3.1
 *
 * This AI agent:
 * - Analyzes market data (technical analysis)
 * - Analyzes news and sentiment (fundamental analysis)
 * - Filters out noise, fake news, and market manipulation
 * - Makes autonomous trading decisions
 * - Outputs structured JSON trade instructions
 */
export class TradingAI {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // Using latest Gemini model
  }

  /**
   * Make an autonomous trading decision based on market data and news
   */
  async makeDecision(marketData: MarketData[], newsAnalysis: NewsAnalysis): Promise<TradeInstruction> {
    try {
      const prompt = this.buildPrompt(marketData, newsAnalysis);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const decision = this.parseDecision(text);

      return decision;
    } catch (error) {
      console.error('Error in AI decision making:', error);
      // Return HOLD decision on error
      return {
        action: 'HOLD',
        symbol: marketData[0]?.symbol || 'BTC/USD',
        volume: 0,
        stop_loss: 0,
        take_profit: 0,
        confidence: 0,
        reasoning: `AI error: ${String(error)}`
      };
    }
  }

  /**
   * Build comprehensive prompt for Gemini 3.1
   */
  private buildPrompt(marketData: MarketData[], newsAnalysis: NewsAnalysis): string {
    return `You are an expert autonomous trading AI. Your goal is to maximize profits while managing risk.

MARKET DATA:
${JSON.stringify(marketData, null, 2)}

NEWS & SENTIMENT ANALYSIS:
${JSON.stringify(newsAnalysis, null, 2)}

INSTRUCTIONS:
1. Analyze the market data using technical analysis (trends, momentum, support/resistance, volume)
2. Analyze news and sentiment - IGNORE fake news, hype, and market manipulation
3. Consider macroeconomic factors and real fundamental changes
4. Make an autonomous trading decision (BUY, SELL, or HOLD)
5. Set appropriate stop loss and take profit levels based on volatility
6. Assign a confidence score (0-1) based on signal strength

RISK MANAGEMENT RULES:
- Only trade when confidence > 0.6
- Stop loss should be 2-5% from entry
- Take profit should be 1.5-3x the risk (risk/reward ratio)
- Consider position sizing based on volatility

OUTPUT FORMAT (JSON ONLY):
{
  "action": "BUY|SELL|HOLD",
  "symbol": "SYMBOL",
  "volume": NUMBER (in base currency, e.g., 100 for $100 position),
  "stop_loss": NUMBER (price level),
  "take_profit": NUMBER (price level),
  "confidence": NUMBER (0-1),
  "reasoning": "Brief explanation of the decision (max 200 chars)"
}

IMPORTANT:
- Output ONLY valid JSON, no markdown, no explanations outside JSON
- Be conservative - it's okay to HOLD when uncertain
- Ignore social media hype and obvious market manipulation
- Focus on real technical and fundamental signals

Generate your trading decision now:`;
  }

  /**
   * Parse AI response and extract JSON trade instruction
   */
  private parseDecision(response: string): TradeInstruction {
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }

      // Find JSON object in response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const decision = JSON.parse(jsonStr);

      // Validate required fields
      if (!decision.action || !decision.symbol || decision.confidence === undefined) {
        throw new Error('Missing required fields in AI response');
      }

      // Ensure action is uppercase
      decision.action = decision.action.toUpperCase();

      // Validate action
      if (!['BUY', 'SELL', 'HOLD'].includes(decision.action)) {
        throw new Error(`Invalid action: ${decision.action}`);
      }

      return decision;
    } catch (error) {
      console.error('Failed to parse AI decision:', error);
      console.error('Raw response:', response);

      // Return safe HOLD decision
      return {
        action: 'HOLD',
        symbol: 'BTC/USD',
        volume: 0,
        stop_loss: 0,
        take_profit: 0,
        confidence: 0,
        reasoning: 'Failed to parse AI response'
      };
    }
  }
}
