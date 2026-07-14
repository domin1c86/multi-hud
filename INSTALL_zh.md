# 在 Claude Code 中安装 multi-hud

`multi-hud` 是一个 Claude Code **状态栏（status line）** —— 一个由 Claude Code 作为子进程运行的程序，它通过 stdin 接收会话数据，并在终端底部打印你看到的 HUD。

有两种安装方式：**插件**流程（推荐）或**手动** `settings.json` 流程（用于本地开发，或如果你不想使用插件系统）。

---

## 选项 A — 作为插件安装（推荐）

```
/plugin marketplace add domin1c86/multi-hud
/plugin install multi-hud
```

然后接入状态栏并（可选地）选择你的功能：

```
/multi-hud:setup          # 将 statusLine 条目写入你的 settings.json（会创建备份）
/multi-hud:configure      # 切换 git/tools/agents/todos/cost、主题、动画、API 密钥
```

`/multi-hud:setup` 会检测已安装的插件路径，并将 `node "<path>/dist/index.js"` 注册为你的状态栏。**之后请完全退出并重启 Claude Code**。插件更新后请重新运行 `/multi-hud:setup`，因为安装路径会随每个版本而变化。

> 插件附带预构建的 `dist/` 目录且无运行时依赖，因此无需构建 —— 只需 `PATH` 中有 `node`（18+）即可。

如需稍后配置功能，只需再次运行 `/multi-hud:configure`，或直接编辑 `~/.claude/plugins/multi-hud/config.json`（参见 [配置](README_zh.md#配置)）。

---

## 选项 B — 手动安装（开发 / 本地）

如果你克隆了仓库并希望在不使用插件系统的情况下直接运行，请使用此选项。

### 1. 前置条件

- **Node.js**（v18+）。状态栏通过 `node` 启动，因此 Node 必须在你的 `PATH` 中。使用 `node --version` 检查。
- **Claude Code** 已安装且可正常运行。

### 2. 构建

从项目目录运行：

```bash
npm install
npm run build
```

这会将 TypeScript 编译到 `dist/`。Claude Code 运行的入口点是 `dist/index.js`。记下它的**绝对路径** —— 下一步会用到：

```bash
# 打印要粘贴到 settings.json 中的绝对路径
node -e "console.log(require('path').resolve('dist/index.js'))"
```

### 3. 注册状态栏

Claude Code 状态栏在你的设置文件中进行配置，**而非**通过将文件复制到插件目录。在 `~/.claude/settings.json` 中添加 `statusLine` 块（如果文件不存在则创建）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/multi-hud/dist/index.js",
    "padding": 0
  }
}
```

- 将路径替换为第 2 步中的绝对路径。
- `type` 必须为 `"command"`；`command` 是 Claude Code 每次刷新时运行的 shell 命令。
- 在 **Windows** 上，JSON 中使用正斜杠或转义的反斜杠，例如 `"node C:/Users/you/multi-hud/dist/index.js"`。
- `padding` 是可选的（额外的水平间距；默认为 `0`）。

你也可以将相同的块放入某个项目的 `.claude/settings.json` 中，而非你的主目录设置，从而将其限定于单个项目。

> 这是**手动**设置的 —— multi-hud 是一个预构建的程序，因此 `/statusline` 命令（用于生成新脚本）不用于安装它。

重启 Claude Code（或打开新会话）。HUD 应出现在底部。

---

以下章节适用于**两种**安装方法。

## 服务商 API 密钥（可选）

开箱即用时，HUD 会渲染 Claude Code 已提供的所有内容 —— 模型、上下文条、成本、Git 和速率限制配额条（仅限 Pro/Max）—— **不进行任何网络调用**。

若要同时显示第三方服务商的**账户余额或套餐配额**，请向 multi-hud 提供 API 密钥。插件用户可以运行 `/multi-hud:configure` 并在那里输入；否则请编辑 `~/.claude/plugins/multi-hud/config.json`（首次运行时创建）并设置匹配的提供商块：

```json
{
  "providers": {
    "deepseek": { "apiKey": "sk-...", "baseUrl": null },
    "kimi":     { "apiKey": "sk-...", "baseUrl": null },
    "glm":      { "apiKey": "...",    "baseUrl": null }
  }
}
```

> **此密钥与用于将 Claude Code 路由到该服务商的密钥是分开的。** 要在 Claude Code 中*使用*第三方服务商，你通常需要在环境中设置 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN`。multi-hud **看不到**这些 —— 它从上述自己的 `config.json` 中读取密钥。两者可以是相同的值，但你必须在两处都进行设置。将 `baseUrl` 保留为 `null` 以使用每个服务商的默认主机。

各服务商的公开信息：

| 服务商 | 余额 | 配额（时间窗口） | 备注 |
|----------|:-----:|:---------------:|-------|
| DeepSeek | ✅ | — | `GET api.deepseek.com/user/balance` |
| Kimi (Moonshot) | ✅ | — | `GET api.moonshot.cn/v1/users/me/balance` |
| GLM (Zhipu) | — | ✅ | 编码套餐配额 API |
| MiniMax | — | — | 尚无状态 API |
| MiMo | — | — | 尚无状态 API |

获取密钥地址：[DeepSeek](https://platform.deepseek.com/) ·
[Kimi](https://platform.moonshot.cn/) · [GLM](https://open.bigmodel.cn/) ·
[MiniMax](https://platform.minimaxi.com/)。API 调用失败时会静默处理 —— HUD 的其余部分仍会渲染。

## 验证

以 Claude Code 调用它的相同方式对入口点进行冒烟测试（通过 stdin 输入示例事件）。从仓库检出目录运行：

```bash
node dist/index.js < tests/fixtures/mock-statusline.json
```

你应该看到渲染好的、带 ANSI 颜色的状态栏（模型、上下文条、令牌数、成本）。如果这能正常工作，一旦状态栏注册完毕，HUD 就能在 Claude Code 内正常工作。

## 故障排除

| 症状 | 可能原因 / 修复 |
|---------|--------------------|
| 完全没有状态栏 | `settings.json` 缺失/无效，或 `command` 路径错误。确认 JSON 可解析且 `dist/index.js` 的绝对路径正确。 |
| 插件更新后无状态栏 | 安装路径随每个版本变化 —— 重新运行 `/multi-hud:setup` 以重写绝对路径。 |
| 状态栏中出现 `node: command not found` | Node 不在 Claude Code 的 `PATH` 中。使用绝对 node 路径，例如 `/usr/local/bin/node ...`。 |
| 状态栏空白/报错 | 使用 `npm run build` 重新构建；重新运行验证冒烟测试以查看原始输出。 |
| 未显示余额或配额 | `config.json` 中未设置 `apiKey`，或该服务商无此类 API（见上表）。 |
| 无配额条 | 时间窗口化的速率限制条仅来自 Claude Code（仅限 Claude.ai Pro/Max），或来自 GLM 的服务商 API。DeepSeek/Kimi 无配额来源（仅余额）。 |

有关配置（主题、显示开关、自定义颜色），请参阅 README 的 [配置](README_zh.md#配置) 章节。