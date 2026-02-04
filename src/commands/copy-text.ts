import { App, Editor, Notice, TFile } from "obsidian";
import CopyInProgressModal from "ui/copy-modal";
import { getContent, Log } from "utils/helper";

export default class CopyPlainText {
  private app: App;
  private modal: CopyInProgressModal;

  constructor(app: App) {
    this.app = app;
    this.modal = new CopyInProgressModal(app);
  }

  async copyToClipboard(contentProvider: Editor | TFile) {
    Log.d("Starting copy process...");
    this.modal.open();
    const content = await getContent(this.app, contentProvider);
    Log.d("Copying text to clipboard...");
    navigator.clipboard.writeText(content)
      .then(() => new Notice("Text copied to the clipboard", 3500))
      .catch((e) => {
        Log.e("Error while copying text to the clipboard", e);
        new Notice("Couldn't copy text to the clipboard", 3500);
      })
      .finally(() => {
        this.modal.close();
        Log.d("Copy process finished.");
      });
  }
}
