import {
	App,
	Component,
	Editor,
	MarkdownRenderer,
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
					.writeText(await renderer.cleanedHtml())
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

	async cleanedHtml() {
		const clonedRoot = this.root.cloneNode(true) as HTMLElement;

		this.removeEmptyParagraphs(clonedRoot);
		this.removeFrontMatter(clonedRoot);
		this.removeDirAttribute(clonedRoot);

		await this.convertImages(clonedRoot);

		// remove empty lines and return
		const html = clonedRoot.innerHTML.replace(/^\s*/gm, "");

		return html;
	}

	/** remove all child nodes that don't have any content (removes empy paragraphs from comments) */
	private removeEmptyParagraphs(root: HTMLElement) {
		root.querySelectorAll("p").forEach((node) => {
			if (node.innerHTML.replace(/^\s*/gm, "").length == 0) {
				node.remove();
			}
		});
	}

	/** Remove frontmatter header */
	private removeFrontMatter(root: HTMLElement) {
		const frontmatterNodes = root.querySelectorAll(
			".frontmatter, .frontmatter-container"
		);
		frontmatterNodes.forEach((node) => node.remove());
	}

	/** Remove the dir attribute of elements */
	private removeDirAttribute(root: HTMLElement) {
		const dirNodes = root.querySelectorAll("[dir]");
		dirNodes.forEach((node) => node.removeAttribute("dir"));
	}

	/** Convert internal Images to base64 data URL */
	private async convertImages(root: HTMLElement) {
		const images = root.querySelectorAll(
			'img:not([src^="http"])'
		) as NodeListOf<HTMLImageElement>;
		for (let i = 0; i < images.length; i++) {
			const image = images[i];
			image.src = await this.toBase64(image.src);
		}
	}

	private async toBase64(src: string) {
		return await fetch(src)
			.then((res) => res.blob())
			.then(
				(blob) =>
					new Promise<FileReader>((resolve, reject) => {
						var fr = new FileReader();
						fr.onload = () => resolve(fr);
						fr.onerror = (err) => reject(err);
						fr.readAsDataURL(blob);
					})
			)
			.then((fr) => fr.result as string);
	}
}
