# 架构说明

Select & Ask AI 在模板的四层结构上实现：

1. `src/manifest.config.js`：按目标浏览器生成权限、入口页面和内容脚本注入规则。
2. `src/extension/`：扩展平台基础设施与后台业务模块。
3. `src/background/`、`src/content/`、`src/pages/`：运行环境入口。
4. `src/shared/`：纯函数与数据模型（无浏览器 API 依赖，页面与后台共用）。

## 一次快捷操作的执行流程

```text
用户在网页选中文字并点击右键菜单
  → background: contextMenus.onClicked（runtime.js）
  → task-runner.runQuickAction()
      1. 通过 activeTab + scripting 读取原始选中内容（保留换行）
      2. buildTaskPlan()：目标 AI × 每个 AI 的提问次数 = 标签页总数
      3. 超过 10 个标签页且未关闭提醒 → 在原网页注入确认弹窗
      4. composePrompt() 组装“处理要求 + 选中内容”
      5. 在当前窗口逐个创建后台标签页（绝不新建窗口）
      6. 任务登记到 storage.session（tabId → 任务）
  → 每个 AI 标签页加载后，内容脚本向后台领取任务（GET_TAB_TASK）
  → 对应适配器执行：等输入框 → 填入 → 发送 → 校验
  → 内容脚本上报结果（REPORT_TASK_RESULT）
  → task-runner 汇总进度，在原网页更新轻量提示；
    首个失败任务触发“复制问题到剪贴板”兜底
```

## 职责划分

- `extension/background/context-menus.js`：仅负责把快捷操作列表映射成右键菜单；每次快捷操作变更后由 runtime 触发重建。
- `extension/background/task-runner.js`：标签页任务的创建、登记、领取、超时与结果汇总。任务状态放在 `storage.session`，service worker 被回收后仍可恢复，且选中内容不会落盘。
- `extension/background/page-feedback.js`：所有需要注入原网页的能力（进度提示、执行前确认、读取选中内容、剪贴板复制）。注入函数必须自包含，不引用模块作用域。
- `src/content/adapters/`：每个 AI 一个适配器，独立声明新对话地址（在 `shared/providers.js`）、输入框定位、内容填入、自动发送、登录与成败判定。通用逻辑在 `adapters/base.js` 工厂中，站点差异只体现为配置与钩子。
- `src/shared/quick-actions.js`：快捷操作模型、规范化、任务计划计算（页面预览与后台执行共用同一套函数，保证 UI 显示与实际行为一致）。

## 不变式

- 新标签页始终在发起操作的窗口内以后台方式打开，不覆盖当前页、不新建窗口。
- 每次提问都打开提供方的“新对话”地址，保证是独立对话。
- 已终结（成功 / 失败 / 超时）的任务不会再次下发给内容脚本，杜绝重复发送。
- 单个任务失败只影响自身计数，不中断同一次执行中的其他任务。
- 选中内容原样传递：组装 prompt 时不修改、不截断；日志中不输出提问内容。

## 新增消息的步骤

1. 在 `src/extension/messaging.js` 的 `ExtensionMessage` 中新增消息名。
2. 如消息有 payload，给 `addRuntimeMessageHandlers()` 传入对应 validator。
3. 在接收端使用 `addRuntimeMessageHandlers()` 注册 handler。
4. 在发送端使用 `sendRuntimeMessage()` 或 `sendTabMessage()`。

## 新增 AI 提供方的步骤

1. `src/shared/providers.js`：注册 id、名称、`newChatUrl`、hosts 和 matches（matches 会自动进入 manifest 的内容脚本注入范围）。
2. `src/content/adapters/<id>.js`：用 `createAdapter()` 配置输入框选择器、发送按钮选择器、登录判定；必要时提供自定义 `fill` 钩子。
3. `src/content/adapters/index.js`：登记适配器。
4. `npm run check` 会校验内容脚本注入范围与提供方注册表一致。

## MV3 状态约定

- 持久配置（快捷操作、设置）→ `chrome.storage.local`。
- 进行中的标签页任务 → `chrome.storage.session`（含选中内容，浏览器关闭即清除）。
- 不把关键状态只放在 service worker 模块级变量里。

## 工程化检查

- `npm run validate:manifest`：校验权限最小化与内容脚本注入范围。
- `npm run check`：先校验 manifest，再执行生产构建。
