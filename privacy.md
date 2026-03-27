# PostSnap — Privacy Policy

**Last updated:** March 2026

## Summary

PostSnap is a 100% client-side Chrome extension. It does not collect, transmit, store, or share any user data. Period.

## Data Collection

PostSnap collects **no data whatsoever**. Specifically:

- **No personal information** — PostSnap does not ask for or access your name, email, account details, or any identifying information.
- **No browsing data** — PostSnap does not access your browsing history, bookmarks, saved passwords, cookies, or autofill data.
- **No analytics or tracking** — PostSnap does not include any analytics scripts, tracking pixels, telemetry, or usage monitoring of any kind.
- **No network requests** — PostSnap makes zero network requests. It does not communicate with any server, API, or third-party service. All processing happens entirely within your browser.

## Screenshots

Screenshots you capture with PostSnap are processed entirely on your device using the browser's built-in Canvas API. Screenshots are temporarily held in your browser's local IndexedDB storage solely to transfer them from the capture step to the editor tab. This data is cleared immediately after the editor loads. Screenshots are never transmitted anywhere.

When you download or copy a screenshot, the file is saved directly to your device or clipboard. PostSnap has no access to the file after export.

## Permissions

PostSnap requests the following Chrome permissions, each with a specific and limited purpose:

- **activeTab** — Allows PostSnap to capture a screenshot of the tab you are currently viewing, only when you explicitly trigger a capture action. PostSnap cannot access any tab you have not actively chosen to capture.
- **contextMenus** — Adds right-click menu options for quick capture access. This permission does not grant access to any page content.
- **scripting** — Allows PostSnap to inject the visual element/region selector overlay onto the current page when you choose Element or Region capture mode. The injected script only adds a visual overlay for selection and does not read, modify, or extract any page content.
- **host_permissions (all URLs)** — Required by Chrome for the scripting permission to function on any webpage. PostSnap uses this solely to inject the selector overlay and never accesses page content beyond what is captured in the screenshot.

## Third-Party Services

PostSnap uses **no third-party services**, libraries that phone home, CDNs, or external resources of any kind. The extension is fully self-contained.

## Data Storage

PostSnap uses browser-local IndexedDB exclusively for temporarily passing screenshot data between the capture and editor steps. This data is:

- Stored only on your device
- Never transmitted anywhere
- Automatically cleared after the editor loads
- Not accessible to any other extension, website, or process

## Children's Privacy

PostSnap does not collect any data from any user, including children under the age of 13.

## Changes to This Policy

If this privacy policy is updated, the changes will be reflected in the "Last updated" date above. Since PostSnap collects no data, meaningful policy changes are unlikely.

## Contact

If you have questions about this privacy policy, contact:

- GitHub: [github.com/AdnanTemur](https://github.com/AdnanTemur)