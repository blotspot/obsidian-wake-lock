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

	setVisibility(visible: boolean) {
		if (visible) {
			this.el.style.display = "inherit";
		} else {
			this.el.style.display = "none";
		}
	}

	switch(wakeLockActive: boolean) {
		setIcon(this.el, wakeLockActive ? "monitor-check" : "monitor-x");
		this.el.setAttribute("data-tooltip-position", "top");
		this.el.ariaLabel = `WakeLock: ${wakeLockActive ? "On" : "Off"}`;
	}
}
