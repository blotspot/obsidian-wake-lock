import { MarkdownView, Plugin, WorkspaceLeaf } from "obsidian";
import { WakeLockHandler } from "./wake-lock";
import { Log } from "./helper";

export abstract class WakeLockStrategy {
	protected plugin: Plugin;
	protected wakeLock: WakeLockHandler;

	constructor(plugin: Plugin, wakeLock: WakeLockHandler) {
		this.plugin = plugin;
		this.wakeLock = wakeLock;
	}

	attach() {
		Log.d("add visibilitychange observer");
		this.enableChangeWatchers();
		this.wakeLock.addEventListener("error", () => this.detach());
	}

	detach() {
		Log.d("remove visibilitychange observer");
		this.disableChangeWatchers();
		this.wakeLock.removeEventListener("error", () => this.detach());
	}

	abstract enable(): void;

	abstract disable(): void;

	protected abstract enableChangeWatchers(): void;
	protected abstract disableChangeWatchers(): void;
}

export class SimpleWakeLockManager extends WakeLockStrategy {
	constructor(plugin: Plugin, wakeLock: WakeLockHandler) {
		super(plugin, wakeLock);
	}

	enable(): void {
		this.attach();
		this.wakeLock.request();
	}

	disable() {
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

export class ActiveEditorViewWakeLockManager extends SimpleWakeLockManager {
	private settingsWindowOpenedObserver: MutationObserver;
	private settingsWindowOpened: boolean = false;

	constructor(plugin: Plugin, wakeLock: WakeLockHandler) {
		super(plugin, wakeLock);

		this.settingsWindowOpenedObserver = new MutationObserver((mutations, obs) =>
			mutations.filter(m => m.type === "childList").forEach(mr => this.handleSettingsWindowOpened()),
		);
	}

	enable() {
		this.attach();
		this.handleSettingsWindowOpened();
		if (!this.settingsWindowOpened && this.plugin.app.workspace.getActiveViewOfType(MarkdownView)) {
			this.wakeLock.request();
		}
	}

	protected enableChangeWatchers() {
		super.enableChangeWatchers();
		Log.d("add active-leaf-change observer");
		this.plugin.app.workspace.on("active-leaf-change", this.onActiveMarkdownView);
		this.settingsWindowOpenedObserver.observe(document.body, { childList: true });
	}

	protected disableChangeWatchers() {
		super.disableChangeWatchers();
		Log.d("remove active-leaf-change observer");
		this.plugin.app.workspace.off("active-leaf-change", this.onActiveMarkdownView);
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

	/** handles active-leaf-change events to dis- / or enable the wake-lock */
	private onActiveMarkdownView = (leaf: WorkspaceLeaf | null) => {
		if (leaf?.view !== undefined && leaf.view instanceof MarkdownView) {
			Log.d("active-leaf-change -> in markdown view");
			this.wakeLock.request();
		} else {
			Log.d("active-leaf-change -> not in markdown view");
			this.wakeLock.release();
		}
	};
}
