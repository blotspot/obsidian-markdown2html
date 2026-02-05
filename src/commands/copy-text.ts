import { App, Notice } from "obsidian";
import CopyInProgressModal from "ui/copy-modal";
import { Log } from "utils/helper";

export default class CopyPlainText {
  private modal: CopyInProgressModal;

  constructor(app: App) {
    this.modal = new CopyInProgressModal(app);
  }

  async copyToClipboard(content: Promise<string>) {
    Log.d("Starting copy process...");
    this.modal.open();
    Log.d("Copying text to clipboard...");
    navigator.clipboard.writeText(await content)
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
