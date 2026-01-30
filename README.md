# Obsidian Markdown to HTML Plugin

A simple [Obsidian](https://obsidian.md) plugin to copy notes as HTML to the clipboard.

## What it does

### Copy as HTML

1. Converts the Markdown content of a note to HTML (either selected text or entire document) using Obsidian's markdown renderer.
   - Should work with all other plugins that add content to your note, like DataView (please keep in mind that all css classes that are not explixitly set in the config will be removed)
1. Cleans up the HTML from the clutter obsidian likes to add
   - Removes all atrributes from tags (a list of attributes to keep can be configured in the settings)
   - Removes all classes (a list of classes to keep can be configured in the settings)
   - Converts internal images into base64 strings
   - Removes empty paragraphs (leftovers from comment blocks, for example)
1. Saves the resulting HTML to the clipboard.

> [!NOTE]  
> This plugin doesn't generate a full HTML page and I don't intend to add that feature.

### Copy as Text

1. Copies a full note **without** any frontmatter to the clipboard.
1. Can be also used on partially selected text, but it will be nothing more than a normal copy

## Tested on

- Desktop (tested on Windows and Linux)
- iOS
- Android

> [!TIP]
> **On Android:**
> Paste contents through the context menu of the text field and not through the keyboard copy option, since that method doesn't cut off the string after a certain amount of characters.

## Installation

### From Github

1. Download the latest release from the [releases page](https://github.com/blotspot/obsidian-markdown2html/releases).
2. Unzip the downloaded file.
3. Copy the folder to your Obsidian plugins directory (usually located at `.obsidian/plugins`).
4. Enable the "Copy Markdown to HTML" plugin from the Settings > Community Plugins menu in Obsidian.

### As beta plugin (using BRAT)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Community Plugins in Obsidian.
1. Open the command palette and run the command `BRAT: Add a beta plugin for testing`
1. Copy the project link (https://github.com/blotspot/obsidian-markdown2html) into the modal that opens up.
1. Make sure **Enable after installing the plugin** is checked
1. Click on **Add Plugin**

#### Updating

Beta plugins can be updated using the command palette by running the command `Check for updates to all beta plugins and UPDATE`. Optionally, beta plugins can be configured to auto-update when starting Obsidian. This feature can be enabled in the BRAT plugin settings tab.

## Usage

1. Open the command palette (default is `Ctrl+P` or `Cmd+P`) and search for **"markdown2html"**.
2. Select **Copy as HTML** OR **Copy as Text** to save your current selection, or if nothing is selected, the full file to the clipboard.

## API Documentation

- Obsidian: https://github.com/obsidianmd/obsidian-api
