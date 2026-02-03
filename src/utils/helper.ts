import { App, Editor, TFile } from "obsidian";
import { APP_NAME } from "./constants";

export async function getContent(app: App, contentProvider: Editor | TFile) {
  if (contentProvider instanceof Editor) {
    Log.d("Reading content from editor selection or full note");
    return contentProvider.somethingSelected()
      ? contentProvider.getSelection()
      : contentProvider.getValue();
  } else {
    Log.d(`Reading content of file: ${contentProvider.path}`);
    return app.vault.read(contentProvider);
  }
}

export function removeEmptyLines(text: string): string {
  return text.replace(/^\s*/gm, "");
}

export function isEmpty(text: string): boolean {
  return removeEmptyLines(text).length === 0;
}

export class Log {
  public static devMode = false;

  public static d(msg: string) {
    if (Log.devMode) {
      console.debug(`[DEBUG] ${APP_NAME} - `, msg);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static e(msg: string, error?: any) {
    console.error(`[ERROR] ${APP_NAME} - `, msg, error);
  }
}
