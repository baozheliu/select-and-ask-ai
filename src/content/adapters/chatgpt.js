import { createAdapter } from './base.js'

export const chatgptAdapter = createAdapter({
  id: 'chatgpt',
  inputSelectors: [
    '#prompt-textarea',
    'div[contenteditable="true"].ProseMirror',
    'textarea[data-testid="prompt-textarea"]',
  ],
  sendButtonSelectors: [
    'button[data-testid="send-button"]',
    '#composer-submit-button',
    'button[data-testid="composer-send-button"]',
  ],
  loginUrlPatterns: [
    /auth\.openai\.com/i,
    /chatgpt\.com\/auth/i,
  ],
  loginIndicatorSelectors: [
    'button[data-testid="login-button"]',
    'button[data-testid="mobile-login-button"]',
  ],
})
