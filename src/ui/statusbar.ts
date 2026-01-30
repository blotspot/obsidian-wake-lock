import { setIcon } from "obsidian";

interface WakeLockEventMap {
	click: Event;
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
	new(): WakeLockEventTarget;
	prototype: WakeLockEventTarget;
};

export class WakeLockStatusBarItem extends TypedEventTarget {
	private el: HTMLElement;

	constructor(statusBarEl: HTMLElement) {
		super();
		this.el = statusBarEl;
		this.el.setAttribute("data-tooltip-position", "top");
		this.el.classList.add("mod-clickable");
		this.el.onClickEvent(() => {
			this.dispatchEvent(new Event("click"));
		});

		this.off();
	}

	setVisible(visible: boolean) {
		visible ? this.el.show() : this.el.hide();
	}

	on() {
		setIcon(this.el, "monitor-check");
		this.el.ariaLabel = "WakeLock: On";
	}

	off() {
		setIcon(this.el, "monitor");
		this.el.ariaLabel = "WakeLock: Off";
	}

	disabled() {
		setIcon(this.el, "monitor-x");
		this.el.ariaLabel = "WakeLock: Disabled";
	}
}
