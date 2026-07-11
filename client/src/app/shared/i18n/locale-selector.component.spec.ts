import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocaleSelectorComponent } from './locale-selector.component';

describe('LocaleSelectorComponent', () => {
  let fixture: ComponentFixture<LocaleSelectorComponent>;
  let component: LocaleSelectorComponent;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    history.replaceState(null, '', '/en-US/rooms/brew-482');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <xliff>
          <file>
            <body>
              <trans-unit id="locale.selectorLabel" datatype="html"><target>Idioma</target></trans-unit>
              <trans-unit id="locale.ptBR" datatype="html"><target>Portugues (Brasil)</target></trans-unit>
              <trans-unit id="locale.enUS" datatype="html"><target>Ingles (Estados Unidos)</target></trans-unit>
              <trans-unit id="locale.esES" datatype="html"><target>Espanhol (Espanha)</target></trans-unit>
            </body>
          </file>
        </xliff>
      `,
    }));

    await TestBed.configureTestingModule({
      imports: [LocaleSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocaleSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders compact locale controls with selected state', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const flags = Array.from(fixture.nativeElement.querySelectorAll('img.locale-flag')) as HTMLImageElement[];

    expect(flags.map((flag) => flag.getAttribute('src'))).toEqual([
      '/flags/br.svg',
      '/flags/us.svg',
      '/flags/es.svg',
    ]);
    expect(flags.every((flag) => flag.alt === '' && flag.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(buttons.every((button) => button.textContent?.trim() === '')).toBe(true);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons.every((button) => button.getAttribute('aria-label'))).toBe(true);
  });

  it.each([
    ['pt-BR', 0],
    ['es-ES', 2],
  ] as const)('persists %s and switches active state without navigation', (locale, activeIndex) => {
    const currentHref = globalThis.location.href;

    component.selectLocale(locale);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

    expect(localStorage.getItem('coffee-planning-poker.locale')).toBe(locale);
    expect(buttons[activeIndex].getAttribute('aria-pressed')).toBe('true');
    expect(globalThis.location.href).toBe(currentHref);
  });

  it('updates translated accessible names after loading the selected catalog', async () => {
    component.selectLocale('pt-BR');
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.locale-selector').getAttribute('aria-label')).toBe('Idioma');
  });
});
