import { App, htmlToMarkdown, Notice } from "obsidian";
import { Markdown2HtmlSettings } from "settings";
import { Log } from "utils/helper";
import CopyHtml from "./copy-html";

export default class CopyPlainText extends CopyHtml {

  constructor(app: App) {
    super(app)
  }

  /**
   * Cleans up the rendered HTML and stores it in the system clipboard.
   * Executes after a short delay to make sure all steps of the rendering are done.
   * Each time the method is called within the delay, the timer resets.
   */
  async copyToClipboard(settings: Markdown2HtmlSettings) {
    if (this.inProgress) {
      Log.d("Data collection finished, converting to text...");
      this.removeFrontmatter(settings);
      const data = htmlToMarkdown(this.htmlRoot.innerHTML);
      Log.d("Copying text to clipboard...");
      navigator.clipboard.writeText(data)
        .then(() => new Notice("Text copied to the clipboard", 3500))
        .catch(e => {
          Log.e("Error while copying text to the clipboard", e);
          new Notice("Couldn't copy text to the clipboard", 3500);
        })
        .finally(() => this.finish());
    }
  }
}
