import { RoomError, RoomErrorCode } from '../../rooms/models/room-session';
import { ValidationCode, ValidationResult } from '../../rooms/services/room-validation';
import { I18nService } from './i18n.service';

export function validationMessage(result: ValidationResult, i18n: I18nService): string {
  if (result.valid) {
    return '';
  }

  switch (result.code) {
    case 'room_name_too_short':
      return i18n.t('validation.roomNameTooShort', 'Enter a room name with at least {min} characters.', result.params);
    case 'room_name_too_long':
      return i18n.t('validation.roomNameTooLong', 'Keep the room name under {max} characters.', result.params);
    case 'display_name_too_short':
      return i18n.t('validation.displayNameTooShort', 'Enter a display name with at least {min} characters.', result.params);
    case 'display_name_too_long':
      return i18n.t('validation.displayNameTooLong', 'Keep your display name under {max} characters.', result.params);
    case 'invalid_room_code':
      return i18n.t('validation.invalidRoomCode', 'Enter a valid room code.');
    case 'task_title_too_short':
      return i18n.t('validation.taskTitleTooShort', 'Add a task title before starting a new round.');
    case 'task_title_too_long':
      return i18n.t('validation.taskTitleTooLong', 'Keep the task title under {max} characters.', result.params);
    case 'task_details_too_long':
      return i18n.t('validation.taskDetailsTooLong', 'Keep task notes under {max} characters.', result.params);
  }
}

export function roomErrorMessage(error: RoomError | null | undefined, i18n: I18nService): string {
  if (!error) {
    return '';
  }

  return knownRoomErrorMessage(error.code, i18n) ??
    i18n.t('error.unknown', 'Something changed before that action finished. Try again.');
}

export function knownRoomErrorMessage(code: RoomErrorCode, i18n: I18nService): string | null {
  switch (code) {
    case 'invalid_room_name':
      return i18n.t('error.invalidRoomName', 'Enter a valid room name and try again.');
    case 'invalid_display_name':
      return i18n.t('error.invalidDisplayName', 'Enter a valid display name and try again.');
    case 'invalid_room_code':
      return i18n.t('error.invalidRoomCode', 'Check the room code and try again.');
    case 'room_unavailable':
      return i18n.t('error.roomUnavailable', 'That room is unavailable. Check the code or create a new room.');
    case 'resume_rejected':
      return i18n.t('error.resumeRejected', 'We could not resume that room. Enter your name to join again.');
    case 'duplicate_join_rejected':
      return i18n.t('error.duplicateJoinRejected', 'That participant session is already active. Rejoin with your saved browser session.');
    case 'invalid_task_title':
      return i18n.t('error.invalidTaskTitle', 'Add a task title before starting a new round.');
    case 'forbidden':
      return i18n.t('error.forbidden', 'Only the facilitator can do that.');
    case 'task_not_found':
      return i18n.t('error.taskNotFound', 'That task is no longer available.');
    case 'no_active_task':
      return i18n.t('error.noActiveTask', 'Select a task before working with votes.');
    case 'stale_round':
      return i18n.t('error.staleRound', 'This round changed. Use the latest room state.');
    case 'invalid_estimate':
      return i18n.t('error.invalidEstimate', 'Choose a valid estimate card.');
    case 'vote_closed':
      return i18n.t('error.voteClosed', 'Votes are closed for this round.');
    case 'round_not_revealed':
      return i18n.t('error.roundNotRevealed', 'Reveal votes before saving an estimate.');
    case 'no_numeric_votes':
      return i18n.t('error.noNumericVotes', 'A numeric vote is required before saving an estimate.');
    case 'room_completed':
      return i18n.t('error.roomCompleted', 'This room estimation is already complete.');
    case 'invalid_room_mode':
      return i18n.t('error.invalidRoomMode', 'Choose a valid room mode.');
    case 'room_mode_restricted':
      return i18n.t('error.roomModeRestricted', 'That action is not available in this room mode.');
    case 'no_votes_cast':
      return i18n.t('error.noVotesCast', 'At least one vote is required before revealing.');
    case 'connection_failed':
      return i18n.t('error.connectionFailed', 'The room connection failed. Check your network and retry.');
  }
}

export const ALL_VALIDATION_CODES: readonly ValidationCode[] = [
  'room_name_too_short',
  'room_name_too_long',
  'display_name_too_short',
  'display_name_too_long',
  'invalid_room_code',
  'task_title_too_short',
  'task_title_too_long',
  'task_details_too_long',
];

export const ALL_ROOM_ERROR_CODES: readonly RoomErrorCode[] = [
  'invalid_room_name',
  'invalid_display_name',
  'invalid_room_code',
  'room_unavailable',
  'resume_rejected',
  'duplicate_join_rejected',
  'invalid_task_title',
  'forbidden',
  'task_not_found',
  'no_active_task',
  'stale_round',
  'invalid_estimate',
  'vote_closed',
  'round_not_revealed',
  'no_numeric_votes',
  'room_completed',
  'invalid_room_mode',
  'room_mode_restricted',
  'no_votes_cast',
  'connection_failed',
];
