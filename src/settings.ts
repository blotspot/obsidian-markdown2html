import {
  debounce,
  ExtraButtonComponent,
  PluginSettingTab,
  Setting,
  TextComponent
} from "obsidian";
import Markdown2Html from "plugin";
import { NOTE2HTML_ICON } from "./utils/constants";
import { isEmpty, Log } from "./utils/helper";

export interface Markdown2HtmlSettings {
  attributeList: string[];
  classList: string[];
  devMode: boolean;
  removeFrontmatter: boolean;
}

export const DEFAULT_SETTINGS: Markdown2HtmlSettings = {
  attributeList: [
    "id",
    "href",
    "src",
    "width",
    "height",
    "alt",
    "colspan",
    "rowspan",
  ],
  classList: [],
  devMode: false,
  removeFrontmatter: true,
};

export class Markdown2HtmlSettingsTab extends PluginSettingTab {
  private plugin: Markdown2Html;
  private data: Markdown2HtmlSettings;

  public icon = NOTE2HTML_ICON;

  constructor(plugin: Markdown2Html) {
    super(plugin.app, plugin);
    this.plugin = plugin;
    void this.loadSettings();
  }

  get settings(): Markdown2HtmlSettings {
    return this.data;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Remove frontmatter")
      .setDesc("When enabled, the frontmatter of notes will be removed during copy.")
      .addToggle(toggle =>
        toggle.setValue(this.data.removeFrontmatter).onChange(async value => {
          this.data.removeFrontmatter = value;
          this.save();
        }),
      );

    new Setting(containerEl).setHeading().setName("HTML cleanup");
    this.newListSetting(
      containerEl,
      "Attributes to keep",
      "Add attribute name(s) you want to keep when rendering markdown to HTML.",
      "Add attribute to keep",
      (settings) => settings.attributeList,
    );

    new Setting(containerEl)
      .setName("Reset attributes")
      .setDesc(
        `It is recommended to keep the default attributes. In case you accidentaly deleted some or all of them, you can reset them to the default values (${DEFAULT_SETTINGS.attributeList.join(", ")}).`,
      )
      .addButton((button) =>
        button
          .setIcon("list-restart")
          .setTooltip("Reset attributes to default")
          .onClick(() => {
            this.data.attributeList = Array.from(
              DEFAULT_SETTINGS.attributeList,
            );
            this.save();
            this.display();
          }),
      );

    this.newListSetting(
      containerEl,
      "Classes to keep",
      "When you don't have the atribute 'class' in the above list, the cleanup will remove all classes from elements. In case you want to keep specific classes, you can add exceptions here.",
      "Add class to keep",
      (settings) => settings.classList,
    );
    new Setting(containerEl)
      .setHeading()
      .setName("Developer mode")
      .setDesc("Enable debug logs in the developer tools.")
      .addToggle(toggle =>
        toggle.setValue(this.data.devMode).onChange(async value => {
          this.data.devMode = value;
          Log.devMode = value;
          this.save();
        }),
      );
  }

  private newListSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    buttonTooltip: string,
    listContent: (settings: Markdown2HtmlSettings) => string[],
  ) {
    const setting = new Setting(containerEl).setName(name).setDesc(desc);
    const listDiv = containerEl.createDiv({
      cls: ["setting-command-hotkeys", "md2html-list"],
    });

    let input: TextComponent;
    const addElement = async () => {
      input
        .getValue()
        .split(/[, ]/g)
        .forEach((value) => {
          // replace invalid characters
          value = value.replace(/[ ~!@$%^&*()+=,./';:"?><[\]\\{}|`#]/g, "");

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
      .addText((text) => {
        input = text;
        input.inputEl.addEventListener("keypress", (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void addElement();
          }
        });
      })
      .addExtraButton((button) =>
        button
          .setIcon("plus-circle")
          .setTooltip(buttonTooltip)
          .onClick(addElement),
      );

    listContent(this.data).forEach((value) => {
      this.addListElement(listDiv, value, listContent);
    });

    return setting;
  }

  private addListElement(
    containerEl: HTMLElement,
    elementName: string,
    listContent: (settings: Markdown2HtmlSettings) => string[],
  ) {
    const elementSpan = containerEl.createSpan({
      cls: "setting-hotkey",
    });
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
    this.data = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.plugin.loadData()) as Markdown2HtmlSettings,
    );
    Log.devMode = this.data.devMode;
  }

  /**
   * save current settings
   */
  private save = debounce(
    async () => {
      await this.plugin.saveData(this.data);
    },
    250,
    true,
  );
}
