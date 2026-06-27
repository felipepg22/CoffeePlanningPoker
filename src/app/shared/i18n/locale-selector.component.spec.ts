import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocaleSelectorComponent } from './locale-selector.component';

type LocaleSelectorNavigation = LocaleSelectorComponent & {
  navigate(target: string): void;
};

describe('LocaleSelectorComponent', () => {
  let fixture: ComponentFixture<LocaleSelectorComponent>;
  let component: LocaleSelectorComponent;

  beforeEach(async () => {
    localStorage.clear();
    history.replaceState(null, '', '/en-US/rooms/brew-482');

    await TestBed.configureTestingModule({
      imports: [LocaleSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocaleSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders compact locale controls with selected state', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['🇧🇷', '🇺🇸', '🇪🇸']);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons.every((button) => button.getAttribute('aria-label'))).toBe(true);
  });

  it('builds route-preserving localized targets', () => {
    expect(component.localeTarget('pt-BR')).toBe('/pt-BR/rooms/brew-482');
  });

  it('preserves search and hash in localized targets without changing origin', () => {
    history.replaceState(null, '', '/en-US/rooms/brew-482?round=active#votes');

    expect(component.localeTarget('es-ES')).toBe('/es-ES/rooms/brew-482?round=active#votes');
  });

  it.each([
    ['pt-BR', '/pt-BR/rooms/brew-482'],
    ['es-ES', '/es-ES/rooms/brew-482'],
  ] as const)('persists %s and navigates to its localized route', (locale, target) => {
    const navigate = spyOnNavigate();

    component.selectLocale(locale);

    expect(localStorage.getItem('coffee-planning-poker.locale')).toBe(locale);
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(target);
  });

  it('persists selected locale without reloading when current target already matches', () => {
    const navigate = spyOnNavigate();

    component.selectLocale('en-US');

    expect(localStorage.getItem('coffee-planning-poker.locale')).toBe('en-US');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not reload when the selected target matches the full current URL', () => {
    const navigate = spyOnNavigate();
    const currentUrl = new URL('/en-US/rooms/brew-482', globalThis.location.href).href;
    vi.spyOn(component, 'localeTarget').mockReturnValue(currentUrl);

    component.selectLocale('en-US');

    expect(localStorage.getItem('coffee-planning-poker.locale')).toBe('en-US');
    expect(navigate).not.toHaveBeenCalled();
  });

  function spyOnNavigate() {
    return vi.spyOn(component as unknown as LocaleSelectorNavigation, 'navigate').mockImplementation(() => undefined);
  }
});
