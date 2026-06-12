import { TestBed } from '@angular/core/testing';

import { RoomSnapshot } from '../models/room-session';
import { RoomPersistence } from './room-persistence';

describe('RoomPersistence', () => {
  let persistence: RoomPersistence;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    persistence = TestBed.inject(RoomPersistence);
  });

  it('stores and reads recovery anchors', () => {
    persistence.save(snapshot(), 'Felipe');

    expect(persistence.read('brew-482')).toEqual(expect.objectContaining({
      roomCode: 'BREW-482',
      participantId: 'p-1',
      displayName: 'Felipe',
      resumeToken: 'token-1',
    }));
  });

  it('clears recovery anchors', () => {
    persistence.save(snapshot(), 'Felipe');

    persistence.clear('BREW-482');

    expect(persistence.read('BREW-482')).toBeNull();
  });

  it('removes stale recovery anchors', () => {
    persistence.save(snapshot(), 'Felipe');
    const raw = localStorage.getItem('coffe-planning-poker.room.BREW-482');
    expect(raw).not.toBeNull();
    localStorage.setItem('coffe-planning-poker.room.BREW-482', JSON.stringify({
      ...JSON.parse(raw ?? '{}'),
      lastJoinedAt: Date.now() - 25 * 60 * 60 * 1000,
    }));

    expect(persistence.read('BREW-482')).toBeNull();
    expect(localStorage.getItem('coffe-planning-poker.room.BREW-482')).toBeNull();
  });
});

function snapshot(): RoomSnapshot {
  return {
    roomCode: 'BREW-482',
    roomName: 'Sprint planning',
    inviteUrl: 'http://localhost:4200/rooms/brew-482',
    localParticipantId: 'p-1',
    resumeToken: 'token-1',
    createdAt: new Date().toISOString(),
    participants: [],
  };
}
