const ROOM_CODE_PATTERN = /^[A-Z0-9]{3,8}(-[A-Z0-9]{2,8})?$/;

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase();
}

export function validateRoomName(value: string): ValidationResult {
  const normalized = value.trim();
  if (normalized.length < 3) {
    return { valid: false, message: 'Enter a room name with at least 3 characters.' };
  }

  if (normalized.length > 80) {
    return { valid: false, message: 'Keep the room name under 80 characters.' };
  }

  return { valid: true, message: '' };
}

export function validateDisplayName(value: string): ValidationResult {
  const normalized = value.trim();
  if (normalized.length < 2) {
    return { valid: false, message: 'Enter a display name with at least 2 characters.' };
  }

  if (normalized.length > 40) {
    return { valid: false, message: 'Keep your display name under 40 characters.' };
  }

  return { valid: true, message: '' };
}

export function validateRoomCode(value: string): ValidationResult {
  const normalized = normalizeRoomCode(value);
  if (!ROOM_CODE_PATTERN.test(normalized)) {
    return { valid: false, message: 'Enter a valid room code.' };
  }

  return { valid: true, message: '' };
}

export function parseInviteRoomCode(value: string, origin = globalThis.location?.origin ?? 'http://localhost:4200'): string | null {
  try {
    const url = new URL(value, origin);
    const match = /^\/rooms\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) {
      return null;
    }

    const roomCode = normalizeRoomCode(decodeURIComponent(match[1]));
    return validateRoomCode(roomCode).valid ? roomCode : null;
  } catch {
    return null;
  }
}
