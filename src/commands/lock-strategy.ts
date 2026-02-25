import { debounce, Debouncer, MarkdownView, Plugin } from "obsidian";
import { Log } from "utils/helper";
import { ScreenWakeLock } from "./wake-lock";

export abstract class LockStrategy {
  wakeLock: ScreenWakeLock;
  protected plugin: Plugin;
  protected typeName: string;
  private attached: boolean = false;

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock) {
    this.plugin = plugin;
    this.wakeLock = wakeLock;
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
  protected abstract releaseWakeLock(): void;
}

/**
 * Always on.
 */
export class SimpleStrategy extends LockStrategy {
  constructor(plugin: Plugin, wakeLock: ScreenWakeLock) {
    super(plugin, wakeLock);
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

  protected requestWakeLock = debounce(() => {
    if (this.allowRequest()) {
      Log.d(`Wake lock request triggered by ${this.typeName}.`);
      this.requestInternal();
    } else {
      this.releaseWakeLock();
    }
  }, 100, true);

  protected requestInternal() {
    this.wakeLock.request();
  }

  protected releaseWakeLock() {
    Log.d(`Wake lock release triggered by ${this.typeName}.`);
    this.requestWakeLock.cancel();
    this.wakeLock.release();
  }

  protected enableChangeWatchers() {
    this.plugin.registerDomEvent(document, "visibilitychange", this.onVisibilityChange);
    this.plugin.registerDomEvent(window, "focus", this.onFocus);
    this.plugin.registerDomEvent(window, "blur", this.onBlur);
  }

  protected disableChangeWatchers() {
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("focus", this.onFocus);
    window.removeEventListener("blur", this.onBlur);
  }

  protected allowRequest() { return true }

  private onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      Log.d("Document is visible, requesting wake lock.");
      this.requestWakeLock();
    } else {
      Log.d("Document is hidden, releasing wake lock.");
      this.releaseWakeLock();
    }
  };

  private onFocus = () => {
    Log.d("Window focused, requesting wake lock.");
    this.requestWakeLock();
  }

  private onBlur = () => {
    Log.d("Window lost focus, releasing wake lock.");
    this.releaseWakeLock();
  }
}

/**
 * Extended logic for SimpleStrategy:
 * 
 * Only activates when editor is in focus.
 */
export class ActiveEditorViewStrategy extends SimpleStrategy {
  protected settingsWindowOpenedObserver: MutationObserver;
  protected settingsWindowOpened: boolean = false;

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock) {
    super(plugin, wakeLock);
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
    this.plugin.registerEvent(this.plugin.app.workspace.on("active-leaf-change", this.onActiveLeafChange));
    this.settingsWindowOpenedObserver.observe(document.body, { childList: true });
  }

  protected disableChangeWatchers() {
    super.disableChangeWatchers();
    this.plugin.app.workspace.off("active-leaf-change", this.onActiveLeafChange);
    this.settingsWindowOpenedObserver.disconnect();
  }

  protected allowRequest() {
    const view = this.plugin?.app?.workspace?.getActiveViewOfType(MarkdownView);
    return !!view && !this.settingsWindowOpened;
  }

  private onActiveLeafChange = () => {
    Log.d("Active leaf changed, requesting wake lock if it's an editor view.");
    this.requestWakeLock();
  }

  /** checks if the settings modal is opened and requests or releases the wake lock accordingly */
  private handleSettingsWindowOpened() {
    if (document.querySelector(".modal-container>.mod-settings")) {
      if (!this.settingsWindowOpened) {
        this.settingsWindowOpened = true;
        this.releaseWakeLock();
      }
    } else {
      if (this.settingsWindowOpened) {
        this.settingsWindowOpened = false;
        this.requestWakeLock();
      }
    }
  }
}

/**
 * Extended logic for ActiveEditorViewStrategy:
 * 
 * Activates after x seconds of typing inactivity. Only when editor is in focus.
 */
export class EditorTypingStrategy extends ActiveEditorViewStrategy {
  private requestDelayed;
  private requestInProgress: boolean = false;

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock, delay: number) {
    super(plugin, wakeLock);
    this.typeName = "EditorTypingStrategy";

    this.requestDelayed = debounce(() => this.wakeLock.request(), delay * 1000, true);
    this.wakeLock.addEventListener("request", () => this.requestInProgress = false);
  }

  protected enableChangeWatchers() {
    super.enableChangeWatchers();
    this.plugin.app.workspace.on("editor-change", this.onEditorChange);
  }

  protected disableChangeWatchers() {
    super.disableChangeWatchers();
    this.plugin.app.workspace.off("editor-change", this.onEditorChange);
  }

  protected requestInternal() {
    if (!this.requestInProgress) {
      this.requestInProgress = true;
      this.requestDelayed();
    }
  }

  protected releaseWakeLock() {
    this.requestDelayed.cancel();
    super.releaseWakeLock();
  }

  private onEditorChange = () => {
    Log.d("Editor changed, requesting wake lock.");
    this.requestWakeLock();
  }
}
