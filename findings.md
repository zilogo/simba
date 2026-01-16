# Findings & Decisions

## Requirements
- 支持中英文UI切换
- 用户可在界面上切换语言
- 语言偏好需要持久化

## Research Findings
- **框架**: Next.js 15.1.1 + React 19 (App Router)
- **现有i18n**: 无，所有文本硬编码英文
- **Providers结构**: ThemeProvider → AuthProvider → QueryProvider
- **主题切换**: 已有 `theme-toggle.tsx` 可参考
- **主要页面**: 9个 (dashboard, playground, documents, conversations, analytics, evals, deploy, login, signup)
- **组件数量**: 77个 TypeScript/TSX 文件
- **UI库**: Radix UI + Tailwind CSS

### 需要翻译的主要区域
- 侧边栏导航: Dashboard, Playground, Documents, Conversations, Analytics, Evals, Deploy
- 头部: Search..., Organizations, Sign out
- 登录/注册页面
- 仪表板卡片: Total Documents, Conversations, Resolution Rate
- 文档管理页面
- 聊天组件

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 使用 react-i18next | 轻量级、成熟稳定、类型支持好 |
| localStorage 存储语言偏好 | 不需要URL路由，实现简单 |
| 翻译全部UI文本 | 用户要求完整的中英文体验 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- 前端目录: `/Users/zilo/Projects/RAG/simba/frontend`
- Providers: `src/providers/index.tsx`
- 主题切换: `src/components/common/theme-toggle.tsx`
- 侧边栏: `src/components/layout/sidebar.tsx`
- 头部: `src/components/layout/header.tsx`

## Visual/Browser Findings
-

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
