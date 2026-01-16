# Simba 中文 RAG 支持方案（Qwen3 + vLLM 版）

## 概述

本文档详细描述如何使用 vLLM 部署的 Qwen3 模型为 Simba 后端 RAG 管道添加中文支持。

---

## 1. 架构设计

```
┌─────────────────────┐                    ┌─────────────────────────────┐
│                     │     HTTP API       │                             │
│   Simba 后端        │◄──────────────────►│   vLLM 模型服务器           │
│   (FastAPI)         │   OpenAI 兼容      │                             │
│                     │                    │   ┌───────────────────────┐ │
│   - 文档摄取        │                    │   │ Qwen3-Embedding-0.6B  │ │
│   - 检索服务        │                    │   │ (端口 8001)           │ │
│   - 重排序服务      │                    │   └───────────────────────┘ │
│   - 聊天服务        │                    │                             │
│                     │                    │   ┌───────────────────────┐ │
└─────────────────────┘                    │   │ Qwen3-Reranker-4B     │ │
                                           │   │ (端口 8002)           │ │
                                           │   └───────────────────────┘ │
                                           └─────────────────────────────┘
```

### 架构优势

- **计算分离**：模型推理在专用服务器，Simba 保持轻量
- **可扩展**：vLLM 支持多 GPU、批处理、动态扩容
- **零 API 成本**：自托管，无调用费用
- **低延迟**：内网通信，无公网延迟

---

## 2. 模型选择

### 2.1 嵌入模型：Qwen3-Embedding-0.6B

| 属性 | 值 |
|------|-----|
| 模型名称 | `Qwen/Qwen3-Embedding-0.6B` |
| 向量维度 | 1024 |
| 模型大小 | ~1.2GB |
| 语言支持 | 100+ 语言，中文优秀 |
| 许可证 | Apache 2.0 |
| MTEB 排名 | 多语言榜单顶级 |

### 2.2 重排序模型：Qwen3-Reranker-4B

| 属性 | 值 |
|------|-----|
| 模型名称 | `Qwen/Qwen3-Reranker-4B` |
| 模型大小 | ~8GB |
| 语言支持 | 100+ 语言，中文优秀 |
| 许可证 | Apache 2.0 |
| 推荐场景 | 召回后精排，提升准确率 |

### 2.3 为什么选择 Qwen3

| 对比项 | Qwen3 | OpenAI | BGE |
|--------|-------|--------|-----|
| 成本 | 免费（自托管） | 按量付费 | 免费（本地） |
| 中文质量 | 顶级 | 好 | 优秀 |
| 部署方式 | vLLM API | 云 API | 本地库 |
| 扩展性 | 高（vLLM） | 高 | 中 |

---

## 3. 现状分析

### 3.1 当前架构

| 组件 | 当前配置 | 文件位置 |
|------|----------|----------|
| 嵌入模型 | `all-MiniLM-L6-v2` (384维) | `simba/core/config.py:47-49` |
| 嵌入库 | FastEmbed (本地) | `simba/services/embedding_service.py` |
| 分块策略 | 英文分隔符 | `simba/services/chunker_service.py:37` |
| 重排序 | `ms-marco-MiniLM-L-6-v2` | `simba/core/config.py:61` |

### 3.2 改动对比

| 组件 | 当前 | 更改后 |
|------|------|--------|
| 嵌入服务 | FastEmbed 本地 | vLLM API |
| 嵌入模型 | `all-MiniLM-L6-v2` | `Qwen3-Embedding-0.6B` |
| 嵌入维度 | 384 | 1024 |
| 重排序服务 | 本地 CrossEncoder | vLLM API |
| 重排序模型 | `ms-marco-MiniLM-L-6-v2` | `Qwen3-Reranker-4B` |
| 分块策略 | 英文分隔符 | 中英文混合分隔符 |

---

## 4. vLLM 服务端部署

### 4.1 安装 vLLM

```bash
pip install vllm
```

### 4.2 部署 Embedding 服务

```bash
vllm serve Qwen/Qwen3-Embedding-0.6B \
  --task embed \
  --host 0.0.0.0 \
  --port 8001 \
  --api-key token-abc123
```

### 4.3 部署 Reranker 服务

```bash
vllm serve Qwen/Qwen3-Reranker-4B \
  --task score \
  --host 0.0.0.0 \
  --port 8002 \
  --api-key token-abc123 \
  --hf-overrides '{
    "architectures": ["Qwen3ForSequenceClassification"],
    "classifier_from_token": ["no", "yes"],
    "is_original_qwen3_reranker": true
  }'
```

### 4.4 验证服务

```bash
# 测试 Embedding API
curl http://your-server:8001/v1/embeddings \
  -H "Authorization: Bearer token-abc123" \
  -H "Content-Type: application/json" \
  -d '{"model": "Qwen/Qwen3-Embedding-0.6B", "input": "测试文本"}'

# 测试 Rerank API
curl http://your-server:8002/v1/rerank \
  -H "Authorization: Bearer token-abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-Reranker-4B",
    "query": "什么是退货政策",
    "documents": ["退货需在30天内", "免费配送", "支持货到付款"]
  }'
```

### 4.5 硬件需求

| 模型 | 显存 (FP16) | 显存 (INT8) | 推荐 GPU |
|------|-------------|-------------|----------|
| Qwen3-Embedding-0.6B | ~2GB | ~1GB | RTX 3060+ |
| Qwen3-Reranker-4B | ~10GB | ~5GB | RTX 3090+ |

---

## 5. Simba 后端实现

### 5.1 配置更新 (`simba/core/config.py`)

```python
class Settings(BaseSettings):
    # ... 现有配置 ...

    # vLLM 服务配置
    vllm_base_url: str = "http://localhost:8001/v1"
    vllm_api_key: str = "token-abc123"

    # Reranker 服务配置（如果独立端口）
    reranker_base_url: str = "http://localhost:8002/v1"
    reranker_api_key: str = "token-abc123"

    # 嵌入配置
    embedding_provider: str = "vllm"  # "vllm", "openai", "fastembed"
    embedding_model: str = "Qwen/Qwen3-Embedding-0.6B"
    embedding_dimensions: int = 1024

    # 重排序配置
    reranker_provider: str = "vllm"  # "vllm", "local"
    reranker_model: str = "Qwen/Qwen3-Reranker-4B"
    reranker_top_k: int = 5
```

### 5.2 嵌入服务重构 (`simba/services/embedding_service.py`)

```python
"""Embedding service with vLLM, OpenAI, and FastEmbed support."""

import logging
from functools import lru_cache
from typing import Protocol

from cachetools import TTLCache

from simba.core.config import settings
from simba.services.metrics_service import EMBEDDING_LATENCY, track_latency

logger = logging.getLogger(__name__)

# TTL cache for query embeddings (5 min TTL, max 1000 entries)
_embedding_cache: TTLCache = TTLCache(maxsize=1000, ttl=300)


class EmbeddingModel(Protocol):
    """Protocol for embedding models."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    def embed_query(self, text: str) -> list[float]: ...


@lru_cache
def get_embedding_model() -> EmbeddingModel:
    """Get cached embedding model instance based on provider setting."""
    provider = settings.embedding_provider

    if provider == "vllm":
        from langchain_openai import OpenAIEmbeddings

        logger.info(f"Using vLLM embeddings: {settings.embedding_model}")
        return OpenAIEmbeddings(
            model=settings.embedding_model,
            openai_api_base=settings.vllm_base_url,
            openai_api_key=settings.vllm_api_key,
            dimensions=settings.embedding_dimensions,
        )

    elif provider == "openai":
        from langchain_openai import OpenAIEmbeddings

        logger.info(f"Using OpenAI embeddings: {settings.embedding_model}")
        return OpenAIEmbeddings(
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
        )

    else:  # fastembed
        from fastembed import TextEmbedding

        logger.info(f"Using FastEmbed: {settings.embedding_model}")
        return _FastEmbedWrapper(TextEmbedding(model_name=settings.embedding_model))


class _FastEmbedWrapper:
    """Wrapper to make FastEmbed compatible with LangChain interface."""

    def __init__(self, model):
        self._model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [e.tolist() for e in self._model.embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        return list(self._model.embed([text]))[0].tolist()


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts (for documents)."""
    with track_latency(EMBEDDING_LATENCY):
        model = get_embedding_model()
        return model.embed_documents(texts)


def get_embedding(text: str) -> list[float]:
    """Generate embedding for a single text (for queries)."""
    # Check cache first
    if text in _embedding_cache:
        return _embedding_cache[text]

    with track_latency(EMBEDDING_LATENCY):
        model = get_embedding_model()
        embedding = model.embed_query(text)

    _embedding_cache[text] = embedding
    return embedding
```

### 5.3 重排序服务重构 (`simba/services/reranker_service.py`)

```python
"""Reranker service with vLLM and local model support."""

import logging
from functools import lru_cache
from typing import Protocol

import httpx
from sentence_transformers import CrossEncoder

from simba.core.config import settings

logger = logging.getLogger(__name__)


class Reranker(Protocol):
    """Protocol for reranker models."""

    def rerank(
        self, query: str, documents: list[str], top_k: int
    ) -> list[tuple[int, float]]: ...


@lru_cache
def get_reranker() -> Reranker:
    """Get reranker instance based on provider setting."""
    provider = settings.reranker_provider

    if provider == "vllm":
        logger.info(f"Using vLLM reranker: {settings.reranker_model}")
        return _VLLMReranker(
            base_url=settings.reranker_base_url,
            api_key=settings.reranker_api_key,
            model=settings.reranker_model,
        )
    else:
        logger.info(f"Using local reranker: {settings.reranker_model}")
        return _LocalReranker(settings.reranker_model)


class _VLLMReranker:
    """vLLM-based reranker using OpenAI-compatible API."""

    def __init__(self, base_url: str, api_key: str, model: str):
        self.base_url = base_url
        self.api_key = api_key
        self.model = model
        self._client = httpx.Client(timeout=30.0)

    def rerank(
        self, query: str, documents: list[str], top_k: int = 5
    ) -> list[tuple[int, float]]:
        """Rerank documents using vLLM rerank API."""
        if not documents:
            return []

        response = self._client.post(
            f"{self.base_url}/rerank",
            json={
                "model": self.model,
                "query": query,
                "documents": documents,
                "top_n": top_k,
            },
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        response.raise_for_status()

        results = response.json()["results"]
        # 返回 (index, score) 元组列表，按 score 降序
        return [(r["index"], r["relevance_score"]) for r in results]


class _LocalReranker:
    """Local cross-encoder reranker."""

    def __init__(self, model_name: str):
        trust_remote_code = "bge-reranker" in model_name.lower()
        self._model = CrossEncoder(
            model_name,
            device="mps",  # macOS; use "cuda" for NVIDIA, "cpu" for CPU
            trust_remote_code=trust_remote_code,
        )

    def rerank(
        self, query: str, documents: list[str], top_k: int = 5
    ) -> list[tuple[int, float]]:
        """Rerank documents using local cross-encoder."""
        if not documents:
            return []

        pairs = [(query, doc) for doc in documents]
        scores = self._model.predict(pairs)

        indexed_scores = list(enumerate(scores))
        indexed_scores.sort(key=lambda x: x[1], reverse=True)

        return indexed_scores[:top_k]


def rerank(
    query: str,
    documents: list[str],
    top_k: int | None = None,
) -> list[tuple[int, float]]:
    """Rerank documents by relevance to query.

    Returns:
        List of (document_index, score) tuples, sorted by score descending.
    """
    top_k = top_k or settings.reranker_top_k
    reranker = get_reranker()
    return reranker.rerank(query, documents, top_k)
```

### 5.4 分块服务更新 (`simba/services/chunker_service.py`)

```python
"""Text chunking service with multilingual support."""

from dataclasses import dataclass
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 中英文混合分隔符
MULTILINGUAL_SEPARATORS = [
    "\n\n",           # 段落分隔
    "\n",             # 换行
    "。",             # 中文句号 (U+3002)
    "！",             # 中文感叹号 (U+FF01)
    "？",             # 中文问号 (U+FF1F)
    "；",             # 中文分号 (U+FF1B)
    "，",             # 中文逗号 (U+FF0C)
    ". ",             # 英文句号
    ", ",             # 英文逗号
    " ",              # 空格 (英文词边界)
    "",               # 最终回退
]


@dataclass
class Chunk:
    """Represents a text chunk with metadata."""
    content: str
    position: int
    start_char: int
    end_char: int


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[Chunk]:
    """Split text into chunks with multilingual support."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=MULTILINGUAL_SEPARATORS,
        keep_separator=False,  # 避免标点出现在块首
    )

    docs = splitter.create_documents([text])

    chunks = []
    current_pos = 0

    for i, doc in enumerate(docs):
        content = doc.page_content
        start_char = text.find(content, current_pos)
        if start_char == -1:
            start_char = current_pos
        end_char = start_char + len(content)

        chunks.append(Chunk(
            content=content,
            position=i,
            start_char=start_char,
            end_char=end_char,
        ))

        current_pos = max(start_char + 1, end_char - chunk_overlap)

    return chunks


def chunk_text_simple(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[str]:
    """Split text into chunks (simple version returning just strings)."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=MULTILINGUAL_SEPARATORS,
        keep_separator=False,
    )

    return splitter.split_text(text)
```

### 5.5 系统提示词更新 (`simba/services/chat_service.py`)

```python
SYSTEM_PROMPT = """You are Simba, a customer service assistant.

## Tone
- Warm but professional
- Confident: state facts clearly, admit uncertainty honestly
- Action-oriented: tell users what they CAN do

## Language
- **Match user language**: respond in Chinese if user writes Chinese, English if English
- For mixed-language queries, prefer the dominant language
- Keep terminology consistent within the conversation

## Search Strategy
Use the rag tool to search for information. Before saying info doesn't exist:
- Try 2-3 different search queries with synonyms and alternative phrasings
- For Chinese queries, also try English keywords if relevant
- For English queries, try Chinese keywords if the knowledge base contains Chinese content

## Response Guidelines
- Be concise: 2-4 sentences for simple questions
- Start with the answer, add details only if needed
- Cite sources when helpful
- If info isn't found after multiple searches, offer alternatives

## Never Do This
- Start with "I apologize" / "抱歉" unless genuinely warranted
- Use filler phrases like "Great question!" / "好问题！"
- Repeat the question back
- End with "Is there anything else?" / "还有什么可以帮您的吗？"
"""
```

---

## 6. 环境配置

### 6.1 环境变量 (`.env`)

```bash
# vLLM 服务配置
VLLM_BASE_URL=http://your-vllm-server:8001/v1
VLLM_API_KEY=token-abc123

# Reranker 服务配置（如果独立端口）
RERANKER_BASE_URL=http://your-vllm-server:8002/v1
RERANKER_API_KEY=token-abc123

# 嵌入配置
EMBEDDING_PROVIDER=vllm
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-0.6B
EMBEDDING_DIMENSIONS=1024

# 重排序配置
RERANKER_PROVIDER=vllm
RERANKER_MODEL=Qwen/Qwen3-Reranker-4B
RERANKER_TOP_K=5
```

### 6.2 更新 `.env.example`

```bash
# vLLM 服务配置
VLLM_BASE_URL=http://localhost:8001/v1
VLLM_API_KEY=token-abc123
RERANKER_BASE_URL=http://localhost:8002/v1
RERANKER_API_KEY=token-abc123

# 嵌入配置
# Provider: "vllm", "openai", "fastembed"
EMBEDDING_PROVIDER=vllm
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-0.6B
EMBEDDING_DIMENSIONS=1024

# 重排序配置
# Provider: "vllm", "local"
RERANKER_PROVIDER=vllm
RERANKER_MODEL=Qwen/Qwen3-Reranker-4B
RERANKER_TOP_K=5
```

---

## 7. 数据迁移

由于嵌入维度从 384 变为 1024，需要重新摄取所有文档。

### 7.1 迁移步骤

```bash
# 1. 确保 vLLM 服务已启动
curl http://your-vllm-server:8001/health

# 2. 停止 Simba 服务
make down

# 3. 更新 .env 配置

# 4. 启动基础设施
make services

# 5. 删除旧的 Qdrant 集合（可选，首次会自动创建新集合）
# 通过 Qdrant API 或 Dashboard

# 6. 启动 Simba 服务
make server
make celery

# 7. 重新上传文档
# 通过前端或 API
```

### 7.2 Qdrant 集合更新

新集合将使用 1024 维向量，配置在 `simba/services/qdrant_service.py` 中自动处理。

---

## 8. 验证方案

### 8.1 启动服务

```bash
# 启动基础设施
make services

# 启动 API 服务
make server

# 启动 Celery (文档摄取)
make celery
```

### 8.2 测试中文查询

```bash
# 创建对话并测试中文
curl -X POST http://localhost:8000/api/v1/conversations/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "退货政策是什么？",
    "thread_id": "test-chinese"
  }'
```

### 8.3 测试流式响应

```bash
curl -N http://localhost:8000/api/v1/conversations/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "如何联系客服？",
    "thread_id": "test-stream"
  }'
```

### 8.4 运行评估

```bash
make evaluate
make evaluate-rerank
```

---

## 9. 成本分析

### 9.1 自托管 vs 云 API

| 项目 | vLLM 自托管 | OpenAI API |
|------|-------------|------------|
| 嵌入调用 | 免费 | $0.02/1M tokens |
| 重排序调用 | 免费 | $1/1K queries (Cohere) |
| 月度 10K 查询 | $0 | ~$10+ |
| 硬件成本 | GPU 服务器 | 无 |

### 9.2 硬件投资回报

假设 GPU 服务器成本 $200/月：
- 月度 100K 查询即可回本
- 超过此量级，自托管更经济

---

## 10. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| vLLM 服务不可用 | 中 | 高 | 健康检查 + 自动重启 + 备用 OpenAI |
| 模型下载失败 | 低 | 中 | 预下载到本地，使用离线模式 |
| 中文检索质量不佳 | 低 | 中 | A/B 测试，可切换模型 |
| 数据迁移失败 | 低 | 高 | 迁移前备份 Qdrant 数据 |

### 10.1 回滚方案

```bash
# 切换回本地 FastEmbed
EMBEDDING_PROVIDER=fastembed
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSIONS=384

# 切换回本地重排序
RERANKER_PROVIDER=local
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
```

---

## 11. 文件修改清单

| 文件 | 改动类型 | 改动内容 |
|------|----------|----------|
| `simba/core/config.py` | 修改 | 添加 vLLM 配置项 |
| `simba/services/embedding_service.py` | 重构 | 支持 vLLM/OpenAI/FastEmbed |
| `simba/services/reranker_service.py` | 重构 | 支持 vLLM/Local |
| `simba/services/chunker_service.py` | 修改 | 添加中文分隔符 |
| `simba/services/chat_service.py` | 修改 | 更新双语系统提示词 |
| `.env.example` | 修改 | 添加新环境变量文档 |

---

## 附录 A: 中文分隔符说明

| 字符 | Unicode | 名称 | 用途 |
|------|---------|------|------|
| 。 | U+3002 | 句号 | 句子边界 |
| ！ | U+FF01 | 感叹号 | 句子边界 |
| ？ | U+FF1F | 问号 | 句子边界 |
| ； | U+FF1B | 分号 | 复句分隔 |
| ， | U+FF0C | 逗号 | 短语分隔 |

## 附录 B: vLLM API 参考

### Embedding API

```bash
POST /v1/embeddings
{
  "model": "Qwen/Qwen3-Embedding-0.6B",
  "input": ["文本1", "文本2"]
}

# 响应
{
  "data": [
    {"embedding": [...], "index": 0},
    {"embedding": [...], "index": 1}
  ]
}
```

### Rerank API

```bash
POST /v1/rerank
{
  "model": "Qwen/Qwen3-Reranker-4B",
  "query": "查询文本",
  "documents": ["文档1", "文档2", "文档3"],
  "top_n": 3
}

# 响应
{
  "results": [
    {"index": 0, "relevance_score": 0.95},
    {"index": 2, "relevance_score": 0.82},
    {"index": 1, "relevance_score": 0.45}
  ]
}
```

## 附录 C: Qwen3 模型性能基准

基于 MTEB 多语言基准测试 (2025年6月):

| 模型 | 平均分 | 检索 | 重排序 |
|------|--------|------|--------|
| Qwen3-Embedding-8B | 70.58 | 72.1 | - |
| Qwen3-Embedding-0.6B | 66.2 | 67.8 | - |
| Qwen3-Reranker-4B | - | - | 顶级 |
| text-embedding-3-large | 64.6 | 66.3 | - |
| bge-m3 | 66.1 | 68.2 | - |
