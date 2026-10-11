# TagsToolGR

A Thunderbird add-on for applying or clearing tags on selected emails. Targets Thunderbird 140 and newer using Manifest V3 and built-in MailExtension APIs.

## Use

- Select one or more messages and click **TagsToolGR** on the unified toolbar. If needed, add the button using the toolbar's Customize command.
- Check multiple existing tags and click **Apply tags**. This adds your choices while keeping each message's other tags.
- Choose **Replace all existing tags** to replace each message's tags with exactly your choices.
- **Clear all tags** immediately leaves selected messages untagged. It does not create a blank tag or delete Thunderbird's tag definitions.
- Right-click messages → **TagsToolGR** → **Add tag**, **Choose tags…**, or **Clear all tags**. Choose tags opens a small picker window for multiple tags or replacement.

The selection is captured when the picker opens and expires after one hour. It includes messages in collapsed threads as returned by Thunderbird. Large selections are collected across all API pages before updates begin. Context actions use the actual right-click target. Failed messages are reported individually (up to three error descriptions); other messages continue processing. Operations run in the background if the toolbar popup closes. Successful direct context-menu actions update tags without opening a dialog.

## Install for testing

Download `tagstoolgr-0.1.0.xpi` from the [v0.1.0 release](https://github.com/KayhanB21/tagstoolgr/releases/tag/v0.1.0). Local builds are written to `dist/`.

In Thunderbird, open Add-ons and Themes → gear menu → Install Add-on From File, then choose the XPI. Alternatively, open Tools → Developer Tools → Debug Add-ons → Load Temporary Add-on and select `manifest.json`.

## Development

No third-party runtime or build dependencies. Node.js 20+ and Python 3 are sufficient.

```sh
npm test
npm run check
npm run package
```

Packaging includes only the manifest, JavaScript, popup, and icons. No account data, email bodies, external services, or analytics are used. `messagesRead` reads selection/message tag metadata, `messagesUpdate` changes tags, `messagesTagsList` lists existing tag definitions, `menus` adds message context actions, and `storage` holds temporary message IDs/results in memory until Thunderbird or the add-on restarts.

## Icon

The supplied original is preserved as `Parthenon.jpg`. `assets/parthenon-master.png` is the square photo adaptation made with the built-in image generation tool; `icons/parthenon-*.png` contains stripped, compressed PNGs at 16, 24, 32, 48, 64, 96, and 128 pixels. The manifest uses these sizes for toolbar and add-on icons. Source photos and the large master are excluded from the XPI.

Editing prompt: “Tightly reframe around the temple, preserving its architecture, stone, camera angle and blue sky; reduce excess sky and foreground; enhance contrast and clarity for small icons; no lettering, border, or badge.”

## Validation and remaining checks

Automated unit tests cover pagination, deduplication, add/replace/clear semantics, deleted tags, empty selections, and partial failures. A browser smoke test with mocked Thunderbird APIs checked multi-select, Apply, Replace, Clear, and layout overflow. This is not live Thunderbird integration validation.

Before release, test in Thunderbird 140 and a current release with local and IMAP folders: one/many messages, more than 100 selected messages, collapsed threads, a right-click outside the active selection, tag creation/rename/deletion while enabled, multiple windows, no tags, no selection, and moved or unavailable messages. Verify light/dark appearance and keyboard navigation. The build has not been submitted to the Thunderbird add-ons site.

API references: [tag definitions](https://webextension-api.thunderbird.net/en/mv3/messages.tags.html), [message updates](https://webextension-api.thunderbird.net/en/mv3/messages.html), [selection](https://webextension-api.thunderbird.net/en/mv3/mailTabs.html), [context menus](https://webextension-api.thunderbird.net/en/mv3/menus.html).

## License

Source code is licensed under the [Mozilla Public License 2.0](LICENSE). The supplied Parthenon photograph and derived image assets are excluded from this source-code license; no separate image license has been established.
