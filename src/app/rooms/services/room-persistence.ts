import { Injectable } from '@angular/core';

import { RecoveryAnchor, RoomSnapshot } from '../models/room-session';
import { normalizeRoomCode } from './room-validation';

const PREFIX = 'coffe-planning-poker.room.';
const TTL_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class RoomPersistence {
  read(roomCode: string): RecoveryAnchor | null {
    const normalized = normalizeRoomCode(roomCode);
    const raw = this.storage()?.getItem(this.key(normalized));
    if (!raw) {
      return null;
    }

    try {
      const anchor = JSON.parse(raw) as RecoveryAnchor;
      if (!this.isFresh(anchor) || anchor.roomCode !== normalized) {
        this.clear(normalized);
        return null;
      }

      return anchor;
    } catch {
      this.clear(normalized);
      return null;
    }
  }

  save(snapshot: RoomSnapshot, displayName: string): void {
    const anchor: RecoveryAnchor = {
      roomCode: normalizeRoomCode(snapshot.roomCode),
      participantId: snapshot.localParticipantId,
      displayName: displayName.trim(),
      resumeToken: snapshot.resumeToken,
      lastJoinedAt: Date.now(),
    };
    this.storage()?.setItem(this.key(anchor.roomCode), JSON.stringify(anchor));
  }

  clear(roomCode: string): void {
    this.storage()?.removeItem(this.key(normalizeRoomCode(roomCode)));
  }

  private isFresh(anchor: RecoveryAnchor): boolean {
    return Date.now() - anchor.lastJoinedAt <= TTL_MS;
  }

  private key(roomCode: string): string {
    return `${PREFIX}${roomCode}`;
  }

  private storage(): Storage | null {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  }
}
