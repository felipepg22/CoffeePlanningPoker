import { ALL_ROOM_ERROR_CODES, ALL_VALIDATION_CODES, knownRoomErrorMessage, roomErrorMessage, validationMessage } from './messages';

describe('localized message helpers', () => {
  it('maps every known validation code', () => {
    for (const code of ALL_VALIDATION_CODES) {
      expect(validationMessage({ valid: false, code, params: { min: 2, max: 80 } })).not.toBe('');
    }
  });

  it('maps every known room error code without backend message text', () => {
    for (const code of ALL_ROOM_ERROR_CODES) {
      const message = knownRoomErrorMessage(code);
      expect(message).toBeTruthy();
      expect(message).not.toContain('SERVER');
    }
  });

  it('uses generic fallback for unknown diagnostics', () => {
    expect(roomErrorMessage({ code: 'unexpected' as never, message: 'SERVER ENGLISH' })).not.toContain('SERVER ENGLISH');
  });
});
