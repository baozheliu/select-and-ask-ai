import { createAdapter } from './base.js'

export const kimiAdapter = createAdapter({
  id: 'kimi',
  inputSelectors: [
    '[data-testid="msh-chatinput-editor"]',
    'div[contenteditable="true"].chat-input-editor',
    'div.chat-input div[contenteditable="true"]',
  ],
  sendButtonSelectors: [
    '[data-testid="msh-chatinput-send-button"]',
    'button.send-button',
  ],
  loginUrlPatterns: [
    /kimi\.(com|moonshot\.cn)\/(login|sign-?in)/i,
  ],
  loginIndicatorSelectors: [
    '[data-testid="msh-login-container"]',
    'div[class*="login-modal"]',
  ],
})
