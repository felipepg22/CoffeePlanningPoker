import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

import { IdentityService } from '../../identity/services/identity.service';
import { SOURCE_LOCALE, SupportedLocale, resolveLocale } from './locales';

export type MessageParams = Record<string, string | number | null | undefined>;

type LocaleCatalog = Record<string, string>;
type CatalogState = Partial<Record<SupportedLocale, LocaleCatalog>>;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly identity = inject(IdentityService);
  private readonly document = inject(DOCUMENT);
  private readonly localeSignal = signal<SupportedLocale>(this.initialLocale());
  private readonly catalogsSignal = signal<CatalogState>({});
  private readonly loadingLocales = new Set<SupportedLocale>();

  readonly locale = computed(() => this.localeSignal());

  constructor() {
    this.applyLocale(this.localeSignal());
  }

  setLocale(locale: SupportedLocale): void {
    this.identity.setLocalePreference(locale);
    this.applyLocale(locale);
  }

  t(messageId: string, fallback: string, params: MessageParams = {}): string {
    const locale = this.localeSignal();
    const catalog = this.catalogsSignal()[locale];
    return this.interpolate(catalog?.[messageId] ?? fallback, params);
  }

  formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(this.localeSignal(), options).format(value);
  }

  formatTime(value: Date, options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }): string {
    return new Intl.DateTimeFormat(this.localeSignal(), options).format(value);
  }

  private initialLocale(): SupportedLocale {
    return resolveLocale({
      pathname: globalThis.location?.pathname ?? '/',
      persistedLocale: this.identity.localePreference(),
      languages: globalThis.navigator?.languages ?? [],
    });
  }

  private applyLocale(locale: SupportedLocale): void {
    this.localeSignal.set(locale);
    this.document.documentElement.lang = locale;

    if (locale !== SOURCE_LOCALE) {
      void this.loadCatalog(locale);
    }
  }

  private async loadCatalog(locale: SupportedLocale): Promise<void> {
    if (this.catalogsSignal()[locale] || this.loadingLocales.has(locale)) {
      return;
    }

    this.loadingLocales.add(locale);

    try {
      const response = await fetch(`/locale/messages.${locale}.xlf`);
      if (!response.ok) {
        return;
      }

      const catalog = this.parseCatalog(await response.text());
      this.catalogsSignal.update((catalogs) => ({ ...catalogs, [locale]: catalog }));
    } finally {
      this.loadingLocales.delete(locale);
    }
  }

  private parseCatalog(xml: string): LocaleCatalog {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const catalog: LocaleCatalog = {};

    for (const unit of Array.from(document.querySelectorAll('trans-unit[id]'))) {
      const id = unit.getAttribute('id');
      const target = unit.querySelector('target');
      if (!id || !target) {
        continue;
      }

      catalog[id] = this.serializeMessage(target);
    }

    return catalog;
  }

  private serializeMessage(node: Node): string {
    let value = '';

    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        value += child.textContent ?? '';
        continue;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        if (element.tagName.toLowerCase() === 'x') {
          const placeholder = element.getAttribute('id');
          value += placeholder ? `{${placeholder}}` : '';
        } else {
          value += this.serializeMessage(element);
        }
      }
    }

    return value;
  }

  private interpolate(template: string, params: MessageParams): string {
    return template.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, key: string) => {
      const value = params[key];
      return value === null || value === undefined ? placeholder : String(value);
    });
  }
}
