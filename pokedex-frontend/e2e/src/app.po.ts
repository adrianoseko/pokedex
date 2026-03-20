import { browser, by, element, ElementFinder } from 'protractor';

export class AppPage {
  // Centralized selector for the title element
  private readonly TITLE_SELECTOR = 'app-root .content span';

  /**
   * Navigate to the configured base URL.
   */
  async navigateTo(): Promise<void> {
    return browser.get(browser.baseUrl);
  }

  /**
   * Get the text of the app title element.
   */
  async getTitleText(): Promise<string> {
    const titleElement: ElementFinder = element(by.css(this.TITLE_SELECTOR));
    return titleElement.getText();
  }
}
