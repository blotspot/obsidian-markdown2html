import { App, debounce, ExtraButtonComponent, PluginSettingTab, requireApiVersion, Setting, TextComponent } from "obsidian";
import Markdown2Html from "src/plugin";
import { isEmpty } from "./utils";
import { MD2HTML_ICON } from "./constants";

export interface Markdown2HtmlSettings {
	attributeList: string[];
	classList: string[];
}

export const DEFAULT_SETTINGS: Markdown2HtmlSettings = {
	attributeList: ["id", "href", "src", "width", "height", "alt", "colspan", "rowspan"],
	classList: [],
};

export class Markdown2HtmlSettingsTab extends PluginSettingTab {
	private plugin: Markdown2Html;
	private data: Markdown2HtmlSettings;

	public icon = MD2HTML_ICON;

	constructor(app: App, plugin: Markdown2Html) {
		super(app, plugin);
		this.plugin = plugin;
		this.loadSettings();
	}

	get settings(): Markdown2HtmlSettings {
		return this.data;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setHeading().setName("Attributes");
		this.newListSetting(
			containerEl,
			"Attributes to keep",
			"Add attribute name(s) you want to keep when rendering markdown to HTML.",
			"Add attribute to keep",
			settings => settings.attributeList
		);

		new Setting(containerEl)
			.setName("Reset Attributes")
			.setDesc(
				`It is recommended to keep the default attributes. In case you accidentaly deleted some or all of them, you can reset them to the default values (${DEFAULT_SETTINGS.attributeList.join(", ")}).`
			)
			.addButton(button =>
				button
					.setIcon("list-restart")
					.setTooltip("Reset Attributes to default")
					.onClick(() => {
						this.data.attributeList = Array.from(DEFAULT_SETTINGS.attributeList);
						this.save();
						this.display();
					})
			);

		new Setting(containerEl).setHeading().setName("Classes");
		this.newListSetting(
			containerEl,
			"Classes to keep",
			"Add class name(s) you want to keep when rendering markdown to HTML.",
			"Add class to keep",
			settings => settings.classList
		);
	}

	private newListSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		buttonTooltip: string,
		listContent: (settings: Markdown2HtmlSettings) => string[]
	) {
		const setting = new Setting(containerEl).setName(name).setDesc(desc);
		const listDiv = createDiv({ cls: ["setting-command-hotkeys", "md2html-list"] });
		// setting.settingEl.classList.add("md2html-list-setting");
		containerEl.appendChild(listDiv);

		let input: TextComponent;
		const addElement = async () => {
			input
				.getValue()
				.split(/[, ]/g)
				.forEach(value => {
					// replace invalid characters
					value = value.replace(/[ ~!@$%^&*()+=,./';:"?><\[\]\\\{\}|`#]/g, "");

					// add to list if not already in list
					if (!isEmpty(value) && !listContent(this.data).contains(value)) {
						listContent(this.data).push(value);
						this.addListElement(listDiv, value, listContent);
						this.save();
						input.setValue("");
					} else {
						input.inputEl.focus();
					}
				});
		};

		setting
			.addText(text => {
				input = text;
				input.inputEl.addEventListener("keypress", (e: KeyboardEvent) => {
					if (e.key === "Enter") {
						e.preventDefault();
						addElement();
					}
				});
			})
			.addExtraButton(button => button.setIcon("plus-circle").setTooltip(buttonTooltip).onClick(addElement));

		listContent(this.data).forEach(value => {
			this.addListElement(listDiv, value, listContent);
		});
	}

	private addListElement(
		containerEl: HTMLElement,
		elementName: string,
		listContent: (settings: Markdown2HtmlSettings) => string[]
	) {
		const elementSpan = createSpan({ cls: "setting-hotkey", parent: containerEl });
		elementSpan.setText(elementName);

		const delBtn = new ExtraButtonComponent(elementSpan);
		delBtn.setIcon("cross");
		delBtn.setTooltip(`Delete '${elementName}' from list`);
		delBtn.onClick(() => {
			if (listContent(this.data).contains(elementName)) {
				listContent(this.data).remove(elementName);
				this.save();
				elementSpan.remove();
			}
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
