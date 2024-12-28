import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface SettingsEventMap {
	active: CustomEvent<WakeLockPluginSettingsData>;
	hideNotifications: CustomEvent<WakeLockPluginSettingsData>;
	showInStatusBar: CustomEvent<WakeLockPluginSettingsData>;
	triggerOnActiveEditorView: CustomEvent<WakeLockPluginSettingsData>;
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
	context: Plugin;
	data: WakeLockPluginSettingsData;

	static async load(context: Plugin) {
		const handler = new WakeLockPluginSettings(context);
		await handler.loadSettings();
		context.addSettingTab(
			new WakeLockSettingsTab(context.app, context, handler)
		);
		return handler;
	}

	private constructor(context: Plugin) {
		super();
		this.context = context;
	}

	private customEvent(eventName: string) {
		this.dispatchEvent(new CustomEvent(eventName, { detail: this.data }));
	}

	async updateIsActive(isActive: boolean) {
		this.data.isActive = isActive;
		await this.save();
		this.customEvent("active");
	}

	async updateHideNotifications(hideNotifications: boolean) {
		this.data.hideNotifications = hideNotifications;
		await this.save();
		this.customEvent("hideNotifications");
	}

	async updateShowInStatusbar(showInStatusBar: boolean) {
		this.data.showInStatusBar = showInStatusBar;
		await this.save();
		this.customEvent("showInStatusBar");
	}

	async updateTriggerOnActiveEditor(triggerOnActiveEditorView: boolean) {
		this.data.triggerOnActiveEditorView = triggerOnActiveEditorView;
		await this.save();
		this.customEvent("triggerOnActiveEditorView");
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
	triggerOnActiveEditorView: boolean;
}

export const DEFAULT_SETTINGS: WakeLockPluginSettingsData = {
	isActive: true,
	hideNotifications: false,
	showInStatusBar: true,
	triggerOnActiveEditorView: false,
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
			.setName("Only activate on active editor view.")
			.setDesc("Will only set a WakeLock when the editor is focused.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.data.triggerOnActiveEditorView)
					.onChange(async (value) => {
						this.settings.updateTriggerOnActiveEditor(value);
					})
			);

		new Setting(containerEl)
			.setName("Hide notifications")
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
			.setDesc(
				"Adds an icon to the status bar, showing the current WakeLock state."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.data.showInStatusBar)
					.onChange(async (value) => {
						this.settings.updateShowInStatusbar(value);
					})
			);
	}
}
