import { addIcon, Notice, Platform, Plugin } from "obsidian";
import { APP_DISPLAY_NAME, APP_ICON, APP_NAME } from "utils/constants";
import { ActiveEditorViewStrategy, EditorTypingStrategy, LockStrategy, SimpleStrategy } from "./commands/lock-strategy";
import { ScreenWakeLock } from "./commands/wake-lock";
import { Strategy, WakeLockPluginSettings } from "./settings";
import { WakeLockStatusBarItem } from "./ui/statusbar";
import { Log } from "./utils/helper";

export default class WakeLockPlugin extends Plugin {
  private settings: WakeLockPluginSettings;
  private statusBarItem: WakeLockStatusBarItem;
  private _wakeLockStrategy: LockStrategy;

  get strategy() {
    return this._wakeLockStrategy;
  }

  set strategy(wakeLockStrategy: LockStrategy) {
    if (this.settings.isActive) {
      this._wakeLockStrategy?.detach();
      wakeLockStrategy.attach();
    }
    this._wakeLockStrategy = wakeLockStrategy;
  }

  async onload() {
    if ("wakeLock" in navigator) {
      await this.initSettings();
      this.initCommands();
      this.initStatusBar();
      const wakeLock = this.initWakeLock();
      this.addEventListener(wakeLock);
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
    this.statusBarItem.off();
    this.strategy?.enable();
  }

  private disableWakeLock() {
    this.notice(APP_DISPLAY_NAME + " disabled!");
    this.statusBarItem.disabled();
    this.strategy?.disable();
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
    this.settings = await WakeLockPluginSettings.load(this);
  }

  private initWakeLock(): ScreenWakeLock {
    const wakeLock = new ScreenWakeLock();
    this.selectStrategy(this.settings.strategy, wakeLock);
    wakeLock.addEventListener("request", () => {
      this.notice(APP_NAME + " on. Start cooking!");
      this.statusBarItem.on();
    });
    wakeLock.addEventListener("release", () => {
      if (this.settings.isActive) this.statusBarItem.off();
      else this.statusBarItem.disabled();
    });

    return wakeLock;
  }

  private addEventListener(wakeLock: ScreenWakeLock) {
    this.settings.addEventListener("active", ev => {
      if (ev.detail.isActive) this.enableWakeLock();
      else this.disableWakeLock();
    });
    this.settings.addEventListener("showInStatusBar", ev => this.statusBarItem.setVisible(ev.detail.showInStatusBar));
    this.settings.addEventListener("strategy", ev => this.selectStrategy(ev.detail.strategy, wakeLock));
    this.settings.addEventListener("wakeLockDelay", ev => this.selectStrategy(ev.detail.strategy, wakeLock));

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.isActive) this.strategy?.enable();
    });
  }

  private selectStrategy(strategy: Strategy, wakeLock: ScreenWakeLock) {
    if (strategy == Strategy.Always) {
      this.strategy = new SimpleStrategy(this, wakeLock);
    } else if (strategy == Strategy.EditorActive) {
      this.strategy = new ActiveEditorViewStrategy(this, wakeLock);
    } else if (strategy == Strategy.EditorTyping) {
      this.strategy = new EditorTypingStrategy(this, wakeLock, this.settings.wakeLockDelay);
    }
  }

  private initCommands() {
    Log.d("initCommands");
    this.addCommand({
      id: "toggle",
      name: "Toggle " + APP_DISPLAY_NAME,
      callback: this.toggleIsActive,
      icon: APP_ICON,
    });
    this.addRibbonIcon(APP_ICON, "Toggle " + APP_DISPLAY_NAME, this.toggleIsActive);
  }

  private initStatusBar() {
    Log.d("initStatusBar");
    this.statusBarItem = new WakeLockStatusBarItem(this.addStatusBarItem());
    this.statusBarItem.addEventListener("click", this.toggleIsActive);
    this.statusBarItem.setVisible(this.settings.showInStatusBar);
    if (!this.settings.isActive) this.statusBarItem.disabled();
  }

  private toggleIsActive = () => {
    this.settings.isActive = !this.settings.isActive;
  };

  private notice(notice: string) {
    if (this.settings?.showNotifications) {
      new Notice(notice, 2000);
    }
    Log.d(notice);
  }
}
