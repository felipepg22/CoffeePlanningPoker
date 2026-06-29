import { TestBed } from '@angular/core/testing';

import { I18nService } from './i18n.service';

describe('I18nService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    history.replaceState(null, '', '/en-US');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the URL locale first and updates the document language', () => {
    history.replaceState(null, '', '/es-ES/rooms/brew-482');

    const service = TestBed.inject(I18nService);

    expect(service.locale()).toBe('es-ES');
    expect(document.documentElement.lang).toBe('es-ES');
  });

  it('falls back to source copy while a locale catalog is missing', () => {
    const service = TestBed.inject(I18nService);

    service.setLocale('pt-BR');

    expect(service.t('button.createRoom', 'Create room')).toBe('Create room');
  });

  it('loads XLIFF targets and interpolates placeholders at runtime', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <xliff>
          <file>
            <body>
              <trans-unit id="round.readiness" datatype="html">
                <target><x id="votedCount"/> de <x id="totalVoters"/> votaram</target>
              </trans-unit>
            </body>
          </file>
        </xliff>
      `,
    }));
    const service = TestBed.inject(I18nService);

    service.setLocale('pt-BR');
    await Promise.resolve();
    await Promise.resolve();

    expect(service.t('round.readiness', '{votedCount} of {totalVoters} voted', {
      votedCount: 2,
      totalVoters: 3,
    })).toBe('2 de 3 votaram');
  });
});
