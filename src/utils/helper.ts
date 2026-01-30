import { App, Editor, TFile } from "obsidian";

export function removeEmptyLines(text: string): string {
  return text.replace(/^\s*/gm, "");
}

export function isEmpty(text: string): boolean {
  return removeEmptyLines(text).length === 0;
}

export async function getContent(app: App, contentProvider: Editor | TFile) {
  if (contentProvider instanceof Editor) {
    return contentProvider.somethingSelected() ? contentProvider.getSelection() : contentProvider.getValue();
  } else {
    return app.vault.read(contentProvider);
  }
}