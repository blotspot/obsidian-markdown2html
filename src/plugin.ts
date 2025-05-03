import { cleanHtml } from "src/html-cleaner";
import {
	addIcon,
	App,
	debounce,
	Editor,
	MarkdownRenderer,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	setIcon,
} from "obsidian";
import { Markdown2HtmlSettings, Markdown2HtmlSettingsTab as Markdown2HtmlSettingsTab } from "./settings";

export default class Markdown2Html extends Plugin {
	private copyInProgressModal: Modal;
	private copyResult: HTMLElement | undefined;

	async onload() {
		// add custom icon
		addIcon(
			"markdown2html-icon",
			`<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="8.33"><path d="M72.499 8.333v24.915l-10.381-8.305 10.381 8.305 10.381-8.305M17.12 33.333V8.419l15.572 12.457L48.263 8.333v25"/><path d="M34.357 66.696 21.842 79.21l12.515 12.457M46.871 91.637l6.258-24.97M65.643 66.696 78.158 79.21 65.643 91.667"/><path d="M8.333 50h83.334"/></g>`
		);

		// init settings
		const settingsTab = new Markdown2HtmlSettingsTab(this.app, this);
		this.addSettingTab(settingsTab);

		// init modal
		this.copyInProgressModal = new Modal(this.app);
		this.copyInProgressModal.titleEl.setText("Copying to clipboard...");
		const rotateDiv = createDiv({ parent: this.copyInProgressModal.contentEl, cls: "md2html-rotate" });
		setIcon(rotateDiv, "loader");

		const copyCallback = () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view != null) {
				if (view.editor != null) {
					this.startCopyProcess();
					this.renderHtml(view.editor);
				} else {
					this.copyResult = view.contentEl;
					if (this.hasCopyResult()) {
						this.startCopyProcess();
						this.copyHtmlToClipboard(settingsTab.settings);
					}
				}
			}
		};

		// add copy command
		this.addCommand({
			id: "clipboard",
			icon: "markdown2html-icon",
			name: "Copy editor selection or full note as HTML",
			callback: copyCallback,
		});

		// add ribon icon
		this.addRibbonIcon("markdown2html-icon", "Copy editor selection or full note as HTML", () => copyCallback());

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
		}, Number.MAX_SAFE_INTEGER);
	}

	/** Openes a modal to let the user know that the copy is in progress and triggers the render of the markdown document or selection. */
	private renderHtml = async (editor: Editor) => {
		const path = this.app.workspace.activeEditor?.file?.path ?? "";
		const content = () => {
			if (editor.somethingSelected()) {
				return editor.getSelection();
			} else {
				return editor.getValue();
			}
		};

		console.debug("Markdown2Html: Copying to clipboard", path);
		await MarkdownRenderer.render(this.app, content(), this.copyResult as HTMLElement, path, this);
	};

	/** Cleans up the rendered HTML and stores it in the system clipboard. */
	private copyHtmlToClipboard = debounce(
		async (settings: Markdown2HtmlSettings) => {
			navigator.clipboard
				.writeText(await cleanHtml(this.copyResult as HTMLElement, settings))
				.then(() => new Notice("HTML copied to the clipboard", 3500))
				.catch(() => new Notice("Couldn't copy html to the clipboard", 3500))
				.finally(() => this.endCopyProcess());
		},
		500 /* wait delay until copy to clipboard happens */,
		true /* reset delay if method is called before timer finishes */
	);

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

	onunload() {}
}
