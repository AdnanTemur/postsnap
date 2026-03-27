# PostSnap — Beautiful Screenshots, One Click

Capture, beautify, and share stunning screenshots directly from your browser. Add gradient backgrounds, window frames, shadows, text overlays, and export in multiple formats — all client-side, zero servers, zero tracking.

## Features

**4 Capture Modes**

- **Viewport** — Capture the visible browser area instantly
- **Element** — Click any element to capture it. Scroll wheel to expand/shrink selection to parent/child elements
- **Region** — Drag to select a custom area with live dimension display
- **Full Page** — Scroll-capture the entire page, automatically stitched together

**Beautifier Editor**

- 16 gradient presets + custom two-color gradients with direction control
- Solid color and transparent background options
- Adjustable padding (0–200px)
- Border radius control (0–40px)
- 6 window frames: macOS dark/light, browser dark/light, phone mockup
- 6 shadow presets (none, light, medium, heavy, glow, colored) + full custom control (blur, spread, opacity, color)
- 5 aspect ratio presets (free, 1:1, 16:9, 4:3, 9:16) — letterboxed, never squished
- Title text overlay with font, size, color, and position options
- Code screenshot themes: Dracula, One Dark, Monokai, GitHub, Nord
- "Made with PostSnap" watermark (toggleable)

**Export**

- PNG, JPEG, WebP formats
- Quality slider for lossy formats
- 1x, 2x, 3x resolution scaling for retina displays
- One-click copy to clipboard
- One-click download

**Extras**

- Keyboard shortcut: `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`)
- Right-click context menu integration
- Bold gradient dark UI with SVG icons throughout
- 100% client-side — no data leaves your browser

## Installation

### From Chrome Web Store

Search "PostSnap" on the Chrome Web Store or visit [link].

### Manual / Developer Install

1. Download or clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `postsnap` folder

## Usage

1. Click the PostSnap icon in your toolbar (or press `Ctrl+Shift+S`)
2. Choose a capture mode
3. The editor opens automatically with your screenshot
4. Customize background, frame, shadow, text, and export settings
5. Click **Download** or **Copy** to save your beautified screenshot

## Permissions Explained

PostSnap requests the minimum permissions required to function:

| Permission                      | Why It's Needed                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`                     | Capture the visible tab when you click a capture button. Only activates on the tab you're viewing — PostSnap cannot access other tabs.                |
| `contextMenus`                  | Add "PostSnap this element" and "PostSnap full page" to the right-click menu for quick access.                                                        |
| `scripting`                     | Inject the element/region selector overlay onto the current page when you choose Element or Region capture. Only runs when you explicitly trigger it. |
| `host_permissions (<all_urls>)` | Required for `scripting` to inject the selector on any webpage. PostSnap never reads page content — it only adds the visual selector overlay.         |

**PostSnap does NOT:**

- Collect, transmit, or store any personal data
- Access browsing history, bookmarks, or cookies
- Run background processes when not in use
- Communicate with any external server

## Tech Stack

- Manifest V3
- Vanilla JavaScript (no frameworks, no build step)
- Canvas API for rendering
- IndexedDB for screenshot transfer (no size limits)
- SVG icons throughout (no emoji, no icon libraries)

## File Structure

```
postsnap/
├── manifest.json          # Extension config
├── background.js          # Service worker: capture, context menu, full-page stitch
├── content/
│   ├── selector.js        # Element hover selector + region drag selector
│   └── selector.css       # Selector overlay styles
├── popup/
│   ├── popup.html         # Toolbar popup UI
│   └── popup.js           # Popup button handlers
├── editor/
│   ├── editor.html        # Beautifier editor page
│   ├── editor.css         # Editor styles (dark gradient theme)
│   └── editor.js          # Canvas render engine + all controls
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## License

MIT

## Credits

Built by [Adnan Temur](https://github.com/AdnanTemur).
