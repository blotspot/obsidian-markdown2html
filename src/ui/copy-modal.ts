import { App, Modal, setIcon } from "obsidian";

export default class CopyInProgressModal extends Modal {
  constructor(app: App) {
    super(app);

    const { contentEl } = this;
    contentEl.empty();

    this.titleEl.setText("Copy in progress...");

    const rotateDiv = contentEl.createDiv({ cls: "content-copy-modal-spinner" });
    setIcon(rotateDiv, "loader");
  }
}
