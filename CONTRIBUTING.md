# Contributing

感谢你对 Select & Ask AI 的兴趣。欢迎 Issue 与 Pull Request。

## 开发环境

- Node.js 18+（推荐 LTS）
- npm 9+

```bash
npm install
npm run dev
npm run check
```

在 Chrome / Edge 的扩展管理页加载 `dist/`（或 CRX/Vite 开发产物）进行验证。

## 提交前请确认

1. `npm run check` 通过（manifest 校验 + 生产构建）。
2. 变更范围尽量小，说明动机与影响面。
3. 不要提交密钥、token、本地路径或个人隐私数据。
4. 业务逻辑不要放进 `src/extension/`，该目录只放可复用的扩展基础设施。

提交标题建议遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
`feat:`、`fix:`、`docs:`、`refactor:`、`test:` 或 `chore:`，后接简洁的祈使句说明。

## Pull Request 建议

- 标题简洁说明改动目的。
- 描述中写清：解决什么问题、如何验证、是否影响多浏览器目标（Chrome / Edge / Firefox）。
- 若改动权限或 manifest，请说明原因，并尽量保持最小权限原则。

## 行为准则

参与本项目即表示你同意遵守 [Code of Conduct](./CODE_OF_CONDUCT.md)。
