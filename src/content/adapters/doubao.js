import { createAdapter } from './base.js'

export const doubaoAdapter = createAdapter({
  id: 'doubao',
  inputSelectors: [
    'textarea[data-testid="chat_input_input"]',
    'div[data-testid="chat_input"] textarea',
    'textarea[placeholder]',
  ],
  sendButtonSelectors: [
    'button[data-testid="chat_input_send_button"]',
    '#flow-end-msg-send',
  ],
  loginUrlPatterns: [
    /doubao\.com\/(login|passport)/i,
  ],
  loginIndicatorSelectors: [
    'button[data-testid="to_login_button"]',
    'div[data-testid="login_dialog"]',
  ],
})
