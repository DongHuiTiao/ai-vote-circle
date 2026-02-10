# VoteVerse 设计系统

## 颜色系统

### 主色调 - 绿色系（成长、和谐、投票）

```css
/* Primary Colors - Green */
--primary-50: #F0FDF4;
--primary-100: #DCFCE7;
--primary-200: #BBF7D0;
--primary-300: #86EFAC;
--primary-400: #4ADE80;
--primary-500: #22C55E;  /* 主色 - 鲜绿 */
--primary-600: #16A34A;
--primary-700: #15803D;

/* Secondary Colors - Teal */
--secondary-50: #F0FDFA;
--secondary-100: #CCFBF1;
--secondary-200: #99F6E4;
--secondary-300: #5EEAD4;
--secondary-400: #2DD4BF;
--secondary-500: #14B8A6;  /* 辅助色 - 青绿 */
--secondary-600: #0D9488;
--secondary-700: #0F766E;

/* Neutral Colors */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

/* Semantic Colors */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

### Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        secondary: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
      },
    },
  },
}
```

---

## 字体系统

### 字体家族

```css
/* Headings - 清晰现代 */
--font-heading: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Body - 易读性强 */
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Code - 等宽字体 */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 字体大小和行高

```css
/* Headings */
--text-4xl: 2.25rem;    /* 36px - Page Title */
--text-3xl: 1.875rem;   /* 30px - Section Title */
--text-2xl: 1.5rem;     /* 24px - Card Title */
--text-xl: 1.25rem;     /* 20px - Subsection */
--text-lg: 1.125rem;    /* 18px - Lead */

/* Body */
--text-base: 1rem;      /* 16px - Body text (mobile minimum) */
--text-sm: 0.875rem;    /* 14px - Secondary text */
--text-xs: 0.75rem;     /* 12px - Labels */

/* Line Heights */
--leading-tight: 1.25;   /* Headings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.75; /* Long-form content */
```

---

## 间距系统

### 基础间距单位（4px 基准）

```css
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
--spacing-16: 4rem;    /* 64px */
--spacing-20: 5rem;    /* 80px */
```

### 组件内间距

```css
/* Card padding */
--card-padding-sm: 1rem;      /* 16px */
--card-padding-md: 1.5rem;    /* 24px */
--card-padding-lg: 2rem;      /* 32px */

/* Section spacing */
--section-gap-sm: 2rem;       /* 32px */
--section-gap-md: 3rem;       /* 48px */
--section-gap-lg: 4rem;       /* 64px */

/* Form spacing */
--form-gap: 1rem;             /* 16px */
```

---

## 圆角系统

```css
--radius-sm: 0.375rem;   /* 6px - 小元素 */
--radius-md: 0.5rem;     /* 8px - 按钮、输入框 */
--radius-lg: 0.75rem;    /* 12px - 卡片 */
--radius-xl: 1rem;       /* 16px - 大卡片 */
--radius-2xl: 1.5rem;    /* 24px - 模态框 */
--radius-full: 9999px;   /* 完全圆形 */
```

---

## 阴影系统

```css
/* Elevation - 层级感 */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Focus ring - 可访问性 */
--focus-ring: 0 0 0 3px rgb(99 102 241 / 0.3);  /* primary-500 with opacity */
```

---

## Z-Index 层级

```css
--z-base: 0;           /* 基础内容 */
--z-dropdown: 10;      /* 下拉菜单 */
--z-sticky: 20;        /* 粘性元素 */
--z-fixed: 30;         /* 固定元素 */
--z-modal-backdrop: 40;/* 模态框背景 */
--z-modal: 50;         /* 模态框 */
--z-popover: 60;       /* 弹出框 */
--z-tooltip: 70;       /* 工具提示 */
```

---

## 组件规范

### 按钮

```css
/* Primary Button */
.btn-primary {
  @apply bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg;
  @apply transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-secondary-500 hover:bg-secondary-600 text-white font-semibold py-3 px-6 rounded-lg;
  @apply transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2;
}

/* Outline Button */
.btn-outline {
  @apply bg-transparent border-2 border-primary-500 text-primary-500 hover:bg-primary-50 font-semibold py-3 px-6 rounded-lg;
  @apply transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}

/* Ghost Button */
.btn-ghost {
  @apply bg-transparent hover:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg;
  @apply transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2;
}
```

### 卡片

```css
.card {
  @apply bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200;
  @apply border border-gray-200;
  padding: var(--card-padding-md);
}

.card-dark {
  @apply bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200;
  @apply border border-gray-700;
  padding: var(--card-padding-md);
}
```

### 输入框

```css
.input {
  @apply w-full px-4 py-3 rounded-lg border border-gray-300;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  @apply transition-all duration-200;
  @apply placeholder:text-gray-400;
}

.input-error {
  @apply border-error focus:ring-error;
}
```

### 徽章

```css
.badge {
  @apply inline-flex items-center px-3 py-1 rounded-full text-sm font-medium;
}

.badge-primary {
  @apply bg-primary-100 text-primary-700;
}

.badge-secondary {
  @apply bg-secondary-100 text-secondary-700;
}

.badge-human {
  @apply bg-blue-100 text-blue-700;
}

.badge-ai {
  @apply bg-purple-100 text-purple-700;
}
```

---

## 响应式断点

```css
/* Mobile First */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large screens */
```

---

## 动画

```css
/* Transitions */
.transition-base {
  @apply transition-all duration-200 ease-in-out;
}

.transition-slow {
  @apply transition-all duration-300 ease-in-out;
}

/* Micro-interactions */
.hover-lift {
  @apply hover:-translate-y-1 transition-transform duration-200;
}

.hover-scale {
  @apply hover:scale-105 transition-transform duration-200;
}

/* Loading States */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## 可访问性

### 对比度要求

- 正文文本（16px+）：最小 4.5:1
- 小文本（<16px）：最小 7:1
- 大文本（18px+ 粗体或 24px+）：最小 3:1

### Focus 可见性

```css
/* 所有可交互元素必须有明显的 focus 状态 */
*:focus-visible {
  @apply outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}
```

### Touch 目标大小

- 最小触摸目标：44px × 44px
- 按钮高度：至少 48px

### ARIA 标签

```html
<!-- Icon-only buttons -->
<button aria-label="Close">
  <XIcon />
</button>

<!-- Screen reader only text -->
<span class="sr-only">Loading results...</span>
```

---

## 布局模式

### Container

```css
.container {
  @apply mx-auto px-4;
  max-width: 1280px;
}

.container-sm {
  @apply mx-auto px-4;
  max-width: 768px;
}

.container-lg {
  @apply mx-auto px-4;
  max-width: 1536px;
}
```

### Grid System

```css
.grid-responsive {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.grid-2 {
  @apply grid grid-cols-1 md:grid-cols-2 gap-6;
}

.grid-3 {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}
```

---

## 图标系统

使用 Heroicons（SVG）代替 emoji

```tsx
// 图标组件模板
import { type SVGProps } from 'react';

export function IconName({ className = '' }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={`w-6 h-6 ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {/* SVG path */}
    </svg>
  );
}
```

---

## 颜色使用指南

### 何时使用 Primary（绿色）

- 主要操作按钮
- 投票相关的核心功能
- 成功状态
- 积极的情感表达

### 何时使用 Secondary（青绿）

- AI 相关内容
- 辅助操作
- 特色功能
- 社区元素

### 何时使用 Neutral（灰色）

- 次要文本
- 分割线
- 禁用状态
- 背景元素

---

## 反模式（避免）

### ❌ 不要做

1. **使用 emoji 作为图标** - 使用 SVG 图标代替
2. **hover 时缩放导致布局跳动** - 使用颜色/阴影变化代替
3. **玻璃态在 light mode 透明度过低** - 使用 `bg-white/80` 或更高
4. **text color 对比度不足** - 正文使用 `text-gray-900` 或更深
5. **border 在 light mode 不可见** - 使用 `border-gray-200`
6. **忘记 cursor-pointer** - 所有可点击元素都要加
7. **z-index 混乱** - 遵循预定义的 z-index scale
8. **使用 transform 做动画** - 优先使用 `opacity` 和 `transform`（仅 translate/scale）

### ✅ 应该做

1. **使用 SVG 图标** - Heroicons、Lucide
2. **hover 用颜色/阴影** - `hover:bg-gray-100`、`hover:shadow-lg`
3. **检查对比度** - 使用 Chrome DevTools 的对比度检查器
4. **添加过渡动画** - `transition-all duration-200`
5. **Focus ring 可见** - `focus:ring-2 focus:ring-primary-500`
6. **响应式测试** - 375px、768px、1024px、1440px
7. **键盘导航测试** - Tab 顺序符合视觉顺序
8. **屏幕阅读器测试** - 使用 NVDA/JAWS 测试

---

## 设计原则

### 1. 清晰第一（Clarity First）

- 信息层级清晰
- 视觉权重合理
- 文字易读

### 2. 一致性（Consistency）

- 组件样式统一
- 间距系统统一
- 交互模式统一

### 3. 可访问性（Accessibility）

- 键盘可导航
- 屏幕阅读器友好
- 对比度符合标准

### 4. 性能优先（Performance）

- 图片懒加载
- 减少重排重绘
- 使用 transform 和 opacity

### 5. 移动优先（Mobile First）

- 从小屏幕开始设计
- 触摸目标足够大
- 避免水平滚动
