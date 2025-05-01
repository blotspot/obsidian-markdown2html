import { App, Modal } from "obsidian";

export class CopyInProgressModal extends Modal {
	private copyInProgress: boolean = false;

	constructor(app: App) {
		super(app);
	}

	get isCopyInProgress() {
		return this.copyInProgress;
	}

	onOpen() {
		this.copyInProgress = true;
		const { titleEl, contentEl } = this;
		titleEl.setText("Markdown2HTML");
		contentEl.setText("Convert to HTML and save it to clipboard...");
	}

	onClose() {
		this.copyInProgress = false;
		const { contentEl } = this;
		contentEl.empty();
	}
}
