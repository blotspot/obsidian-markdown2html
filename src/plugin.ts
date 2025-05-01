import { cleanHtml } from "src/components/cleaner";
import {
	debounce,
	Editor,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	Modal,
	Notice,
	Plugin,
	renderResults,
} from "obsidian";
import { CopyInProgressModal } from "./components/modal";

export default class Markdown2Html extends Plugin {
	private copyInProgressModal: CopyInProgressModal;
	private copyResult: HTMLElement;

	async onload() {
		this.addCommand({
			id: "clipboard",
			icon: "file-code-2",
			name: "Copy selection or document to clipboard",
			editorCallback: this.copyCallback,
		});

		this.copyInProgressModal = new CopyInProgressModal(this.app);

		this.registerMarkdownPostProcessor(async (el, ctx) => {
			// INFO:
			// We can't unregister the post processor, and all postprocessors are called every time a render is triggered.
			// To test if the render was triggered by our copy process, we check if the copy modal is open.
			if (this.copyInProgressModal.isCopyInProgress) {
				this.copyToClipboard();
			}
		}, Number.MAX_SAFE_INTEGER);
	}

	/** Openes a modal to let the user know that the copy is in progress and triggers the render of the markdown document or selection */
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

	private copyToClipboard = debounce(
		async () => {
			navigator.clipboard
				.writeText(await cleanHtml(this.copyResult))
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
		500,
		true
	);

	onunload() {}
}
