import { App, Component, debounce, Editor, MarkdownRenderer, Notice, TFile } from "obsidian";
import { Markdown2HtmlSettings } from "settings";
import CopyInProgressModal from "ui/copy-modal";
import { APP_NAME } from "utils/constants";
import { getContent } from "utils/helper";
import { cleanHtml } from "utils/html-cleaner";

export default class CopyHtml {
  private app: App;
  private modal: CopyInProgressModal;

  private copyResult?: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.modal = new CopyInProgressModal(app);
  }

  /** triggers the render of the markdown note or selection. */
  async renderHtml(contentProvider: Editor | TFile) {
    try {
      this.startCopyProcess();
      const content = await getContent(this.app, contentProvider);
      const path = this.app.workspace.activeEditor?.file?.path ?? "";
      const copyComp = new Component();
      copyComp.load();
      void MarkdownRenderer.render(this.app, content, this.copyResult as HTMLElement, path, copyComp);
    } catch (e) {
      console.error(`${APP_NAME}: Error while rendering HTML`, e);
      new Notice("Error while rendering HTML", 3500);
      this.endCopyProcess();
    }
  }

  /**
   * Cleans up the rendered HTML and stores it in the system clipboard.
   * Executes after a short delay to make sure all steps of the rendering are done.
   * Each time the method is called within the delay, the timer resets.
   */
  copyToClipboard = debounce(
    async (settings: Markdown2HtmlSettings) => {
      if (this.copyInProgress()) {
        navigator.clipboard
          .writeText(await cleanHtml(this.copyResult as HTMLElement, settings))
          .then(() => new Notice("HTML copied to the clipboard", 3500))
          .catch(e => {
            console.error(`${APP_NAME}: Error while copying HTML to the clipboard`, e);
            new Notice("Couldn't copy HTML to the clipboard", 3500);
          })
          .finally(() => this.endCopyProcess());
      }
    },
    500 /* wait delay until copy to clipboard happens */,
    true /* reset delay if method is called before timer finishes */
  );

  copyInProgress() {
    return this.copyResult !== undefined;
  }

  private startCopyProcess() {
    // eslint-disable-next-line no-undef
    this.copyResult = createDiv();
    this.modal.open();
  }

  private endCopyProcess() {
    this.copyResult = undefined;
    this.modal.close();
  }
}
