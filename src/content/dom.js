/** 内容脚本通用 DOM 工具：等待、可见性、填入与发送的底层实现。 */

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isVisible(element) {
  if (!element) return false
  if (element.disabled) return false

  const rects = element.getClientRects()
  if (!rects.length) return false

  const style = getComputedStyle(element)
  return style.visibility !== 'hidden' && style.display !== 'none'
}

export function queryVisible(selectors, root = document) {
  for (const selector of selectors) {
    let elements = []
    try {
      elements = root.querySelectorAll(selector)
    } catch {
      continue
    }

    for (const element of elements) {
      if (isVisible(element)) return element
    }
  }

  return null
}

/**
 * 轮询等待条件成立。checker 返回真值即结束；onTick 可用于中途判定失败。
 */
export async function waitFor(checker, {
  timeoutMs = 30_000,
  intervalMs = 500,
  onTick = null,
} = {}) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const result = checker()
    if (result) return result

    const abortReason = onTick?.()
    if (abortReason) {
      const error = new Error(abortReason)
      error.aborted = true
      throw error
    }

    await delay(intervalMs)
  }

  return null
}

export function isTextareaLike(element) {
  return element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement
}

export function readInputText(element) {
  if (!element) return ''
  return isTextareaLike(element) ? element.value : (element.textContent || '')
}

function setNativeValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype

  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter) {
    setter.call(element, value)
  } else {
    element.value = value
  }
}

function fillTextarea(element, text) {
  element.focus()
  setNativeValue(element, text)
  element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function selectAllContent(element) {
  const selection = getSelection()
  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
}

function fillContentEditableByExecCommand(element, text) {
  element.focus()
  selectAllContent(element)

  try {
    return document.execCommand('insertText', false, text)
  } catch {
    return false
  }
}

function fillContentEditableByPaste(element, text) {
  element.focus()
  selectAllContent(element)

  try {
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', text)
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer,
    })
    element.dispatchEvent(pasteEvent)
    return true
  } catch {
    return false
  }
}

function fillContentEditableByDom(element, text) {
  element.focus()
  element.textContent = ''

  const lines = text.split('\n')
  lines.forEach((line, index) => {
    element.appendChild(document.createTextNode(line))
    if (index < lines.length - 1) {
      element.appendChild(document.createElement('br'))
    }
  })

  element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }))
}

function normalizeForComparison(text) {
  return text.replace(/\s+/g, ' ').trim()
}

export function inputContainsText(element, text) {
  const current = normalizeForComparison(readInputText(element))
  const expected = normalizeForComparison(text)

  if (!expected) return true
  // 富文本编辑器可能改写空白字符，用规整后的头尾片段判断填入是否成功
  const head = expected.slice(0, 40)
  const tail = expected.slice(-40)
  return current.includes(head) && current.includes(tail)
}

/**
 * 把文本填入输入框。依次尝试多种策略，直到校验通过。
 * 返回 true 表示填入成功。
 */
export async function fillInput(element, text) {
  if (isTextareaLike(element)) {
    fillTextarea(element, text)
    await delay(120)
    return inputContainsText(element, text)
  }

  fillContentEditableByExecCommand(element, text)
  await delay(120)
  if (inputContainsText(element, text)) return true

  fillContentEditableByPaste(element, text)
  await delay(200)
  if (inputContainsText(element, text)) return true

  fillContentEditableByDom(element, text)
  await delay(120)
  return inputContainsText(element, text)
}

export function dispatchEnter(element) {
  const eventInit = {
    bubbles: true,
    cancelable: true,
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
  }

  element.focus()
  element.dispatchEvent(new KeyboardEvent('keydown', eventInit))
  element.dispatchEvent(new KeyboardEvent('keypress', eventInit))
  element.dispatchEvent(new KeyboardEvent('keyup', eventInit))
}

export function clickElement(element) {
  try {
    element.click()
    return true
  } catch {
    return false
  }
}
