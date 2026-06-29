export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES';

export interface LocaleOption {
  readonly locale: SupportedLocale;
  readonly label: string;
  readonly nativeLabel: string;
  readonly flag: string;
}

export const SOURCE_LOCALE: SupportedLocale = 'en-US';

export const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-ES'] as const satisfies readonly SupportedLocale[];

export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { locale: 'pt-BR', label: 'Portuguese (Brazil)', nativeLabel: 'Portugues (Brasil)', flag: '🇧🇷' },
  { locale: 'en-US', label: 'English (United States)', nativeLabel: 'English (United States)', flag: '🇺🇸' },
  { locale: 'es-ES', label: 'Spanish (Spain)', nativeLabel: 'Espanol (Espana)', flag: '🇪🇸' },
];

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function parseLocalePrefix(pathname: string): SupportedLocale | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return isSupportedLocale(firstSegment) ? firstSegment : null;
}

export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (isSupportedLocale(segments[0])) {
    segments.shift();
  }

  return `/${segments.join('/')}`;
}

export function bestSupportedLocale(languages: readonly string[] = []): SupportedLocale {
  for (const language of languages) {
    if (isSupportedLocale(language)) {
      return language;
    }
  }

  for (const language of languages) {
    const primary = language.split('-')[0]?.toLowerCase();
    if (primary === 'pt') {
      return 'pt-BR';
    }
    if (primary === 'en') {
      return 'en-US';
    }
    if (primary === 'es') {
      return 'es-ES';
    }
  }

  return SOURCE_LOCALE;
}

export function resolveLocale(options: {
  readonly pathname: string;
  readonly persistedLocale?: string | null;
  readonly languages?: readonly string[];
}): SupportedLocale {
  return parseLocalePrefix(options.pathname) ??
    (isSupportedLocale(options.persistedLocale) ? options.persistedLocale : null) ??
    bestSupportedLocale(options.languages ?? []) ??
    SOURCE_LOCALE;
}

export function localizedPathFor(locale: SupportedLocale, pathname: string, search = '', hash = ''): string {
  const routePath = stripLocalePrefix(pathname);
  const normalizedRoute = routePath === '/' ? '' : routePath;
  return `/${locale}${normalizedRoute}${search}${hash}`;
}

export function localizedUrlFor(locale: SupportedLocale, location: Pick<Location, 'hash' | 'pathname' | 'search'>): string {
  return localizedPathFor(locale, location.pathname, location.search, location.hash);
}
