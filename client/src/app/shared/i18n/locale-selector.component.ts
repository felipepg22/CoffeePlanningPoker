import { Component, inject } from '@angular/core';

import { I18nService } from './i18n.service';
import { LOCALE_OPTIONS, SupportedLocale } from './locales';

@Component({
  selector: 'app-locale-selector',
  template: `
    <div class="locale-selector" role="group" [attr.aria-label]="i18n.t('locale.selectorLabel', 'Language')">
      @for (option of localeOptions; track option.locale) {
        <button
          class="locale-option"
          type="button"
          [class.is-active]="option.locale === activeLocale()"
          [attr.aria-label]="localeLabel(option.locale)"
          [attr.aria-pressed]="option.locale === activeLocale()"
          [title]="option.nativeLabel"
          (click)="selectLocale(option.locale)"
        >
          <img class="locale-flag" [src]="option.flagAsset" alt="" aria-hidden="true">
        </button>
      }
    </div>
  `,
  styles: [`
    .locale-selector {
      display: inline-flex;
      gap: var(--space-1);
      border: 1px solid oklch(0.98 0.004 258 / 0.2);
      border-radius: var(--radius-md);
      background: var(--color-shell-deep);
      padding: var(--space-1);
    }

    .locale-option {
      display: grid;
      width: 2.25rem;
      min-width: 2.25rem;
      height: 2rem;
      place-items: center;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-ink-inverse);
      font: inherit;
      transition: background 180ms var(--ease-out-quart), border-color 180ms var(--ease-out-quart), box-shadow 180ms var(--ease-out-quart), transform 160ms var(--ease-out-quart);
    }

    .locale-option:hover,
    .locale-option.is-active {
      border-color: oklch(0.98 0.004 258 / 0.35);
      background: oklch(0.98 0.004 258 / 0.14);
    }

    .locale-option:focus-visible {
      outline: 3px solid var(--color-coffee-soft);
      outline-offset: 2px;
    }

    .locale-flag {
      display: block;
      width: 1.35rem;
      height: auto;
      border: 1px solid oklch(0.98 0.004 258 / 0.28);
      border-radius: 0.125rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .locale-option {
        transition-duration: 0.01ms;
      }
    }
  `],
})
export class LocaleSelectorComponent {
  readonly i18n = inject(I18nService);

  readonly localeOptions = LOCALE_OPTIONS;
  readonly activeLocale = this.i18n.locale;

  selectLocale(locale: SupportedLocale): void {
    this.i18n.setLocale(locale);
  }

  localeLabel(locale: SupportedLocale): string {
    if (locale === 'pt-BR') {
      return this.i18n.t('locale.ptBR', 'Portuguese (Brazil)');
    }

    if (locale === 'es-ES') {
      return this.i18n.t('locale.esES', 'Spanish (Spain)');
    }

    return this.i18n.t('locale.enUS', 'English (United States)');
  }
}
