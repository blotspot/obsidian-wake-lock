import { MarkdownView, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { WakeLock } from "./wake-lock";
import { WakeLockStatusBarItem } from "./statusbar";
import { Log } from "./helper";
import { WakeLockPluginSettings, WakeLockPluginSettingsData } from "./settings";

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

	private initWakeLock() {
		this.wakeLock.addEventListener("request", () => {
			this.notice("WakeLock on.");
			this.statusBarItem.switch(true);
		});
		this.wakeLock.addEventListener("release", () => {
			this.statusBarItem.switch(false);
		});
		this.wakeLock.addEventListener("error", (err) => {
			this.unregisterDomEvents();
			this.notice("Error on WakeLock request.")
		});
		this.setWakeLockState(this.settings.data);
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
		this.setStatusBarVisibility(this.settings.data.showInStatusBar);
	}

	private setWakeLockState(currentSettings: WakeLockPluginSettingsData) {
		if (currentSettings.isActive) {
			this.notice("WakeLock enabled!");
			currentSettings.triggerOnActiveEditorView
				? this.setActiveEditorTrigger(currentSettings)
				: this.enableWakeLock();
		} else {
			this.notice("WakeLock disabled!");
			this.disableWakeLock();
			if (currentSettings.triggerOnActiveEditorView) {
				this.unregisterEditorTrigger();
			}
		}
	}

	private setWakeLockStateBasedOnActiveView() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		this.onActiveMarkdownView(
			activeView === null
				? null
				: ({ view: activeView } as unknown as WorkspaceLeaf)
		);
	}

	private setStatusBarVisibility(showInStatusBar: boolean) {
		this.statusBarItem.setVisible(showInStatusBar);
	}

	private setActiveEditorTrigger(
		currentSettings: WakeLockPluginSettingsData
	) {
		if (currentSettings.triggerOnActiveEditorView) {
			this.setWakeLockStateBasedOnActiveView();
			this.registerEditorTriggers();
		} else {
			if (currentSettings.isActive && !this.wakeLock.active()) {
				this.enableWakeLock();
			}
			this.unregisterEditorTrigger();
		}
	}

	private async initSettings() {
		this.settings = await WakeLockPluginSettings.load(this);
		this.settings.addEventListener("active", (ev) => {
			this.setWakeLockState(ev.detail);
		});
		this.settings.addEventListener("showInStatusBar", (ev) => {
			this.setStatusBarVisibility(ev.detail.showInStatusBar);
		});
		this.settings.addEventListener("triggerOnActiveEditorView", (ev) => {
			this.setActiveEditorTrigger(ev.detail);
		});
	}

	private onDocumentVisibilityChange = () => {
		Log.d("visibilityChange -> " + document.visibilityState);
		if (document.visibilityState === "visible") {
			this.wakeLock.request();
		} else {
			this.wakeLock.release(); // this should be handled automagically by the system.
		}
	};

	private onActiveMarkdownView = (leaf: WorkspaceLeaf | null) => {
		const isMarkdownView = leaf?.view instanceof MarkdownView;
		if (this.settings.data.isActive && isMarkdownView && !this.wakeLock.active()) {
			this.enableWakeLock();
		} else if (this.settings.data.isActive && !isMarkdownView && this.wakeLock.active()) {
			this.disableWakeLock();
		}
	};

	private registerEditorTriggers() {
		this.app.workspace.on("active-leaf-change", this.onActiveMarkdownView);
	}

	private unregisterEditorTrigger() {
		this.app.workspace.off("active-leaf-change", this.onActiveMarkdownView);
	}

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
