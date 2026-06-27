import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localePt from '@angular/common/locales/pt';

import { formatAppEstimate, formatEstimateCard } from './estimate-format';

describe('estimate formatting', () => {
  beforeAll(() => {
    registerLocaleData(localePt, 'pt-BR');
    registerLocaleData(localeEs, 'es-ES');
  });

  it('formats app-owned averages by locale', () => {
    expect(formatAppEstimate(1.5, 'en-US')).toBe('1.5');
    expect(formatAppEstimate(1.5, 'pt-BR')).toBe('1,5');
    expect(formatAppEstimate(1.5, 'es-ES')).toBe('1,5');
  });

  it('formats totals and open values', () => {
    expect(formatAppEstimate(8, 'en-US')).toBe('8');
    expect(formatAppEstimate(null, 'en-US')).toBe('Open');
  });

  it('preserves estimate card labels', () => {
    expect(formatEstimateCard('?')).toBe('?');
    expect(formatEstimateCard('13')).toBe('13');
  });
});
