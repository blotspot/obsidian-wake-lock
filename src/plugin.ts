import { Notice, Plugin } from "obsidian";
import { WakeLockHandler } from "./wake-lock";
import { WakeLockStatusBarItem } from "./statusbar";
import { Log } from "./helper";
import { WakeLockPluginSettings } from "./settings";
import {
	ActiveEditorViewWakeLockManager as ActiveEditorViewWakeLockStrategy,
	SimpleWakeLockManager as SimpleWakeLockStrategy,
	WakeLockStrategy,
} from "./wake-lock-strategy";

export default class WakeLockPlugin extends Plugin {
	private settings: WakeLockPluginSettings;
	private statusBarItem: WakeLockStatusBarItem;
	private wakeLock: WakeLockHandler;
	private _wakeLockStrategy: WakeLockStrategy;

	get strategy() {
		return this._wakeLockStrategy;
	}

	set strategy(wakeLockManager: WakeLockStrategy) {
		if (this.settings.isActive) {
			Log.d("detach old stategy and set new one");
			this._wakeLockStrategy?.detach();
			wakeLockManager.attach();
		}
		this._wakeLockStrategy = wakeLockManager;
	}

	async onload() {
		this.wakeLock = new WakeLockHandler();
		if (this.wakeLock.isSupported) {
			await this.initSettings();
			this.initWakeLock();
			this.initCommands();
			this.initStatusBar();

			if (this.settings.isActive) this.strategy.enable();
		} else {
			this.notice("WakeLock not supported, disabling plugin.");
			this.unload();
		}
	}

	onunload() {
		this.disableWakeLock();
	}

	private enableWakeLock() {
		this.notice("WakeLock enabled!");
		this.strategy.enable();
	}

	private disableWakeLock() {
		this.notice("WakeLock disabled!");
		this.strategy?.disable();
	}

	/** load settings and register listeners for setting changes */
	private async initSettings() {
		this.settings = await WakeLockPluginSettings.load(this);
		this.settings.addEventListener("active", ev => {
			ev.detail.isActive ? this.enableWakeLock() : this.disableWakeLock();
		});
		this.settings.addEventListener("showInStatusBar", ev => {
			this.statusBarItem.setVisible(ev.detail.showInStatusBar);
		});
		this.settings.addEventListener("triggerOnActiveEditorView", ev => {
			this.strategy = ev.detail.triggerOnActiveEditorView
				? new ActiveEditorViewWakeLockStrategy(this, this.wakeLock)
				: new SimpleWakeLockStrategy(this, this.wakeLock);
		});
	}

	private initWakeLock() {
		this.wakeLock.addEventListener("request", () => {
			this.notice("WakeLock on.");
			this.statusBarItem.switch(true);
		});
		this.wakeLock.addEventListener("release", () => {
			this.statusBarItem.switch(false);
		});
		this.wakeLock.addEventListener("error", () => {
			this.notice("Error on WakeLock request.");
		});

		if (this.settings.triggerOnActiveEditorView) {
			Log.d("active editor view strategy");
			this._wakeLockStrategy = new ActiveEditorViewWakeLockStrategy(this, this.wakeLock);
		} else {
			Log.d("simple strategy");
			this._wakeLockStrategy = new SimpleWakeLockStrategy(this, this.wakeLock);
		}
	}

	private initCommands() {
		Log.d("initCommands");
		this.addCommand({
			id: "toggle",
			name: "Toggle WakeLock",
			icon: "monitor-dot",
			callback: this.toggleIsActive,
		});
	}

	private initStatusBar() {
		this.statusBarItem = new WakeLockStatusBarItem(this.addStatusBarItem());
		this.statusBarItem.addEventListener("click", this.toggleIsActive);
		this.statusBarItem.setVisible(this.settings.showInStatusBar);
	}

	private toggleIsActive = () => {
		this.settings.isActive = !this.settings.isActive;
	};

	private notice(notice: string) {
		if (!this.settings?.hideNotifications) {
			new Notice(notice);
		}
		Log.d(notice);
	}
}
