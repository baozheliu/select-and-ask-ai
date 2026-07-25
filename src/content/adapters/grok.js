import { createAdapter } from './base.js'

export const grokAdapter = createAdapter({
  id: 'grok',
  inputSelectors: [
    'textarea[aria-label*="Grok" i]',
    'form textarea',
    'div[contenteditable="true"].tiptap',
  ],
  sendButtonSelectors: [
    'button[aria-label="Submit"]',
    'form button[type="submit"]',
  ],
  loginUrlPatterns: [
    /accounts\.x\.ai/i,
    /grok\.com\/(login|sign-in)/i,
  ],
  loginIndicatorSelectors: [
    'a[href*="/sign-in"]',
    'a[href*="/sign-up"]',
  ],
})
