# Simba 通用 RAG 平台改造方案

> 将 Simba 从"客服助手"改造为可配置的通用 RAG 平台

## 目录

1. [项目背景](#1-项目背景)
2. [现状分析](#2-现状分析)
3. [改造目标](#3-改造目标)
4. [技术方案](#4-技术方案)
5. [详细设计](#5-详细设计)
6. [文件变更清单](#6-文件变更清单)
7. [数据库迁移](#7-数据库迁移)
8. [API 接口设计](#8-api-接口设计)
9. [前端组件设计](#9-前端组件设计)
10. [实施计划](#10-实施计划)
11. [验证方案](#11-验证方案)

---

## 1. 项目背景

### 1.1 Simba 简介

Simba 是一个开源的 RAG（检索增强生成）平台，当前定位为"客服助手"。其核心能力包括：

- 多格式文档索引（PDF、Word、Excel、Markdown 等）
- 向量语义检索 + 混合检索 + 重排序
- 流式对话交互，支持来源追踪
- 多租户隔离
- 可嵌入的聊天组件（`simba-chat` NPM 包）

### 1.2 改造动机

Simba 的 RAG 能力是通用的，但目前的配置（系统提示词、品牌名称等）限制了其应用场景。通过本次改造，用户可以将 Simba 用于：

| 场景 | 说明 |
|-----|------|
| 企业知识库 | 内部文档检索、政策查询 |
| 产品文档助手 | API 文档、用户手册问答 |
| 教育培训 | 课程资料、学习辅导 |
| 研究助理 | 论文检索、资料整理 |
| 法律合规 | 合同文档、法规条款查询 |

---

## 2. 现状分析

### 2.1 系统提示词

**位置**: `simba/services/chat_service.py:34-59`

```python
SYSTEM_PROMPT = """You are Simba, a customer service assistant.

## Tone
- Warm but professional
- Confident: state facts clearly, admit uncertainty honestly
- Action-oriented: tell users what they CAN do
- Match user language

## Search Strategy
Use the rag tool to search for information. Before saying info doesn't exist:
- Try 2-3 different search queries with synonyms and alternative phrasings
- For non-English queries, also try translated keywords

## Response Guidelines
- Be concise: 2-4 sentences for simple questions
- Start with the answer, add details only if needed
- Cite sources when helpful
- If info isn't found after multiple searches, offer alternatives

## Never Do This
- Start with "I apologize" unless genuinely warranted
- Use filler: "Great question!", "I'd be happy to help!"
- Repeat the question back
- End with "Is there anything else I can help with?"
- Say "I don't have information" without offering an alternative path
"""
```

**问题**:
- 硬编码，无法按组织/场景定制
- 仅英文，无中文版本
- 品牌名 "Simba" 写死

### 2.2 品牌名称硬编码位置

| 文件 | 位置 | 内容 |
|-----|------|------|
| `frontend/src/lib/constants.ts` | L1 | `APP_NAME = "Simba"` |
| `frontend/src/app/layout.tsx` | metadata | `"Simba - Customer Service Assistant"` |
| `frontend/src/components/layout/sidebar.tsx` | L40 | Logo 显示 "Simba" |
| `frontend/src/app/page.tsx` | 欢迎页 | `"Welcome to **Simba**"` |
| `frontend/src/components/chat/chat-message.tsx` | 聊天气泡 | AI 消息标签 "Simba" |

### 2.3 现有 i18n 支持

前端已实现完整的国际化支持：

- **框架**: `i18next` + `react-i18next`
- **语言**: 中文 (zh) / 英文 (en)
- **存储**: `localStorage` 持久化
- **翻译文件**: `frontend/src/lib/locales/{en,zh}.json`

### 2.4 配置系统

- **后端**: Pydantic Settings + 环境变量 (`simba/core/config.py`)
- **数据库**: 无组织级自定义设置存储
- **现有组织模型**: 仅存储 `organization_id`，无配置字段

---

## 3. 改造目标

### 3.1 功能目标

| 功能 | 说明 | 优先级 |
|-----|------|--------|
| 自定义系统提示词 | 按组织配置不同的 AI 行为 | P0 |
| 双语提示词 | 支持中/英文提示词，自动切换 | P0 |
| 品牌名称可配置 | 替换所有 "Simba" 为自定义名称 | P0 |
| 设置管理界面 | 前端页面编辑配置 | P1 |
| 提示词变量 | 支持 `{{app_name}}` 等动态变量 | P1 |
| RAG 参数覆盖 | 按组织配置检索参数 | P2 |

### 3.2 非功能目标

- **向后兼容**: 现有部署无需修改即可继续使用默认配置
- **无感迁移**: 已有组织自动使用默认值
- **性能影响最小**: 配置缓存，避免每次请求查询数据库

---

## 4. 技术方案

### 4.1 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Settings    │  │ useSettings │  │ Brand Context       │  │
│  │ Page        │──│ Hook        │──│ Provider            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Settings    │  │ Settings    │  │ Chat Service        │  │
│  │ Routes      │──│ Service     │──│ (get_system_prompt) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Database                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              organization_settings                    │   │
│  │  - organization_id (unique)                          │   │
│  │  - app_name, app_description                         │   │
│  │  - system_prompt_en, system_prompt_zh                │   │
│  │  - retrieval_limit, retrieval_min_score              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 数据流

```
用户发送消息
      │
      ▼
Chat Service 接收请求
      │
      ▼
获取组织设置 (缓存优先)
      │
      ├── 有自定义提示词 ──► 使用自定义提示词
      │
      └── 无自定义提示词 ──► 使用默认提示词模板
      │
      ▼
检测用户消息语言 (中/英)
      │
      ▼
选择对应语言的提示词
      │
      ▼
替换变量 ({{app_name}} 等)
      │
      ▼
构建 Agent 并执行 RAG
```

---

## 5. 详细设计

### 5.1 Phase 1: 后端配置存储

#### 5.1.1 数据模型

**文件**: `simba/models/settings.py`

```python
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Index, String, Text, Float, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from simba.models.base import Base


class OrganizationSettings(Base):
    """Organization-level settings for customization."""

    __tablename__ = "organization_settings"
    __table_args__ = (
        Index("idx_org_settings_org_id", "organization_id"),
    )

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4
    )
    organization_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    # Branding
    app_name: Mapped[str] = mapped_column(
        String(100),
        default="Simba",
        nullable=False
    )
    app_description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    # System prompts (bilingual)
    system_prompt_en: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    system_prompt_zh: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # RAG configuration overrides
    retrieval_limit: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )
    retrieval_min_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
```

#### 5.1.2 设置服务

**文件**: `simba/services/settings_service.py`

```python
from functools import lru_cache
from typing import Optional

from sqlalchemy.orm import Session

from simba.models.settings import OrganizationSettings


class SettingsService:
    """Service for managing organization settings."""

    def __init__(self, db: Session):
        self.db = db
        self._cache: dict[str, OrganizationSettings] = {}

    def get_settings(self, organization_id: str) -> OrganizationSettings:
        """Get settings for an organization, creating default if not exists."""
        # Check cache first
        if organization_id in self._cache:
            return self._cache[organization_id]

        settings = self.db.query(OrganizationSettings).filter(
            OrganizationSettings.organization_id == organization_id
        ).first()

        if not settings:
            # Create default settings
            settings = OrganizationSettings(organization_id=organization_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)

        self._cache[organization_id] = settings
        return settings

    def update_settings(
        self,
        organization_id: str,
        **kwargs
    ) -> OrganizationSettings:
        """Update settings for an organization."""
        settings = self.get_settings(organization_id)

        for key, value in kwargs.items():
            if hasattr(settings, key):
                setattr(settings, key, value)

        self.db.commit()
        self.db.refresh(settings)

        # Invalidate cache
        self._cache.pop(organization_id, None)

        return settings

    def clear_cache(self, organization_id: Optional[str] = None):
        """Clear settings cache."""
        if organization_id:
            self._cache.pop(organization_id, None)
        else:
            self._cache.clear()
```

### 5.2 Phase 2: 默认提示词模板

#### 5.2.1 英文模板

**文件**: `simba/prompts/default_en.txt`

```
You are {{app_name}}, a helpful assistant.

## Tone
- Professional and helpful
- Confident: state facts clearly, admit uncertainty honestly
- Action-oriented: tell users what they CAN do
- Match user language

## Search Strategy
Use the rag tool to search for information. Before saying info doesn't exist:
- Try 2-3 different search queries with synonyms and alternative phrasings
- For non-English queries, also try translated keywords

## Response Guidelines
- Be concise: 2-4 sentences for simple questions
- Start with the answer, add details only if needed
- Cite sources when helpful
- If info isn't found after multiple searches, offer alternatives (e.g., "Contact support at...")

## Never Do This
- Start with "I apologize" unless genuinely warranted
- Use filler phrases: "Great question!", "I'd be happy to help!", "Please note that..."
- Repeat the question back to the user
- End with "Is there anything else I can help with?"
- Say "I don't have information" without offering an alternative path
```

#### 5.2.2 中文模板

**文件**: `simba/prompts/default_zh.txt`

```
你是 {{app_name}}，一个有帮助的助手。

## 语气
- 专业且有帮助
- 自信：清晰陈述事实，诚实承认不确定
- 行动导向：告诉用户他们能做什么
- 匹配用户语言

## 搜索策略
使用 rag 工具搜索信息。在说信息不存在之前：
- 尝试 2-3 个不同的搜索查询，使用同义词和替代措辞
- 对于非中文查询，也尝试翻译后的关键词

## 响应指南
- 简洁：简单问题 2-4 句话
- 先给答案，仅在需要时添加细节
- 适时引用来源
- 如果多次搜索后仍未找到信息，提供替代方案（如"请联系支持..."）

## 禁止事项
- 不要以"我道歉"开头（除非真正需要）
- 不要使用填充语："好问题！"、"我很乐意帮助！"、"请注意..."
- 不要重复用户的问题
- 不要以"还有什么可以帮您的吗？"结尾
- 不要说"我没有信息"而不提供替代方案
```

#### 5.2.3 提示词加载器

**文件**: `simba/services/prompt_service.py`

```python
import re
from pathlib import Path
from functools import lru_cache


PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


@lru_cache(maxsize=2)
def load_default_prompt(language: str = "en") -> str:
    """Load default prompt template for the specified language."""
    filename = f"default_{language}.txt"
    filepath = PROMPTS_DIR / filename

    if not filepath.exists():
        # Fallback to English
        filepath = PROMPTS_DIR / "default_en.txt"

    return filepath.read_text(encoding="utf-8")


def render_prompt(template: str, variables: dict) -> str:
    """Render a prompt template with variables.

    Supports {{variable_name}} syntax.
    """
    def replace_var(match):
        var_name = match.group(1)
        return str(variables.get(var_name, match.group(0)))

    return re.sub(r"\{\{(\w+)\}\}", replace_var, template)


def detect_language(text: str) -> str:
    """Detect if text is primarily Chinese or English.

    Returns 'zh' for Chinese, 'en' for English.
    """
    # Count Chinese characters
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    total_chars = len(text.strip())

    if total_chars == 0:
        return "en"

    # If more than 10% Chinese characters, consider it Chinese
    if chinese_chars / total_chars > 0.1:
        return "zh"

    return "en"
```

### 5.3 Phase 3: 修改聊天服务

**文件**: `simba/services/chat_service.py` (修改)

```python
# 添加导入
from simba.services.prompt_service import (
    load_default_prompt,
    render_prompt,
    detect_language
)
from simba.services.settings_service import SettingsService

# 保留原有 SYSTEM_PROMPT 作为后备
DEFAULT_SYSTEM_PROMPT = """You are a helpful assistant..."""


def get_system_prompt(
    organization_id: str,
    user_message: str,
    db: Session
) -> str:
    """Get the appropriate system prompt for the organization and language.

    Args:
        organization_id: The organization ID
        user_message: The user's message (for language detection)
        db: Database session

    Returns:
        The rendered system prompt
    """
    settings_service = SettingsService(db)
    settings = settings_service.get_settings(organization_id)

    # Detect user language
    language = detect_language(user_message)

    # Get prompt based on language
    if language == "zh" and settings.system_prompt_zh:
        prompt_template = settings.system_prompt_zh
    elif settings.system_prompt_en:
        prompt_template = settings.system_prompt_en
    else:
        # Use default template
        prompt_template = load_default_prompt(language)

    # Render variables
    variables = {
        "app_name": settings.app_name,
        "language": language,
    }

    return render_prompt(prompt_template, variables)


# 修改 create_agent 函数
async def create_agent(
    organization_id: str,
    collection_name: str,
    user_message: str,
    db: Session,
    ...
):
    """Create a chat agent with organization-specific settings."""
    # 获取自定义系统提示词
    system_prompt = get_system_prompt(organization_id, user_message, db)

    # 获取 RAG 配置覆盖
    settings_service = SettingsService(db)
    settings = settings_service.get_settings(organization_id)

    retrieval_limit = settings.retrieval_limit or get_settings().retrieval_limit
    retrieval_min_score = settings.retrieval_min_score or get_settings().retrieval_min_score

    # ... 其余代码使用 system_prompt 和配置覆盖
```

### 5.4 Phase 4: 设置 API

**文件**: `simba/api/routes/settings.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from simba.api.middleware.auth import get_organization
from simba.api.middleware.auth import OrganizationContext
from simba.core.database import get_db
from simba.services.settings_service import SettingsService
from simba.services.prompt_service import load_default_prompt


router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    """Organization settings response."""
    organization_id: str
    app_name: str
    app_description: str | None
    system_prompt_en: str | None
    system_prompt_zh: str | None
    retrieval_limit: int | None
    retrieval_min_score: float | None

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    """Organization settings update request."""
    app_name: str | None = Field(None, min_length=1, max_length=100)
    app_description: str | None = Field(None, max_length=500)
    system_prompt_en: str | None = Field(None, max_length=10000)
    system_prompt_zh: str | None = Field(None, max_length=10000)
    retrieval_limit: int | None = Field(None, ge=1, le=50)
    retrieval_min_score: float | None = Field(None, ge=0.0, le=1.0)


class DefaultPromptsResponse(BaseModel):
    """Default prompt templates."""
    en: str
    zh: str


@router.get("", response_model=SettingsResponse)
async def get_settings(
    org: OrganizationContext = Depends(get_organization),
    db: Session = Depends(get_db),
):
    """Get current organization settings."""
    service = SettingsService(db)
    settings = service.get_settings(org.organization_id)
    return SettingsResponse.model_validate(settings)


@router.put("", response_model=SettingsResponse)
async def update_settings(
    data: SettingsUpdate,
    org: OrganizationContext = Depends(get_organization),
    db: Session = Depends(get_db),
):
    """Update organization settings."""
    service = SettingsService(db)

    # Filter out None values
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    settings = service.update_settings(org.organization_id, **update_data)
    return SettingsResponse.model_validate(settings)


@router.get("/prompts/default", response_model=DefaultPromptsResponse)
async def get_default_prompts():
    """Get default prompt templates for reference."""
    return DefaultPromptsResponse(
        en=load_default_prompt("en"),
        zh=load_default_prompt("zh"),
    )
```

### 5.5 Phase 5: 前端实现

#### 5.5.1 设置 Hook

**文件**: `frontend/src/hooks/useSettings.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface OrgSettings {
  organization_id: string;
  app_name: string;
  app_description: string | null;
  system_prompt_en: string | null;
  system_prompt_zh: string | null;
  retrieval_limit: number | null;
  retrieval_min_score: number | null;
}

export interface SettingsUpdate {
  app_name?: string;
  app_description?: string;
  system_prompt_en?: string;
  system_prompt_zh?: string;
  retrieval_limit?: number;
  retrieval_min_score?: number;
}

export interface DefaultPrompts {
  en: string;
  zh: string;
}

export function useSettings() {
  return useQuery<OrgSettings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/settings");
      return response.data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SettingsUpdate) => {
      const response = await api.put("/settings", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useDefaultPrompts() {
  return useQuery<DefaultPrompts>({
    queryKey: ["settings", "prompts", "default"],
    queryFn: async () => {
      const response = await api.get("/settings/prompts/default");
      return response.data;
    },
    staleTime: Infinity, // Default prompts don't change
  });
}
```

#### 5.5.2 品牌 Context Provider

**文件**: `frontend/src/providers/brand-provider.tsx`

```typescript
"use client";

import { createContext, useContext, ReactNode } from "react";
import { useSettings, OrgSettings } from "@/hooks/useSettings";

interface BrandContextType {
  appName: string;
  appDescription: string;
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextType>({
  appName: "Simba",
  appDescription: "AI-powered assistant",
  isLoading: true,
});

export function BrandProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useSettings();

  const value: BrandContextType = {
    appName: settings?.app_name ?? "Simba",
    appDescription: settings?.app_description ?? "AI-powered assistant",
    isLoading,
  };

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
```

#### 5.5.3 设置页面

**文件**: `frontend/src/app/(app)/settings/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings, useUpdateSettings, useDefaultPrompts } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useSettings();
  const { data: defaultPrompts } = useDefaultPrompts();
  const updateSettings = useUpdateSettings();

  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [promptEn, setPromptEn] = useState("");
  const [promptZh, setPromptZh] = useState("");
  const [promptTab, setPromptTab] = useState("en");

  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name);
      setAppDescription(settings.app_description ?? "");
      setPromptEn(settings.system_prompt_en ?? "");
      setPromptZh(settings.system_prompt_zh ?? "");
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        app_name: appName,
        app_description: appDescription || undefined,
        system_prompt_en: promptEn || undefined,
        system_prompt_zh: promptZh || undefined,
      });
      toast.success(t("settings.saveSuccess"));
    } catch (error) {
      toast.error(t("settings.saveError"));
    }
  };

  const handleResetPrompt = (lang: "en" | "zh") => {
    if (defaultPrompts) {
      if (lang === "en") {
        setPromptEn(defaultPrompts.en);
      } else {
        setPromptZh(defaultPrompts.zh);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.description")}</p>
      </div>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.branding")}</CardTitle>
          <CardDescription>{t("settings.brandingDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">{t("settings.appName")}</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Simba"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appDescription">{t("settings.appDescription")}</Label>
            <Input
              id="appDescription"
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder={t("settings.appDescriptionPlaceholder")}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.systemPrompt")}</CardTitle>
          <CardDescription>{t("settings.systemPromptDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={promptTab} onValueChange={setPromptTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="zh">中文</TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetPrompt(promptTab as "en" | "zh")}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("settings.resetToDefault")}
              </Button>
            </div>

            <TabsContent value="en">
              <Textarea
                value={promptEn}
                onChange={(e) => setPromptEn(e.target.value)}
                placeholder={defaultPrompts?.en}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {promptEn.length} / 10000 {t("settings.characters")}
              </p>
            </TabsContent>

            <TabsContent value="zh">
              <Textarea
                value={promptZh}
                onChange={(e) => setPromptZh(e.target.value)}
                placeholder={defaultPrompts?.zh}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {promptZh.length} / 10000 {t("settings.characters")}
              </p>
            </TabsContent>
          </Tabs>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">{t("settings.availableVariables")}</p>
            <code className="text-xs">{"{{app_name}}"}</code> - {t("settings.varAppName")}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
```

---

## 6. 文件变更清单

### 6.1 后端 (Python)

| 操作 | 文件 | 说明 |
|-----|------|------|
| 新建 | `simba/models/settings.py` | 组织设置数据模型 |
| 新建 | `simba/services/settings_service.py` | 设置管理服务 |
| 新建 | `simba/services/prompt_service.py` | 提示词加载与渲染 |
| 新建 | `simba/api/routes/settings.py` | 设置 API 端点 |
| 新建 | `simba/prompts/default_en.txt` | 英文默认提示词 |
| 新建 | `simba/prompts/default_zh.txt` | 中文默认提示词 |
| 修改 | `simba/services/chat_service.py` | 集成自定义提示词 |
| 修改 | `simba/api/app.py` | 注册设置路由 |
| 修改 | `simba/models/__init__.py` | 导出新模型 |

### 6.2 前端 (TypeScript/React)

| 操作 | 文件 | 说明 |
|-----|------|------|
| 新建 | `frontend/src/hooks/useSettings.ts` | 设置 API Hook |
| 新建 | `frontend/src/providers/brand-provider.tsx` | 品牌 Context |
| 新建 | `frontend/src/app/(app)/settings/page.tsx` | 设置页面 |
| 修改 | `frontend/src/lib/locales/en.json` | 英文翻译 |
| 修改 | `frontend/src/lib/locales/zh.json` | 中文翻译 |
| 修改 | `frontend/src/providers/index.tsx` | 添加 BrandProvider |
| 修改 | `frontend/src/components/layout/sidebar.tsx` | 使用动态品牌名 |
| 修改 | `frontend/src/components/chat/chat-message.tsx` | 使用动态品牌名 |
| 修改 | `frontend/src/app/layout.tsx` | 动态页面标题 |

### 6.3 数据库

| 操作 | 说明 |
|-----|------|
| 迁移 | 创建 `organization_settings` 表 |

---

## 7. 数据库迁移

### 7.1 迁移脚本

```sql
-- Migration: Create organization_settings table
-- Version: 001

CREATE TABLE organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(255) NOT NULL UNIQUE,

    -- Branding
    app_name VARCHAR(100) NOT NULL DEFAULT 'Simba',
    app_description VARCHAR(500),

    -- System prompts
    system_prompt_en TEXT,
    system_prompt_zh TEXT,

    -- RAG configuration overrides
    retrieval_limit INTEGER,
    retrieval_min_score FLOAT,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_org_settings_org_id ON organization_settings(organization_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organization_settings_updated_at
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 7.2 使用 Alembic 迁移

```bash
# 生成迁移
cd simba
uv run alembic revision --autogenerate -m "add organization_settings table"

# 执行迁移
uv run alembic upgrade head
```

---

## 8. API 接口设计

### 8.1 获取设置

```
GET /api/v1/settings

Headers:
  X-Organization-Id: {org_id}

Response 200:
{
  "organization_id": "org_123",
  "app_name": "My Assistant",
  "app_description": "A helpful AI assistant",
  "system_prompt_en": "You are {{app_name}}...",
  "system_prompt_zh": "你是 {{app_name}}...",
  "retrieval_limit": 8,
  "retrieval_min_score": 0.3
}
```

### 8.2 更新设置

```
PUT /api/v1/settings

Headers:
  X-Organization-Id: {org_id}
  Content-Type: application/json

Body:
{
  "app_name": "My New Assistant",
  "system_prompt_en": "You are {{app_name}}, a knowledge assistant..."
}

Response 200:
{
  "organization_id": "org_123",
  "app_name": "My New Assistant",
  ...
}
```

### 8.3 获取默认提示词

```
GET /api/v1/settings/prompts/default

Response 200:
{
  "en": "You are {{app_name}}, a helpful assistant...",
  "zh": "你是 {{app_name}}，一个有帮助的助手..."
}
```

---

## 9. 前端组件设计

### 9.1 组件层级

```
App
├── Providers
│   ├── I18nProvider
│   ├── QueryClientProvider
│   ├── AuthProvider
│   └── BrandProvider  ← 新增
│       └── children
│
├── Layout
│   ├── Sidebar
│   │   └── Logo (使用 useBrand)
│   └── Header
│
└── Pages
    ├── Settings  ← 新增
    │   ├── BrandingCard
    │   └── PromptEditorCard
    │       └── PromptEditor
    │
    └── Playground
        └── ChatMessage (使用 useBrand)
```

### 9.2 状态管理

```
┌─────────────────────────────────────────────┐
│              React Query Cache               │
│                                             │
│  ["settings"] ─────► OrgSettings            │
│  ["settings", "prompts", "default"] ───►    │
│                      DefaultPrompts          │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│             BrandContext                     │
│                                             │
│  appName: string                            │
│  appDescription: string                     │
│  isLoading: boolean                         │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              UI Components                   │
│                                             │
│  Sidebar, ChatMessage, etc.                 │
│  使用 useBrand() hook                        │
└─────────────────────────────────────────────┘
```

---

## 10. 实施计划

### 10.1 阶段划分

| 阶段 | 内容 | 预估工作量 |
|-----|------|-----------|
| Phase 1 | 后端模型 + 服务 + API | 中 |
| Phase 2 | 默认提示词模板 | 小 |
| Phase 3 | 修改聊天服务集成 | 中 |
| Phase 4 | 前端设置 Hook + Provider | 中 |
| Phase 5 | 前端设置页面 | 中 |
| Phase 6 | 替换硬编码品牌名 | 小 |
| Phase 7 | 测试 + 文档 | 中 |

### 10.2 依赖关系

```
Phase 1 (模型 + API)
    │
    ├──► Phase 2 (提示词模板)
    │         │
    │         └──► Phase 3 (聊天服务集成)
    │
    └──► Phase 4 (前端 Hook)
              │
              ├──► Phase 5 (设置页面)
              │
              └──► Phase 6 (品牌名替换)
                        │
                        └──► Phase 7 (测试)
```

---

## 11. 验证方案

### 11.1 后端测试

```bash
# 单元测试
cd simba
uv run pytest tests/services/test_settings_service.py -v
uv run pytest tests/services/test_prompt_service.py -v

# API 测试
uv run pytest tests/api/test_settings.py -v

# 完整测试
uv run pytest
```

### 11.2 前端测试

```bash
cd frontend

# 类型检查
pnpm typecheck

# Lint
pnpm lint

# 构建验证
pnpm build
```

### 11.3 端到端验证

| 测试场景 | 步骤 | 预期结果 |
|---------|------|---------|
| 默认设置 | 新组织首次访问 | 使用默认 "Simba" 和默认提示词 |
| 自定义品牌 | 修改 app_name 为 "MyBot" | UI 各处显示 "MyBot" |
| 自定义提示词 | 修改英文提示词 | 英文对话使用新提示词 |
| 双语切换 | 用中文提问 | 自动使用中文提示词 |
| 变量替换 | 提示词中使用 `{{app_name}}` | 正确替换为品牌名 |

### 11.4 回归测试

确保以下现有功能不受影响：
- [ ] 文档上传和索引
- [ ] 聊天对话功能
- [ ] 来源追踪
- [ ] 多租户隔离
- [ ] 用户认证

---

## 附录

### A. 提示词变量参考

| 变量 | 说明 | 示例值 |
|-----|------|--------|
| `{{app_name}}` | 品牌名称 | "MyAssistant" |
| `{{language}}` | 当前语言 | "en" / "zh" |
| `{{collection_name}}` | 当前集合 | "product-docs" |

### B. 配置优先级

```
用户自定义 (数据库) > 环境变量 > 默认值 (代码)
```

### C. 缓存策略

- 组织设置: 内存缓存，更新时失效
- 默认提示词: LRU 缓存，启动时加载
- 前端设置: React Query 缓存，5分钟过期
