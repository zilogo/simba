# Task Plan: 中英文UI切换功能

## Goal
为Simba前端(Next.js 15)添加中英文语言切换功能，支持用户在界面上切换语言

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [ ] 探索前端代码结构
- [ ] 了解现有组件和页面
- [ ] 确定需要翻译的文本内容
- **Status:** in_progress

### Phase 2: Planning & Structure
- [ ] 选择i18n方案 (next-intl / react-i18next / 自定义)
- [ ] 设计翻译文件结构
- [ ] 规划语言切换组件位置
- **Status:** pending

### Phase 3: Implementation
- [ ] 安装i18n依赖
- [ ] 创建翻译文件 (en.json, zh.json)
- [ ] 配置i18n provider
- [ ] 实现语言切换组件
- [ ] 替换硬编码文本为翻译key
- **Status:** pending

### Phase 4: Testing & Verification
- [ ] 测试语言切换功能
- [ ] 验证所有页面文本正确显示
- [ ] 测试语言偏好持久化
- **Status:** pending

### Phase 5: Delivery
- [ ] 代码审查
- [ ] 运行lint检查
- [ ] 交付给用户
- **Status:** pending

## Key Questions
1. 使用哪个i18n库? (next-intl更适合Next.js App Router)
2. 语言偏好存储在哪里? (localStorage / cookie)
3. 是否需要URL路由包含语言? (/en/... vs /zh/...)

## Decisions Made
| Decision | Rationale |
|----------|-----------|
|          |           |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions (attention manipulation)
- Log ALL errors - they help avoid repetition
