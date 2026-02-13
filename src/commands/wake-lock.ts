import { debounce } from "obsidian";
import { Log } from "../utils/helper";

interface WakeLockEventMap {
  request: Event;
  release: Event;
  error: Event;
}

interface WakeLockEventTarget extends EventTarget {
  addEventListener<K extends keyof WakeLockEventMap>(
    type: K,
    listener: (ev: WakeLockEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void;
}

const TypedEventTarget = EventTarget as {
  new(): WakeLockEventTarget;
  prototype: WakeLockEventTarget;
};

export class ScreenWakeLock extends TypedEventTarget {
  private sentinel: WakeLockSentinel | null = null;

  constructor() {
    super();
  }

  public active() {
    return this.sentinel !== null;
  }

  /**
   * Request a new WakeLockSentinel from the wake lock API if none is currently active,
   * and store it for later release.
   */
  request = () => void this.internalRequestWakeLock();

  /**
   * Release currently active WakeLockSentinel
   */
  release = debounce(
    async () => {
      this.internalReleaseWakeLock();
    },
    500,
    true
  );

  private async internalRequestWakeLock() {
    if (this.sentinel === null || this.sentinel.released) {
      Log.d("requesting...");

      navigator.wakeLock
        .request("screen")
        .then(sentinel => {
          sentinel.addEventListener("release", this.onWakeLockReleased);
          this.sentinel = sentinel;
          this.dispatchEvent(new Event("request"));
        })
        .catch(err => {
          Log.e("Error requesting wake lock.", err);
          this.dispatchEvent(new Event("error"));
        });
    }
  }

  private internalReleaseWakeLock() {
    if (this.sentinel !== null && !this.sentinel.released) {
      void this.sentinel.release();
    }
  }

  private onWakeLockReleased = () => {
    Log.d("released!");
    this.sentinel = null;
    this.dispatchEvent(new Event("release"));
  };
}
