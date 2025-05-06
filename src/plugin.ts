import { MarkdownView, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { WakeLockManager } from "./wake-lock";
import { WakeLockStatusBarItem } from "./statusbar";
import { Log } from "./helper";
import { WakeLockPluginSettings, WakeLockPluginSettingsData } from "./settings";

export default class WakeLockPlugin extends Plugin {
	private settings: WakeLockPluginSettings;
	private statusBarItem: WakeLockStatusBarItem;
	private wakeLock: WakeLockManager;

	private settingsWindowOpened: boolean = false;
	private settingsWindowOpenedObserver: MutationObserver;

	async onload() {
		this.wakeLock = new WakeLockManager();

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
		this.disableWakeLock(this.settings.data);
	}

	/**
	 * Enables wake lock functionality by requesting a new WakeLockSentinel from the API,
	 * and registering events for auto release / reaquire.
	 */
	wakeLockOn() {
		this.registerDomEvents();
		this.wakeLock.request();
	}

	/**
	 * Disables wake lock functionality by releasing the current WakeLockSentinel if possible,
	 * and unregistering events for auto release / reaquire.
	 */
	wakeLockOff() {
		this.wakeLock.release();
		this.unregisterDomEvents();
	}

	enableWakeLock(settings: WakeLockPluginSettingsData) {
		this.notice("WakeLock enabled!");
		settings.triggerOnActiveEditorView ? this.setActiveEditorTrigger(settings) : this.wakeLockOn();
	}

	disableWakeLock(settings: WakeLockPluginSettingsData) {
		this.notice("WakeLock disabled!");
		this.wakeLockOff();
		if (settings.triggerOnActiveEditorView) {
			this.unregisterEditorViewActiveListeners();
		}
	}

	private initWakeLock() {
		this.wakeLock.addEventListener("request", () => {
			this.notice("WakeLock on.");
			this.statusBarItem.switch(true);
		});
		this.wakeLock.addEventListener("release", () => {
			this.statusBarItem.switch(false);
		});
		this.wakeLock.addEventListener("error", err => {
			this.unregisterDomEvents();
			this.notice("Error on WakeLock request.");
		});

		this.settingsWindowOpenedObserver = new MutationObserver((mutations, obs) =>
			mutations.filter(m => m.type === "childList").forEach(m => this.handleSettingsWindow()),
		);

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

	/** sets wake-lock based on the current settings and context */
	private setWakeLockState(currentSettings: WakeLockPluginSettingsData) {
		if (currentSettings.isActive) {
			this.enableWakeLock(currentSettings);
		} else {
			this.disableWakeLock(currentSettings);
		}
	}

	private setStatusBarVisibility(showInStatusBar: boolean) {
		this.statusBarItem.setVisible(showInStatusBar);
	}

	/** un/registers triggers to monitor if the editor is in focus */
	private setActiveEditorTrigger(currentSettings: WakeLockPluginSettingsData) {
		if (currentSettings.isActive && currentSettings.triggerOnActiveEditorView) {
			// only register listeners if wakelock function is enabled and check if wakelock needs to be triggered
			this.registerEditorViewActiveListeners();
			this.setWakeLockStateBasedOnActiveView();
		} else if (!currentSettings.triggerOnActiveEditorView) {
			// turn wake lock back on if setting for active editor monitoring is disabled
			if (currentSettings.isActive && !this.wakeLock.active()) {
				this.wakeLockOn();
			}
			// and unregisters listeners
			this.unregisterEditorViewActiveListeners();
		}
	}

	/** load settings and register listeners for setting changes */
	private async initSettings() {
		this.settings = await WakeLockPluginSettings.load(this);
		this.settings.addEventListener("active", ev => {
			this.setWakeLockState(ev.detail);
		});
		this.settings.addEventListener("showInStatusBar", ev => {
			this.setStatusBarVisibility(ev.detail.showInStatusBar);
		});
		this.settings.addEventListener("triggerOnActiveEditorView", ev => {
			this.setActiveEditorTrigger(ev.detail);
		});
	}

	/** checks if the settings modal is opened and requests or releases the wake lock accordingly */
	private handleSettingsWindow() {
		if (document.querySelector(".modal-container>.mod-settings")) {
			this.settingsWindowOpened = true;
			this.wakeLockOff();
		} else {
			if (this.settingsWindowOpened) {
				this.settingsWindowOpened = false;
				this.wakeLockOn();
			}
		}
	}

	private setWakeLockStateBasedOnActiveView() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		this.onActiveMarkdownView({ view: activeView } as unknown as WorkspaceLeaf);
		this.handleSettingsWindow();
	}

	/** handles active-leaf-change events to dis- / or enable the wake-lock */
	private onActiveMarkdownView = (leaf: WorkspaceLeaf | null) => {
		const isMarkdownView = leaf?.view instanceof MarkdownView;
		if (this.settings.data.isActive && isMarkdownView && !this.wakeLock.active()) {
			this.wakeLockOn();
		} else if (this.settings.data.isActive && !isMarkdownView && this.wakeLock.active()) {
			this.wakeLockOff();
		}
	};

	private registerEditorViewActiveListeners() {
		this.app.workspace.on("active-leaf-change", this.onActiveMarkdownView);
		this.settingsWindowOpenedObserver.observe(document.body, { childList: true });
	}

	private unregisterEditorViewActiveListeners() {
		this.app.workspace.off("active-leaf-change", this.onActiveMarkdownView);
		this.settingsWindowOpenedObserver.disconnect();
	}

	/** handles if Obsidian window is in the background / minimised */
	private onDocumentVisibilityChange = () => {
		Log.d("visibilityChange -> " + document.visibilityState);
		if (document.visibilityState === "visible") {
			this.wakeLock.request();
		} else {
			this.wakeLock.release(); // this should be handled automagically by the system.
		}
	};

	private registerDomEvents() {
		this.registerDomEvent(document, "visibilitychange", this.onDocumentVisibilityChange);
	}

	private unregisterDomEvents() {
		document.removeEventListener("visibilitychange", this.onDocumentVisibilityChange);
	}

	private notice(notice: string) {
		if (!this.settings?.data.hideNotifications) {
			new Notice(notice);
		}
		Log.d(notice);
	}
}
