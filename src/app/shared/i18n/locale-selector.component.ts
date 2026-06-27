import { Component, inject } from '@angular/core';

import { IdentityService } from '../../identity/services/identity.service';
import { LOCALE_OPTIONS, SupportedLocale, localizedUrlFor, resolveLocale } from './locales';

@Component({
  selector: 'app-locale-selector',
  template: `
    <div class="locale-selector" role="group" i18n-aria-label="@@locale.selectorLabel" aria-label="Language">
      @for (option of localeOptions; track option.locale) {
        <button
          class="locale-option"
          type="button"
          [class.is-active]="option.locale === activeLocale"
          [attr.aria-label]="option.label"
          [attr.aria-pressed]="option.locale === activeLocale"
          [title]="option.nativeLabel"
          (click)="selectLocale(option.locale)"
        >
          <span class="flag-emoji" aria-hidden="true">{{ option.flag }}</span>
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

    .flag-emoji {
      font-size: 1.08rem;
      font-weight: 400;
      line-height: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .locale-option {
        transition-duration: 0.01ms;
      }
    }
  `],
})
export class LocaleSelectorComponent {
  private readonly identity = inject(IdentityService);

  readonly localeOptions = LOCALE_OPTIONS;
  readonly activeLocale = resolveLocale({
    pathname: globalThis.location?.pathname ?? '/',
    persistedLocale: this.identity.localePreference(),
    languages: globalThis.navigator?.languages ?? [],
  });

  selectLocale(locale: SupportedLocale): void {
    this.identity.setLocalePreference(locale);
    const target = this.localeTarget(locale);
    if (this.absoluteUrl(target) !== this.currentUrl()) {
      this.navigate(target);
    }
  }

  localeTarget(locale: SupportedLocale): string {
    return localizedUrlFor(locale, globalThis.location);
  }

  protected navigate(target: string): void {
    globalThis.location.assign(target);
  }

  private currentUrl(): string {
    return globalThis.location.href;
  }

  private absoluteUrl(target: string): string {
    return new URL(target, globalThis.location.href).href;
  }
}
