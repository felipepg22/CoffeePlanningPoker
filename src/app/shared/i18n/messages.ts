import { RoomError, RoomErrorCode } from '../../rooms/models/room-session';
import { ValidationCode, ValidationResult } from '../../rooms/services/room-validation';

export function validationMessage(result: ValidationResult): string {
  if (result.valid) {
    return '';
  }

  switch (result.code) {
    case 'room_name_too_short':
      return $localize`:@@validation.roomNameTooShort:Enter a room name with at least ${result.params['min']}:min: characters.`;
    case 'room_name_too_long':
      return $localize`:@@validation.roomNameTooLong:Keep the room name under ${result.params['max']}:max: characters.`;
    case 'display_name_too_short':
      return $localize`:@@validation.displayNameTooShort:Enter a display name with at least ${result.params['min']}:min: characters.`;
    case 'display_name_too_long':
      return $localize`:@@validation.displayNameTooLong:Keep your display name under ${result.params['max']}:max: characters.`;
    case 'invalid_room_code':
      return $localize`:@@validation.invalidRoomCode:Enter a valid room code.`;
    case 'task_title_too_short':
      return $localize`:@@validation.taskTitleTooShort:Add a task title before starting a new round.`;
    case 'task_title_too_long':
      return $localize`:@@validation.taskTitleTooLong:Keep the task title under ${result.params['max']}:max: characters.`;
    case 'task_details_too_long':
      return $localize`:@@validation.taskDetailsTooLong:Keep task notes under ${result.params['max']}:max: characters.`;
  }
}

export function roomErrorMessage(error: RoomError | null | undefined): string {
  if (!error) {
    return '';
  }

  return knownRoomErrorMessage(error.code) ??
    $localize`:@@error.unknown:Something changed before that action finished. Try again.`;
}

export function knownRoomErrorMessage(code: RoomErrorCode): string | null {
  switch (code) {
    case 'invalid_room_name':
      return $localize`:@@error.invalidRoomName:Enter a valid room name and try again.`;
    case 'invalid_display_name':
      return $localize`:@@error.invalidDisplayName:Enter a valid display name and try again.`;
    case 'invalid_room_code':
      return $localize`:@@error.invalidRoomCode:Check the room code and try again.`;
    case 'room_unavailable':
      return $localize`:@@error.roomUnavailable:That room is unavailable. Check the code or create a new room.`;
    case 'resume_rejected':
      return $localize`:@@error.resumeRejected:We could not resume that room. Enter your name to join again.`;
    case 'duplicate_join_rejected':
      return $localize`:@@error.duplicateJoinRejected:That participant session is already active. Rejoin with your saved browser session.`;
    case 'invalid_task_title':
      return $localize`:@@error.invalidTaskTitle:Add a task title before starting a new round.`;
    case 'forbidden':
      return $localize`:@@error.forbidden:Only the facilitator can do that.`;
    case 'task_not_found':
      return $localize`:@@error.taskNotFound:That task is no longer available.`;
    case 'no_active_task':
      return $localize`:@@error.noActiveTask:Select a task before working with votes.`;
    case 'stale_round':
      return $localize`:@@error.staleRound:This round changed. Use the latest room state.`;
    case 'invalid_estimate':
      return $localize`:@@error.invalidEstimate:Choose a valid estimate card.`;
    case 'vote_closed':
      return $localize`:@@error.voteClosed:Votes are closed for this round.`;
    case 'round_not_revealed':
      return $localize`:@@error.roundNotRevealed:Reveal votes before saving an estimate.`;
    case 'no_numeric_votes':
      return $localize`:@@error.noNumericVotes:A numeric vote is required before saving an estimate.`;
    case 'room_completed':
      return $localize`:@@error.roomCompleted:This room estimation is already complete.`;
    case 'connection_failed':
      return $localize`:@@error.connectionFailed:The room connection failed. Check your network and retry.`;
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
  'connection_failed',
];
