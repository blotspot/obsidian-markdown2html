import {
	App,
	Component,
	Editor,
	MarkdownRenderer,
	MarkdownView,
	Notice,
	Plugin,
} from "obsidian";

export default class Markdown2Html extends Plugin {
	async onload() {
		this.addCommand({
			id: "clipboard",
			icon: "file-code-2",
			name: "Copy selection or document to clipboard",
			editorCallback: async (editor: Editor) => {
				const renderer = new Markdown2HtmlRenderer(this.app);
				const content = () => {
					if (editor.somethingSelected()) {
						return editor.getSelection();
					} else {
						return editor.getValue();
					}
				};
				await renderer.render(content());
				navigator.clipboard
					.writeText(renderer.cleanedHtml())
					.then(() => {
						new Notice("HTML copied to the clipboard", 3500);
					})
					.catch(() => {
						new Notice("Couldn't copy html to the clipboard", 3500);
					});
				renderer.unload();
			},
		});
	}

	onunload() {}
}

class Markdown2HtmlRenderer extends Component {
	private app: App;
	private root: HTMLElement;

	constructor(app: App) {
		super();
		this.app = app;
		this.root = createDiv();
		this.load();
	}

	async render(md: string) {
		await MarkdownRenderer.render(this.app, md, this.root, "", this);
	}

	cleanedHtml() {
		// @ts-ignore
		const clonedRoot: HTMLElement = this.root.cloneNode(true);

		this.removeFrontMatter(clonedRoot);
		this.removeDirAttribute(clonedRoot);

		const html = clonedRoot.innerHTML;
		return html;
	}

	/** Remove frontmatter header */
	private removeFrontMatter(root: HTMLElement) {
		root.querySelectorAll(".frontmatter, .frontmatter-container").forEach(
			(node) => node.remove()
		);
	}

	/** Remove the dir attribute of elements */
	private removeDirAttribute(root: HTMLElement) {
		root.querySelectorAll("[dir]").forEach((node) =>
			node.removeAttribute("dir")
		);
	}
}
