import { cleanHtml } from "src/html-cleaner";
import { App, debounce, Editor, MarkdownRenderer, Modal, Notice, Plugin, setIcon } from "obsidian";
import { Markdown2HtmlSettings, Markdown2HtmlSettingsTab as Markdown2HtmlSettingsTab } from "./settings";

export default class Markdown2Html extends Plugin {
	private copyInProgressModal: Modal;
	private copyResult: HTMLElement | null;

	async onload() {
		// init settings
		const settingsTab = new Markdown2HtmlSettingsTab(this.app, this);
		this.addSettingTab(settingsTab);

		// init modal
		this.copyInProgressModal = new Modal(this.app);
		this.copyInProgressModal.titleEl.setText("Copying to clipboard...");
		const rotateDiv = createDiv({ parent: this.copyInProgressModal.contentEl, cls: "md2html-rotate" });
		setIcon(rotateDiv, "loader");

		// add copy command
		this.addCommand({
			id: "clipboard",
			icon: "clipboard-copy",
			name: "Copy selection or document to clipboard",
			editorCallback: this.copyCallback,
		});

		// register post processor to monitor copy progress
		this.registerMarkdownPostProcessor(async (el, ctx) => {
			// INFO:
			// We can't unregister the post processor, and all postprocessors are called every time a render is triggered.
			// To test if the render was triggered by our copy process, we check if our copy process is in progress.
			if (this.copyResult != null) {
				// Get's called after every segment (can be multiple for renders with plugins like dataview).
				// Since it has a debaounce delay that will reset after every call,
				// this function will execute effectively only once after all rendering actions are fully done
				this.copyToClipboard(settingsTab.settings);
			}
		}, Number.MAX_SAFE_INTEGER);
	}

	/** Openes a modal to let the user know that the copy is in progress and triggers the render of the markdown document or selection. */
	private copyCallback = async (editor: Editor) => {
		this.startCopyProcess();

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
	private copyToClipboard = debounce(
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
		this.copyResult = null;
		this.copyInProgressModal.close();
	}

	onunload() {}
}
