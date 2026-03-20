import { browser, logging } from 'protractor';
import { AppPage } from './app.po';

// E2E tests for the Pokedex frontend application
describe('Pokedex Frontend App', () => {
  let page: AppPage;

  beforeEach((): void => {
    page = new AppPage();
  });

  it('should display welcome message', async () => {
    await page.navigateTo();
    const titleText: string = await page.getTitleText();
    expect(titleText).toEqual('pokedex-frontend app is running!');
  });

  afterEach(async () => {
    try {
      await assertNoSevereBrowserLogs();
    } catch (err) {
      // Ensure the test fails if we cannot retrieve or assert logs
      fail(`Failed to verify browser logs: ${err}`);
    }
  });

  // Helper: retrieve browser logs and assert there are no SEVERE-level entries
  async function assertNoSevereBrowserLogs(): Promise<void> {
    const logs: logging.Entry[] = await browser.manage().logs().get(logging.Type.BROWSER);
    const severeEntryMatcher = jasmine.objectContaining({
      level: logging.Level.SEVERE,
    } as logging.Entry);

    expect(logs).not.toContain(severeEntryMatcher);
  }
});
