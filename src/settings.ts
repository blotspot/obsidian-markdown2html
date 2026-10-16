import { debounce, ExtraButtonComponent, PluginSettingTab, SettingDefinitionItem, SettingDefinitionRender, TextComponent } from "obsidian";
import Markdown2Html from "plugin";
import { NOTE2HTML_ICON } from "utils/constants";
import { Log } from "utils/helper";

export interface Markdown2HtmlSettings {
  attributeList: string[];
  classList: string[];
  devMode: boolean;
  removeFrontmatter: boolean;
  removeEmptyContainer: boolean;
  cleanup: boolean;
  relativeImagePath: boolean;
  removeCopyCodeButton: boolean;
  removeAttributes: boolean;
  removeClasses: boolean;
}

export const DEFAULT_SETTINGS: Markdown2HtmlSettings = {
  attributeList: ["id", "href", "src", "width", "height", "alt", "colspan", "rowspan"],
  classList: [],
  devMode: false,
  removeFrontmatter: true,
  removeEmptyContainer: true,
  cleanup: true,
  relativeImagePath: false,
  removeCopyCodeButton: false,
  removeAttributes: true,
  removeClasses: true,
};

const cloneDefaults = (): Markdown2HtmlSettings => ({
  ...DEFAULT_SETTINGS,
  attributeList: [...DEFAULT_SETTINGS.attributeList],
  classList: [...DEFAULT_SETTINGS.classList],
});

export class Markdown2HtmlSettingsTab extends PluginSettingTab {
  private plugin: Markdown2Html;
  private data: Markdown2HtmlSettings = cloneDefaults();

  public icon = NOTE2HTML_ICON;

  constructor(plugin: Markdown2Html) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  get settings(): Markdown2HtmlSettings {
    return this.data;
  }

  /**
   * Load settings on start-up.
   */
  async loadSettings() {
    const loaded = (await this.plugin.loadData()) as Partial<Markdown2HtmlSettings> | null;
    this.data = Object.assign(cloneDefaults(), loaded);
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
    true
  );

  getSettingDefinitions(): SettingDefinitionItem[] {
    const cleanupEnabled = () => this.data.cleanup;
    const removeAttributesEnabled = () => this.data.cleanup && this.data.removeAttributes;
    const removeClassesEnabled = () => this.data.cleanup && this.data.removeAttributes && this.data.removeClasses;

    return [
      {
        name: "Remove frontmatter",
        desc: "When enabled, the frontmatter of notes will be removed during copy.",
        control: { type: "toggle", key: "removeFrontmatter" },
      },
      {
        name: "Relative image paths",
        desc: "When enabled, local images will be referenced as relative paths from the vault root.",
        control: { type: "toggle", key: "relativeImagePath" },
      },

      // --- HTML cleanup ---
      {
        type: "group",
        heading: "HTML cleanup",
        items: [
          {
            name: "Enable HTML cleanup",
            control: { type: "toggle", key: "cleanup" },
          },
          {
            name: "Remove empty container elements",
            desc: "When enabled, empty container elements (<p>, <div>) will be removed during copy.",
            control: { type: "toggle", key: "removeEmptyContainer" },
            visible: cleanupEnabled,
          },
          {
            name: "Remove copy code button",
            desc: "When enabled, the 'copy code' button on code blocks will be removed during copy.",
            control: { type: "toggle", key: "removeCopyCodeButton" },
            visible: cleanupEnabled,
          },
          {
            name: "Remove unwanted attributes",
            desc: "Usually, the HTML render keeps all attributes set by obsidian. By enabling this setting, only the attributes specified below will be kept.",
            control: { type: "toggle", key: "removeAttributes" },
          },

          this.chipListDefinition({
            name: "Attributes to keep",
            desc: "Add attribute name(s) you want to keep when rendering markdown to HTML.",
            addTooltip: "Add attribute to keep",
            getList: () => this.data.attributeList,
            visible: removeAttributesEnabled,
          }),
          {
            name: "Reset attributes",
            desc: `It is recommended to keep the default attributes. In case you accidentally deleted some or all of them, you can reset them to the default values (${DEFAULT_SETTINGS.attributeList.join(", ")}).`,
            render: setting => {
              setting.addButton(button =>
                button
                  .setIcon("list-restart")
                  .setTooltip("Reset attributes to default")
                  .setDestructive()
                  .onClick(() => {
                    this.data.attributeList = [...DEFAULT_SETTINGS.attributeList];
                    this.save();
                    this.update();
                  })
              );
            },
            visible: removeAttributesEnabled,
          },

          {
            name: "Remove unwanted classes",
            desc: "Usually, the HTML render keeps all classes set by obsidian. By enabling this setting, only the classes specified below will be kept.",
            control: { type: "toggle", key: "removeClasses" },
          },

          this.chipListDefinition({
            name: "Classes to keep",
            desc: "When you don't have the attribute 'class' in the above list, the cleanup will remove all classes from elements. In case you want to keep specific classes, you can add exceptions here.",
            addTooltip: "Add class to keep",
            getList: () => this.data.classList,
            visible: removeClassesEnabled,
          }),
        ],
      },

      // --- Developer mode ---
      {
        type: "group",
        heading: "Developer mode",
        items: [
          {
            name: "Enable debug logs",
            desc: "Enable debug logs in the developer tools.",
            control: { type: "toggle", key: "devMode" },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    return (this.data as unknown as Record<string, unknown>)[key];
  }

  setControlValue(key: string, value: unknown): void {
    Object.assign(this.data, { [key]: value });

    if (key === "devMode") Log.devMode = value as boolean;
    this.save();

    // `visible`-Prädikate neu auswerten (ohne Re-Render)
    if (["cleanup", "removeAttributes", "removeClasses"].contains(key)) this.refreshDomState();
  }

  private chipListDefinition(opts: {
    name: string;
    desc: string;
    addTooltip: string;
    getList: () => string[];
    visible: () => boolean;
  }): SettingDefinitionRender {
    const { name, desc, addTooltip, getList, visible } = opts;

    return {
      name,
      desc,
      visible,
      render: setting => {
        setting.infoEl.querySelectorAll(":scope > .content-copy-chip-list").forEach(el => el.remove());
        const chips = setting.infoEl.createDiv({ cls: "content-copy-chip-list" });

        const renderChips = () => {
          chips.empty();
          for (const value of getList()) {
            const chip = chips.createSpan({ cls: "content-copy-chip", text: value });
            new ExtraButtonComponent(chip)
              .setIcon("cross")
              .setTooltip(`Delete '${value}' from list`)
              .onClick(() => {
                const list = getList();
                const i = list.indexOf(value);
                if (i >= 0) list.splice(i, 1);
                this.save();
                renderChips();
              });
          }
        };

        let input: TextComponent;
        const add = () => {
          const list = getList();
          const added = [...new Set(parseListInput(input.getValue()))].filter(v => !list.includes(v));
          if (added.length > 0) {
            list.push(...added);
            this.save();
            input.setValue("");
            renderChips();
          }
          input.inputEl.focus();
        };

        setting
          .addText(text => {
            input = text;
            text.setPlaceholder(addTooltip);
            text.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
              if (e.key === "Enter") { e.preventDefault(); add(); }
            });
          })
          .addExtraButton(btn => btn.setIcon("plus-circle").setTooltip(addTooltip).onClick(add));

        renderChips();
      },
    };
  }
}

function parseListInput(raw: string): string[] {
  return raw
    .split(/[, ]/g)
    .map(v => v.replace(/[ ~!@$%^&*()+=,./';:"?><[\]\\{}|`#]/g, ""))
    .filter(v => v.length > 0);
}
