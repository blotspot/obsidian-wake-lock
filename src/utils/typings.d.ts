import { Modal } from "obsidian";

interface HotkeysTab {
  setQuery(value: string): void;
}

interface AppSetting extends Modal {
  openTabById(id: "hotkeys"): HotkeysTab;
}

declare module 'obsidian' {
  interface App {
    setting: AppSetting;
  }
}