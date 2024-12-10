import {
	App,
	debounce,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

interface WakeLockPluginSettings {
	isActive: boolean;
}

const DEFAULT_SETTINGS: WakeLockPluginSettings = {
	isActive: true,
};

export default class WakeLockPlugin extends Plugin {
	settings: WakeLockPluginSettings;
	wakeLock: WakeLockSentinel | null = null;

	async onload() {
		let isSupported = false;

		if ("wakeLock" in navigator) {
			isSupported = true;
		}

		if (isSupported) {
			await this.loadSettings();

			this.initCommands();
			this.initWakeLock();
			this.addSettingTab(new WakeLockSettingsTab(this.app, this));
		} else {
			console.debug("WakeLock not supported.");
			new Notice("WakeLock not supported.");
		}
	}

	onunload() {
		this.disableWakeLock();
	}

	private saveRequestWakeLock = debounce(async () => {
		this.requestWakeLock();
	}, 1000);

	private async requestWakeLock() {
		if (this.wakeLock === null || this.wakeLock.released) {
			console.debug("Requesting WakeLock...");
			try {
				this.wakeLock = await navigator.wakeLock.request("screen");
				new Notice("WakeLock is active!");
				console.debug("WakeLock is active!");

				this.wakeLock.addEventListener("release", () => {
					console.debug("WakeLock released!");
					this.wakeLock = null;
				});
			} catch (err) {
				// The Wake Lock request has failed - usually system related, such as battery.
				console.error(`${err.name}, ${err.message}`);
			}
		} else {
			console.debug("wake lock already requested.");
		}
	}

	private saveReleaseWakeLock = debounce(async () => {
		this.releaseWakeLock();
	}, 100);

	private releaseWakeLock() {
		if (this.wakeLock !== null && !this.wakeLock.released) {
			this.wakeLock.release();
		} else {
			console.debug("wake lock not requested or already released.");
		}
	}

	async updateWakeLockState(isActive: boolean) {
		this.settings.isActive = isActive;
		this.saveSettings();

		if (isActive) {
			this.initWakeLock();
		} else {
			this.disableWakeLock();
		}
	}

	private initCommands() {
		console.debug("WakeLock::initCommands");
		this.addCommand({
			id: "wake-lock-toggle",
			name: "Toggle WakeLock",
			callback: () => {
				this.updateWakeLockState(!this.settings.isActive);
			},
		});
	}

	private initWakeLock() {
		if (this.settings.isActive) {
			new Notice("WakeLock activated!");
			this.registerDomEvents();
			this.requestWakeLock();
		}
	}

	private disableWakeLock() {
		new Notice("WakeLock disabled!");
		this.unregisterDomEvents();
		this.releaseWakeLock();
	}

	private onWindowBlur = () => {
		console.debug("WakeLock::onWindowBlur");
		this.saveReleaseWakeLock();
	};

	private onWindowFocus = () => {
		console.debug("WakeLock::onWindowFocus");
		this.saveRequestWakeLock();
	};

	private onDocumentVisibilityChange = () => {
		console.debug(
			"WakeLock::visibilityChange -> " + document.visibilityState
		);
		``;
		if (document.visibilityState === "visible") {
			this.saveRequestWakeLock();
		} else {
			this.saveReleaseWakeLock();
		}
	};

	private registerDomEvents() {
		this.registerDomEvent(
			document,
			"visibilitychange",
			this.onDocumentVisibilityChange
		);
		// this.registerDomEvent(window, "blur", this.onWindowBlur);
		// this.registerDomEvent(window, "focus", this.onWindowFocus);
	}

	private unregisterDomEvents() {
		document.removeEventListener(
			"visibilitychange",
			this.onDocumentVisibilityChange
		);
		// window.removeEventListener("blur", this.onWindowBlur);
		// window.removeEventListener("focus", this.onWindowFocus);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class WakeLockSettingsTab extends PluginSettingTab {
	plugin: WakeLockPlugin;

	constructor(app: App, plugin: WakeLockPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Use WakeLock")
			.setDesc("Enable or disable WakeLock functionality.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isActive)
					.onChange(async (value) => {
						await this.plugin.updateWakeLockState(value);
					})
			);
	}
}
