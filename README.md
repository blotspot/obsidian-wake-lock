[![GitHub Release](https://img.shields.io/github/v/release/blotspot/obsidian-wake-lock?sort=semver)](https://github.com/blotspot/obsidian-wake-lock/releases/latest) [![GitHub Release](https://img.shields.io/github/v/release/blotspot/obsidian-wake-lock?include_prereleases&label=latest)](https://github.com/blotspot/obsidian-wake-lock/releases) [![License](https://img.shields.io/badge/license-GPL--3.0-purple.svg)](https://opensource.org/license/gpl-3-0)

# Cook Mode (Screen WakeLock) Plugin

This is a plugin for [Obsidian](https://obsidian.md) that ensures your screen stays awake while using the app. It leverages the [Screen Wake Lock API](https://www.w3.org/TR/screen-wake-lock/) to prevent your device from going to sleep, making it ideal for long writing or brainstorming sessions.

## Features

- **Keeps the display awake** while Obsidian is in the foreground.
- **Simple and lightweight** implementation with minimal impact on performance.
- **Multiple activation strategies**:
    - Always On: Keeps the screen awake as long as Obsidian is open.
    - Editor Focus: Activates only when the editor is in focus.
    - Editor Typing: Activates after five seconds of inactivity (while in the editor).
- **Customizable settings**:
    - Enable or disable the plugin with a toggle.
    - Choose your preferred activation strategy.
    - Show or hide the WakeLock status in the status bar.
    - Enable or disable notifications for WakeLock events.
    - Developer mode for debugging.
- **Cross-platform support**: Works on desktop and mobile platforms (with some limitations on iOS).
- **Hotkey and command palette integration** for quick toggling.
- **Status bar integration**: Displays the current WakeLock state.

## Installation

### From Github

1. Download the latest release from the [releases page](https://github.com/blotspot/obsidian-wake-lock/releases).
2. Unzip the downloaded file.
3. Copy the folder to your Obsidian plugins directory (usually located at `.obsidian/plugins`).
4. Enable the "Screen WakeLock" plugin from the Settings > Community Plugins menu in Obsidian.

### As beta plugin (using BRAT)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Community Plugins in Obsidian.
1. Open the command palette and run the command `BRAT: Add a beta plugin for testing`
1. Copy the project link (https://github.com/blotspot/obsidian-wake-lock) into the modal that opens up.
1. Make sure **Enable after installing the plugin** is checked
1. Click on **Add Plugin**

#### Updating

Beta plugins can be updated using the command palette by running the command `Check for updates to all beta plugins and UPDATE`. Optionally, beta plugins can be configured to auto-update when starting Obsidian. This feature can be enabled in the BRAT plugin settings tab.

## Usage

Once the plugin is enabled, it will automatically keep your screen awake whenever Obsidian is in the foreground. A successful wake lock is indicated by a "Cook Mode on." notification.

You can toggle the functionality through:

- A hotkey (configurable in Obsidian settings).
- The command palette (`Toggle Cook Mode`).
- The status bar icon (if enabled).

### Activation Strategies

- **Always On**: Keeps the screen awake as long as Obsidian is open.
- **Editor Focus**: Activates only when the editor is in focus.
- **Editor Typing**: Activates after five seconds of inactivity (while in the editor).

## Compatibility

See: [Browser Compatibility for the Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock#browser_compatibility).

### iOS Limitations

Due to partial compatibility, the plugin may not work flawlessly on iOS devices. If the wake lock does not activate when starting the app, try disabling and re-enabling the plugin one or two times. Once it works, it will continue to function until the app is restarted. For convenience, consider creating a keyboard shortcut or configuring your mobile toolbar.

## API Documentation

- Obsidian API: [https://github.com/obsidianmd/obsidian-api](https://github.com/obsidianmd/obsidian-api)
- Screen Wake Lock API: [https://www.w3.org/TR/screen-wake-lock/](https://www.w3.org/TR/screen-wake-lock/)
