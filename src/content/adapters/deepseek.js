import { createAdapter } from './base.js'

export const deepseekAdapter = createAdapter({
  id: 'deepseek',
  inputSelectors: [
    'textarea#chat-input',
    'textarea[placeholder]',
  ],
  sendButtonSelectors: [
    'div[role="button"][aria-disabled="false"]:has(svg)',
    'button[type="submit"]',
  ],
  // DeepSeek 的发送控件是无障碍属性不稳定的自绘按钮，回车发送更可靠
  preferEnter: true,
  loginUrlPatterns: [
    /chat\.deepseek\.com\/sign_?in/i,
    /chat\.deepseek\.com\/login/i,
  ],
  loginIndicatorSelectors: [
    'div[class*="login"] input[type="text"]',
    'input[placeholder*="手机号"]',
    'input[placeholder*="邮箱"]',
  ],
})
