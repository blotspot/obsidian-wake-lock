import { setIcon } from "obsidian";

interface WakeLockEventMap {
	click: Event;
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

const HIDE_CLASS = "screen-wake-lock-hide";

export class WakeLockStatusBarItem extends TypedEventTarget {
	private el: HTMLElement;

	constructor(statusBarItem: HTMLElement) {
		super();
		this.el = statusBarItem;
		this.el.classList.add("mod-clickable");
		this.el.onClickEvent(() => {
			this.dispatchEvent(new Event("click"));
		});

		this.switch(false);
	}

	setVisible(visible: boolean) {
		if (visible) {
			if (this.el.classList.contains(HIDE_CLASS)) {
				this.el.classList.remove(HIDE_CLASS);
			}
		} else {
			if (!this.el.classList.contains(HIDE_CLASS)) {
				this.el.classList.add(HIDE_CLASS);
			}
		}
	}

	switch(wakeLockActive: boolean) {
		setIcon(this.el, wakeLockActive ? "monitor-check" : "monitor-x");
		this.el.setAttribute("data-tooltip-position", "top");
		this.el.ariaLabel = `WakeLock: ${wakeLockActive ? "On" : "Off"}`;
	}
}
