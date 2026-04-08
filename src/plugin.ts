import { addIcon, Notice, Platform, Plugin } from "obsidian";
import { APP_DISPLAY_NAME, APP_ICON, APP_NAME } from "utils/constants";
import { LockStrategy, LockStrategyFactory } from "./commands/lock-strategy";
import { ScreenWakeLock } from "./commands/wake-lock";
import { Strategy, WakeLockPluginSettings } from "./settings";
import { WakeLockStatusBarItem } from "./ui/statusbar";
import { Log } from "./utils/helper";

export default class WakeLockPlugin extends Plugin {
  private settings!: WakeLockPluginSettings;
  private statusBarItem: WakeLockStatusBarItem | undefined;
  private _wakeLockStrategy: LockStrategy | undefined;

  private get lockStrategy(): LockStrategy | undefined {
    return this._wakeLockStrategy;
  }

  private set lockStrategy(wakeLockStrategy: LockStrategy) {
    if (this.settings.isActive) {
      this._wakeLockStrategy?.disable();
      wakeLockStrategy.enable();
    }
    this._wakeLockStrategy = wakeLockStrategy;
  }

  async onload() {
    if ("wakeLock" in navigator) {
      this.settings = await this.initSettings();
      this.statusBarItem = this.initStatusBar();
      this.initCommands();
      this.initWakeLock();
    } else {
      new Notice(APP_DISPLAY_NAME + " not supported, disabling plugin.");
      this.unload();
    }
  }

  onunload() {
    this.disableWakeLock();
  }

  onExternalSettingsChange() {
    void this.settings?.reloadSettings();
  }

  private enableWakeLock() {
    this.notice(APP_DISPLAY_NAME + " enabled!");
    this.statusBarItem?.off();
    this.lockStrategy?.enable();
  }

  private disableWakeLock() {
    this.notice(APP_DISPLAY_NAME + " disabled!");
    this.statusBarItem?.disabled();
    this.lockStrategy?.disable();
  }

  /** load settings and register listeners for setting changes */
  private async initSettings() {
    Log.d("initSettings");
    addIcon(
      APP_ICON,
      Platform.isDesktop
        ? `<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21.744 15.98c-.344.609-.996 1.02-1.744 1.02l-16 0c-1.104 0-2-.896-2-2l0-10c0-1.104.896-2 2-2l8 0M8 21l8 0M12 17l0 4M20 7l0-2c0-1.097-.903-2-2-2-1.097 0-2 .903-2 2l0 2"/>
				<path d="M22,8l0,3c0,0.552 -0.448,1 -1,1l-6,0c-0.552,0 -1,-0.448 -1,-1l0,-3c0,-0.552 0.448,-1 1,-1l6,0c0.552,0 1,0.448 1,1Z"/>
			</g>`
        : `<g transform="scale(4.1666)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
			  <path d="m19 15 0 5c0 1.104-.896 2-2 2l-10 0c-1.104 0-2-.896-2-2l0-16c0-1.104.896-2 2-2l3.5 0M12 18l.01 0M18 6l0-2c0-1.097-.903-2-2-2-1.097 0-2 .903-2 2l0 2"/>
  			<path d="M20,7l0,3c0,0.552 -0.448,1 -1,1l-6,0c-0.552,0 -1,-0.448 -1,-1l0,-3c0,-0.552 0.448,-1 1,-1l6,0c0.552,0 1,0.448 1,1Z"/>
			</g>`
    );
    const settings = await WakeLockPluginSettings.load(this);
    if (!settings.rememberOnStartUp) {
      settings.isActive = false; // ensure wake lock is not active on start-up
    }

    return settings;
  }

  private initWakeLock() {
    const wakeLock = new ScreenWakeLock();

    const selectStrategy = (strategy: Strategy) => {
      Log.d("selectStrategy: " + strategy);
      this.lockStrategy = LockStrategyFactory.createStrategy(this, strategy, wakeLock, this.settings);
    }

    selectStrategy(this.settings.strategy);
    wakeLock.addEventListener("request", () => {
      this.notice(APP_NAME + " on. Start cooking!");
      this.statusBarItem?.on();
    });
    wakeLock.addEventListener("release", () => {
      if (this.settings.isActive) this.statusBarItem?.off();
      else this.statusBarItem?.disabled();
    });

    this.settings.addEventListener("active", ev => {
      if (ev.detail.isActive) this.enableWakeLock();
      else this.disableWakeLock();
    });
    this.settings.addEventListener("showInStatusBar", ev => this.statusBarItem?.setVisible(ev.detail.showInStatusBar));
    this.settings.addEventListener("strategy", ev => selectStrategy(ev.detail.strategy));
    this.settings.addEventListener("wakeLockDelay", ev => selectStrategy(ev.detail.strategy));

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.isActive) this.lockStrategy?.enable();
    });
  }

  private initCommands() {
    Log.d("initCommands");
    this.addCommand({
      id: "toggle",
      name: "Toggle",
      callback: this.toggleIsActive,
      icon: APP_ICON,
    });
    const switchStrategy = (strategy: Strategy) => {
      this.notice("Switch to " + strategy + " strategy");
      this.settings.strategy = strategy;
    }
    this.addCommand({
      id: "switch-simple-strategy",
      name: "Switch to simple strategy (always on)",
      callback: () => switchStrategy(Strategy.Always),
    });
    this.addCommand({
      id: "switch-frontmatter-strategy",
      name: "Switch to frontmatter strategy (on when frontmatter key is set)",
      callback: () => switchStrategy(Strategy.Frontmatter),
    });
    this.addCommand({
      id: "switch-active-editor-strategy",
      name: "Switch to active editor strategy (on when editor is active)",
      callback: () => switchStrategy(Strategy.EditorActive),
    });
    this.addCommand({
      id: "switch-editor-typing-strategy",
      name: "Switch to editor typing strategy (on after a few seconds of typing inactivity)",
      callback: () => switchStrategy(Strategy.EditorTyping),
    });
    this.addCommand({
      id: "switch-strategy",
      name: "Switch between all available strategies",
      callback: () => {
        const strategies: Strategy[] = [Strategy.Always, Strategy.Frontmatter, Strategy.EditorActive, Strategy.EditorTyping];
        const currentIndex = strategies.indexOf(this.settings.strategy);
        const nextIndex = (currentIndex + 1) % strategies.length;
        switchStrategy(strategies[nextIndex] ?? Strategy.Always);
      },
    });
    this.addRibbonIcon(APP_ICON, "Toggle " + APP_DISPLAY_NAME, this.toggleIsActive);
  }

  private initStatusBar() {
    Log.d("initStatusBar");
    const statusBarItem = new WakeLockStatusBarItem(this.addStatusBarItem());
    statusBarItem.addEventListener("click", this.toggleIsActive);
    statusBarItem.setVisible(this.settings.showInStatusBar);
    if (!this.settings.isActive) statusBarItem.disabled();

    return statusBarItem;
  }

  private toggleIsActive = () => {
    this.settings.isActive = !this.settings.isActive;
  };

  private notice(notice: string) {
    if (this.settings.showNotifications) {
      new Notice(notice, 2000);
    }
    Log.d(notice);
  }
}
