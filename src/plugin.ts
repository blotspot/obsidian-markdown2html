import CopyHtml from "commands/copy-html";
import CopyPlainText from "commands/copy-text";
import {
  addIcon,
  Editor,
  getFrontMatterInfo,
  MarkdownView,
  Menu,
  Plugin,
  removeIcon,
  TFile,
} from "obsidian";
import { Markdown2HtmlSettingsTab } from "settings";
import { Log } from "utils/helper";
import {
  NOTE2CLIP_ACTION_TEXT as MD2HTML_ACTION_TEXT,
  NOTE2HTML_ICON,
  NOTE2TXT_ACTION_TEXT,
  NOTE2TXT_ICON,
} from "./utils/constants";

export default class Markdown2Html extends Plugin {
  async onload() {
    // add custom icon
    addIcon(
      NOTE2HTML_ICON,
      `<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
				<path d="M16,3l0,2c0,0.552 -0.448,1 -1,1l-6,0c-0.552,0 -1,-0.448 -1,-1l0,-2c0,-0.552 0.448,-1 1,-1l6,0c0.552,0 1,0.448 1,1Z" />
				<path d="M16,4l2,0c1.097,0 2,0.903 2,2l0,14c0,1.097 -0.903,2 -2,2l-12,0c-1.097,0 -2,-0.903 -2,-2l0,-14c0,-1.097 0.903,-2 2,-2l2,0" />
				<path d="M14,11l2.002,2.969l-2.002,3.031" />
				<path d="M10,11l-2,2.969l2,3.031" />
			</g>`,
    );
    addIcon(
      NOTE2TXT_ICON,
      `<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
		     <path d="M16,3l0,2c0,0.552 -0.448,1 -1,1l-6,0c-0.552,0 -1,-0.448 -1,-1l0,-2c0,-0.552 0.448,-1 1,-1l6,0c0.552,0 1,0.448 1,1Z" />
         <path d="M16,4l2,0c1.097,0 2,0.903 2,2l0,14c0,1.097 -0.903,2 -2,2l-12,0c-1.097,0 -2,-0.903 -2,-2l0,-14c0,-1.097 0.903,-2 2,-2l2,0" />
		     <path d="M8.263,17l-0,-5.98l3.737,2.99l3.737,-3.01l0,6" />
			</g>`,
    );

    // init settings
    const settingsTab = new Markdown2HtmlSettingsTab(this);
    this.addSettingTab(settingsTab);

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

    const getContent = async (contentProvider: Editor | TFile): Promise<string> => {
      let contentPromise: Promise<string>;
      if (contentProvider instanceof Editor) {
        Log.d("Reading content from editor selection or full note");
        contentPromise = Promise.resolve(contentProvider.somethingSelected()
          ? contentProvider.getSelection()
          : contentProvider.getValue());
      } else {
        Log.d(`Reading content of file: ${contentProvider.path}`);
        contentPromise = this.app.vault.read(contentProvider);
      }
      return contentPromise
        .then((content) => {
          Log.d(`Content length: ${content.length} characters`);
          const fmtInfo = getFrontMatterInfo(content);
          return (settingsTab.settings.removeFrontmatter && fmtInfo.exists ? content.slice(fmtInfo.contentStart) : content).trim();
        })
        .catch((e) => {
          Log.e("Error while reading content", e);
          throw e;
        });
    }

    const isHtmlRenderAllowed = (extension?: string): boolean => {
      // disable html copy for canvas files
      return !!extension && !["canvas", "base"].contains(extension);
    }

    // register copy commands
    this.addCommand({
      id: "html",
      icon: NOTE2HTML_ICON,
      name: MD2HTML_ACTION_TEXT,
      checkCallback: (checking: boolean) => {
        const contentProvider = getContentProvider();
        if (!!contentProvider && isHtmlRenderAllowed(this.app.workspace.activeEditor?.file?.extension)) {
          if (!checking) {
            void copyAsHtmlCommand.renderHtml(getContent(contentProvider));
          }
          return true;
        }
        return false;
      },
    });
    this.addCommand({
      id: "txt",
      icon: NOTE2TXT_ICON,
      name: NOTE2TXT_ACTION_TEXT,
      checkCallback: (checking: boolean) => {
        const contentProvider = getContentProvider();
        if (contentProvider) {
          if (!checking) {
            void copyAsTextCommand.copyToClipboard(getContent(contentProvider));
          }
          return true;
        }
        return false;
      },
    });

    // add ribon action
    this.addRibbonIcon(NOTE2HTML_ICON, MD2HTML_ACTION_TEXT, () => {
      const contentProvider = getContentProvider();
      if (contentProvider !== null && isHtmlRenderAllowed(this.app.workspace.activeEditor?.file?.extension)) {
        void copyAsHtmlCommand.renderHtml(getContent(contentProvider));
      }
    });

    // register context menu events
    const addMenuItems = (menu: Menu, contentProvider: Editor | TFile, extension?: string) => {
      menu.addSeparator();
      // add html copy item
      if (isHtmlRenderAllowed(extension)) {
        menu.addItem((item) => {
          item
            .setTitle(MD2HTML_ACTION_TEXT)
            .setIcon(NOTE2HTML_ICON)
            .onClick(
              async () => void copyAsHtmlCommand.renderHtml(getContent(contentProvider)),
            );
        });
      }
      // add text copy item
      menu.addItem((item) => {
        item
          .setTitle(NOTE2TXT_ACTION_TEXT)
          .setIcon(NOTE2TXT_ICON)
          .onClick(
            async () => void copyAsTextCommand.copyToClipboard(getContent(contentProvider)),
          );
      });
      menu.addSeparator();
    };

    // editor menu
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) =>
        addMenuItems(menu, editor, view.file?.extension),
      ),
    );
    // file menu
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFile) {
          addMenuItems(menu, file, file.extension);
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
    removeIcon(NOTE2HTML_ICON);
    removeIcon(NOTE2TXT_ICON);
  }
}
