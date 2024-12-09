import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

// Remember to rename these classes and interfaces!

interface ObsidianWakeLockPluginSettings {
	isActive: boolean;
}

const DEFAULT_SETTINGS: ObsidianWakeLockPluginSettings = {
	isActive: true,
};

export default class WakeLockPlugin extends Plugin {
	settings: ObsidianWakeLockPluginSettings;
	wakeLock: WakeLockSentinel | null = null;

	async onload() {
		let isSupported = false;

		if ("wakeLock" in navigator) {
			isSupported = true;
		}

		if (isSupported) {
			await this.loadSettings();

			this.initCommands();
			this.registerDomEvents();
			this.loadWakeLock();

			this.addSettingTab(new WakeLockSettingsTab(this.app, this));
		} else {
			console.debug("WakeLock not supported.");
			new Notice("WakeLock not supported.");
		}
	}

	onunload() {
		this.disableWakeLock();
	}

	async loadWakeLock() {
		if (this.settings.isActive) {
			this.requestWakeLock();
		}
	}

	async requestWakeLock() {
		console.debug("Requesting WakeLock...");
		try {
			this.wakeLock = await navigator.wakeLock.request("screen");
			new Notice("WakeLock is active!");
			console.debug("WakeLock is active!");

			this.wakeLock.addEventListener("release", () => {
				console.debug("WakeLock released!");
			});
		} catch (err) {
			// The Wake Lock request has failed - usually system related, such as battery.
			console.error(`${err.name}, ${err.message}`);
		}
	}

	disableWakeLock() {
		if (this.wakeLock !== null) {
			this.wakeLock.release().then(() => (this.wakeLock = null));
		}
	}

	async updateWakeLock(isActive: boolean) {
		this.settings.isActive = isActive;
		this.saveSettings();

		if (isActive) {
			new Notice("WakeLock activated!");
			this.registerDomEvents();
			this.requestWakeLock();
		} else {
			new Notice("WakeLock disabled!");
			this.unregisterDomEvents();
			this.disableWakeLock();
		}
	}

	initCommands() {
		console.debug("WakeLock::initCommands");
		this.addCommand({
			id: "wake-lock-toggle",
			name: "Toggle WakeLock",
			callback: () => {
				this.updateWakeLock(!this.settings.isActive);
			},
		});
	}

	private disableEvent = () => {
		console.debug("WakeLock::disabledByEvent");
		this.disableWakeLock();
	};

	private enableEvent = () => {
		console.debug("WakeLock::enabledByEvent");
		this.loadWakeLock();
	};

	registerDomEvents() {
		this.registerDomEvent(window, "blur", this.disableEvent);
		this.registerDomEvent(window, "focus", this.enableEvent);
	}

	unregisterDomEvents() {
		window.removeEventListener("blur", this.disableEvent);
		window.removeEventListener("focus", this.enableEvent);
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
						await this.plugin.updateWakeLock(value);
					})
			);
	}
}
