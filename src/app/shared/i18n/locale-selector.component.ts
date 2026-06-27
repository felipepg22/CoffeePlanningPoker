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
          <span aria-hidden="true">{{ option.flag }}</span>
        </button>
      }
    </div>
  `,
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
    if (target !== this.currentUrl()) {
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
    const location = globalThis.location;
    return `${location.pathname}${location.search}${location.hash}`;
  }
}
