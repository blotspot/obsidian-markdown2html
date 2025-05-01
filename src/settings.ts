import test from "node:test";
import { App, debounce, ExtraButtonComponent, PluginSettingTab, Setting, TextComponent } from "obsidian";
import Markdown2Html from "src/plugin";

export interface Markdown2HtmlPluginSettings {
	attributeList: string[];
	classList: string[];
}

export const DEFAULT_SETTINGS: Markdown2HtmlPluginSettings = {
	attributeList: ["id", "href", "src", "width", "height", "alt", "colspan", "rowspan"],
	classList: [],
};

export class Markdown2HtmlSettingsTab extends PluginSettingTab {
	private plugin: Markdown2Html;
	private data: Markdown2HtmlPluginSettings;

	constructor(app: App, plugin: Markdown2Html) {
		super(app, plugin);
		this.plugin = plugin;
		this.loadSettings();
	}

	get settings(): Markdown2HtmlPluginSettings {
		return this.data;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.newListSetting(
			containerEl,
			"Attributes to keep",
			"Add attribute name(s) you want to keep when rendering markdown to HTML.",
			"Add attribute to keep",
			this.data.attributeList,
			(value: string) => {
				if (!this.data.attributeList.includes(value)) {
					this.data.attributeList.push(value);
				}
				this.save();
			},
			(value: string) => {
				if (this.data.attributeList.includes(value)) {
					this.data.attributeList.remove(value);
				}
				this.save();
			}
		);

		this.newListSetting(
			containerEl,
			"Classes to keep",
			"Add class name(s) you want to keep when rendering markdown to HTML.",
			"Add class to keep",
			this.data.classList,
			(value: string) => {
				if (!this.data.classList.includes(value)) {
					this.data.classList.push(value);
				}
				this.save();
			},
			(value: string) => {
				if (this.data.classList.includes(value)) {
					this.data.classList.remove(value);
				}
				this.save();
			}
		);
	}

	private newListSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		buttonTooltip: string,
		initList: string[] = [],
		addToSettingCallback?: (value: string) => void,
		removeFromSettingCallback?: (value: string) => void
	) {
		const listDiv = createDiv({ cls: "setting-command-hotkeys" });
		let input: TextComponent;
		const setting = new Setting(containerEl).setName(name).setDesc(desc);

		const onInputSet = async () => {
			input
				.getValue()
				.split(",")
				.map(v => v.trim())
				.forEach(value => {
					if (value.replace(/^\s*/gm, "").length > 0) {
						addToSettingCallback?.(value);
						this.addListElement(listDiv, value, removeFromSettingCallback);
						input.setValue("");
					}
				});
		};

		setting.controlEl.appendChild(listDiv);
		setting
			.addText(text => {
				input = text;
				input.inputEl.addEventListener("keypress", (e: KeyboardEvent) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onInputSet();
					}
				});
			})
			.addButton(button => button.setIcon("plus-circle").setTooltip(buttonTooltip).onClick(onInputSet));

		initList.forEach(value => {
			this.addListElement(listDiv, value, removeFromSettingCallback);
		});
	}

	private addListElement(
		containerEl: HTMLElement,
		elementName: string,
		removeFromListCallback?: (value: string) => void
	) {
		const element = createSpan({ cls: "setting-hotkey", parent: containerEl });
		element.setText(elementName);
		const delBtn = new ExtraButtonComponent(element);
		delBtn.setIcon("cross");
		delBtn.setTooltip(`Delete '${elementName}' from list`);
		delBtn.onClick(() => {
			removeFromListCallback?.(elementName);
			element.remove();
		});
	}

	/**
	 * Load settings on start-up.
	 */
	private async loadSettings() {
		this.data = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData());
	}

	/**
	 * save current settings
	 */
	private save = debounce(
		async () => {
			await this.plugin.saveData(this.data);
		},
		250,
		true
	);
}
