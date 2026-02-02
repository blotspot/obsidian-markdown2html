import { App, Editor, getFrontMatterInfo, Notice, TFile } from "obsidian";
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
    this.modal.open();
    const fileContents = await getContent(this.app, contentProvider);
    const fmtInfo = getFrontMatterInfo(fileContents);

    navigator.clipboard
      .writeText(
        (fmtInfo.exists
          ? fileContents.slice(fmtInfo.contentStart)
          : fileContents
        ).trim(),
      )
      .then(() => new Notice("Text copied to the clipboard", 3500))
      .catch((e) => {
        Log.e("Error while copying text to the clipboard", e);
        new Notice("Couldn't copy text to the clipboard", 3500);
      })
      .finally(() => {
        this.modal.close();
      });
  }
}
