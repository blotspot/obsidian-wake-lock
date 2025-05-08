import { Log } from "./helper";
import { debounce, Platform } from "obsidian";

interface WakeLockEventMap {
	request: Event;
	release: Event;
	error: Event;
}

interface WakeLockEventTarget extends EventTarget {
	addEventListener<K extends keyof WakeLockEventMap>(
		type: K,
		listener: (ev: WakeLockEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean,
	): void;
}

const TypedEventTarget = EventTarget as {
	new (): WakeLockEventTarget;
	prototype: WakeLockEventTarget;
};

export class WakeLockHandler extends TypedEventTarget {
	public isSupported = false;
	private sentinel: WakeLockSentinel | null = null;

	constructor() {
		super();
		if ("wakeLock" in navigator) {
			this.isSupported = true;
		}
	}

	public active() {
		return this.sentinel !== null;
	}

	/**
	 * Request a new WakeLockSentinel from the wake lock API if none is currently active,
	 * and store it for later release.
	 */
	request = debounce(
		async () => {
			this.internalRequestWakeLock();
			// NOTE: wake-lock works better (only one reload) without suspension on iOS... idk why)
		},
		Platform.isIosApp ? 0 : 500,
		false,
	);

	/**
	 * Release currently active WakeLockSentinel
	 */
	release = debounce(
		async () => {
			this.internalReleaseWakeLock();
		},
		500,
		false,
	);

	private async internalRequestWakeLock() {
		if (this.isSupported && (this.sentinel === null || this.sentinel.released)) {
			Log.d("requesting...");

			navigator.wakeLock
				.request("screen")
				.then(sentinel => {
					sentinel.addEventListener("release", this.onWakeLockReleased);
					this.sentinel = sentinel;
					this.dispatchEvent(new Event("request"));
				})
				.catch(err => {
					Log.e(`${err.name}, ${err.message}`);
					this.dispatchEvent(new Event("error"));
				});
		} else {
			Log.d("already requested.");
		}
	}

	private internalReleaseWakeLock() {
		if (this.sentinel !== null && !this.sentinel.released) {
			this.sentinel.release();
		} else {
			Log.d("not requested or already released.");
		}
	}

	private onWakeLockReleased = () => {
		Log.d("released!");
		this.sentinel = null;
		this.dispatchEvent(new Event("release"));
	};
}
