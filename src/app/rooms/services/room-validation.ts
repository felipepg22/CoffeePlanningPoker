const ROOM_CODE_PATTERN = /^[A-Z0-9]{3,8}(-[A-Z0-9]{2,8})?$/;
const ROOM_NAME_MIN = 3;
const ROOM_NAME_MAX = 80;
const DISPLAY_NAME_MIN = 2;
const DISPLAY_NAME_MAX = 40;
const TASK_TITLE_MIN = 3;
const TASK_TITLE_MAX = 120;
const TASK_DETAILS_MAX = 1000;

export type ValidationCode =
  | 'room_name_too_short'
  | 'room_name_too_long'
  | 'display_name_too_short'
  | 'display_name_too_long'
  | 'invalid_room_code'
  | 'task_title_too_short'
  | 'task_title_too_long'
  | 'task_details_too_long';

export type ValidationResult =
  | { readonly valid: true; readonly code: null; readonly params: Record<string, never> }
  | { readonly valid: false; readonly code: ValidationCode; readonly params: Record<string, number> };

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase();
}

export function validateRoomName(value: string): ValidationResult {
  const normalized = value.trim();
  if (normalized.length < ROOM_NAME_MIN) {
    return { valid: false, code: 'room_name_too_short', params: { min: ROOM_NAME_MIN } };
  }

  if (normalized.length > ROOM_NAME_MAX) {
    return { valid: false, code: 'room_name_too_long', params: { max: ROOM_NAME_MAX } };
  }

  return valid();
}

export function validateDisplayName(value: string): ValidationResult {
  const normalized = value.trim();
  if (normalized.length < DISPLAY_NAME_MIN) {
    return { valid: false, code: 'display_name_too_short', params: { min: DISPLAY_NAME_MIN } };
  }

  if (normalized.length > DISPLAY_NAME_MAX) {
    return { valid: false, code: 'display_name_too_long', params: { max: DISPLAY_NAME_MAX } };
  }

  return valid();
}

export function validateRoomCode(value: string): ValidationResult {
  const normalized = normalizeRoomCode(value);
  if (!ROOM_CODE_PATTERN.test(normalized)) {
    return { valid: false, code: 'invalid_room_code', params: {} };
  }

  return valid();
}

export function validateTaskTitle(value: string): ValidationResult {
  const normalized = value.trim();
  if (normalized.length < TASK_TITLE_MIN) {
    return { valid: false, code: 'task_title_too_short', params: { min: TASK_TITLE_MIN } };
  }

  if (normalized.length > TASK_TITLE_MAX) {
    return { valid: false, code: 'task_title_too_long', params: { max: TASK_TITLE_MAX } };
  }

  return valid();
}

export function validateTaskDetails(value: string): ValidationResult {
  if (value.trim().length > TASK_DETAILS_MAX) {
    return { valid: false, code: 'task_details_too_long', params: { max: TASK_DETAILS_MAX } };
  }

  return valid();
}

export function parseInviteRoomCode(value: string, origin = globalThis.location?.origin ?? 'http://localhost:4200'): string | null {
  try {
    const url = new URL(value, origin);
    const match = /^\/(?:(?:pt-BR|en-US|es-ES)\/)?rooms\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) {
      return null;
    }

    const roomCode = normalizeRoomCode(decodeURIComponent(match[1]));
    return validateRoomCode(roomCode).valid ? roomCode : null;
  } catch {
    return null;
  }
}

function valid(): ValidationResult {
  return { valid: true, code: null, params: {} };
}
