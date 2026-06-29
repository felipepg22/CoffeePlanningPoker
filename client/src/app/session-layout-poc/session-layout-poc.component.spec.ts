import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionLayoutPocComponent } from './session-layout-poc.component';
import { SessionLayoutPocState } from './session-layout-poc.data';

describe('SessionLayoutPocComponent', () => {
  let fixture: ComponentFixture<SessionLayoutPocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionLayoutPocComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionLayoutPocComponent);
    fixture.detectChanges();
  });

  it('renders the countertop layout first', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Session layout proof of concept');
    expect(text).toContain('Countertop');
    expect(text).toContain('Estimate reconnect fallback');
    expect(text).toContain('Pick an estimate');
  });

  it('switches between layout components', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.poc-layout-nav button')) as HTMLButtonElement[];
    const compactButton = buttons.find((button) => button.textContent?.includes('Compact'));

    compactButton?.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Save');
    expect(text).toContain('Team');
    expect(text).toContain('Tasks');
  });
});

describe('SessionLayoutPocState', () => {
  it('updates the local vote and saves the revealed average to the active task', () => {
    const state = new SessionLayoutPocState();

    state.selectEstimate('13');
    state.revealVotes();
    state.saveFinalEstimate();

    expect(state.selectedEstimate()).toBe('13');
    expect(state.averageEstimate()).toBe(9);
    expect(state.activeTask().estimate).toBe(9);
    expect(state.activeTask().status).toBe('estimated');
    expect(state.notice()).toContain('Saved 9 points');
  });

  it('keeps save disabled until votes are revealed', () => {
    const state = new SessionLayoutPocState();

    expect(state.canSave()).toBe(false);

    state.revealVotes();

    expect(state.canSave()).toBe(true);
  });
});
