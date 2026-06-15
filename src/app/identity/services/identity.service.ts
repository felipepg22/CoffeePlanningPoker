import { Injectable } from '@angular/core';

const PARTICIPANT_ID_KEY = 'coffee-planning-poker.participant-id';
const DISPLAY_NAME_KEY = 'coffee-planning-poker.display-name';

@Injectable({ providedIn: 'root' })
export class IdentityService {
  participantId(): string {
    const stored = this.storage()?.getItem(PARTICIPANT_ID_KEY);
    if (stored) {
      return stored;
    }

    const id = this.createId();
    this.storage()?.setItem(PARTICIPANT_ID_KEY, id);
    return id;
  }

  displayName(): string {
    return this.storage()?.getItem(DISPLAY_NAME_KEY) ?? '';
  }

  setDisplayName(displayName: string): void {
    this.storage()?.setItem(DISPLAY_NAME_KEY, displayName.trim());
  }

  private createId(): string {
    const crypto = globalThis.crypto;
    if (crypto && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `participant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private storage(): Storage | null {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  }
}
