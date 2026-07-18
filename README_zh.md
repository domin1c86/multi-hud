# multi-hud

README_zh.md | English

一款 Claude Code 状态栏插件，用于实时监控中国大语言模型服务商的使用情况与成本估算：DeepSeek、Kimi、GLM、MiniMax 和 MiMo。

灵感源自社区插件 [claude-hud](https://github.com/asilvadesigns/claude-hud)，针对第三方服务商计费模式（API 按量付费 vs Coding Plan 时间窗口配额）进行了适配。

## 功能特性

- **上下文使用率** — 实时上下文窗口填充情况（进度条 + 百分比）
- **服务商配额监控** — 多窗口配额条：5小时 / 24小时 / 7天 / 30天（Coding Plan 模式）
- **令牌用量与成本** — 输入/输出令牌计数，配合内置价目表自动计算成本（¥）
- **多服务商支持** — DeepSeek、Kimi（Moonshot）、GLM（Zhipu）、MiniMax、MiMo；根据模型 ID 前缀自动识别
- **Git 状态** — 当前分支及脏状态指示器
- **主题** — 内置默认、简约、Powerline 和霓虹主题；支持通过十六进制颜色自定义
- **动画效果** — 脉冲（亮度变化）和激光（扫光）进度条动画，`always`（持续）或 `on-change`（变化时）模式；通过 `animations.enabled` 选择性开启

## 安装

以 Claude Code 插件形式安装，随后运行设置命令：

```
/plugin marketplace add domin1c86/multi-hud
/plugin install multi-hud
/multi-hud:setup          # 在 settings.json 中注册状态栏
/multi-hud:configure      # （可选）切换显示元素、主题、动画
```

运行 `/multi-hud:setup` 后请完全重启 Claude Code。如需手动 `settings.json` 配置方式（开发/本地使用）、服务商 API 密钥设置及故障排查，请参阅 **INSTALL.md**。

## 配置

配置文件：`~/.claude/plugins/multi-hud/config.json`。首次运行时自动创建。所有字段均为可选 —— 缺失值将回退至默认值。

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

### 配置项说明

| 键 | 类型 | 默认值 | 描述 |
|-----|------|---------|-------------|
| `providerOverride` | `string \| null` | `null` | 强制指定服务商，绕过自动检测 |
| `pollIntervalMs` | `number` | `30000` | 服务商 API 轮询间隔（毫秒） |
| `theme` | `string` | `"default"` | 主题：`default`、`minimal`、`powerline` 或 `neon` |
| `customTheme` | `object` | `{}` | 主题覆盖（见下文） |
| `display.*` | `boolean` | `true` | 切换各状态栏显示 |

### 服务商 API 支持

| 服务商 | 配额轮询 | 余额轮询 |
|----------|---------------|-----------------|
| DeepSeek | — | 是 |
| Kimi | — | 是 |
| GLM | 是 | — |
| MiniMax | — | — |
| MiMo | — | — |

仅对已配置 API 密钥的服务商发起查询。API 调用失败时将静默处理。

## 主题

### 内置主题

| 主题 | 描述 |
|-------|-------------|
| `default` | 多彩风格，带服务商 Emoji 图标 |
| `minimal` | 无颜色，纯 ASCII 字符 |
| `powerline` | Powerline 风格，字母缩写 + 高对比度背景 |
| `neon` | 霓虹高亮，加宽进度条 + 鲜艳真彩 |

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

颜色语法规范：`#RRGGBB`（前景色），`[#RRGGBB]`（背景色），`b#RRGGBB[#RRGGBB]`（粗体前景色 + 背景色）。仅指定前景色时，背景色按 2/3 亮度推导（反之亦然，按 1.5 倍亮度推导）。

## 动画

进度条（上下文 + 配额）支持动画效果。动画**默认关闭** —— 请在 `config.json` 的 `animations` 项下启用：

```json
{
  "animations": {
    "enabled": true,
    "defaultMode": "on-change",
    "defaultType": "pulse",
    "triggerThreshold": 5
  }
}
```

- `defaultType` — `pulse`（填充亮度起伏）或 `laser`（高亮光斑扫过填充区域）。主题可为单个进度条覆盖此效果。
- `defaultMode` — `always`（持续动画）或 `on-change`（当进度条数值跳跃幅度至少达到 `triggerThreshold` 个百分点时，动画约 1.5 秒）。
- `triggerThreshold` — 触发 `on-change` 模式的跳跃幅度（百分比）。

由于状态栏是无状态的子进程，Claude Code 在每次刷新时重新运行它，因此每次调用仅根据挂钟时间渲染单帧 —— 动画推进速度取决于 Claude Code 更新状态栏的频率，而非固定帧率。

## 服务商 API 密钥

- **DeepSeek** — [platform.deepseek.com](https://platform.deepseek.com/)
- **Kimi (Moonshot)** — [platform.moonshot.cn](https://platform.moonshot.cn/)
- **GLM (Zhipu)** — [open.bigmodel.cn](https://open.bigmodel.cn/)
- **MiniMax** — [platform.minimaxi.com](https://platform.minimaxi.com/)

## 开发

```bash
npm install        # 安装依赖
npm run dev        # 调试模式 (tsc --watch)
npm test           # 运行所有测试
npm run test:watch # 监视模式 (vitest)
npm run build      # 构建
npm run lint       # ESLint
npm run format     # Prettier
```

## 许可证

MIT