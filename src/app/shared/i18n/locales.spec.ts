import { bestSupportedLocale, localizedPathFor, localizedUrlFor, parseLocalePrefix, resolveLocale } from './locales';

describe('locale helpers', () => {
  it('gives URL locale precedence', () => {
    expect(resolveLocale({ pathname: '/pt-BR/rooms/brew-482', persistedLocale: 'es-ES', languages: ['en-US'] })).toBe('pt-BR');
  });

  it('uses persisted locale on neutral routes', () => {
    expect(resolveLocale({ pathname: '/rooms/brew-482', persistedLocale: 'es-ES', languages: ['pt-BR'] })).toBe('es-ES');
  });

  it('matches browser languages by exact locale then language fallback', () => {
    expect(bestSupportedLocale(['fr-CA', 'pt'])).toBe('pt-BR');
    expect(bestSupportedLocale(['es-ES', 'pt-BR'])).toBe('es-ES');
  });

  it('falls back to source locale when unsupported', () => {
    expect(resolveLocale({ pathname: '/fr-FR', persistedLocale: 'de-DE', languages: ['it-IT'] })).toBe('en-US');
  });

  it('preserves route intent when building localized paths', () => {
    expect(parseLocalePrefix('/en-US/rooms/brew-482')).toBe('en-US');
    expect(localizedPathFor('pt-BR', '/rooms/brew-482', '?x=1', '#top')).toBe('/pt-BR/rooms/brew-482?x=1#top');
    expect(localizedPathFor('es-ES', '/en-US/rooms/brew-482')).toBe('/es-ES/rooms/brew-482');
    expect(localizedPathFor('en-US', '/')).toBe('/en-US');
  });

  it('uses fixed local dev ports when switching served locale variants', () => {
    expect(localizedUrlFor('es-ES', {
      protocol: 'http:',
      hostname: 'localhost',
      port: '4200',
      pathname: '/pt-BR/rooms/brew-482',
      search: '',
      hash: '',
    })).toBe('http://localhost:4201/es-ES/rooms/brew-482');
  });
});
