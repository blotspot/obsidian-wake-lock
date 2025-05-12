import { App, Platform, Plugin, PluginSettingTab, Setting } from "obsidian";
import { Log } from "./helper";

interface SettingsEventMap {
	active: CustomEvent<WakeLockPluginSettingsData>;
	showInStatusBar: CustomEvent<WakeLockPluginSettingsData>;
	strategy: CustomEvent<WakeLockPluginSettingsData>;
}

interface SettingsEventTarget extends EventTarget {
	addEventListener<K extends keyof SettingsEventMap>(
		type: K,
		listener: (ev: SettingsEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean,
	): void;
}

const TypedEventTarget = EventTarget as {
	new (): SettingsEventTarget;
	prototype: SettingsEventTarget;
};

export class WakeLockPluginSettings extends TypedEventTarget {
	private context: Plugin;
	private data: WakeLockPluginSettingsData;

	static async load(context: Plugin) {
		const handler = new WakeLockPluginSettings(context);
		await handler.loadSettings();
		Log.devMode = handler.data.devMode;
		context.addSettingTab(new WakeLockSettingsTab(context.app, context, handler));
		return handler;
	}

	private constructor(context: Plugin) {
		super();
		this.context = context;
	}

	get isActive(): boolean {
		return this.data.isActive;
	}

	set isActive(isActive: boolean) {
		if (this.data.isActive !== isActive) {
			this.updateIsActive(isActive);
		}
	}

	get showInStatusBar(): boolean {
		return this.data.showInStatusBar;
	}

	set showInStatusBar(showInStatusBar: boolean) {
		if (this.data.showInStatusBar !== showInStatusBar) {
			this.updateShowInStatusbar(showInStatusBar);
		}
	}

	get strategy(): string {
		return this.data.strategy;
	}

	set strategy(strategy: string) {
		if (this.data.strategy !== strategy) {
			this.updateStrategy(strategy);
		}
	}

	get showNotifications(): boolean {
		return this.data.showNotifications;
	}

	set showNotifications(showNotifications: boolean) {
		if (this.data.showNotifications !== showNotifications) {
			this.updateShowNotifications(showNotifications);
		}
	}

	get devMode(): boolean {
		return this.data.devMode;
	}

	set devMode(devMode: boolean) {
		if (this.data.devMode !== devMode) {
			this.updateDevMode(devMode);
		}
	}

	private customEvent(eventName: string) {
		this.dispatchEvent(new CustomEvent(eventName, { detail: this.data }));
	}

	private async updateIsActive(isActive: boolean) {
		this.data.isActive = isActive;
		await this.save();
		this.customEvent("active");
	}

	private async updateShowNotifications(showNotifications: boolean) {
		this.data.showNotifications = showNotifications;
		await this.save();
	}

	private async updateShowInStatusbar(showInStatusBar: boolean) {
		this.data.showInStatusBar = showInStatusBar;
		await this.save();
		this.customEvent("showInStatusBar");
	}

	private async updateStrategy(strategy: string) {
		this.data.strategy = strategy;
		await this.save();
		this.customEvent("strategy");
	}

	private async updateDevMode(devMode: boolean) {
		this.data.devMode = devMode;
		await this.save();
		Log.devMode = devMode;
	}

	/**
	 * Load settings on start-up.
	 */
	private async loadSettings() {
		this.data = Object.assign({}, DEFAULT_SETTINGS, await this.context.loadData());
	}

	async reloadSettings() {
		const _data = Object.assign({}, this.data, await this.context.loadData());
		this.isActive = _data.isActive;
		this.showInStatusBar = _data.showInStatusBar;
		this.showNotifications = _data.showNotifications;
		this.strategy = _data.strategy;
		this.devMode = _data.devMode;
	}

	/**
	 * save current settings
	 */
	private async save() {
		await this.context.saveData(this.data);
	}
}

export interface WakeLockPluginSettingsData {
	isActive: boolean;
	showInStatusBar: boolean;
	showNotifications: boolean;
	devMode: boolean;
	strategy: string;
}

export enum Strategy {
	Always = "always",
	EditorActive = "editor-active",
	EditorTyping = "editor-typing",
}

export const DEFAULT_SETTINGS: WakeLockPluginSettingsData = {
	isActive: true,
	showNotifications: true,
	showInStatusBar: Platform.isDesktop,
	devMode: false,
	strategy: Strategy.Always,
};

export class WakeLockSettingsTab extends PluginSettingTab {
	settings: WakeLockPluginSettings;

	constructor(app: App, plugin: Plugin, settings: WakeLockPluginSettings) {
		super(app, plugin);
		this.settings = settings;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Functionaility").setHeading();

		new Setting(containerEl)
			.setName("Use WakeLock")
			.setDesc("Enable or disable WakeLock functionality. (Hotkey trigger)")
			.addToggle(toggle =>
				toggle.setValue(this.settings.isActive).onChange(async value => {
					this.settings.isActive = value;
				}),
			);

		new Setting(containerEl)
			.setName("Activation strategy")
			.setDesc("Choose the strategy at which the wake lock is activated.")
			.addDropdown(dropdown =>
				dropdown
					.addOption(Strategy.Always, "Always On")
					.addOption(Strategy.EditorActive, "Editor Focus")
					.addOption(Strategy.EditorTyping, "Editor Typing")
					.setValue(this.settings.strategy)
					.onChange(value => (this.settings.strategy = value)),
			);

		new Setting(containerEl).setName("View Options").setHeading();

		new Setting(containerEl)
			.setName("Show in status bar")
			.setDesc("Adds an icon to the status bar, showing the current WakeLock state.")
			.addToggle(toggle =>
				toggle.setValue(this.settings.showInStatusBar).onChange(async value => {
					this.settings.showInStatusBar = value;
				}),
			);

		new Setting(containerEl)
			.setName("Show notifications")
			.setDesc("Show notification messages about enable / disable events.")
			.addToggle(toggle =>
				toggle.setValue(this.settings.showNotifications).onChange(async value => {
					this.settings.showNotifications = value;
				}),
			);

		new Setting(containerEl)
			.setName("Developer mode")
			.setDesc("Enable debug logs in the developer tools.")
			.addToggle(toggle =>
				toggle.setValue(this.settings.devMode).onChange(async value => {
					this.settings.devMode = value;
				}),
			);

		if (Platform.isIosApp) {
			new Setting(containerEl)
				.setName("iOS usage note")
				.setHeading()
				.setDesc(
					`If you're seeing the "WakeLock enabled!" notifiation but not followed by "WakeLock on",
						try disabling and re-enabling the plugin one or two times. It should catch itself after that. 
						You have to do this every time the app is freshly loaded, so create a keyboard shortcut or
						configure your mobile toolbar for convenience.`,
				);
		}
	}
}
