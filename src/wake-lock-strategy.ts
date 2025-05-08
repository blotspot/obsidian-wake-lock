import { App, MarkdownView, Plugin, WorkspaceLeaf } from "obsidian";
import { WakeLockHandler } from "./wake-lock";
import { Log } from "./helper";

export abstract class WakeLockStrategy {
	protected plugin: Plugin;
	protected wakeLock: WakeLockHandler;
	protected attached: boolean = false;

	constructor(plugin: Plugin, wakeLock: WakeLockHandler) {
		this.plugin = plugin;
		this.wakeLock = wakeLock;
	}

	attach() {
		if (!this.attached) {
			Log.d("attach listeners");
			this.enableChangeWatchers();
			this.attached = true;
		}
	}

	detach() {
		if (this.attached) {
			Log.d("detach listeners");
			this.disableChangeWatchers();
			this.attached = false;
		}
	}

	abstract enable(): void;

	abstract disable(): void;

	protected abstract enableChangeWatchers(): void;
	protected abstract disableChangeWatchers(): void;
}

export class SimpleStrategy extends WakeLockStrategy {
	constructor(plugin: Plugin, wakeLock: WakeLockHandler) {
		super(plugin, wakeLock);
	}

	enable(): void {
		Log.d("enable simple stategy");
		this.attach();
		this.wakeLock.request();
	}

	disable() {
		Log.d("disable simple stategy");
		this.detach();
		this.wakeLock.release();
	}

	protected enableChangeWatchers() {
		this.plugin.registerDomEvent(document, "visibilitychange", this.onDocumentVisibilityChange);
	}

	protected disableChangeWatchers() {
		document.removeEventListener("visibilitychange", this.onDocumentVisibilityChange);
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
}

export class ActiveEditorViewStrategy extends WakeLockStrategy {
	private settingsWindowOpenedObserver: MutationObserver;
	private settingsWindowOpened: boolean = false;

	constructor(plugin: Plugin, wakeLock: WakeLockHandler) {
		super(plugin, wakeLock);

		this.settingsWindowOpenedObserver = new MutationObserver((mutations, obs) => {
			if (mutations.some(m => m.type === "childList")) {
				this.handleSettingsWindowOpened();
			}
		});
	}

	enable() {
		Log.d("enable active editor view stategy");
		this.attach();
		this.handleSettingsWindowOpened();
		this.changeWakeLockState();
	}

	disable() {
		Log.d("disable active editor view stategy");
		this.detach();
		this.wakeLock.release();
	}

	protected enableChangeWatchers() {
		Log.d("add active-leaf-change observer");
		this.plugin.registerDomEvent(document, "visibilitychange", this.changeWakeLockState);
		this.plugin.app.workspace.on("active-leaf-change", this.changeWakeLockState);
		this.settingsWindowOpenedObserver.observe(document.body, { childList: true });
	}

	protected disableChangeWatchers() {
		Log.d("remove active-leaf-change observer");
		document.removeEventListener("visibilitychange", this.changeWakeLockState);
		this.plugin.app.workspace.off("active-leaf-change", this.changeWakeLockState);
		this.settingsWindowOpenedObserver.disconnect();
	}

	/** checks if the settings modal is opened and requests or releases the wake lock accordingly */
	private handleSettingsWindowOpened() {
		if (document.querySelector(".modal-container>.mod-settings")) {
			if (!this.settingsWindowOpened) {
				Log.d("settings window opened");
				this.settingsWindowOpened = true;
				this.wakeLock.release();
			}
		} else {
			if (this.settingsWindowOpened) {
				Log.d("settings window closed");
				this.settingsWindowOpened = false;
				this.wakeLock.request();
			}
		}
	}

	private changeWakeLockState = () => {
		const view = this.plugin?.app?.workspace?.getActiveViewOfType(MarkdownView);
		if (view && !this.settingsWindowOpened) {
			this.wakeLock.request();
		} else {
			this.wakeLock.release();
		}
	};
}
