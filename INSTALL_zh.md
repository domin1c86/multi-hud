# 在 Claude Code 中安装 multi-hud

`multi-hud` 是一个 Claude Code **状态栏** —— 一个小型程序，Claude Code 将其作为子进程运行，通过标准输入向它传入会话数据，并在终端底部打印你看到的 HUD 显示。安装分为两步：**构建**，然后在 `settings.json` 中**指向 Claude Code 的配置**。供应商的 API 密钥（用于余额/配额）是可选的第三步。

---

## 1. 前置条件

- **Node.js**（v18+）。状态栏通过 `node` 来启动，因此 Node 必须在 `PATH` 中。可以使用 `node --version` 检查。
- **Claude Code** 已安装并能正常工作。

## 2. 构建

在项目目录下执行：

```bash
npm install
npm run build
```

这会将 TypeScript 编译到 `dist/` 目录下。Claude Code 运行的入口文件是
`dist/index.js`。记下它的**绝对路径** —— 下一步需要用到它：

```bash
# 输出绝对路径，以便粘贴到 settings.json 中
node -e "console.log(require('path').resolve('dist/index.js'))"
```

## 3. 注册状态栏

Claude Code 的状态栏是通过 settings 文件来配置的，**不是**通过复制文件到插件目录来实现。在 `~/.claude/settings.json` 中添加一个 `statusLine` 代码块（如果文件不存在则创建它）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/multi-hud/dist/index.js",
    "padding": 0
  }
}
```

- 将路径替换为步骤 2 中获取的绝对路径。
- `type` 必须是 `"command"`；`command` 是 Claude Code 每次刷新时执行的 shell 命令。
- 在 **Windows** 上，JSON 中使用正斜杠或转义后的反斜杠，例如
  `"node C:/Users/you/multi-hud/dist/index.js"`。
- `padding` 为可选项（额外的水平间距；默认为 `0`）。

你也可以通过将相同的代码块放在某个项目的 `.claude/settings.json` 中而不是全局的 settings 文件里，来将其作用范围限制在单个项目中。

> 这是**手动**设置的 —— multi-hud 是一个预构建的程序，因此不使用 `/statusline` 命令（该命令会生成一个新的脚本）来安装它。

重启 Claude Code（或打开一个新的会话）。HUD 应该会出现在底部。

## 4. 供应商 API 密钥（可选）

开箱即用，HUD 会渲染 Claude Code 已经提供的一切 —— 模型、上下文栏、费用、git 以及速率限制配额条（仅 Pro/Max）—— **无需网络请求**。

要同时显示第三方供应商的**账户余额或套餐配额**，需要为 multi-hud 提供一个 API 密钥。首次运行时，它会在 `~/.claude/plugins/multi-hud/config.json` 创建配置文件；编辑对应的供应商代码块：

```json
{
  "providers": {
    "deepseek": { "apiKey": "sk-...", "baseUrl": null },
    "kimi":     { "apiKey": "sk-...", "baseUrl": null },
    "glm":      { "apiKey": "...",    "baseUrl": null }
  }
}
```

> **此密钥与将 Claude Code 路由到供应商所使用的密钥是分开的。** 要在 Claude Code 中*使用*第三方供应商，通常需要设置 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN` 环境变量。multi-hud **不会**获取到这些 —— 它会从其自身的 `config.json`（如上所示）中读取密钥。这两处可以使用相同的值，但必须在两处都进行设置。将 `baseUrl` 设置为 `null` 以使用各供应商的默认主机地址。

各供应商提供的信息：

| 供应商 | 余额 | 配额（时间窗口内） | 备注 |
|----------|:-------:|:---------------------:|-------|
| DeepSeek | ✅ | — | `GET api.deepseek.com/user/balance` |
| Kimi（月之暗面） | ✅ | — | `GET api.moonshot.cn/v1/users/me/balance` |
| GLM（智谱） | — | ✅ | 编程套餐配额 API |
| MiniMax | — | — | 暂无状态 API |
| MiMo | — | — | 暂无状态 API |

获取密钥的地址：[DeepSeek](https://platform.deepseek.com/) ·
[Kimi](https://platform.moonshot.cn/) · [GLM](https://open.bigmodel.cn/) ·
[MiniMax](https://platform.minimaxi.com/)。API 调用失败会静默处理 —— HUD 的其余部分仍然会正常渲染。

## 5. 验证

可以用 Claude Code 调用时相同的方式对构建的程序进行冒烟测试（通过标准输入传入一个示例事件）：

```bash
node dist/index.js < tests/fixtures/mock-statusline.json
```

你应该能看到带 ANSI 颜色渲染的状态行（模型、上下文栏、tokens、费用）。如果这里能正常工作，一旦完成第 3 步，HUD 就可以在 Claude Code 中正常使用了。

## 故障排除

| 现象 | 可能的原因 / 解决方法 |
|---------|--------------------|
| 完全没有状态栏 | `settings.json` 缺失或无效，或 `command` 路径错误。确认 JSON 可以正常解析，并且 `dist/index.js` 的绝对路径是正确的。 |
| 状态栏中显示 `node: command not found` | Node 不在 Claude Code 的 `PATH` 中。请使用 node 的绝对路径，例如 `/usr/local/bin/node ...`。 |
| 状态栏空白或报错 | 执行 `npm run build` 重新构建；重新执行第 5 步的冒烟测试来查看原始输出。 |
| 不显示余额或配额 | 未在 `config.json` 中设置 `apiKey`，或者该供应商没有此类 API（请参见上文表格）。 |
| 不显示配额条 | 时间窗口内的速率限制条仅来自 Claude Code（仅限 Claude.ai Pro/Max）或来自 GLM 的供应商 API。DeepSeek/Kimi 没有配额数据来源（仅显示余额）。 |

关于配置（主题、显示开关、自定义颜色），请参阅 README 中的 [配置](README.md#configuration) 部分。
