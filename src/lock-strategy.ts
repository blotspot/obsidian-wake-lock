import { debounce, MarkdownView, Plugin } from "obsidian";
import { ScreenWakeLock } from "./wake-lock";
import { Log } from "./helper";

export abstract class LockStrategy {
	wakeLock: ScreenWakeLock;
	protected plugin: Plugin;
	protected attached: boolean = false;
	protected typeName: string;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.wakeLock = ScreenWakeLock.getInstance();
	}

	attach() {
		if (!this.attached) {
			this.enableChangeWatchers();
			this.attached = true;
		}
	}

	detach() {
		if (this.attached) {
			this.disableChangeWatchers();
			this.attached = false;
		}
	}

	abstract enable(): void;

	abstract disable(): void;

	protected abstract enableChangeWatchers(): void;
	protected abstract disableChangeWatchers(): void;

	protected abstract requestWakeLock(): void;
	protected abstract releaseWakeLock(): void;
}

export class SimpleStrategy extends LockStrategy {
	constructor(plugin: Plugin) {
		super(plugin);
		this.typeName = "SimpleStrategy";
	}

	enable(): void {
		this.attach();
		this.requestWakeLock();
	}

	disable() {
		this.detach();
		this.releaseWakeLock();
	}

	protected enableChangeWatchers() {
		this.plugin.registerDomEvent(document, "visibilitychange", this.onVisibilityChange);
	}

	protected disableChangeWatchers() {
		document.removeEventListener("visibilitychange", this.onVisibilityChange);
	}

	protected requestWakeLock() {
		this.wakeLock.request();
	}

	protected releaseWakeLock(): void {
		this.wakeLock.release();
	}

	private onVisibilityChange = () => {
		if (document.visibilityState === "visible") {
			this.requestWakeLock();
		} else {
			this.releaseWakeLock(); // this should be handled automagically by the system.
		}
	};
}

export class ActiveEditorViewStrategy extends SimpleStrategy {
	protected settingsWindowOpenedObserver: MutationObserver;
	protected settingsWindowOpened: boolean = false;

	constructor(plugin: Plugin) {
		super(plugin);
		this.typeName = "ActiveEditorViewStrategy";
		this.settingsWindowOpened = !!document.querySelector(".modal-container>.mod-settings");
		this.settingsWindowOpenedObserver = new MutationObserver((mutations, obs) => {
			if (mutations.some(m => m.type === "childList")) {
				this.handleSettingsWindowOpened();
			}
		});
	}

	enable() {
		this.attach();
		this.handleSettingsWindowOpened();
		this.requestWakeLock();
	}

	protected enableChangeWatchers() {
		super.enableChangeWatchers();
		this.plugin.app.workspace.on("active-leaf-change", this.requestWakeLock);
		this.settingsWindowOpenedObserver.observe(document.body, { childList: true });
	}

	protected disableChangeWatchers() {
		super.disableChangeWatchers();
		this.plugin.app.workspace.off("active-leaf-change", this.requestWakeLock);
		this.settingsWindowOpenedObserver.disconnect();
	}

	protected requestWakeLock = () => {
		const view = this.plugin?.app?.workspace?.getActiveViewOfType(MarkdownView);
		if (view && !this.settingsWindowOpened) {
			this.wakeLock.request();
		} else {
			this.releaseWakeLock();
		}
	};

	/** checks if the settings modal is opened and requests or releases the wake lock accordingly */
	private handleSettingsWindowOpened() {
		if (document.querySelector(".modal-container>.mod-settings")) {
			if (!this.settingsWindowOpened) {
				Log.d(`${this.typeName} - settings window opened`);
				this.settingsWindowOpened = true;
				this.releaseWakeLock();
			}
		} else {
			if (this.settingsWindowOpened) {
				Log.d(`${this.typeName} - settings window closed`);
				this.settingsWindowOpened = false;
				this.requestWakeLock();
			}
		}
	}
}

export class EditorTypingStrategy extends ActiveEditorViewStrategy {
	constructor(plugin: Plugin) {
		super(plugin);
		this.typeName = "EditorTypingStrategy";
	}

	protected enableChangeWatchers() {
		super.enableChangeWatchers();
		this.plugin.app.workspace.on("editor-change", this.requestWakeLock);
	}

	protected disableChangeWatchers() {
		super.disableChangeWatchers();
		this.plugin.app.workspace.off("editor-change", this.requestWakeLock);
	}

	protected requestWakeLock = () => {
		if (!this.settingsWindowOpened) {
			this.releaseWakeLock();
			this.requestDelayed();
		} else {
			this.releaseWakeLock();
		}
	};

	private requestDelayed = debounce(() => this.wakeLock.request(), 5000, true);
}
