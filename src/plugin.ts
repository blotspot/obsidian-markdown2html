import { cleanHtml } from "src/html-cleaner";
import {
	addIcon,
	App,
	debounce,
	Editor,
	getFrontMatterInfo,
	MarkdownRenderer,
	MarkdownView,
	Menu,
	Modal,
	Notice,
	Plugin,
	removeIcon,
	setIcon,
	TFile,
} from "obsidian";
import { Markdown2HtmlSettings, Markdown2HtmlSettingsTab as Markdown2HtmlSettingsTab } from "./settings";
import {
	HTML2CLIP_ACTION_TEXT as MD2HTML_ACTION_TEXT,
	MD2HTML_ICON,
	PLAINTXT_ACTION_TEXT,
	PLAINTXT_ICON,
} from "./constants";

export default class Markdown2Html extends Plugin {
	private copyInProgressModal: Modal;
	private copyResult: HTMLElement | undefined;

	async onload() {
		// add custom icon
		addIcon(
			MD2HTML_ICON,
			`<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
			<path d="M17.5 2 17.5 8 15 6 17.5 8 20 6M4.11 8 4.11 2 7.85 5 11.5 2 11.5 8"/>
			<path d="M8.25 16 5.25 19 8.25 22M11.25 22 12.75 16M15.75 16 18.75 19 15.75 22"/>
			<path d="M2,12L22,12"/>
			</g>`
		);
		addIcon(
			PLAINTXT_ICON,
			`<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
			<path d="M2 12h20"/>
    	<path d="M4.5 22v-6M7 16H2M10 22l4-6M14 22l-4-6M19.5 22v-6M22 16h-5"/>
			<path d="M17.4 2v5.98l-2.492-1.994L17.4 7.98l2.491-1.994M4.109 8V2.02l3.737 2.99L11.583 2v6"/>
			</g>`
		);

		// init settings
		const settingsTab = new Markdown2HtmlSettingsTab(this.app, this);
		this.addSettingTab(settingsTab);

		// init modal
		this.copyInProgressModal = new Modal(this.app);
		this.copyInProgressModal.titleEl.setText("Copying to clipboard...");
		const rotateDiv = createDiv({ parent: this.copyInProgressModal.contentEl, cls: "md2html-rotate" });
		setIcon(rotateDiv, "loader");

		//// Add commands
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
				this.renderMarkdownToHtml(contentProvider as Editor | TFile);
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
				this.copyPlainTextToClipboard(contentProvider as Editor | TFile);
				return true;
			},
		});

		// add ribon action
		this.addRibbonIcon(MD2HTML_ICON, MD2HTML_ACTION_TEXT, () => {
			const contentProvider = getContentProvider();
			if (contentProvider !== null) {
				this.renderMarkdownToHtml(contentProvider);
			}
		});

		// register context menu events
		const addMenuItems = (menu: Menu, contentProvider: Editor | TFile) => {
			menu.addSeparator();
			this.addHtmlMenuItem(menu, contentProvider);
			this.addTextMenuItem(menu, contentProvider);
			menu.addSeparator();
		};

		// editor menu
		this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => addMenuItems(menu, editor)));
		// file menu
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile) {
					addMenuItems(menu, file);
				}
			})
		);
		// register post processor to monitor markdown render progress
		this.registerMarkdownPostProcessor(async (el, ctx) => {
			// INFO:
			// We can't unregister the post processor, and all postprocessors are called every time a render is triggered.
			// To test if the render was triggered by our copy process, we check if our copy process is in progress.
			if (this.hasCopyResult()) {
				// Get's called after every segment (can be multiple for renders with plugins like dataview).
				// Since it has a debaounce delay that will reset after every call,
				// this function will execute effectively only once after all rendering actions are fully done
				this.copyHtmlToClipboard(settingsTab.settings);
			}
		}, Number.MAX_SAFE_INTEGER /** using a high order number to make sure this renderer goes last at every step */);
	}

	private addHtmlMenuItem(menu: Menu, contentProvider: Editor | TFile) {
		menu.addItem(item => {
			item
				.setTitle(MD2HTML_ACTION_TEXT)
				.setIcon(MD2HTML_ICON)
				.onClick(async () => this.renderMarkdownToHtml(contentProvider));
		});
	}

	private addTextMenuItem(menu: Menu, contentProvider: Editor | TFile) {
		menu.addItem(item => {
			item
				.setTitle(PLAINTXT_ACTION_TEXT)
				.setIcon(PLAINTXT_ICON)
				.onClick(async () => this.copyPlainTextToClipboard(contentProvider));
		});
	}

	/**
	 * Cleans up the rendered HTML and stores it in the system clipboard.
	 * Executes after a short delay to make sure all steps of the rendering are done.
	 * Each time the method is called within the delay, the timer resets.
	 */
	private copyHtmlToClipboard = debounce(
		async (settings: Markdown2HtmlSettings) => {
			if (this.hasCopyResult()) {
				navigator.clipboard
					.writeText(await cleanHtml(this.copyResult as HTMLElement, settings))
					.then(() => new Notice("HTML copied to the clipboard", 3500))
					.catch(e => {
						console.error("MD2HTML: Error while copying HTML to the clipboard", e);
						new Notice("Couldn't copy HTML to the clipboard", 3500);
					})
					.finally(() => this.endCopyProcess());
			}
		},
		500 /* wait delay until copy to clipboard happens */,
		true /* reset delay if method is called before timer finishes */
	);

	private async getContent(contentProvider: Editor | TFile) {
		if (contentProvider instanceof Editor) {
			return contentProvider.somethingSelected() ? contentProvider.getSelection() : contentProvider.getValue();
		} else {
			return this.app.vault.read(contentProvider);
		}
	}

	/** triggers the render of the markdown note or selection. */
	private async renderMarkdownToHtml(contentProvider: Editor | TFile) {
		try {
			this.startCopyProcess();
			const content = await this.getContent(contentProvider);
			const path = this.app.workspace.activeEditor?.file?.path ?? "";
			MarkdownRenderer.render(this.app, content, this.copyResult as HTMLElement, path, this);
		} catch (e) {
			console.error("MD2HTML: Error while rendering HTML", e);
			new Notice("Error while rendering HTML", 3500);
			this.endCopyProcess();
		}
	}

	private async copyPlainTextToClipboard(contentProvider: Editor | TFile) {
		this.startCopyProcess();
		if (this.hasCopyResult()) {
			const fileContents = await this.getContent(contentProvider);
			const fmtInfo = getFrontMatterInfo(fileContents);

			navigator.clipboard
				.writeText((fmtInfo.exists ? fileContents.slice(fmtInfo.contentStart) : fileContents).trim())
				.then(() => new Notice("Text copied to the clipboard", 3500))
				.catch(e => {
					console.error("MD2HTML: Error while copying Text to the clipboard", e);
					new Notice("Couldn't copy Text to the clipboard", 3500);
				})
				.finally(() => this.endCopyProcess());
		}
	}

	private startCopyProcess() {
		this.copyResult = createDiv();
		this.copyInProgressModal.open();
	}

	private endCopyProcess() {
		this.copyResult = undefined;
		this.copyInProgressModal.close();
	}

	private hasCopyResult() {
		return this.copyResult !== undefined;
	}

	onunload() {
		removeIcon(MD2HTML_ICON);
		removeIcon(PLAINTXT_ICON);
	}
}
