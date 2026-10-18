import { Modal, SettingTab } from "obsidian";

interface HotkeysTab extends SettingTab {
  containerEl: HTMLElement;
  setQuery(value: string): void;
}

interface AppSetting extends Modal {
  containerEl: HTMLElement;
  isOpen: boolean;
  doc: Document;
  openTabById(id: "hotkeys"): HotkeysTab;
  openTabById(id: string): SettingTab;
}

declare module 'obsidian' {
  interface App {
    setting: AppSetting;
  }
}