# Obsidian WakeLock Plugin

This is a tniy plugin for [Obsidian](https://obsidian.md).

It's only purpose is to stop your device from dimming or locking the screen. Use it at your own leisure as an always active screen will impact your device battery.

## How it works

WakeLock is released whenever the Obsidian window or app isn't visible and will be requested whenever it is called back to front again.

The functionality can be disabled through a hotkey, command or in the plugin settings page. For mobile devices, the Command can be added to the mobile toolbar by going to `Settings > Toolbar > [Scroll down to bottom] > [Search for "Toggle WakeLock" in the "Add global command" search field]`. The command should then be added to your active toolbar options automatically.

## Manually installing the plugin

1. Head over to [Releases](https://github.com/blotspot/obsidian-wake-lock/releases/latest).
1. Download and unpack the zip file into `VaultFolder/.obsidian/plugins/` folder.
1. OR Download and copy `main.js`, `styles.css` and `manifest.json` to your vault `VaultFolder/.obsidian/plugins/wake-lock/`.

## Possible Updates

-   Allowing WakeLock only when a file is currently edited (actively focused).
    -   Subsequently, disable WakeLock to trigger through a frontmatter code
-   Added setting options (like, global WakeLock (current functionality) or editing WakeLock (see above))

## Compatability

See: https://developer.mozilla.org/en-US/docs/Web/API/WakeLock#browser_compatibility

## API Documentation

Obsidian: https://github.com/obsidianmd/obsidian-api
WakeLock: https://www.w3.org/TR/screen-wake-lock/
