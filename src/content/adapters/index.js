import { chatgptAdapter } from './chatgpt.js'
import { claudeAdapter } from './claude.js'
import { deepseekAdapter } from './deepseek.js'
import { doubaoAdapter } from './doubao.js'
import { geminiAdapter } from './gemini.js'
import { grokAdapter } from './grok.js'
import { kimiAdapter } from './kimi.js'

const ADAPTERS = new Map([
  chatgptAdapter,
  geminiAdapter,
  claudeAdapter,
  grokAdapter,
  deepseekAdapter,
  doubaoAdapter,
  kimiAdapter,
].map(adapter => [adapter.id, adapter]))

export function getAdapter(providerId) {
  return ADAPTERS.get(providerId) || null
}
