import { App, ExtraButtonComponent, Platform, Plugin, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import { APP_DISPLAY_NAME, APP_ICON, APP_ID } from "utils/constants";
import { Log } from "utils/helper";

interface SettingsEventMap {
  active: CustomEvent<WakeLockPluginSettingsData>;
  showInStatusBar: CustomEvent<WakeLockPluginSettingsData>;
  strategy: CustomEvent<WakeLockPluginSettingsData>;
  wakeLockDelay: CustomEvent<WakeLockPluginSettingsData>;
  rememberOnStartUp: CustomEvent<WakeLockPluginSettingsData>;
}

interface SettingsEventTarget extends EventTarget {
  addEventListener<K extends keyof SettingsEventMap>(
    type: K,
    listener: (ev: SettingsEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void;
}

const TypedEventTarget = EventTarget as {
  new(): SettingsEventTarget;
  prototype: SettingsEventTarget;
};

export class WakeLockPluginSettings extends TypedEventTarget {
  private context: Plugin;
  private data!: WakeLockPluginSettingsData;

  private static handler: WakeLockPluginSettings | null = null;

  static async load(context: Plugin) {
    if (!this.handler) {
      this.handler = new WakeLockPluginSettings(context);
      await this.handler.loadSettings();
      Log.devMode = this.handler.data.devMode;
      context.addSettingTab(new WakeLockSettingsTab(context.app, context, this.handler));
    }
    return this.handler;
  }

  private constructor(context: Plugin) {
    super();
    this.context = context;
  }

  get isActive(): boolean {
    return this.data.isActive;
  }

  set isActive(isActive: boolean) {
    if (this.data.isActive !== isActive) {
      void this.updateIsActive(isActive);
    }
  }

  get rememberOnStartUp(): boolean {
    return this.data.rememberOnStartUp;
  }

  set rememberOnStartUp(rememberOnStartUp: boolean) {
    if (this.data.rememberOnStartUp !== rememberOnStartUp) {
      void this.updateRememberOnStartup(rememberOnStartUp);
    }
  }

  get showInStatusBar(): boolean {
    return this.data.showInStatusBar;
  }

  set showInStatusBar(showInStatusBar: boolean) {
    if (this.data.showInStatusBar !== showInStatusBar) {
      void this.updateShowInStatusbar(showInStatusBar);
    }
  }

  get strategy(): Strategy {
    return this.data.strategy;
  }

  set strategy(strategy: Strategy) {
    if (this.data.strategy !== strategy) {
      void this.updateStrategy(strategy);
    }
  }

  get wakeLockDelay(): number {
    return this.data.wakeLockDelay;
  }

  set wakeLockDelay(delay: number) {
    if (this.data.wakeLockDelay !== delay) {
      void this.updateWakeLockDelay(delay);
    }
  }

  get showNotifications(): boolean {
    return this.data.showNotifications;
  }

  set showNotifications(showNotifications: boolean) {
    if (this.data.showNotifications !== showNotifications) {
      void this.updateShowNotifications(showNotifications);
    }
  }

  get devMode(): boolean {
    return this.data.devMode;
  }

  set devMode(devMode: boolean) {
    if (this.data.devMode !== devMode) {
      void this.updateDevMode(devMode);
    }
  }

  private customEvent(eventName: string) {
    this.dispatchEvent(new CustomEvent(eventName, { detail: this.data }));
  }

  private async updateIsActive(isActive: boolean) {
    this.data.isActive = isActive;
    await this.save();
    this.customEvent("active");
  }

  private async updateRememberOnStartup(rememberOnStartUp: boolean) {
    this.data.rememberOnStartUp = rememberOnStartUp;
    await this.save();
    this.customEvent("rememberOnStartUp");
  }

  private async updateShowNotifications(showNotifications: boolean) {
    this.data.showNotifications = showNotifications;
    await this.save();
  }

  private async updateShowInStatusbar(showInStatusBar: boolean) {
    this.data.showInStatusBar = showInStatusBar;
    await this.save();
    this.customEvent("showInStatusBar");
  }

  private async updateStrategy(strategy: Strategy) {
    this.data.strategy = strategy;
    await this.save();
    this.customEvent("strategy");
  }

  private async updateWakeLockDelay(delay: number) {
    this.data.wakeLockDelay = delay;
    await this.save();
    this.customEvent("wakeLockDelay");
  }

  private async updateDevMode(devMode: boolean) {
    this.data.devMode = devMode;
    await this.save();
    Log.devMode = devMode;
  }

  /**
   * Load settings on start-up.
   */
  private async loadSettings() {
    this.data = Object.assign({}, DEFAULT_SETTINGS, (await this.context.loadData()) as WakeLockPluginSettingsData);
  }

  async reloadSettings() {
    const _data = Object.assign({}, this.data, (await this.context.loadData()) as WakeLockPluginSettingsData);
    this.isActive = _data.isActive;
    this.showInStatusBar = _data.showInStatusBar;
    this.showNotifications = _data.showNotifications;
    this.strategy = _data.strategy;
    this.wakeLockDelay = _data.wakeLockDelay;
    this.devMode = _data.devMode;
  }

  /**
   * save current settings
   */
  private async save() {
    await this.context.saveData(this.data);
  }
}

export interface WakeLockPluginSettingsData {
  isActive: boolean;
  rememberOnStartUp: boolean;
  showInStatusBar: boolean;
  showNotifications: boolean;
  devMode: boolean;
  strategy: Strategy;
  wakeLockDelay: number;
}

export enum Strategy {
  Always = "always",
  EditorActive = "editor-active",
  EditorTyping = "editor-typing",
  Frontmatter = "frontmatter",
}

export const DEFAULT_SETTINGS: WakeLockPluginSettingsData = {
  isActive: true,
  rememberOnStartUp: false,
  showNotifications: true,
  showInStatusBar: Platform.isDesktop,
  devMode: false,
  strategy: Strategy.Always,
  wakeLockDelay: 5,
};

export class WakeLockSettingsTab extends PluginSettingTab {
  settings: WakeLockPluginSettings;

  public icon = APP_ICON;

  constructor(app: App, plugin: Plugin, settings: WakeLockPluginSettings) {
    super(app, plugin);
    this.settings = settings;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const strategyDesc = createFragment();

    strategyDesc.createEl("p").setText("Choose the strategy at which " + APP_DISPLAY_NAME + " is invoked.");

    const ul = strategyDesc.createEl("ul");
    const makeListItem = (title: string, description: string) => {
      const li = ul.createEl("li");
      li.createEl("strong").setText(title);
      li.appendText(` - ${description}`);
    }
    makeListItem("Always on", `Always invoked as long as ${APP_DISPLAY_NAME} is enabled. (Simplest strategy. Remember to engage and disengage ${APP_DISPLAY_NAME} manually.)`);
    makeListItem("Frontmatter", `Invokes only when the frontmatter key "cook-mode" is set to true in the current file. (Check your recipes without your screen going dark.)`);
    makeListItem("Editor focus", `Invokes when an editor window is focused. (Focused on your words and not your screen timeout.)`);
    makeListItem("Editor typing", `Invokes after a few seconds of not typing in the editor window. (Similar to 'Editor focus' but automatically disengages when typing resumes.)`);

    return [
      {
        type: "group",
        heading: "Functionality",
        items: [
          {
            name: "Use " + APP_DISPLAY_NAME,
            desc: "Enable or disable " + APP_DISPLAY_NAME + " to keep the screen from going dark. (Hotkey trigger)",
            control: {
              type: "toggle",
              key: "isActive",
            }
          },
          {
            name: "Remember on start-up",
            desc: "Remember the last active state and apply it on start-up. If disabled, the " + APP_DISPLAY_NAME + " will always be disabled on start-up.",
            control: {
              type: "toggle",
              key: "rememberOnStartUp",
            }
          },
          {
            name: "Activation strategy",
            desc: strategyDesc,
            render: setting => {
              setting
                .addButton(button =>
                  button
                    .setIcon("command")
                    .setTooltip("Configure hotkeys for strategies")
                    .onClick(() => {
                      const hotkeysTab = this.app.setting.openTabById("hotkeys");
                      const containerParent = hotkeysTab.containerEl.parentElement;
                      const titlebar = containerParent?.querySelector(".setting-page-titlebar")
                      if (!titlebar) {
                        const navEl = createDiv({ cls: "setting-page-titlebar" });
                        const backBtn = new ExtraButtonComponent(navEl);
                        backBtn.setIcon("chevron-left")
                        backBtn.onClick(() => {
                          containerParent?.removeChild(navEl);
                          this.app.setting.openTabById(APP_ID);
                        })
                        containerParent?.prepend(navEl);
                      }
                      hotkeysTab.setQuery(APP_ID);
                    })
                )
                .addDropdown(dropdown =>
                  dropdown
                    .addOption(Strategy.Always, "Always on")
                    .addOption(Strategy.Frontmatter, "Frontmatter")
                    .addOption(Strategy.EditorActive, "Editor focus")
                    .addOption(Strategy.EditorTyping, "Editor typing")
                    .setValue(this.settings.strategy)
                    .onChange(value => {
                      const strategy = value as Strategy;
                      this.settings.strategy = strategy;
                      this.refreshDomState();
                    })
                );
            }
          },
          {
            name: "Activation delay",
            desc: `Define the amount of seconds after which the ${APP_DISPLAY_NAME} should engage.`,
            visible: () => this.settings.strategy === Strategy.EditorTyping,
            control: {
              type: "slider",
              key: "wakeLockDelay",
              min: 0.5,
              max: 10,
              step: 0.25,
            }
          }
        ]
      },
      {
        type: "group",
        heading: "Display",
        items: [
          {
            name: "Show in status bar",
            desc: `Adds an icon to the status bar, showing the current ${APP_DISPLAY_NAME} state.`,
            control: {
              type: "toggle",
              key: "showInStatusBar",
            }
          },
          {
            name: "Show notifications",
            desc: "Show notification messages about enable / disable events.",
            control: {
              type: "toggle",
              key: "showNotifications",
            }
          },
          {
            name: "Developer mode",
            desc: "Enable debug logs in the developer tools.",
            control: {
              type: "toggle",
              key: "devMode",
            }
          }
        ]
      }
    ];
  }
}
