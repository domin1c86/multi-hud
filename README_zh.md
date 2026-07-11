# multi-hud

简体中文 | [English](README.md)

Claude Code 状态栏插件，支持 DeepSeek、Kimi、GLM、MiniMax、MiMo 第三方中文 LLM 提供商的实时用量监控和成本估算。

灵感来自社区插件 [claude-hud](https://github.com/asilvadesigns/claude-hud)，针对第三方提供商的计费模式（API 按量计费 vs Coding Plan 时间窗口配额）进行了适配。

## 功能

- **上下文用量** — 实时显示当前对话已用上下文比例（进度条 + 百分比）
- **提供商配额监控** — 支持 5h / 24h / 7d / 30d 多窗口配额条（Coding Plan 模式）
- **Token 用量与费用** — 显示输入/输出 Token 数，内置定价表自动计算会话成本（¥）
- **多提供商支持** — DeepSeek、Kimi (Moonshot)、GLM (Zhipu)、MiniMax、MiMo，根据模型 ID 前缀自动探测
- **Git 状态** — 显示当前分支、未提交更改标记
- **多主题** — 内置 default、minimal、powerline、neon 四套主题，支持 hex 颜色自定义
- **动画效果** — 进度条支持 pulse、laser 动画（框架已就绪，渲染接入待完成）

## 安装

```bash
npm install
npm run build
```

### Claude Code 集成

```bash
# macOS / Linux
ln -s $(pwd)/dist/index.js ~/.claude/plugins/multi-hud/index.js

# Windows (PowerShell, 管理员)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\plugins\multi-hud\index.js" -Target "$(pwd)\dist\index.js"
```

## 配置

配置文件：`~/.claude/plugins/multi-hud/config.json`。首次运行自动创建。所有字段可选，未设置的使用默认值。

```json
{
  "providerOverride": null,
  "pollIntervalMs": 30000,
  "theme": "default",
  "customTheme": {},
  "animations": {
    "enabled": false,
    "defaultMode": "on-change",
    "defaultType": "pulse",
    "triggerThreshold": 5
  },
  "display": {
    "showGitStatus": true,
    "showTools": true,
    "showAgents": true,
    "showTodos": true,
    "showCost": true
  },
  "providers": {
    "deepseek": { "apiKey": "sk-xxx", "baseUrl": null },
    "kimi": { "apiKey": "sk-xxx", "baseUrl": null },
    "glm": { "apiKey": "sk-xxx", "baseUrl": null },
    "minimax": { "apiKey": "sk-xxx", "baseUrl": null },
    "mimo": { "apiKey": "", "baseUrl": null }
  }
}
```

### 配置项

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `providerOverride` | `string \| null` | `null` | 强制指定提供商，跳过自动探测 |
| `pollIntervalMs` | `number` | `30000` | 轮询提供商 API 间隔（毫秒） |
| `theme` | `string` | `"default"` | 主题：`default`、`minimal`、`powerline`、`neon` |
| `customTheme` | `object` | `{}` | 自定义主题覆盖，见下方 |
| `display.*` | `boolean` | `true` | 各状态行的显示开关 |

### 提供商 API

| 提供商 | 配额查询 | 余额查询 |
|--------|----------|----------|
| DeepSeek | — | ✅ |
| Kimi | — | ✅ |
| GLM | ✅ | — |
| MiniMax | — | — |
| MiMo | — | — |

只有配置了 API Key 的提供商才会尝试查询。API 调用失败静默返回空值。

## 主题

### 内置主题

| 主题 | 特点 |
|------|------|
| `default` | 默认彩色主题，提供商 Emoji 图标 |
| `minimal` | 极简无颜色，纯 ASCII 字符 |
| `powerline` | Powerline 风格，字母缩写 + 高对比度背景色 |
| `neon` | 霓虹高亮，更宽进度条 + 鲜艳真彩色 |

### 自定义主题

```json
{
  "theme": "default",
  "customTheme": {
    "colors": {
      "model": "#e91e63",
      "cost": "#4caf50"
    },
    "icons": {
      "deepseek": "🚀",
      "warning": "⚡"
    },
    "layout": {
      "compact": false,
      "showLabels": true,
      "barWidth": 12
    }
  }
}
```

颜色规格语法：`#RRGGBB`（前景色）、`[#RRGGBB]`（背景色）、`b#RRGGBB[#RRGGBB]`（加粗前景 + 背景）。仅指定前景时自动推导背景（2/3 亮度），反之亦然。

## 提供商 API Key 获取

- **DeepSeek** — [platform.deepseek.com](https://platform.deepseek.com/)
- **Kimi (Moonshot)** — [platform.moonshot.cn](https://platform.moonshot.cn/)
- **GLM (Zhipu)** — [open.bigmodel.cn](https://open.bigmodel.cn/)
- **MiniMax** — [platform.minimaxi.com](https://platform.minimaxi.com/)

## 开发

```bash
npm install        # 安装依赖
npm run dev        # 开发模式（自动编译）
npm test           # 运行所有测试
npm run test:watch # 持续测试
npm run build      # 构建
npm run lint       # ESLint
npm run format     # Prettier 格式化
```

## 许可证

MIT
