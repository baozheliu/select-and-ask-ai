/**
 * 轻量 i18n 封装，基于浏览器扩展 chrome.i18n / browser.i18n。
 * 文案定义在 public/_locales/{en,zh_CN,zh_TW}/messages.json。
 */

function getI18nApi() {
  return globalThis.browser?.i18n || globalThis.chrome?.i18n || null
}

/**
 * @param {string} key
 * @param {string|number|Array<string|number>} [substitutions]
 * @returns {string}
 */
export function t(key, substitutions) {
  const api = getI18nApi()
  if (!api?.getMessage) return key

  let message = ''
  if (substitutions === undefined) {
    message = api.getMessage(key)
  } else {
    const values = Array.isArray(substitutions)
      ? substitutions.map(value => String(value))
      : [String(substitutions)]
    message = api.getMessage(key, values)
  }

  return message || key
}
