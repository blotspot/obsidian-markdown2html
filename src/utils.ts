export function removeEmptyLines(text: string): string {
	return text.replace(/^\s*/gm, "");
}

export function isEmpty(text: string): boolean {
	return removeEmptyLines(text).length === 0;
}
