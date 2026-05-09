# multi-hud

Claude Code 状态栏插件，支持 DeepSeek、Kimi、GLM、MiniMax 等第三方中文 LLM 提供商的实时用量监控。

灵感来自社区插件 [claude-hud](https://github.com/asilvadesigns/claude-hud)，但针对第三方提供商的计费模式（API 按量计费 vs Coding Plan 时间窗口配额）进行了适配。

## 功能

- **上下文用量条** — 实时显示当前对话已用上下文比例
- **提供商配额监控** — 支持 5h / 24h / 7d / 30d 多窗口配额条（Coding Plan 模式）
- **Token 用量统计** — 显示输入/输出 Token 数（API 模式）
- **费用估算** — 基于定价配置实时计算当前对话成本
- **工具/Agent/Todo 追踪** — 解析 Claude Code 的 transcript 事件，显示活跃工具、运行中 Agent 和待办事项
- **Git 状态** — 显示当前分支、是否有未提交更改、ahead/behind
- **多主题系统** — 内置 default、minimal、powerline、neon 四套主题，支持深度自定义颜色和图标
- **动画效果** — 进度条支持 pulse、laser 等动画模式
- **自动探测提供商** — 根据模型 ID 前缀自动选择对应适配器（如 `deepseek-chat` → DeepSeek）

## 安装

```bash
npm install
npm run build
```

## Claude Code 集成

将构建产物配置为 Claude Code 的 statusline 插件：

```bash
# macOS/Linux
ln -s $(pwd)/dist/index.js ~/.claude/plugins/multi-hud/index.js

# Windows (PowerShell, 管理员)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\plugins\multi-hud\index.js" -Target "$(pwd)\dist\index.js"
```

然后在 Claude Code 的配置中启用插件（具体方式取决于 Claude Code 的插件加载机制）。

## 配置

配置文件路径：`~/.claude/plugins/multi-hud/config.json`

首次运行时插件会自动创建配置目录。所有配置项都有默认值，只需覆盖你想修改的部分即可。

### 完整配置示例

```json
{
  "providerOverride": null,
  "pollIntervalMs": 30000,
  "theme": "default",
  "customTheme": {},
  "animations": {
    "enabled": true,
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
  "pricing": {
    "currency": "CNY",
    "models": {
      "deepseek-chat": { "input": 0.001, "output": 0.002 },
      "deepseek-coder": { "input": 0.001, "output": 0.002 },
      "kimi-latest": { "input": 0.003, "output": 0.006 },
      "glm-4": { "input": 0.005, "output": 0.005 },
      "minimax-text-01": { "input": 0.001, "output": 0.001 }
    }
  },
  "providers": {
    "deepseek": { "apiKey": "your-deepseek-api-key", "baseUrl": null },
    "kimi": { "apiKey": "your-kimi-api-key", "baseUrl": null },
    "glm": { "apiKey": "your-glm-api-key", "baseUrl": null },
    "minimax": { "apiKey": "your-minimax-api-key", "baseUrl": null }
  }
}
```

### 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `providerOverride` | `string \| null` | `null` | 强制指定提供商，跳过自动探测。可选值：`deepseek`、`kimi`、`glm`、`minimax` |
| `pollIntervalMs` | `number` | `30000` | 轮询提供商 API 的间隔（毫秒） |
| `theme` | `string` | `"default"` | 主题名称，可选：`default`、`minimal`、`powerline`、`neon` |
| `customTheme` | `object` | `{}` | 自定义主题覆盖，见下方「自定义主题」 |
| `animations.enabled` | `boolean` | `true` | 是否启用动画 |
| `animations.defaultMode` | `string` | `"on-change"` | 动画触发模式：`always`（始终播放）或 `on-change`（变化时播放） |
| `animations.defaultType` | `string` | `"pulse"` | 默认动画类型：`pulse`、`laser`、`none` |
| `animations.triggerThreshold` | `number` | `5` | 触发动画的变化阈值（百分比） |
| `display.showGitStatus` | `boolean` | `true` | 是否显示 Git 状态 |
| `display.showTools` | `boolean` | `true` | 是否显示工具调用状态 |
| `display.showAgents` | `boolean` | `true` | 是否显示 Agent 运行状态 |
| `display.showTodos` | `boolean` | `true` | 是否显示待办事项 |
| `display.showCost` | `boolean` | `true` | 是否显示费用估算 |
| `pricing.currency` | `string` | `"CNY"` | 货币符号 |
| `pricing.models` | `object` | 见默认值 | 各模型的输入/输出单价（每 1K Token） |
| `providers.*.apiKey` | `string` | `""` | 对应提供商的 API Key |
| `providers.*.baseUrl` | `string \| null` | `null` | 自定义 API 基础地址，留空使用默认值 |

## 提供商 API Key 获取

- **DeepSeek**: [DeepSeek Open Platform](https://platform.deepseek.com/)
- **Kimi (Moonshot)**: [Moonshot AI](https://platform.moonshot.cn/)
- **GLM (Zhipu)**: [Zhipu AI](https://open.bigmodel.cn/)
- **MiniMax**: [MiniMax](https://platform.minimaxi.com/)

将获取到的 API Key 填入配置文件的对应 `providers.*.apiKey` 字段即可。

## 主题系统

### 内置主题

| 主题 | 特点 |
|------|------|
| `default` | 默认彩色主题，带有提供商 Emoji 图标 |
| `minimal` | 极简无颜色主题，使用纯 ASCII 字符，适合无颜色终端 |
| `powerline` | 仿 Powerline 风格，使用字母缩写和高对比度背景色 |
| `neon` | 霓虹高亮风格，更宽的进度条和鲜艳的 ANSI 颜色 |

### 自定义主题

通过 `customTheme` 可以覆盖内置主题的任意部分：

```json
{
  "theme": "default",
  "customTheme": {
    "colors": {
      "model": "[35m",
      "cost": "\\u001b[32m"
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

可自定义的部分：

- **`colors`** — 模型名、标签、警告、错误、暗淡、工具/Agent/Todo/成本/Git 各状态的颜色（ANSI 转义码）
- **`bars`** — 上下文条和各配额条的前景色、背景色、动画配置
- **`icons`** — 提供商图标、警告/错误/工具/Agent/Todo/Git 图标
- **`layout`** — 是否紧凑模式、是否显示标签、进度条宽度

## 项目结构

```
src/
  index.ts              # 插件入口，stdin 解析和 stdout 输出
  core/
    engine.ts           # 提供商探测、轮询、缓存管理
    renderer.ts         # 状态栏格式化与动画状态机
    config.ts           # 配置加载与默认值
    cache.ts            # 内存 TTL 缓存
    transcript.ts       # Transcript JSONL 解析（工具/Agent/Todo）
    git.ts              # Git 仓库状态读取
    cost.ts             # 基于 Token 用量和定价计算费用
  providers/
    base.ts             # 提供商适配器基类
    deepseek.ts         # DeepSeek 适配器
    kimi.ts             # Kimi 适配器
    glm.ts              # GLM 适配器
    minimax.ts          # MiniMax 适配器
  themes/
    built-ins.ts        # 内置主题
    custom.ts           # 自定义主题合并逻辑
    index.ts            # 主题注册与解析
  types/
    index.ts            # 共享 TypeScript 类型
  animations/
    pulse.ts            # Pulse 动画帧生成器
    laser.ts            # Laser 扫过动画帧生成器
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（自动编译）
npm run dev

# 运行测试
npm test

# 持续测试
npm run test:watch

# 构建
npm run build
```

## 测试覆盖

- 18 个测试文件，64 个测试用例全部通过
- 涵盖配置加载、缓存、动画生成、主题解析、所有提供商适配器、transcript 解析、Git 状态、费用计算、渲染器、引擎、插件入口点和集成测试

## 许可证

MIT
