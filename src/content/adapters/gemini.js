import { createAdapter } from './base.js'

export const geminiAdapter = createAdapter({
  id: 'gemini',
  inputSelectors: [
    'rich-textarea .ql-editor',
    'div.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][aria-label]',
  ],
  sendButtonSelectors: [
    'button.send-button',
    'button[aria-label="Send message"]',
    'button[aria-label="发送消息"]',
    'button[mattooltip*="Send" i]',
  ],
  loginUrlPatterns: [
    /accounts\.google\.com/i,
  ],
  loginIndicatorSelectors: [
    'a[href*="accounts.google.com/ServiceLogin"]',
    'a[data-test-id="sign-in-button"]',
  ],
})
