import { App, debounce, Debouncer, MarkdownView, Plugin } from "obsidian";
import { Strategy, WakeLockPluginSettingsData } from "settings";
import { Log } from "utils/helper";
import { ScreenWakeLock } from "./wake-lock";

export abstract class LockStrategy {
  wakeLock: ScreenWakeLock;
  protected plugin: Plugin;
  protected typeName!: string;
  private attached: boolean = false;

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock) {
    this.plugin = plugin;
    this.wakeLock = wakeLock;
  }

  get app(): App {
    return this.plugin.app;
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

  protected abstract allowRequest(): boolean;

  protected abstract requestWakeLock(): Debouncer<[], void>;
  protected abstract releaseWakeLock(): Promise<void>;
}

/**
 * Always on.
 */
export class SimpleStrategy extends LockStrategy {
  protected settingsWindowOpenedObserver: MutationObserver;
  protected settingsWindowOpened: boolean = false;

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock) {
    super(plugin, wakeLock);
    this.typeName = "SimpleStrategy";
    this.settingsWindowOpened = !!document.querySelector(".modal-container>.mod-settings");
    this.settingsWindowOpenedObserver = new MutationObserver((mutations, obs) => {
      if (mutations.some(m => m.type === "childList")) {
        this.handleSettingsWindowOpened();
      }
    });
  }

  enable(): void {
    this.attach();
    this.handleSettingsWindowOpened();
    this.requestWakeLock();
  }

  disable() {
    this.detach();
    void this.releaseWakeLock();
  }

  protected requestWakeLock = debounce(() => {
    if (this.allowRequest()) {
      this.requestInternal();
    } else {
      Log.d(`Wake lock strategy ${this.typeName} does not allow requesting wake lock at this moment.`);
      void this.releaseWakeLock();
    }
  }, 100, true);

  protected requestInternal() {
    this.wakeLock.request();
  }

  protected async releaseWakeLock() {
    if (this.wakeLock.active) {
      Log.d(`Wake lock release triggered by ${this.typeName}.`);
      this.requestWakeLock.cancel();
      await this.wakeLock.release();
    }
  }

  protected enableChangeWatchers() {
    this.plugin.registerDomEvent(document, "visibilitychange", this.onVisibilityChange);
    this.plugin.registerDomEvent(window, "focus", this.onFocus);
    this.plugin.registerDomEvent(window, "blur", this.onBlur);
    this.settingsWindowOpenedObserver.observe(document.body, { childList: true });
  }

  protected disableChangeWatchers() {
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("focus", this.onFocus);
    window.removeEventListener("blur", this.onBlur);
    this.settingsWindowOpenedObserver.disconnect();
  }

  protected allowRequest() {
    return !this.settingsWindowOpened;
  }

  /** checks if the settings modal is opened and requests or releases the wake lock accordingly */
  private handleSettingsWindowOpened() {
    if (document.querySelector(".modal-container>.mod-settings")) {
      if (!this.settingsWindowOpened) {
        this.settingsWindowOpened = true;
        void this.releaseWakeLock();
      }
    } else {
      if (this.settingsWindowOpened) {
        this.settingsWindowOpened = false;
        this.requestWakeLock();
      }
    }
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      Log.d("Document is visible, testing wake lock strategy...");
      this.requestWakeLock();
    } else {
      Log.d("Document is hidden.");
      void this.releaseWakeLock();
    }
  };

  private onFocus = () => {
    Log.d("Window focused, testing wake lock strategy...");
    this.requestWakeLock();
  }

  private onBlur = () => {
    Log.d("Window lost focus.");
    void this.releaseWakeLock();
  }
}

/**
 * Extended logic for SimpleStrategy:
 * 
 * Only activates when the front matter key "cook-mode" is set to true in active file.
 */
export class FrontmatterStrategy extends SimpleStrategy {

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock) {
    super(plugin, wakeLock);
    this.typeName = "FrontmatterStrategy";
  }

  protected enableChangeWatchers(): void {
    super.enableChangeWatchers();
    this.plugin.registerEvent(this.app.metadataCache.on("changed", this.onMetadataCacheChange));
  }

  protected disableChangeWatchers(): void {
    super.disableChangeWatchers();
    this.app.metadataCache.off("changed", this.onMetadataCacheChange);
  }

  protected allowRequest() {
    const file = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
    if (file) {
      const cookMode = this.app.metadataCache.getFileCache(file)?.frontmatter?.["cook-mode"] as boolean | string | undefined;
      return cookMode === true || (typeof cookMode === "string" && cookMode.toLowerCase() === "true");
    }
    return false;
  }

  private onMetadataCacheChange = () => {
    Log.d("Metadata cache changed, testing wake lock strategy...");
    this.requestWakeLock();
  }
}

/**
 * Extended logic for SimpleStrategy:
 * 
 * Only activates when editor is in focus.
 */
export class ActiveEditorViewStrategy extends SimpleStrategy {

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock) {
    super(plugin, wakeLock);
    this.typeName = "ActiveEditorViewStrategy";
  }

  protected enableChangeWatchers() {
    super.enableChangeWatchers();
    this.plugin.registerEvent(this.app.workspace.on("active-leaf-change", this.onActiveLeafChange));
  }

  protected disableChangeWatchers() {
    super.disableChangeWatchers();
    this.app.workspace.off("active-leaf-change", this.onActiveLeafChange);
  }

  protected allowRequest() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return !!view && super.allowRequest();
  }

  private onActiveLeafChange = () => {
    Log.d("Active leaf changed, testing wake lock strategy...");
    this.requestWakeLock();
  }
}

/**
 * Extended logic for ActiveEditorViewStrategy:
 * 
 * Activates after x seconds of typing inactivity. Only when editor is in focus.
 */
export class EditorTypingStrategy extends ActiveEditorViewStrategy {
  private delayedRequest;
  private delayedRequestStarted: boolean = false;

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock, delay: number) {
    super(plugin, wakeLock);
    this.typeName = "EditorTypingStrategy";

    this.delayedRequest = debounce(() => this.wakeLock.request(), delay * 1000, true);
    this.wakeLock.addEventListener("request", () => this.delayedRequestStarted = false);
  }

  protected enableChangeWatchers() {
    super.enableChangeWatchers();
    this.plugin.registerEvent(this.app.workspace.on("editor-change", this.onEditorChange));
  }

  protected disableChangeWatchers() {
    super.disableChangeWatchers();
    this.app.workspace.off("editor-change", this.onEditorChange);
  }

  protected requestInternal() {
    void this.releaseWakeLock()
    if (!this.delayedRequestStarted) {
      this.delayedRequestStarted = true;
      this.delayedRequest();
    }
  }

  protected async releaseWakeLock() {
    this.delayedRequest.cancel();
    this.delayedRequestStarted = false;
    await super.releaseWakeLock();
  }

  private onEditorChange = () => {
    Log.d("Editor changed, testing wake lock strategy...");
    this.requestWakeLock();
  }
}

/** Factory for lock strategies. */
export class LockStrategyFactory {
  static createStrategy(plugin: Plugin, strategy: Strategy, wakeLock: ScreenWakeLock, settings: WakeLockPluginSettingsData): LockStrategy {
    switch (strategy) {
      case Strategy.Always:
        return new SimpleStrategy(plugin, wakeLock);
      case Strategy.EditorActive:
        return new ActiveEditorViewStrategy(plugin, wakeLock);
      case Strategy.EditorTyping:
        return new EditorTypingStrategy(plugin, wakeLock, settings.wakeLockDelay);
      case Strategy.Frontmatter:
        return new FrontmatterStrategy(plugin, wakeLock);
    }
  }
}