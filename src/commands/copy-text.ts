import { App, Editor, getFrontMatterInfo, Notice, TFile } from "obsidian";
import { APP_NAME } from "utils/constants";
import { getContent } from "utils/helper";

export default class CopyPlainText {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  async copyToClipboard(contentProvider: Editor | TFile) {
    const fileContents = await getContent(this.app, contentProvider);
    const fmtInfo = getFrontMatterInfo(fileContents);

    navigator.clipboard
      .writeText((fmtInfo.exists ? fileContents.slice(fmtInfo.contentStart) : fileContents).trim())
      .then(() => new Notice("Text copied to the clipboard", 3500))
      .catch(e => {
        console.error(`${APP_NAME}: Error while copying text to the clipboard`, e);
        new Notice("Couldn't copy text to the clipboard", 3500);
      });
  }
}
