# Hex 颜色主题系统设计文档

## 目标

将主题颜色定义中的原始 ANSI 转义码替换为人类可读的十六进制颜色规格（例如 `#39c5bb[#7f7f7f]`），实现以下能力：
- 无需了解 ANSI 代码即可轻松自定义颜色
- 通过固定比例自动推导缺失的前景色/背景色
- 通过简单的前缀标记支持文本样式（加粗、斜体）

## 颜色规格语法

```
规格       := [样式前缀] [前景色] [背景色]
样式前缀   := ("b" | "i")*
前景色     := "#" 6位十六进制
背景色     := "[" "#" 6位十六进制 "]"
6位十六进制 := [0-9a-fA-F]{6}
```

### 示例

| 规格 | 含义 |
|------|------|
| `#39c5bb` | 前景色 `#39c5bb`，背景色自动推导 |
| `[#7f7f7f]` | 背景色 `#7f7f7f`，前景色自动推导 |
| `#39c5bb[#7f7f7f]` | 前景色和背景色均明确指定 |
| `b#39c5bb` | 加粗 + 前景色 `#39c5bb`，背景色自动推导 |
| `i[#7f7f7f]` | 斜体 + 背景色 `#7f7f7f`，前景色自动推导 |
| `bi#39c5bb[#7f7f7f]` | 加粗斜体 + 前景色背景色均明确指定 |

## 推导算法

参考对：前景色 `#c0c0c0` (192, 192, 192)，背景色 `#808080` (128, 128, 128)。
比例：每个 RGB 通道 `fg / bg = 1.5`。

### 规则

- 由前景色推导背景色：`bg_通道 = round(fg_通道 × 2/3)`
- 由背景色推导前景色：`fg_通道 = min(255, round(bg_通道 × 3/2))`

两种运算都将结果钳制在 `[0, 255]` 范围内。

## ANSI 转换

使用真彩色 ANSI 转义序列：

- 前景色：`\x1b[38;2;R;G;Bm`
- 背景色：`\x1b[48;2;R;G;Bm`
- 加粗：`\x1b[1m`
- 斜体：`\x1b[3m`

样式前缀在颜色代码之前输出。重置 `\x1b[0m` 仍由渲染器处理。

## 架构

### 新增模块：`src/themes/compiler.ts`

```typescript
export interface ParsedColor {
  fg?: string;      // 十六进制，例如 "#39c5bb"
  bg?: string;      // 十六进制，例如 "#7f7f7f"
  bold: boolean;
  italic: boolean;
}

export function parseColorSpec(spec: string): ParsedColor;
export function compileColorSpec(spec: string, role: 'fg' | 'bg'): string;
export function compileTheme(theme: Theme): Theme;
```

### 字段角色规则

`Theme` 中的每个颜色字段都有一个语义角色，决定解析规格时使用哪个部分：

| 字段路径 | 角色 | 行为 |
|----------|------|------|
| `colors.*` | `fg` | 文字颜色；若规格包含背景部分则忽略 |
| `bars.*.fgColor` | `fg` | 进度条填充色 |
| `bars.*.bgColor` | `bg` | 进度条空白底色 |

如果规格提供的颜色类型与字段角色相反（例如 `fgColor` 字段收到 `[#7f7f7f]`），则使用固定比例从提供的颜色推导出所需颜色。

### 集成点

在 `src/themes/index.ts` 中，`resolveTheme()` 返回一个 `Theme`。`compileTheme()` 在结果到达渲染器之前对其进行编译。

在 `src/index.ts` 中：
```typescript
const theme = compileTheme(resolveTheme(config.theme, config.customTheme));
```

渲染器（`src/core/renderer.ts`）**无需修改** —— 它仍然接收 ANSI 字符串。

### 向后兼容

如果颜色字符串以 `\x1b[`（ESC 字符）开头，则视为原始 ANSI 转义序列并不做修改直接透传。这保留了所有使用原始 ANSI 代码的现有自定义主题。

## 内置主题迁移

四套内置主题（`default`、`minimal`、`powerline`、`neon`）全部从 ANSI 代码迁移为十六进制规格。

### 映射参考（Default 主题）

| 原 ANSI | 近似 Hex |
|---------|----------|
| `\x1b[30m` / `\x1b[40m` | `#000000` |
| `\x1b[31m` / `\x1b[41m` | `#f44336` |
| `\x1b[32m` / `\x1b[42m` | `#4caf50` |
| `\x1b[33m` / `\x1b[43m` | `#ff9800` |
| `\x1b[34m` / `\x1b[44m` | `#2196f3` |
| `\x1b[35m` / `\x1b[45m` | `#9c27b0` |
| `\x1b[36m` / `\x1b[46m` | `#00bcd4` |
| `\x1b[37m` / `\x1b[47m` | `#e0e0e0` |
| `\x1b[90m` | `#757575` |
| `\x1b[91m` | `#ff5252` |
| `\x1b[92m` | `#69f0ae` |
| `\x1b[93m` | `#ffd740` |
| `\x1b[94m` | `#448aff` |
| `\x1b[95m` | `#e040fb` |
| `\x1b[96m` | `#18ffff` |
| `\x1b[97m` | `#ffffff` |

## 类型变更

`Theme` 和 `BarStyle` 接口**不需要结构变更**。颜色字段保持为 `string` 类型。仅其语义含义从「原始 ANSI」变为「颜色规格」。`src/types/index.ts` 中的注释应更新以反映这一点。

## 测试策略

1. **`parseColorSpec` 单元测试** —— 覆盖所有语法变体、样式提取、十六进制解析、大小写不敏感
2. **推导规则单元测试** —— 验证 `deriveBackground('#c0c0c0')` 返回 `#808080`，反之亦然
3. **`compileColorSpec` 单元测试** —— 验证基于角色的编译产生正确的 ANSI 序列
4. **向后兼容单元测试** —— 原始 ANSI 字符串不做修改直接透传
5. **集成测试** —— 内置主题编译成功，现有渲染器测试仍然通过
6. **主题测试更新** —— `tests/themes/built-ins.test.ts` 应验证主题编译无错误
