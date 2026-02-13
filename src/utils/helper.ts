import { APP_NAME } from "./constants";

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
      console.debug("[DEBUG]", APP_NAME, new Date().toISOString(), "-", msg);
    }
  }

  public static w(msg: string) {
    console.warn("[WARN]", APP_NAME, new Date().toISOString(), "-", msg);
  }

  public static e(msg: string, error?: unknown) {
    if (error instanceof Error) {
      console.error("[ERROR]", APP_NAME, new Date().toISOString(), "-", msg, error.message, error.stack);
    } else {
      console.error("[ERROR]", APP_NAME, new Date().toISOString(), "-", msg, error);
    }
  }

}
