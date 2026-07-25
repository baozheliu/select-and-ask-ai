import { t } from './i18n.js'

/**
 * AI 提供方注册表。
 *
 * 每个提供方描述“打开新对话”所需的地址与站点匹配规则，
 * 页面内的输入框定位、填入与发送逻辑在 src/content/adapters/ 中按提供方实现。
 * 展示名称与厂商名通过 i18n 本地化，此处 name/vendor 仅作回退。
 */
export const AI_PROVIDERS = Object.freeze([
  Object.freeze({
    id: 'chatgpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    newChatUrl: 'https://chatgpt.com/',
    hosts: Object.freeze(['chatgpt.com', 'chat.openai.com']),
    matches: Object.freeze(['https://chatgpt.com/*', 'https://chat.openai.com/*']),
    brandColor: '#10a37f',
    iconUrl: 'https://chatgpt.com/favicon.ico',
  }),
  Object.freeze({
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    newChatUrl: 'https://gemini.google.com/app',
    hosts: Object.freeze(['gemini.google.com']),
    matches: Object.freeze(['https://gemini.google.com/*']),
    brandColor: '#4285f4',
    iconUrl: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
  }),
  Object.freeze({
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    newChatUrl: 'https://claude.ai/new',
    hosts: Object.freeze(['claude.ai']),
    matches: Object.freeze(['https://claude.ai/*']),
    brandColor: '#d97757',
    iconUrl: 'https://claude.ai/images/claude_app_icon.png',
  }),
  Object.freeze({
    id: 'grok',
    name: 'Grok',
    vendor: 'xAI',
    newChatUrl: 'https://grok.com/',
    hosts: Object.freeze(['grok.com']),
    matches: Object.freeze(['https://grok.com/*']),
    brandColor: '#1d1d1f',
    iconUrl: 'https://grok.com/favicon.ico',
  }),
  Object.freeze({
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: '深度求索',
    newChatUrl: 'https://chat.deepseek.com/',
    hosts: Object.freeze(['chat.deepseek.com']),
    matches: Object.freeze(['https://chat.deepseek.com/*']),
    brandColor: '#4d6bfe',
    iconUrl: 'https://cdn.deepseek.com/chat/icon.png',
  }),
  Object.freeze({
    id: 'doubao',
    name: '豆包',
    vendor: '字节跳动',
    newChatUrl: 'https://www.doubao.com/chat/',
    hosts: Object.freeze(['www.doubao.com', 'doubao.com']),
    matches: Object.freeze(['https://www.doubao.com/*']),
    brandColor: '#5063f0',
    iconUrl: 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/logo-icon.png',
  }),
  Object.freeze({
    id: 'kimi',
    name: 'Kimi',
    vendor: '月之暗面',
    newChatUrl: 'https://www.kimi.com/',
    hosts: Object.freeze(['www.kimi.com', 'kimi.com', 'kimi.moonshot.cn']),
    matches: Object.freeze(['https://www.kimi.com/*', 'https://kimi.moonshot.cn/*']),
    brandColor: '#0a0a1f',
    iconUrl: 'https://www.kimi.com/favicon.ico',
  }),
])

const PROVIDER_BY_ID = new Map(AI_PROVIDERS.map(provider => [provider.id, provider]))

export const AI_PROVIDER_IDS = Object.freeze(AI_PROVIDERS.map(provider => provider.id))

export function getProviderById(providerId) {
  return PROVIDER_BY_ID.get(providerId) || null
}

export function isKnownProviderId(providerId) {
  return PROVIDER_BY_ID.has(providerId)
}

export function getProviderName(providerId) {
  const provider = PROVIDER_BY_ID.get(providerId)
  if (!provider) return providerId

  const localized = t(`providerName_${providerId}`)
  return localized === `providerName_${providerId}` ? provider.name : localized
}

export function getProviderVendor(providerId) {
  const provider = PROVIDER_BY_ID.get(providerId)
  if (!provider) return ''

  const localized = t(`providerVendor_${providerId}`)
  return localized === `providerVendor_${providerId}` ? provider.vendor : localized
}

export function findProviderByUrl(url) {
  let hostname = ''

  try {
    hostname = new URL(url).hostname
  } catch {
    return null
  }

  return AI_PROVIDERS.find(provider => provider.hosts.some(
    host => hostname === host || hostname.endsWith(`.${host}`),
  )) || null
}

export function getAllProviderMatches() {
  return AI_PROVIDERS.flatMap(provider => provider.matches)
}
