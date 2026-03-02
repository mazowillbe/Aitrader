import axios from 'axios';
import type { EconomicEvent, EventRisk } from '../types/enhanced';

/**
 * Economic Calendar Service
 * 
 * Integrates economic calendar to:
 * - Track high-impact economic events
 * - Assess event risk for positions
 * - Provide pre-event risk reduction
 */
export class EconomicCalendarService {
  private cache: { events: EconomicEvent[]; timestamp: number } | null = null;
  private cacheTimeout = 60 * 60 * 1000; // 1 hour
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.ENABLE_ECONOMIC_CALENDAR !== 'false';
    if (!this.isEnabled) {
      console.log('⚠️ Economic Calendar disabled');
    }
  }

  /**
   * Get upcoming economic events
   */
  async getUpcomingEvents(hours: number = 24): Promise<EconomicEvent[]> {
    if (!this.isEnabled) return [];

    try {
      const allEvents = await this.fetchEvents();
      const now = Date.now();
      const cutoff = now + (hours * 60 * 60 * 1000);

      return allEvents
        .filter(event => event.timestamp >= now && event.timestamp <= cutoff)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Failed to fetch economic events:', error);
      return [];
    }
  }

  /**
   * Get events affecting a specific currency
   */
  async getEventsForCurrency(currency: string, hours: number = 24): Promise<EconomicEvent[]> {
    const events = await this.getUpcomingEvents(hours);
    return events.filter(event => 
      event.currency.toUpperCase() === currency.toUpperCase()
    );
  }

  /**
   * Assess event risk for a symbol
   */
  async assessEventRisk(symbol: string): Promise<EventRisk> {
    if (!this.isEnabled) {
      return {
        hasHighImpactEvent: false,
        nextEventMinutes: -1,
        affectedCurrencies: [],
        riskLevel: 'none',
        recommendedAction: 'none'
      };
    }

    try {
      // Extract currencies from symbol
      const currencies = this.extractCurrencies(symbol);
      const events = await this.getUpcomingEvents(24);
      
      // Filter events for relevant currencies
      const relevantEvents = events.filter(e => 
        currencies.includes(e.currency.toUpperCase())
      );

      if (relevantEvents.length === 0) {
        return {
          hasHighImpactEvent: false,
          nextEventMinutes: -1,
          affectedCurrencies: [],
          riskLevel: 'none',
          recommendedAction: 'none'
        };
      }

      // Find next high-impact event
      const highImpactEvents = relevantEvents.filter(e => e.impact === 'high');
      const nextHighImpact = highImpactEvents[0];
      
      const now = Date.now();
      const nextEventMinutes = nextHighImpact 
        ? Math.round((nextHighImpact.timestamp - now) / (60 * 1000))
        : -1;

      // Determine risk level
      const riskLevel = this.determineRiskLevel(relevantEvents, nextEventMinutes);
      const recommendedAction = this.determineRecommendedAction(riskLevel, nextEventMinutes);

      return {
        hasHighImpactEvent: highImpactEvents.length > 0,
        nextEventMinutes,
        affectedCurrencies: [...new Set(relevantEvents.map(e => e.currency))],
        riskLevel,
        recommendedAction
      };
    } catch (error) {
      console.error('Failed to assess event risk:', error);
      return {
        hasHighImpactEvent: false,
        nextEventMinutes: -1,
        affectedCurrencies: [],
        riskLevel: 'none',
        recommendedAction: 'none'
      };
    }
  }

  /**
   * Check if should reduce position before event
   */
  async shouldReduceBeforeEvent(symbol: string): Promise<boolean> {
    const risk = await this.assessEventRisk(symbol);
    
    // Reduce if high-impact event within 4 hours
    if (risk.nextEventMinutes > 0 && risk.nextEventMinutes <= 240 && risk.riskLevel === 'high') {
      return true;
    }

    return false;
  }

  /**
   * Check if should avoid trading now
   */
  async shouldAvoidTrading(symbol: string): Promise<boolean> {
    const risk = await this.assessEventRisk(symbol);
    
    // Avoid trading 30 minutes before to 30 minutes after major events
    if (risk.nextEventMinutes >= -30 && risk.nextEventMinutes <= 30 && risk.riskLevel === 'critical') {
      return true;
    }

    return false;
  }

  /**
   * Fetch events from API or generate demo data
   */
  private async fetchEvents(): Promise<EconomicEvent[]> {
    // Check cache
    if (this.cache && Date.now() - this.cache.timestamp < this.cacheTimeout) {
      return this.cache.events;
    }

    let events: EconomicEvent[];

    // Try real API first
    if (process.env.ECONOMIC_CALENDAR_API_KEY) {
      try {
        events = await this.fetchFromAPI();
      } catch (error) {
        console.warn('Failed to fetch from calendar API, using demo data');
        events = this.generateDemoEvents();
      }
    } else {
      events = this.generateDemoEvents();
    }

    // Cache results
    this.cache = { events, timestamp: Date.now() };

    return events;
  }

  /**
   * Fetch from real API
   */
  private async fetchFromAPI(): Promise<EconomicEvent[]> {
    // Example using a generic economic calendar API
    // In production, use a service like ForexFactory, Investing.com, or Alpha Vantage
    const response = await axios.get('https://api.example.com/economic-calendar', {
      params: {
        api_key: process.env.ECONOMIC_CALENDAR_API_KEY,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

    return response.data.events.map((e: any) => this.parseAPIEvent(e));
  }

  /**
   * Parse API event format
   */
  private parseAPIEvent(apiEvent: any): EconomicEvent {
    return {
      id: apiEvent.id || String(Math.random()),
      name: apiEvent.name || apiEvent.event,
      currency: apiEvent.currency || 'USD',
      impact: this.parseImpact(apiEvent.impact || apiEvent.importance),
      forecast: apiEvent.forecast,
      previous: apiEvent.previous,
      actual: apiEvent.actual,
      datetime: new Date(apiEvent.date || apiEvent.datetime),
      timestamp: new Date(apiEvent.date || apiEvent.datetime).getTime(),
      isPast: new Date(apiEvent.date || apiEvent.datetime) < new Date()
    };
  }

  /**
   * Parse impact level
   */
  private parseImpact(impact: string): 'high' | 'medium' | 'low' {
    const lower = (impact || '').toLowerCase();
    if (lower.includes('high') || lower.includes('3')) return 'high';
    if (lower.includes('medium') || lower.includes('2')) return 'medium';
    return 'low';
  }

  /**
   * Generate realistic demo economic events
   */
  private generateDemoEvents(): EconomicEvent[] {
    const events: EconomicEvent[] = [];
    const now = new Date();

    // Major economic events template
    const eventTemplates = [
      { name: 'Non-Farm Payrolls', currency: 'USD', impact: 'high' as const, dayOffset: 0 },
      { name: 'GDP Growth Rate', currency: 'USD', impact: 'high' as const, dayOffset: 1 },
      { name: 'Consumer Price Index (CPI)', currency: 'USD', impact: 'high' as const, dayOffset: 0 },
      { name: 'Federal Interest Rate Decision', currency: 'USD', impact: 'high' as const, dayOffset: 2 },
      { name: 'ECB Interest Rate Decision', currency: 'EUR', impact: 'high' as const, dayOffset: 3 },
      { name: 'UK GDP Growth Rate', currency: 'GBP', impact: 'high' as const, dayOffset: 1 },
      { name: 'ISM Manufacturing PMI', currency: 'USD', impact: 'medium' as const, dayOffset: 0 },
      { name: 'ADP Employment Change', currency: 'USD', impact: 'medium' as const, dayOffset: 0 },
      { name: 'Retail Sales', currency: 'USD', impact: 'medium' as const, dayOffset: 1 },
      { name: 'Unemployment Rate', currency: 'USD', impact: 'high' as const, dayOffset: 0 },
      { name: 'FOMC Minutes', currency: 'USD', impact: 'high' as const, dayOffset: 2 },
      { name: 'BOJ Interest Rate Decision', currency: 'JPY', impact: 'high' as const, dayOffset: 4 },
      { name: 'Chinese GDP Growth Rate', currency: 'CNY', impact: 'medium' as const, dayOffset: 3 },
      { name: 'Eurozone CPI', currency: 'EUR', impact: 'high' as const, dayOffset: 1 },
      { name: 'US Initial Jobless Claims', currency: 'USD', impact: 'medium' as const, dayOffset: 0 }
    ];

    // Generate events for next 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(8 + Math.floor(Math.random() * 8), 30, 0, 0); // Random time between 8:30-16:30 UTC

      // Pick random events for this day
      const dayEvents = eventTemplates.filter(e => 
        (day + e.dayOffset) % 3 === 0 || Math.random() > 0.7
      );

      dayEvents.forEach(template => {
        const eventDate = new Date(date);
        eventDate.setHours(8 + Math.floor(Math.random() * 10));

        events.push({
          id: `${template.name}-${day}`,
          name: template.name,
          currency: template.currency,
          impact: template.impact,
          forecast: this.generateForecast(template.name),
          previous: this.generateForecast(template.name),
          datetime: eventDate,
          timestamp: eventDate.getTime(),
          isPast: eventDate < now
        });
      });
    }

    // Add some events very soon for testing
    const soonEvents = [
      { name: 'CPI Release', currency: 'USD', impact: 'high' as const, minutesOffset: 30 },
      { name: 'FOMC Statement', currency: 'USD', impact: 'high' as const, minutesOffset: 120 },
      { name: 'ECB Press Conference', currency: 'EUR', impact: 'medium' as const, minutesOffset: 180 }
    ];

    soonEvents.forEach((template, i) => {
      const eventDate = new Date(now.getTime() + template.minutesOffset * 60 * 1000);
      events.push({
        id: `soon-${i}`,
        name: template.name,
        currency: template.currency,
        impact: template.impact,
        forecast: this.generateForecast(template.name),
        previous: this.generateForecast(template.name),
        datetime: eventDate,
        timestamp: eventDate.getTime(),
        isPast: false
      });
    });

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Generate realistic forecast values
   */
  private generateForecast(eventName: string): string {
    if (eventName.includes('Payrolls')) return `${Math.floor(150 + Math.random() * 200)}K`;
    if (eventName.includes('GDP')) return `${(1.5 + Math.random() * 2).toFixed(1)}%`;
    if (eventName.includes('CPI') || eventName.includes('Inflation')) return `${(2 + Math.random() * 3).toFixed(1)}%`;
    if (eventName.includes('Interest Rate') || eventName.includes('FOMC')) return `${(4.5 + Math.random() * 1).toFixed(2)}%`;
    if (eventName.includes('Unemployment')) return `${(3.5 + Math.random() * 2).toFixed(1)}%`;
    if (eventName.includes('PMI')) return `${Math.floor(48 + Math.random() * 8)}`;
    if (eventName.includes('Claims')) return `${Math.floor(200 + Math.random() * 100)}K`;
    return `${(Math.random() * 5).toFixed(2)}%`;
  }

  /**
   * Extract currencies from trading symbol
   */
  private extractCurrencies(symbol: string): string[] {
    const currencies: string[] = [];
    
    // Forex pairs
    if (symbol.includes('/')) {
      const parts = symbol.split('/');
      currencies.push(parts[0]);
      if (parts[1] !== 'USD') {
        currencies.push(parts[1]);
      }
    }
    
    // Stocks
    if (['AAPL', 'TSLA', 'GOOGL', 'MSFT'].includes(symbol)) {
      currencies.push('USD');
    }
    
    // Crypto (USD pairs)
    if (['BTC', 'ETH', 'SOL'].some(c => symbol.includes(c))) {
      currencies.push('USD');
    }

    return currencies;
  }

  /**
   * Determine risk level based on events
   */
  private determineRiskLevel(events: EconomicEvent[], nextHighImpactMinutes: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (events.length === 0) return 'none';

    const highImpact = events.filter(e => e.impact === 'high');
    const mediumImpact = events.filter(e => e.impact === 'medium');

    // Critical: High impact within 1 hour
    if (nextHighImpactMinutes >= 0 && nextHighImpactMinutes <= 60) {
      return 'critical';
    }

    // High: High impact within 4 hours
    if (nextHighImpactMinutes > 60 && nextHighImpactMinutes <= 240) {
      return 'high';
    }

    // Medium: Multiple medium impact events or high impact within 12 hours
    if (mediumImpact.length >= 2 || (nextHighImpactMinutes > 240 && nextHighImpactMinutes <= 720)) {
      return 'medium';
    }

    // Low: Any events within 24 hours
    if (events.length > 0) {
      return 'low';
    }

    return 'none';
  }

  /**
   * Determine recommended action based on risk
   */
  private determineRecommendedAction(
    riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical',
    nextEventMinutes: number
  ): 'none' | 'reduce_size' | 'close_positions' | 'avoid_trading' {
    if (riskLevel === 'critical') {
      // Within 30 minutes of major event
      if (nextEventMinutes >= -30 && nextEventMinutes <= 30) {
        return 'avoid_trading';
      }
      return 'close_positions';
    }

    if (riskLevel === 'high') {
      return 'reduce_size';
    }

    if (riskLevel === 'medium') {
      return 'reduce_size';
    }

    return 'none';
  }

  /**
   * Get high-impact events summary
   */
  async getHighImpactSummary(): Promise<string> {
    const events = await this.getUpcomingEvents(24);
    const highImpact = events.filter(e => e.impact === 'high' && !e.isPast);

    if (highImpact.length === 0) {
      return 'No high-impact events in the next 24 hours';
    }

    return highImpact.slice(0, 3).map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      return `${e.name} (${e.currency}) at ${time}`;
    }).join(', ');
  }
}
