import { addIcon, Notice, Platform, Plugin } from "obsidian";
import { WAKE_LOCK, WAKE_LOCK_ICON } from "utils/constants";
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
      this.initWakeLock();
    } else {
      new Notice(WAKE_LOCK + " not supported, disabling plugin.");
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
    this.notice("WakeLock enabled!");
    this.statusBarItem.off();
    this.strategy?.enable();
  }

  private disableWakeLock() {
    this.notice("WakeLock disabled!");
    this.statusBarItem.disabled();
    this.strategy?.disable();
  }

  /** load settings and register listeners for setting changes */
  private async initSettings() {
    Log.d("initSettings");
    addIcon(
      WAKE_LOCK_ICON,
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
    this.settings.addEventListener("active", ev => {
      if (ev.detail.isActive) this.enableWakeLock();
      else this.disableWakeLock();
    });
    this.settings.addEventListener("showInStatusBar", ev => this.statusBarItem.setVisible(ev.detail.showInStatusBar));
    this.settings.addEventListener("strategy", ev => this.selectStrategy(ev.detail.strategy));
    this.settings.addEventListener("wakeLockDelay", ev => this.selectStrategy(ev.detail.strategy));
  }

  private initWakeLock() {
    this.selectStrategy(this.settings.strategy);
    const wakeLock = ScreenWakeLock.getInstance();
    wakeLock.addEventListener("request", () => {
      this.notice("WakeLock on.");
      this.statusBarItem.on();
    });
    wakeLock.addEventListener("release", () => {
      if (this.settings.isActive) this.statusBarItem.off();
      else this.statusBarItem.disabled();
    });
  }

  private selectStrategy(strategy: string) {
    if (strategy == Strategy.Always.toString()) {
      this.strategy = new SimpleStrategy(this);
    } else if (strategy == Strategy.EditorActive.toString()) {
      this.strategy = new ActiveEditorViewStrategy(this);
    } else if (strategy == Strategy.EditorTyping.toString()) {
      this.strategy = new EditorTypingStrategy(this, this.settings.wakeLockDelay);
    }

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.isActive) this.strategy?.enable();
    });
  }

  private initCommands() {
    Log.d("initCommands");
    this.addCommand({
      id: "toggle",
      name: "Toggle " + WAKE_LOCK,
      callback: this.toggleIsActive,
      icon: WAKE_LOCK_ICON,
    });
    this.addRibbonIcon(WAKE_LOCK_ICON, "Toggle " + WAKE_LOCK, this.toggleIsActive);
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
