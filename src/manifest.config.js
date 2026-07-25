import { CONTENT_SCRIPT_MATCHES, EXTENSION_PAGES } from './extension/config.js'

export const ExtensionTarget = Object.freeze({
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
})

const DEFAULT_TARGET = ExtensionTarget.chrome
const CHROMIUM_TARGETS = new Set([
  ExtensionTarget.chrome,
  ExtensionTarget.edge,
])

function normalizeTarget(target = DEFAULT_TARGET) {
  return Object.values(ExtensionTarget).includes(target) ? target : DEFAULT_TARGET
}

function createContentScripts() {
  return [
    {
      matches: CONTENT_SCRIPT_MATCHES,
      js: ['src/content/index.js'],
      run_at: 'document_idle',
    },
  ]
}

export function defineExtensionManifest({
  target = DEFAULT_TARGET,
} = {}) {
  const normalizedTarget = normalizeTarget(target)
  const isChromium = CHROMIUM_TARGETS.has(normalizedTarget)

  const manifest = {
    manifest_version: 3,
    name: '__MSG_extName__',
    version: '0.1.2',
    description: '__MSG_extDescription__',
    default_locale: 'zh_CN',
    action: {
      default_title: '__MSG_extName__',
      default_popup: EXTENSION_PAGES.popup,
      default_icon: {
        16: 'assets/icons/icon16.png',
        32: 'assets/icons/icon32.png',
        48: 'assets/icons/icon48.png',
        128: 'assets/icons/icon128.png',
      },
    },
    icons: {
      16: 'assets/icons/icon16.png',
      32: 'assets/icons/icon32.png',
      48: 'assets/icons/icon48.png',
      128: 'assets/icons/icon128.png',
    },
    permissions: [
      // 右键菜单入口
      'contextMenus',
      // 保存快捷操作与设置；session 区域保存进行中的标签页任务
      'storage',
      // 用户在页面上发起右键操作后，读取选中内容并展示执行状态提示
      'activeTab',
      'scripting',
      // 可选的“标签页分组”设置（仅 Chromium 支持）
      ...(isChromium ? ['tabGroups'] : []),
    ],
    background: {
      service_worker: 'src/background/index.js',
      type: 'module',
    },
    content_scripts: createContentScripts(),
    options_page: EXTENSION_PAGES.options,
  }

  return manifest
}
