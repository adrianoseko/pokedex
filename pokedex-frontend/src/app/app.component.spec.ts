import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  const APP_TITLE = 'pokedex-frontend';
  const EXPECTED_RENDER_TEXT = `${APP_TITLE} app is running!`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have as title '${APP_TITLE}'`, () => {
    expect(component.title).toEqual(APP_TITLE);
  });

  it('should render title', () => {
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    // keep the same runtime behavior as original when element is missing
    const span = compiled.querySelector('.content span')!;
    expect(span.textContent).toContain(EXPECTED_RENDER_TEXT);
  });
});
