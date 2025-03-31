# Screen WakeLock Plugin

This is a plugin for [Obsidian](https://obsidian.md) that keeps the screen awake when in focus.

## Features

- Keeps the display awake while Obsidian is in the foreground.
- Simple and lightweight.
- Toggle WakeLock via command, mobile or status bar.
- Customizable settings to control notifications and status bar visibility.
- Available on all platforms.

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

Once the plugin is enabled, it will automatically keep your screen awake whenever Obsidian is in the foreground. A successful wake lock is indicated by a "WakeLock on." notification.

The functionality can be disabled through a hotkey, command or in the plugin settings page.

## Compatability

See: https://developer.mozilla.org/en-US/docs/Web/API/WakeLock#browser_compatibility

## Troubleshooting (iOS)

Due to only partial compatability, the plugin does not work flawlessly on iOS devices. However, there is a workaround in case the wake lock wont activate when starting the app.

If you're seeing the "WakeLock enabled!" but not followed by a "WakeLock on." try disabling and re-enabling the plugin one or two times. It should catch itself after that. Sadly, you have to do that dance every time the app is freshly loaded (not from suspension, if it works once, it will continue to work). Create a keyboard shortcut or configure your mobile toolbar for convenience.

## API Documentation

- Obsidian: https://github.com/obsidianmd/obsidian-api
- WakeLock: https://www.w3.org/TR/screen-wake-lock/
