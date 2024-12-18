import { Notice, Plugin } from "obsidian";
import { WakeLock } from "./src/wake-lock";
import { WakeLockStatusBarItem } from "./src/statusbar";
import { Log } from "./src/log";
import { WakeLockPluginSettings } from "./src/settings";

export default class WakeLockPlugin extends Plugin {
	private settings: WakeLockPluginSettings;
	private statusBarItem: WakeLockStatusBarItem;
	private wakeLock: WakeLock;

	async onload() {
		this.wakeLock = new WakeLock();

		if (this.wakeLock.isSupported) {
			await this.initSettings();
			this.initCommands();
			this.initStatusBar();
			this.initWakeLock();
		} else {
			this.notice("WakeLock not supported, disabling plugin.");
			this.unload();
		}
	}

	onunload() {
		this.disableWakeLock();
	}

	/**
	 * Enables wake lock functionality by requesting a new WakeLockSentinel from the API,
	 * and registering events for auto release / reaquire.
	 */
	enableWakeLock() {
		this.registerDomEvents();
		this.wakeLock.request();
	}

	/**
	 * Disables wake lock functionality by releasing the current WakeLockSentinel if possible,
	 * and unregistering events for auto release / reaquire.
	 */
	disableWakeLock() {
		this.wakeLock.release();
		this.unregisterDomEvents();
	}

	private updateWakeLockState(isActive: boolean) {
		if (isActive) {
			this.notice("WakeLock enabled!");
			this.enableWakeLock();
		} else {
			this.notice("WakeLock disabled!");
			this.disableWakeLock();
		}
	}

	private updateStatusBarVisibility(showInStatusBar: boolean) {
		this.statusBarItem.setVisible(showInStatusBar);
	}

	private async initSettings() {
		this.settings = await WakeLockPluginSettings.load(this);
		this.settings.addEventListener("active", (ev) => {
			this.updateWakeLockState(ev.detail);
		});
		this.settings.addEventListener("showInStatusBar", (ev) => {
			this.updateStatusBarVisibility(ev.detail);
		});
	}

	private initWakeLock() {
		if (this.settings.data.isActive) {
			this.enableWakeLock();
		}
		this.wakeLock.addEventListener("request", () => {
			this.notice("WakeLock on.");
			this.statusBarItem.switch(true);
		});
		this.wakeLock.addEventListener("release", () => {
			this.statusBarItem.switch(false);
		});
	}

	private toggleIsActive = () => {
		this.settings.updateIsActive(!this.settings.data.isActive);
	};

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
		this.updateStatusBarVisibility(this.settings.data.showInStatusBar);
	}

	private onDocumentVisibilityChange = () => {
		Log.d("visibilityChange -> " + document.visibilityState);
		if (document.visibilityState === "visible") {
			this.wakeLock.request();
		} else {
			this.wakeLock.release(); // this should be handled automagically by the system.
		}
	};

	private registerDomEvents() {
		this.registerDomEvent(
			document,
			"visibilitychange",
			this.onDocumentVisibilityChange
		);
	}

	private unregisterDomEvents() {
		document.removeEventListener(
			"visibilitychange",
			this.onDocumentVisibilityChange
		);
	}

	private notice(notice: string) {
		if (!this.settings?.data.hideNotifications) {
			new Notice(notice);
		}
		Log.d(notice);
	}
}
