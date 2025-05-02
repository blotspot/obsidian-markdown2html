import { Markdown2HtmlSettings } from "./settings";
import { isEmpty, removeEmptyLines } from "./utils";

export async function cleanHtml(root: HTMLElement, settings: Markdown2HtmlSettings) {
	removeEmptyContainer(root);
	removeFrontMatter(root);
	removeAttributes(root, settings);
	await convertImages(root);

	const html = removeEmptyLines(root.innerHTML);
	return html;
}

/** remove all child nodes that don't have any content (removes empty paragraphs left by comments) */
function removeEmptyContainer(element: HTMLElement) {
	element.querySelectorAll("p, div").forEach(node => {
		if (isEmpty(node.innerHTML)) {
			node.remove();
		}
	});
}

/** Remove frontmatter header */
function removeFrontMatter(element: HTMLElement) {
	const frontmatterNodes = element.querySelectorAll(".frontmatter, .frontmatter-container");
	frontmatterNodes.forEach(node => node.remove());
}

/** Remove all irrelevant attributes of elements */
function removeAttributes(element: HTMLElement, settings: Markdown2HtmlSettings) {
	const elements = element.querySelectorAll<HTMLElement>("*");

	elements.forEach(element => {
		const attributesToRemove: string[] = [];
		const classesToKeep: string[] = Object.assign([], settings.classList).filter(cls =>
			element.classList.contains(cls)
		);

		const attributes = element.attributes;
		for (let i = 0; i < attributes.length; i++) {
			const attrName = attributes[i].name.toLowerCase();
			if (!settings.attributeList.contains(attrName)) {
				attributesToRemove.push(attrName);
			}
		}
		// remove all attributes that are not allowed
		attributesToRemove.forEach(attr => element.removeAttribute(attr));
		// readd classes to keep
		element.addClasses(classesToKeep);
	});
}

/** Convert internal Images to base64 data URL */
async function convertImages(element: HTMLElement) {
	const images = element.querySelectorAll('img:not([src^="http"])') as NodeListOf<HTMLImageElement>;
	for (let i = 0; i < images.length; i++) {
		const image = images[i];
		image.src = await toBase64(image.src);
	}
}

/** Read a file from an uri and turn it into a base64 string */
async function toBase64(src: string) {
	return await fetch(src)
		.then(res => res.blob())
		.then(
			blob =>
				new Promise<FileReader>((resolve, reject) => {
					var fr = new FileReader();
					fr.onload = () => resolve(fr);
					fr.onerror = err => reject(err);
					fr.readAsDataURL(blob);
				})
		)
		.then(fr => fr.result as string);
}
