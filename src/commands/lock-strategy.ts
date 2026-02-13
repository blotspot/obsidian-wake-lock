import { debounce, MarkdownView, Plugin } from "obsidian";
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

  protected abstract requestWakeLock(): void;
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

  protected enableChangeWatchers() {
    this.plugin.registerDomEvent(document, "visibilitychange", this.requestLockOnVisibleDocument);
    this.plugin.registerDomEvent(window, "focus", this.requestLockOnVisibleDocument);
    this.plugin.registerDomEvent(window, "orientationchange", this.requestLockOnVisibleDocument);
  }

  protected disableChangeWatchers() {
    document.removeEventListener("visibilitychange", this.requestLockOnVisibleDocument);
    window.removeEventListener("focus", this.requestLockOnVisibleDocument);
    window.removeEventListener("orientationchange", this.requestLockOnVisibleDocument);
  }

  protected requestWakeLock() {
    this.wakeLock.request();
  }

  protected releaseWakeLock(): void {
    this.wakeLock.release();
  }

  private requestLockOnVisibleDocument = () => {
    if (document.visibilityState === "visible") {
      this.requestWakeLock();
    } else {
      this.releaseWakeLock(); // this should be handled automagically by the system.
    }
  };
}

/**
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

    this.plugin.registerEvent(this.plugin.app.workspace.on("active-leaf-change", this.requestWakeLock));
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
 * Activates after x seconds of inactivity.
 *
 * Only when editor is in focus.
 */
export class EditorTypingStrategy extends ActiveEditorViewStrategy {
  private requestDelayed;

  constructor(plugin: Plugin, wakeLock: ScreenWakeLock, delay: number) {
    super(plugin, wakeLock);
    this.typeName = "EditorTypingStrategy";
    this.requestDelayed = debounce(() => this.wakeLock.request(), delay * 1000, true);
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
      this.wakeLock.release();
      this.requestDelayed();
    } else {
      this.releaseWakeLock();
    }
  };

  protected releaseWakeLock(): void {
    this.requestDelayed.cancel();
    super.releaseWakeLock();
  }
}
