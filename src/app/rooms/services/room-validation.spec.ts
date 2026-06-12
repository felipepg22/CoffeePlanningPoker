import {
  normalizeRoomCode,
  parseInviteRoomCode,
  validateDisplayName,
  validateRoomCode,
  validateRoomName,
} from './room-validation';

describe('room validation', () => {
  it('validates room names', () => {
    expect(validateRoomName('ab').valid).toBe(false);
    expect(validateRoomName('Sprint planning').valid).toBe(true);
  });

  it('validates display names', () => {
    expect(validateDisplayName('a').valid).toBe(false);
    expect(validateDisplayName('Felipe').valid).toBe(true);
  });

  it('normalizes and validates room codes', () => {
    expect(normalizeRoomCode(' brew-482 ')).toBe('BREW-482');
    expect(validateRoomCode('BREW-482').valid).toBe(true);
    expect(validateRoomCode('bad code!').valid).toBe(false);
  });

  it('parses invite URLs', () => {
    expect(parseInviteRoomCode('/rooms/brew-482', 'http://localhost:4200')).toBe('BREW-482');
    expect(parseInviteRoomCode('http://localhost:4200/rooms/BREW-482', 'http://localhost:4200')).toBe('BREW-482');
    expect(parseInviteRoomCode('http://localhost:4200/not-a-room', 'http://localhost:4200')).toBeNull();
  });
});
