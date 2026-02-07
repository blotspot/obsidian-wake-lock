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
  new (): WakeLockEventTarget;
  prototype: WakeLockEventTarget;
};

export class ScreenWakeLock extends TypedEventTarget {
  private static handler: ScreenWakeLock | null = null;
  private sentinel: WakeLockSentinel | null = null;

  public static getInstance() {
    if (this.handler === null) {
      this.handler = new ScreenWakeLock();
    }
    return this.handler;
  }

  private constructor() {
    super();
  }

  public active() {
    return this.sentinel !== null;
  }

  static DEBOUNCE_DELAY = 0;

  /**
   * Request a new WakeLockSentinel from the wake lock API if none is currently active,
   * and store it for later release.
   */
  request = debounce(
    async () => {
      void this.internalRequestWakeLock();
      // NOTE: wake-lock works better (only one reload) without suspension on iOS... idk why)
    },
    ScreenWakeLock.DEBOUNCE_DELAY,
    true
  );

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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          Log.e(`${err.name}, ${err.message}`);
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
