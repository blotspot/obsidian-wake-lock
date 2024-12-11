import { setIcon } from "obsidian";

export class WakeLockStatusBarItem {
	private el: HTMLElement;

	constructor(statusBarItem: HTMLElement) {
		this.el = statusBarItem;
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
