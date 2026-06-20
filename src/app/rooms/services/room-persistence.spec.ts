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
    const raw = localStorage.getItem('coffee-planning-poker.room.BREW-482');
    expect(raw).not.toBeNull();
    localStorage.setItem('coffee-planning-poker.room.BREW-482', JSON.stringify({
      ...JSON.parse(raw ?? '{}'),
      lastJoinedAt: Date.now() - 25 * 60 * 60 * 1000,
    }));

    expect(persistence.read('BREW-482')).toBeNull();
    expect(localStorage.getItem('coffee-planning-poker.room.BREW-482')).toBeNull();
  });
});

function snapshot(): RoomSnapshot {
  const now = new Date().toISOString();
  return {
    roomCode: 'BREW-482',
    roomName: 'Sprint planning',
    inviteUrl: 'http://localhost:4200/rooms/brew-482',
    localParticipantId: 'p-1',
    resumeToken: 'token-1',
    createdAt: now,
    updatedAt: now,
    snapshotVersion: 1,
    participants: [],
    planningSession: {
      estimateCards: ['0', '1', '2', '3', '5', '8', '13', '21', '?'],
      tasks: [],
      currentTaskId: null,
      activeRound: null,
      completedRounds: [],
      archivedEstimateTotal: 0,
      estimationStatus: 'active',
      completedTotalEstimate: null,
    },
  };
}
