import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocaleSelectorComponent } from './locale-selector.component';

describe('LocaleSelectorComponent', () => {
  let fixture: ComponentFixture<LocaleSelectorComponent>;
  let component: LocaleSelectorComponent;

  beforeEach(async () => {
    localStorage.clear();
    history.replaceState(null, '', '/en-US/rooms/brew-482');

    await TestBed.configureTestingModule({
      imports: [LocaleSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocaleSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders compact locale controls with selected state', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['BR', 'US', 'ES']);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons.every((button) => button.getAttribute('aria-label'))).toBe(true);
  });

  it('builds route-preserving localized targets', () => {
    expect(component.localeTarget('pt-BR')).toBe('/pt-BR/rooms/brew-482');
  });

  it('persists selected locale when current target already matches', () => {
    history.replaceState(null, '', '/en-US');

    component.selectLocale('en-US');

    expect(localStorage.getItem('coffee-planning-poker.locale')).toBe('en-US');
  });
});
