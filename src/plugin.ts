import CopyHtml from "commands/copy-html";
import CopyPlainText from "commands/copy-text";
import {
  addIcon,
  Editor,
  MarkdownView,
  Menu,
  Plugin,
  removeIcon,
  TFile,
} from "obsidian";
import { Markdown2HtmlSettingsTab } from "settings";
import {
  HTML2CLIP_ACTION_TEXT as MD2HTML_ACTION_TEXT,
  MD2HTML_ICON,
  PLAINTXT_ACTION_TEXT,
  PLAINTXT_ICON,
} from "./utils/constants";
import { Log } from "utils/helper";

export default class Markdown2Html extends Plugin {
  async onload() {
    // add custom icon
    addIcon(
      MD2HTML_ICON,
      `<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
				<path d="M16,3l0,2c0,0.552 -0.448,1 -1,1l-6,0c-0.552,0 -1,-0.448 -1,-1l0,-2c0,-0.552 0.448,-1 1,-1l6,0c0.552,0 1,0.448 1,1Z" />
				<path d="M16,4l2,0c1.097,0 2,0.903 2,2l0,14c0,1.097 -0.903,2 -2,2l-12,0c-1.097,0 -2,-0.903 -2,-2l0,-14c0,-1.097 0.903,-2 2,-2l2,0" />
				<path d="M14,11l2.002,2.969l-2.002,3.031" />
				<path d="M10,11l-2,2.969l2,3.031" />
			</g>`,
    );
    addIcon(
      PLAINTXT_ICON,
      `<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
		     <path d="M16,3l0,2c0,0.552 -0.448,1 -1,1l-6,0c-0.552,0 -1,-0.448 -1,-1l0,-2c0,-0.552 0.448,-1 1,-1l6,0c0.552,0 1,0.448 1,1Z" />
         <path d="M16,4l2,0c1.097,0 2,0.903 2,2l0,14c0,1.097 -0.903,2 -2,2l-12,0c-1.097,0 -2,-0.903 -2,-2l0,-14c0,-1.097 0.903,-2 2,-2l2,0" />
		     <path d="M8.263,17l-0,-5.98l3.737,2.99l3.737,-3.01l0,6" />
			</g>`,
    );

    // init settings
    const settingsTab = new Markdown2HtmlSettingsTab(this);
    this.addSettingTab(settingsTab);

    //// Add commands
    const copyAsHtmlCommand = new CopyHtml(this.app);
    const copyAsTextCommand = new CopyPlainText(this.app);
    // callback function to get the content provider (editor or file)
    const getContentProvider = (): Editor | TFile | null => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view != null) {
        return view.editor;
      }
      const file = this.app.workspace.activeEditor?.file;
      if (file != null) {
        return file;
      }
      return null;
    };

    // register copy commands
    this.addCommand({
      id: "clipboard",
      icon: MD2HTML_ICON,
      name: MD2HTML_ACTION_TEXT,
      checkCallback: (checking: boolean) => {
        const contentProvider = getContentProvider();
        if (checking) {
          return !!contentProvider;
        }
        void copyAsHtmlCommand.renderHtml(contentProvider as Editor | TFile);
        return true;
      },
    });
    this.addCommand({
      id: "txtclipboard",
      icon: PLAINTXT_ICON,
      name: PLAINTXT_ACTION_TEXT,
      checkCallback: (checking: boolean) => {
        const contentProvider = getContentProvider();
        if (checking) {
          return !!contentProvider;
        }
        void copyAsTextCommand.copyToClipboard(
          contentProvider as Editor | TFile,
        );
        return true;
      },
    });

    // add ribon action
    this.addRibbonIcon(MD2HTML_ICON, MD2HTML_ACTION_TEXT, () => {
      const contentProvider = getContentProvider();
      if (contentProvider !== null) {
        void copyAsHtmlCommand.renderHtml(contentProvider);
      }
    });

    // register context menu events
    const addMenuItems = (menu: Menu, contentProvider: Editor | TFile) => {
      menu.addSeparator();
      // add html copy item
      menu.addItem((item) => {
        item
          .setTitle(MD2HTML_ACTION_TEXT)
          .setIcon(MD2HTML_ICON)
          .onClick(
            async () => void copyAsHtmlCommand.renderHtml(contentProvider),
          );
      });
      // add text copy item
      menu.addItem((item) => {
        item
          .setTitle(PLAINTXT_ACTION_TEXT)
          .setIcon(PLAINTXT_ICON)
          .onClick(
            async () => void copyAsTextCommand.copyToClipboard(contentProvider),
          );
      });
      menu.addSeparator();
    };

    // editor menu
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) =>
        addMenuItems(menu, editor),
      ),
    );
    // file menu
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFile) {
          addMenuItems(menu, file);
        }
      }),
    );
    // register post processor to monitor markdown render progress
    this.registerMarkdownPostProcessor(async (el, ctx) => {
      // INFO:
      // We can't unregister the post processor, and all postprocessors are called every time a render is triggered.
      // To test if the render was triggered by our copy process, we check if our copy process is in progress.
      if (copyAsHtmlCommand.copyInProgress()) {
        Log.d("HTML rendering segment finished...");
        // Get's called after every segment (can be multiple for renders with plugins like dataview).
        // Since it has a debaounce delay that will reset after every call,
        // this function will execute effectively only once after all rendering actions are fully done
        void copyAsHtmlCommand.copyToClipboard(settingsTab.settings);
      }
    }, Number.MAX_SAFE_INTEGER /** using a high order number to make sure this renderer goes last at every step */);
  }

  onunload() {
    removeIcon(MD2HTML_ICON);
    removeIcon(PLAINTXT_ICON);
  }
}
