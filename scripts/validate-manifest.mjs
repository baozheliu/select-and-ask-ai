import assert from 'node:assert/strict'
import { ExtensionTarget, defineExtensionManifest } from '../src/manifest.config.js'
import { getAllProviderMatches } from '../src/shared/providers.js'

const targets = Object.values(ExtensionTarget)
const providerMatches = getAllProviderMatches()

function validateLeastPrivilege(manifest, target) {
  assert.equal(manifest.manifest_version, 3, `${target}: manifest_version must be 3`)
  assert.ok(Array.isArray(manifest.permissions), `${target}: permissions must be an array`)
  assert.ok(!manifest.host_permissions, `${target}: host_permissions should not be required`)

  for (const contentScript of manifest.content_scripts || []) {
    assert.ok(
      !contentScript.matches.includes('<all_urls>'),
      `${target}: content scripts must not match <all_urls>`,
    )

    for (const match of contentScript.matches) {
      assert.ok(
        providerMatches.includes(match),
        `${target}: content script match must map to a known AI provider: ${match}`,
      )
    }
  }

  for (const resourceGroup of manifest.web_accessible_resources || []) {
    assert.ok(
      !resourceGroup.matches?.includes('<all_urls>'),
      `${target}: web_accessible_resources must not expose assets to <all_urls>`,
    )
  }
}

function validateRequiredCapabilities(manifest, target) {
  for (const permission of ['contextMenus', 'storage', 'activeTab', 'scripting']) {
    assert.ok(
      manifest.permissions.includes(permission),
      `${target}: permission ${permission} is required`,
    )
  }

  if (target === ExtensionTarget.firefox) {
    assert.ok(!manifest.permissions.includes('tabGroups'), `${target}: tabGroups is Chromium-only`)
  } else {
    assert.ok(manifest.permissions.includes('tabGroups'), `${target}: tabGroups permission is required`)
  }

  assert.ok(manifest.background?.service_worker, `${target}: background service worker is required`)
  assert.ok(manifest.options_page, `${target}: options page is required`)
}

for (const target of targets) {
  const manifest = defineExtensionManifest({ target })

  validateLeastPrivilege(manifest, target)
  validateRequiredCapabilities(manifest, target)
}

console.log(`Validated extension manifests: ${targets.join(', ')}`)
