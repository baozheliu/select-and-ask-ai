import { createAdapter } from './base.js'

export const claudeAdapter = createAdapter({
  id: 'claude',
  inputSelectors: [
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"][aria-label*="prompt" i]',
    'fieldset div[contenteditable="true"]',
  ],
  sendButtonSelectors: [
    'button[aria-label="Send message"]',
    'button[aria-label="发送消息"]',
    'button[data-testid="send-button"]',
  ],
  loginUrlPatterns: [
    /claude\.ai\/login/i,
    /auth\.anthropic\.com/i,
  ],
  loginIndicatorSelectors: [
    'button[data-testid="login-with-google"]',
    'input[data-testid="login-email-input"]',
  ],
})
