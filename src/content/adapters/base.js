import {
  clickElement,
  delay,
  dispatchEnter,
  fillInput,
  queryVisible,
  readInputText,
  waitFor,
} from '../dom.js'

export const AdapterFailureReason = Object.freeze({
  notLoggedIn: 'NOT_LOGGED_IN',
  inputNotFound: 'INPUT_NOT_FOUND',
  fillFailed: 'FILL_FAILED',
  sendFailed: 'SEND_FAILED',
})

/** 所有站点通用的输入框兜底选择器，放在站点专属选择器之后 */
const GENERIC_INPUT_SELECTORS = Object.freeze([
  'div[contenteditable="true"][role="textbox"]',
  'textarea:not([readonly]):not([disabled])',
  'div[contenteditable="true"]',
])

/** 所有站点通用的发送按钮兜底选择器 */
const GENERIC_SEND_SELECTORS = Object.freeze([
  'button[aria-label*="Send" i]',
  'button[aria-label*="发送"]',
  'button[data-testid*="send" i]',
  'button[type="submit"]',
])

const INPUT_WAIT_TIMEOUT_MS = 45_000
const SEND_VERIFY_TIMEOUT_MS = 15_000

/**
 * 适配器工厂。每个 AI 提供方通过配置与可选钩子定义自己的行为：
 *
 * - inputSelectors      输入框选择器（按优先级）
 * - sendButtonSelectors 发送按钮选择器（按优先级）
 * - loginUrlPatterns    命中即判定“未登录”的地址正则
 * - loginIndicatorSelectors 页面上出现即判定“未登录”的元素选择器
 * - preferEnter         优先用回车发送（true 时先回车再尝试按钮）
 * - fill(element, text) 可选的自定义填入实现
 */
export function createAdapter({
  id,
  inputSelectors = [],
  sendButtonSelectors = [],
  loginUrlPatterns = [],
  loginIndicatorSelectors = [],
  preferEnter = false,
  fill = fillInput,
}) {
  function detectNotLoggedIn() {
    const href = location.href

    if (loginUrlPatterns.some(pattern => pattern.test(href))) {
      return AdapterFailureReason.notLoggedIn
    }

    if (loginIndicatorSelectors.length && queryVisible(loginIndicatorSelectors)) {
      return AdapterFailureReason.notLoggedIn
    }

    return null
  }

  function findInput() {
    return queryVisible([...inputSelectors, ...GENERIC_INPUT_SELECTORS])
  }

  function findSendButton() {
    return queryVisible([...sendButtonSelectors, ...GENERIC_SEND_SELECTORS])
  }

  async function waitForInput() {
    try {
      return await waitFor(findInput, {
        timeoutMs: INPUT_WAIT_TIMEOUT_MS,
        onTick: detectNotLoggedIn,
      })
    } catch (error) {
      if (error.aborted) return null
      throw error
    }
  }

  async function waitForInputCleared(inputElement) {
    const cleared = await waitFor(() => {
      // 发送后编辑器可能被框架重新渲染，每次都重新定位
      const currentInput = findInput() || inputElement
      return readInputText(currentInput).trim() === '' ? true : null
    }, { timeoutMs: SEND_VERIFY_TIMEOUT_MS, intervalMs: 400 })

    return cleared === true
  }

  /** 发送前重新定位输入框，避免持有已被替换的旧节点 */
  function currentInput(fallback) {
    return findInput() || fallback
  }

  async function trySendByButton() {
    const button = await waitFor(() => {
      const candidate = findSendButton()
      return candidate && !candidate.disabled && candidate.getAttribute('aria-disabled') !== 'true'
        ? candidate
        : null
    }, { timeoutMs: 5_000, intervalMs: 300 })

    if (!button) return false
    return clickElement(button)
  }

  function trySendByEnter(inputElement) {
    const target = currentInput(inputElement)
    if (!target) return false

    try {
      dispatchEnter(target)
      return true
    } catch {
      return false
    }
  }

  function trySendBySubmit(inputElement) {
    const form = currentInput(inputElement)?.closest?.('form')
    if (!form) return false

    try {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit()
      } else {
        form.submit()
      }
      return true
    } catch {
      return false
    }
  }

  async function send(inputElement) {
    const buttonAttempt = trySendByButton
    const enterAttempt = () => trySendByEnter(inputElement)
    const submitAttempt = () => trySendBySubmit(inputElement)

    const attempts = preferEnter
      ? [enterAttempt, buttonAttempt, submitAttempt]
      : [buttonAttempt, enterAttempt, submitAttempt]

    for (const attempt of attempts) {
      let attempted = false
      try {
        attempted = await attempt()
      } catch {
        attempted = false
      }
      if (!attempted) continue

      await delay(300)
      if (await waitForInputCleared(inputElement)) {
        return true
      }

      // 尝试失败但输入框内容也没了（如站点自行清空重建），
      // 无法确认状态时不再继续尝试，避免重复发送
      const remaining = readInputText(currentInput(inputElement)).trim()
      if (!remaining) {
        return true
      }
    }

    return false
  }

  return {
    id,

    /**
     * 执行一次提问任务。返回：
     * { ok: true } 或 { ok: false, reason: AdapterFailureReason }
     */
    async run({ prompt, autoSend }) {
      const loggedOutReason = detectNotLoggedIn()
      if (loggedOutReason) {
        return { ok: false, reason: loggedOutReason }
      }

      const inputElement = await waitForInput()
      if (!inputElement) {
        return {
          ok: false,
          reason: detectNotLoggedIn() || AdapterFailureReason.inputNotFound,
        }
      }

      // 输入框刚出现时页面脚本可能尚未就绪，稍等再填入；失败后重试一次
      await delay(600)

      let filled = false
      try {
        filled = await fill(inputElement, prompt)
      } catch {
        filled = false
      }

      if (!filled) {
        await delay(1_500)
        const retryInput = findInput() || inputElement
        try {
          filled = await fill(retryInput, prompt)
        } catch {
          filled = false
        }
      }

      if (!filled) {
        return { ok: false, reason: AdapterFailureReason.fillFailed }
      }

      if (!autoSend) {
        return { ok: true }
      }

      const sent = await send(inputElement)
      if (!sent) {
        // 发送失败时内容保留在输入框中，由后台负责剪贴板兜底提示
        return { ok: false, reason: AdapterFailureReason.sendFailed }
      }

      return { ok: true }
    },
  }
}
