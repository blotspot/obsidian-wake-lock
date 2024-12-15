import { App, PluginSettingTab, Setting } from "obsidian";
import WakeLockPlugin from "../main";

interface SettingsEventMap {
	active: CustomEvent<boolean>;
	hideNotifications: CustomEvent<boolean>;
	showInStatusBar: CustomEvent<boolean>;
}

interface SettingsEventTarget extends EventTarget {
	addEventListener<K extends keyof SettingsEventMap>(
		type: K,
		listener: (ev: SettingsEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): void;
	addEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean
	): void;
}

const TypedEventTarget = EventTarget as {
	new (): SettingsEventTarget;
	prototype: SettingsEventTarget;
};

export class WakeLockPluginSettings extends TypedEventTarget {
	context: WakeLockPlugin;
	data: WakeLockPluginSettingsData;

	static async load(context: WakeLockPlugin) {
		const handler = new WakeLockPluginSettings(context);
		await handler.loadSettings();
		context.addSettingTab(
			new WakeLockSettingsTab(context.app, context, handler)
		);
		return handler;
	}

	private constructor(context: WakeLockPlugin) {
		super();
		this.context = context;
	}

	async updateIsActive(isActive: boolean) {
		this.data.isActive = isActive;
		await this.save();
		this.dispatchEvent(
			new CustomEvent("active", {
				detail: isActive,
			})
		);
	}

	async updateHideNotifications(hideNotifications: boolean) {
		this.data.hideNotifications = hideNotifications;
		await this.save();
		this.dispatchEvent(
			new CustomEvent("hideNotifications", {
				detail: hideNotifications,
			})
		);
	}

	async updateShowInStatusbar(showInStatusBar: boolean) {
		this.data.showInStatusBar = showInStatusBar;
		await this.save();
		this.dispatchEvent(
			new CustomEvent("showInStatusBar", {
				detail: showInStatusBar,
			})
		);
	}

	/**
	 * Load settings on start-up.
	 */
	private async loadSettings() {
		this.data = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.context.loadData()
		);
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
	hideNotifications: boolean;
	showInStatusBar: boolean;
}

export const DEFAULT_SETTINGS: WakeLockPluginSettingsData = {
	isActive: true,
	hideNotifications: false,
	showInStatusBar: true,
};

export class WakeLockSettingsTab extends PluginSettingTab {
	settings: WakeLockPluginSettings;

	constructor(
		app: App,
		plugin: WakeLockPlugin,
		settings: WakeLockPluginSettings
	) {
		super(app, plugin);
		this.settings = settings;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Use WakeLock")
			.setDesc("Enable or disable WakeLock functionality.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.data.isActive)
					.onChange(async (value) => {
						await this.settings.updateIsActive(value);
					})
			);

		new Setting(containerEl)
			.setName("Hide Notifications")
			.setDesc(
				"Hide all notification messages about enable / disable events."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.data.hideNotifications)
					.onChange(async (value) => {
						this.settings.updateHideNotifications(value);
					})
			);

		new Setting(containerEl)
			.setName("Show in status bar")
			.setDesc("Shows the WakeLock state in the statusbar.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.data.showInStatusBar)
					.onChange(async (value) => {
						this.settings.updateShowInStatusbar(value);
					})
			);
	}
}
