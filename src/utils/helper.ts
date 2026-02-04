import { App, Editor, getFrontMatterInfo, TFile } from "obsidian";
import { APP_NAME } from "./constants";

export async function getContent(app: App, contentProvider: Editor | TFile): Promise<string> {
  let contentPromise: Promise<string>;
  if (contentProvider instanceof Editor) {
    Log.d("Reading content from editor selection or full note");
    contentPromise = Promise.resolve(contentProvider.somethingSelected()
      ? contentProvider.getSelection()
      : contentProvider.getValue());
  } else {
    Log.d(`Reading content of file: ${contentProvider.path}`);
    contentPromise = app.vault.read(contentProvider);
  }
  return contentPromise
    .then((content) => {
      Log.d(`Content length: ${content.length} characters`);
      const fmtInfo = getFrontMatterInfo(content);
      return (fmtInfo.exists ? content.slice(fmtInfo.contentStart) : content).trim();
    })
    .catch((e) => {
      Log.e("Error while reading content", e);
      throw e;
    });

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

  public static w(msg: string) {
    console.warn(`[WARN] ${APP_NAME} - `, msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static e(msg: string, error?: any) {
    console.error(`[ERROR] ${APP_NAME} - `, msg, error);
  }
}
