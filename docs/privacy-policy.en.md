# Select & Ask AI Privacy Policy

Last updated: July 19, 2026

Select & Ask AI is a browser extension. Its single purpose is to help users select text on a webpage and, through the context menu, send their instructions plus the selected text to the AI web apps they have enabled (for example ChatGPT, Gemini, Claude, Grok, DeepSeek, Doubao, and Kimi).

## Data We Process

Select & Ask AI processes and/or temporarily stores the following data locally in the user's browser:

- Extension preferences, such as the list of enabled AI providers, whether to group tabs created by the same ask, and whether onboarding has been completed.
- User-created quick actions, such as the action name, instruction text, target AI providers, ask counts per AI, and whether to attach the page title or page URL.
- Text the user actively selects and then triggers a quick action; optionally, if the user enables the related options, the current page title and page URL.
- Temporary task state needed to complete an ask (for example target tabs and send progress). In-progress tasks are kept in session storage so selected text is not persisted as long-term history.

This data is used to sync the context menu, restore preferences and quick actions, and, after a user-initiated action, fill and send the prompt to the chosen AI websites.

## Data Storage and Transfer

Select & Ask AI does not provide an account system or a developer-operated remote sync service. Preferences and quick actions are stored by default in the user's own browser local storage.

When the user actively chooses a quick action, the extension opens the official web app for each selected AI and fills in the composed prompt (instructions, selected text, and optionally the page title/URL if enabled). That content is delivered into the third-party AI website the user visits or is already signed into, and is governed by that website's own privacy policy and terms. The extension developer does not operate those AI services and does not relay prompts through a developer server.

Select & Ask AI does not upload selected text, page titles, URLs, quick actions, or settings to a developer server. Select & Ask AI does not sell user data and does not transfer user data to third parties for advertising, profiling, credit evaluation, or any purpose unrelated to the extension's single purpose.

The extension does not store AI account passwords; it reuses the login state the user already has on each AI website.

## Permission Usage

Select & Ask AI requests only the permissions necessary for this single purpose:

- `contextMenus`: Provides context-menu quick actions when text is selected.
- `storage`: Stores preferences and quick actions locally; uses session storage for in-progress task state.
- `activeTab`: After a user-initiated context-menu action, reads the selected text on the active tab and shows progress feedback on the original page.
- `scripting`: After a user-initiated action, injects the scripts needed to read the selection, show progress feedback, and copy the full prompt to the clipboard as a fallback if sending fails.
- `tabGroups`: When the user enables tab grouping, groups the tabs opened by the same ask.
- Host access (via content-script matches): Runs packaged content scripts only on supported official AI sites to fill and send prompts in new chat pages. The current scope includes official domains for ChatGPT, Gemini, Claude, Grok, DeepSeek, Doubao, and Kimi.

Select & Ask AI does not use remote JavaScript or remote Wasm. All executable scripts and runtime resources required by the extension are included in the extension package. Third-party site icons shown in the settings page may load from those sites' public icon URLs; that is not remote executable code.

## Data Retention and Deletion

Preferences and quick actions are stored locally in the user's browser. In-progress task state is kept in session storage and is generally not retained long-term after the browser session ends. Users can clear related data through the extension settings, the browser extension management page, or the browser's site/extension data management features. When Select & Ask AI is uninstalled, the browser generally removes the local data stored by the extension.

Content already sent to a third-party AI website is retained or deleted according to the user's account and that website's policies. Users can manage their conversation history on those websites.

## Children's Privacy

Select & Ask AI is intended for general users. It does not intentionally collect children's personally identifiable information, health information, financial information, authentication information, personal communications, or precise location. Text that users actively select and send may contain any content; the extension does not collect additional data specifically from children.

## Policy Changes

If Select & Ask AI's data processing practices materially change, this privacy policy will be updated and the latest version will be made available on the extension store listing or the corresponding public page.

## Contact

For questions about this privacy policy or Select & Ask AI's data processing practices, please contact the developer through the support channel on the store listing or via the project repository Issues: https://github.com/baozheliu/select-and-ask-ai/issues
