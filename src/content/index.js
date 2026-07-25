import { createLogger } from '../extension/logger.js'
import {
  ExtensionMessage,
  createExtensionMessage,
  sendRuntimeMessage,
} from '../extension/messaging.js'
import { findProviderByUrl } from '../shared/providers.js'
import { getAdapter } from './adapters/index.js'

const logger = createLogger('content')

/**
 * AI 站点内容脚本入口。
 *
 * 页面加载后向后台询问本标签页是否有待执行的提问任务，
 * 有则交给对应站点的适配器执行，并上报结果。
 * 隐私要求：日志中不输出提问内容。
 */
async function main() {
  const provider = findProviderByUrl(location.href)
  if (!provider) return

  // service worker 冷启动时首次询问可能失败，稍候重试一次
  let task = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      task = await sendRuntimeMessage(createExtensionMessage(ExtensionMessage.getTabTask))
      break
    } catch (error) {
      logger.warn('Failed to fetch tab task', error?.message)
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 1_000))
      } else {
        return
      }
    }
  }

  if (!task) return

  const adapter = getAdapter(task.providerId || provider.id)
  if (!adapter) {
    logger.warn('No adapter for provider', task.providerId)
    return
  }

  logger.info('Running task for provider', adapter.id, 'autoSend:', task.autoSend)

  let result
  try {
    result = await adapter.run({ prompt: task.prompt, autoSend: task.autoSend })
  } catch (error) {
    logger.error('Adapter run crashed', adapter.id, error?.message)
    result = { ok: false, reason: 'SEND_FAILED' }
  }

  const report = createExtensionMessage(ExtensionMessage.reportTaskResult, {
    status: result.ok ? 'success' : 'failure',
    reason: result.ok ? null : result.reason,
  })

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await sendRuntimeMessage(report)
      return
    } catch (error) {
      logger.warn('Failed to report task result', error?.message)
      await new Promise(resolve => setTimeout(resolve, 1_000))
    }
  }
}

main()
