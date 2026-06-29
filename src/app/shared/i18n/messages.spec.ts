import { ALL_ROOM_ERROR_CODES, ALL_VALIDATION_CODES, knownRoomErrorMessage, roomErrorMessage, validationMessage } from './messages';
import { I18nService } from './i18n.service';

describe('localized message helpers', () => {
  const i18n = {
    t: (_id: string, fallback: string, params = {}) =>
      fallback.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, key: string) => {
        const value = (params as Record<string, string | number | null | undefined>)[key];
        return value === null || value === undefined ? placeholder : String(value);
      }),
  } as I18nService;

  it('maps every known validation code', () => {
    for (const code of ALL_VALIDATION_CODES) {
      expect(validationMessage({ valid: false, code, params: { min: 2, max: 80 } }, i18n)).not.toBe('');
    }
  });

  it('maps every known room error code without backend message text', () => {
    for (const code of ALL_ROOM_ERROR_CODES) {
      const message = knownRoomErrorMessage(code, i18n);
      expect(message).toBeTruthy();
      expect(message).not.toContain('SERVER');
    }
  });

  it('uses generic fallback for unknown diagnostics', () => {
    expect(roomErrorMessage({ code: 'unexpected' as never, message: 'SERVER ENGLISH' }, i18n)).not.toContain('SERVER ENGLISH');
  });
});
