import { Log } from "./log";
import { debounce } from "obsidian";

interface WakeLockEventMap {
	request: Event;
	release: Event;
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

export class WakeLock extends TypedEventTarget {
	public isSupported = false;
	private wakeLock: WakeLockSentinel | null = null;

	constructor() {
		super();
		if ("wakeLock" in navigator) {
			this.isSupported = true;
		}
	}

	active = () => {
		return this.wakeLock !== null;
	};

	/**
	 * Request a new WakeLockSentinel from the wake lock API if none is currently active,
	 * and store it for later release.
	 */
	request = debounce(async () => {
		this.internalRequestWakeLock();
	}, 500);

	/**
	 * Release currently active WakeLockSentinel
	 */
	release = debounce(async () => {
		this.internalReleaseWakeLock();
	}, 500);

	private async internalRequestWakeLock() {
		if (
			this.isSupported &&
			(this.wakeLock === null || this.wakeLock.released)
		) {
			Log.d("requesting...");
			try {
				this.wakeLock = await navigator.wakeLock.request("screen");

				this.wakeLock.addEventListener(
					"release",
					this.onWakeLockReleased
				);

				this.dispatchEvent(new Event("request"));
			} catch (err) {
				// The Wake Lock request has failed - usually system related, such as battery.
				console.error(`${err.name}, ${err.message}`);
			}
		} else {
			Log.d("already requested.");
		}
	}

	private internalReleaseWakeLock() {
		if (this.wakeLock !== null && !this.wakeLock.released) {
			this.wakeLock.release();
		} else {
			Log.d("not requested or already released.");
		}
	}

	private onWakeLockReleased = () => {
		Log.d("released!");
		this.wakeLock = null;
		this.dispatchEvent(new Event("release"));
	};
}
