import type { EconomicCalendarData, EconomicEvent } from '../types/enhanced';

export class EconomicCalendarService {
  private cachedEvents: EconomicEvent[] = [];
  private lastFetch = 0;
  private readonly CACHE_TTL = 60 * 60 * 1000;

  async getCalendarData(symbols: string[]): Promise<EconomicCalendarData> {
    if (Date.now() - this.lastFetch > this.CACHE_TTL || this.cachedEvents.length === 0) {
      this.cachedEvents = this.generateEconomicEvents();
      this.lastFetch = Date.now();
    }

    const now = new Date();
    const events = this.cachedEvents.map((event) => {
      const eventTime = new Date(event.datetime);
      const hoursUntil = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return { ...event, hours_until_event: hoursUntil };
    });

    const upcomingEvents = events.filter((e) => e.hours_until_event > 0 && e.hours_until_event < 48);
    const highImpactWithin4h = upcomingEvents.filter(
      (e) => e.impact === 'high' && e.hours_until_event <= 4
    );

    const affectedCurrencies = this.getAffectedCurrencies(symbols, highImpactWithin4h);

    let riskLevel: EconomicCalendarData['risk_level'] = 'low';
    let positionSizeReduction = 0;
    let shouldAvoidTrading = false;

    if (highImpactWithin4h.length > 0) {
      const hasAffectedCurrency = highImpactWithin4h.some((e) =>
        affectedCurrencies.includes(e.currency)
      );

      if (hasAffectedCurrency) {
        const withinHour = highImpactWithin4h.filter(
          (e) => e.hours_until_event <= 1 && affectedCurrencies.includes(e.currency)
        );

        if (withinHour.length > 0) {
          riskLevel = 'extreme';
          positionSizeReduction = 0.75;
          shouldAvoidTrading = true;
        } else {
          riskLevel = 'high';
          positionSizeReduction = 0.5;
          shouldAvoidTrading = false;
        }
      } else {
        riskLevel = 'medium';
        positionSizeReduction = 0.25;
      }
    } else if (upcomingEvents.filter((e) => e.impact === 'medium' && e.hours_until_event < 2).length > 0) {
      riskLevel = 'medium';
      positionSizeReduction = 0.2;
    }

    return {
      upcoming_events: upcomingEvents.slice(0, 10),
      high_impact_within_4h: highImpactWithin4h,
      affected_currencies: affectedCurrencies,
      risk_level: riskLevel,
      position_size_reduction: positionSizeReduction,
      should_avoid_trading: shouldAvoidTrading
    };
  }

  private getAffectedCurrencies(symbols: string[], events: EconomicEvent[]): string[] {
    const symbolCurrencies = new Set<string>();

    for (const symbol of symbols) {
      const parts = symbol.replace('/', '').split('');
      if (symbol.includes('/')) {
        const currencies = symbol.split('/');
        currencies.forEach((c) => symbolCurrencies.add(c.toUpperCase()));
      } else if (symbol === 'AAPL' || symbol === 'TSLA' || symbol === 'GOOGL' || symbol === 'MSFT') {
        symbolCurrencies.add('USD');
      } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
        symbolCurrencies.add('USD');
      }
    }

    return events.map((e) => e.currency).filter((c) => symbolCurrencies.has(c));
  }

  private generateEconomicEvents(): EconomicEvent[] {
    const now = new Date();
    const events: EconomicEvent[] = [];

    const eventTemplates = [
      { name: 'US Non-Farm Payrolls', currency: 'USD', impact: 'high' as const },
      { name: 'US CPI (YoY)', currency: 'USD', impact: 'high' as const },
      { name: 'FOMC Meeting Minutes', currency: 'USD', impact: 'high' as const },
      { name: 'ECB Interest Rate Decision', currency: 'EUR', impact: 'high' as const },
      { name: 'Bank of England Rate Decision', currency: 'GBP', impact: 'high' as const },
      { name: 'US Retail Sales (MoM)', currency: 'USD', impact: 'medium' as const },
      { name: 'EU GDP Growth Rate', currency: 'EUR', impact: 'medium' as const },
      { name: 'UK GDP (QoQ)', currency: 'GBP', impact: 'medium' as const },
      { name: 'US Initial Jobless Claims', currency: 'USD', impact: 'medium' as const },
      { name: 'Japan Tankan Index', currency: 'JPY', impact: 'medium' as const },
      { name: 'US ISM Manufacturing PMI', currency: 'USD', impact: 'medium' as const },
      { name: 'EU Consumer Confidence', currency: 'EUR', impact: 'low' as const },
      { name: 'UK Retail Sales (MoM)', currency: 'GBP', impact: 'low' as const }
    ];

    for (let i = 0; i < 8; i++) {
      const template = eventTemplates[i % eventTemplates.length];
      const hoursAhead = 2 + i * 6 + Math.random() * 4;
      const eventTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      events.push({
        id: `evt_${i}`,
        datetime: eventTime.toISOString(),
        currency: template.currency,
        event_name: template.name,
        impact: template.impact,
        forecast: template.impact === 'high' ? `${(Math.random() * 0.5).toFixed(1)}%` : undefined,
        previous: template.impact === 'high' ? `${(Math.random() * 0.5).toFixed(1)}%` : undefined,
        actual: undefined,
        hours_until_event: hoursAhead
      });
    }

    return events.sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
  }
}
