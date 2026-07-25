import { t } from '../../shared/i18n.js'
import { callExtensionApi, getExtensionApi } from '../browser/chrome-api.js'
import { createLogger } from '../logger.js'

const logger = createLogger('page-feedback')

/**
 * 注入原网页的反馈能力：轻量状态提示、执行前确认、选中内容读取、剪贴板兜底。
 *
 * 以下 pageXxx 函数会被序列化后在目标页面执行，必须完全自包含，
 * 不能引用模块作用域中的任何变量。
 */

function pageReadSelection() {
  return globalThis.getSelection?.().toString() || ''
}

function pageShowToast(runId, text, state) {
  const HOST_ID = 'select-ask-ai-toast-host'
  const isDark = matchMedia('(prefers-color-scheme: dark)').matches

  let host = document.getElementById(HOST_ID)
  if (!host) {
    host = document.createElement('div')
    host.id = HOST_ID
    host.style.cssText = [
      'position:fixed',
      'right:20px',
      'bottom:20px',
      'z-index:2147483647',
      'display:flex',
      'flex-direction:column',
      'gap:10px',
      'pointer-events:none',
      'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif',
    ].join(';')
    document.documentElement.appendChild(host)
  }

  const itemId = `select-ask-ai-toast-${runId}`
  let item = document.getElementById(itemId)
  if (!item) {
    item = document.createElement('div')
    item.id = itemId
    item.style.cssText = [
      'display:flex',
      'align-items:flex-start',
      'gap:10px',
      'max-width:340px',
      'padding:12px 16px',
      'border-radius:16px',
      `background:${isDark ? 'rgba(44,48,66,0.55)' : 'rgba(255,255,255,0.55)'}`,
      '-webkit-backdrop-filter:blur(12px) saturate(190%)',
      'backdrop-filter:blur(12px) saturate(190%)',
      `border:1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)'}`,
      `color:${isDark ? '#f5f5f7' : '#1d1d1f'}`,
      'font-size:13px',
      'line-height:1.55',
      `box-shadow:0 12px 36px rgba(0,0,0,${isDark ? '0.5' : '0.18'}),inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)'}`,
      'white-space:pre-line',
      'transition:opacity 0.3s ease,transform 0.3s ease',
    ].join(';')

    const dot = document.createElement('span')
    dot.className = 'select-ask-ai-toast-dot'
    dot.style.cssText = [
      'flex-shrink:0',
      'width:10px',
      'height:10px',
      'margin-top:5px',
      'border-radius:50%',
      'background:#0a84ff',
      'box-shadow:0 0 8px rgba(10,132,255,0.7)',
    ].join(';')

    const textNode = document.createElement('span')
    textNode.className = 'select-ask-ai-toast-text'

    item.appendChild(dot)
    item.appendChild(textNode)
    host.appendChild(item)
  }

  const dot = item.querySelector('.select-ask-ai-toast-dot')
  const textNode = item.querySelector('.select-ask-ai-toast-text')
  textNode.textContent = text

  const stateColors = {
    progress: ['#0a84ff', 'rgba(10,132,255,0.7)'],
    success: ['#34c759', 'rgba(52,199,89,0.7)'],
    warning: ['#ff9f0a', 'rgba(255,159,10,0.7)'],
    error: ['#ff453a', 'rgba(255,69,58,0.7)'],
  }
  const [dotColor, dotGlow] = stateColors[state] || stateColors.progress
  dot.style.background = dotColor
  dot.style.boxShadow = `0 0 8px ${dotGlow}`

  if (state !== 'progress') {
    const timerKey = '__selectAskAiToastTimer'
    if (item[timerKey]) clearTimeout(item[timerKey])
    item[timerKey] = setTimeout(() => {
      item.style.opacity = '0'
      item.style.transform = 'translateY(8px)'
      setTimeout(() => {
        item.remove()
        if (host && !host.childElementCount) host.remove()
      }, 320)
    }, 8000)
  }

  return true
}

function pageConfirmLargeRun(message, titleText, skipReminderText, cancelText, confirmText) {
  return new Promise(resolve => {
    const OVERLAY_ID = 'select-ask-ai-confirm-overlay'
    document.getElementById(OVERLAY_ID)?.remove()

    const isDark = matchMedia('(prefers-color-scheme: dark)').matches
    const textColor = isDark ? '#f5f5f7' : '#1d1d1f'
    const mutedColor = isDark ? 'rgba(235,235,245,0.62)' : 'rgba(60,60,67,0.62)'
    const glassBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)'

    const overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(15,23,42,0.35)',
      '-webkit-backdrop-filter:blur(8px)',
      'backdrop-filter:blur(8px)',
      'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif',
    ].join(';')

    const dialog = document.createElement('div')
    dialog.style.cssText = [
      'width:min(400px,90vw)',
      'padding:24px',
      'border-radius:24px',
      `background:${isDark ? 'rgba(44,48,66,0.62)' : 'rgba(255,255,255,0.62)'}`,
      '-webkit-backdrop-filter:blur(14px) saturate(190%)',
      'backdrop-filter:blur(14px) saturate(190%)',
      `border:1px solid ${glassBorder}`,
      `color:${textColor}`,
      'font-size:14px',
      'line-height:1.6',
      `box-shadow:0 24px 64px rgba(0,0,0,${isDark ? '0.55' : '0.25'}),inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)'}`,
    ].join(';')

    const title = document.createElement('div')
    title.textContent = titleText
    title.style.cssText = 'font-weight:700;font-size:16px;margin-bottom:8px;letter-spacing:-0.2px;'

    const body = document.createElement('div')
    body.textContent = message
    body.style.cssText = `margin-bottom:16px;white-space:pre-line;color:${mutedColor};`

    const skipLabel = document.createElement('label')
    skipLabel.style.cssText = `display:flex;align-items:center;gap:8px;margin-bottom:18px;cursor:pointer;font-size:13px;color:${mutedColor};`
    const skipCheckbox = document.createElement('input')
    skipCheckbox.type = 'checkbox'
    skipCheckbox.style.cssText = 'width:16px;height:16px;accent-color:#0a84ff;margin:0;'
    skipLabel.appendChild(skipCheckbox)
    skipLabel.appendChild(document.createTextNode(skipReminderText))

    const buttonRow = document.createElement('div')
    buttonRow.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;'

    function finish(confirmed) {
      overlay.remove()
      resolve({ confirmed, skipFuture: skipCheckbox.checked })
    }

    const cancelButton = document.createElement('button')
    cancelButton.textContent = cancelText
    cancelButton.style.cssText = [
      'padding:9px 18px',
      `border:1px solid ${glassBorder}`,
      'border-radius:999px',
      `background:${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'}`,
      `color:${textColor}`,
      'cursor:pointer',
      'font-size:14px',
      'font-weight:600',
      'font-family:inherit',
    ].join(';')
    cancelButton.addEventListener('click', () => finish(false))

    const confirmButton = document.createElement('button')
    confirmButton.textContent = confirmText
    confirmButton.style.cssText = [
      'padding:9px 18px',
      'border:0',
      'border-radius:999px',
      'background:linear-gradient(180deg,#0a84ff 0%,#0066d6 120%)',
      'color:#fff',
      'cursor:pointer',
      'font-size:14px',
      'font-weight:600',
      'font-family:inherit',
      'box-shadow:0 6px 16px rgba(10,132,255,0.4),inset 0 1px 0 rgba(255,255,255,0.35)',
    ].join(';')
    confirmButton.addEventListener('click', () => finish(true))

    overlay.addEventListener('click', event => {
      if (event.target === overlay) finish(false)
    })

    buttonRow.appendChild(cancelButton)
    buttonRow.appendChild(confirmButton)
    dialog.appendChild(title)
    dialog.appendChild(body)
    dialog.appendChild(skipLabel)
    dialog.appendChild(buttonRow)
    overlay.appendChild(dialog)
    document.documentElement.appendChild(overlay)

    confirmButton.focus()
  })
}

function pageCopyText(text) {
  function copyWithTextarea() {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.cssText = 'position:fixed;top:-1000px;opacity:0;'
    document.documentElement.appendChild(textarea)
    textarea.focus()
    textarea.select()

    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }

    textarea.remove()
    return copied
  }

  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch(() => copyWithTextarea())
  }

  return Promise.resolve(copyWithTextarea())
}

async function executeInTab(tabId, func, args, extensionApi) {
  const scripting = extensionApi.scripting
  if (!scripting?.executeScript) {
    throw new Error('scripting API is not available')
  }

  const results = await callExtensionApi(
    scripting.executeScript.bind(scripting),
    [{ target: { tabId }, func, args }],
    extensionApi,
  )

  return results?.[0]?.result
}

export function createPageFeedback({ extensionApi = getExtensionApi() } = {}) {
  return {
    async readSelection(tabId) {
      return await executeInTab(tabId, pageReadSelection, [], extensionApi) || ''
    },

    async showToast(tabId, runId, text, state = 'progress') {
      try {
        await executeInTab(tabId, pageShowToast, [runId, String(text), state], extensionApi)
      } catch (error) {
        // 原网页可能已关闭或不可注入，提示失败不影响任务执行
        logger.warn('Failed to show toast', error?.message)
      }
    },

    async confirmLargeRun(tabId, message, actionName) {
      try {
        const result = await executeInTab(
          tabId,
          pageConfirmLargeRun,
          [
            String(message),
            t('confirmActionTitle', actionName),
            t('confirmSkipReminder'),
            t('commonCancel'),
            t('confirmContinue'),
          ],
          extensionApi,
        )

        return {
          confirmed: result?.confirmed === true,
          skipFuture: result?.skipFuture === true,
        }
      } catch (error) {
        logger.warn('Failed to show confirm dialog', error?.message)
        // 无法弹出确认时保守处理：不执行
        return { confirmed: false, skipFuture: false }
      }
    },

    async copyText(tabId, text) {
      try {
        return await executeInTab(tabId, pageCopyText, [String(text)], extensionApi) === true
      } catch (error) {
        logger.warn('Failed to copy text to clipboard', error?.message)
        return false
      }
    },
  }
}
