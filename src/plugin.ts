import { cleanHtml } from "src/html-cleaner";
import { debounce, Editor, MarkdownRenderer, Notice, Plugin } from "obsidian";
import { CopyInProgressModal } from "./modal";
import { Markdown2HtmlPluginSettings, Markdown2HtmlSettingsTab as Markdown2HtmlSettingsTab } from "./settings";

export default class Markdown2Html extends Plugin {
	private copyInProgressModal: CopyInProgressModal;
	private copyResult: HTMLElement;

	async onload() {
		this.addCommand({
			id: "clipboard",
			icon: "clipboard-copy",
			name: "Copy selection or document to clipboard",
			editorCallback: this.copyCallback,
		});
		const settingsTab = new Markdown2HtmlSettingsTab(this.app, this);
		this.addSettingTab(settingsTab);
		this.copyInProgressModal = new CopyInProgressModal(this.app);
		this.registerMarkdownPostProcessor(async (el, ctx) => {
			// INFO:
			// We can't unregister the post processor, and all postprocessors are called every time a render is triggered.
			// To test if the render was triggered by our copy process, we check if the copy modal is open.
			if (this.copyInProgressModal.isCopyInProgress) {
				// Get's called after every segment (can be multiple for renders with plugins like dataview).
				// Since it has a debaounce delay that will reset after every call,
				// this function will execute effectively only once after all rendering actions are fully done
				this.copyToClipboard(settingsTab.settings);
			}
		}, Number.MAX_SAFE_INTEGER);
	}

	/** Openes a modal to let the user know that the copy is in progress and triggers the render of the markdown document or selection. */
	private copyCallback = async (editor: Editor) => {
		const path = this.app.workspace.activeEditor?.file?.path ?? "";
		const content = () => {
			if (editor.somethingSelected()) {
				return editor.getSelection();
			} else {
				return editor.getValue();
			}
		};
		this.copyInProgressModal.open();

		console.debug("Markdown2Html: Copying to clipboard", path);
		this.copyResult = createDiv();
		await MarkdownRenderer.render(this.app, content(), this.copyResult, path, this);
	};

	/** Cleans up the rendered HTML and stores it in the system clipboard. */
	private copyToClipboard = debounce(
		async (settings: Markdown2HtmlPluginSettings) => {
			navigator.clipboard
				.writeText(await cleanHtml(this.copyResult, settings))
				.then(() => {
					new Notice("HTML copied to the clipboard", 3500);
				})
				.catch(() => {
					new Notice("Couldn't copy html to the clipboard", 3500);
				})
				.finally(() => {
					this.copyInProgressModal.close();
				});
		},
		500 /* wait delay until copy to clipboard happens */,
		true /* reset delay if method is called before timer finishes */
	);

	onunload() {}
}
