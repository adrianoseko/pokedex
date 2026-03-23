import { TestBed, waitForAsync, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  const APP_TITLE = 'pokedex-frontend';

  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
      });
  }));

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have as title '${APP_TITLE}'`, () => {
    expect(component.title).toEqual(APP_TITLE);
  });

  it('should render title', () => {
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const titleElement = compiled.querySelector('.content span');
    // ensure the element exists before asserting on its text to provide clearer failure
    expect(titleElement).toBeTruthy();
    expect(titleElement!.textContent).toContain(`${APP_TITLE} app is running!`);
  });
});
