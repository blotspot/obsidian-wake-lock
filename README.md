# Screen WakeLock Plugin

This is a plugin for [Obsidian](https://obsidian.md) that keeps the screen awake when in focus.

## Features

- Keeps the display awake while Obsidian is in the foreground.
- Simple and lightweight.
- Toggle WakeLock via command or status bar.
- Customizable settings to control notifications and status bar visibility.

## Installation

1. Download the latest release from the [releases page](https://github.com/blotspot/obsidian-wake-lock/releases).
2. Unzip the downloaded file.
3. Copy the folder to your Obsidian plugins directory (usually located at `.obsidian/plugins`).
4. Enable the "Screen WakeLock" plugin from the Settings > Community Plugins menu in Obsidian.

## Usage

Once the plugin is enabled, it will automatically keep your screen awake whenever Obsidian is in the foreground.

The functionality can be disabled through a hotkey, command or in the plugin settings page.

## Compatability

See: https://developer.mozilla.org/en-US/docs/Web/API/WakeLock#browser_compatibility

## API Documentation

- Obsidian: https://github.com/obsidianmd/obsidian-api
- WakeLock: https://www.w3.org/TR/screen-wake-lock/
