import { t } from './i18n.js'

/**
 * 组装发送给 AI 的完整问题。
 *
 * 选中内容必须原样保留：不修改、不截断。
 */
export function composePrompt({
  instruction,
  selection,
  pageTitle = '',
  pageUrl = '',
  includePageTitle = false,
  includePageUrl = false,
}) {
  const sections = [
    t('promptInstruction', instruction),
    t('promptSelection', selection),
  ]

  const pageInfoLines = []
  if (includePageTitle && pageTitle) {
    pageInfoLines.push(t('promptPageTitle', pageTitle))
  }
  if (includePageUrl && pageUrl) {
    pageInfoLines.push(t('promptPageUrl', pageUrl))
  }

  if (pageInfoLines.length) {
    sections.push(pageInfoLines.join('\n'))
  }

  return sections.join('\n\n')
}
