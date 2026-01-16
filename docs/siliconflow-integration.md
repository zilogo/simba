# SiliconFlow 模型集成指南

本文档介绍如何在 Simba 中配置和使用 SiliconFlow 提供的 Embedding 和 Reranker 模型。

## 概述

[SiliconFlow](https://siliconflow.cn) 提供高性能、低成本的 AI 模型 API 服务，支持多种开源模型，包括：

- **Embedding 模型**: BGE 系列、Qwen 系列
- **Reranker 模型**: BGE Reranker 系列
- **LLM 模型**: Qwen、DeepSeek、GLM 等

## 获取 API Key

1. 访问 [SiliconFlow 控制台](https://cloud.siliconflow.cn)
2. 注册/登录账号
3. 在「API 密钥」页面创建新的 API Key

## 环境变量配置

在项目根目录的 `.env` 文件中添加以下配置：

```bash
# =============================================================================
# SiliconFlow 配置
# =============================================================================

# Embedding 模型
EMBEDDING_PROVIDER=api:BAAI/bge-large-zh-v1.5
EMBEDDING_BASE_URL=https://api.siliconflow.cn/v1
EMBEDDING_API_KEY=sk-your-api-key-here
EMBEDDING_DIMENSIONS=1024

# Reranker 模型
RERANKER_PROVIDER=api:BAAI/bge-reranker-v2-m3
RERANKER_BASE_URL=https://api.siliconflow.cn/v1
RERANKER_API_KEY=sk-your-api-key-here
```

## 支持的模型

### Embedding 模型

| 模型 | 维度 | 语言 | 推荐场景 |
|------|------|------|----------|
| `BAAI/bge-large-zh-v1.5` | 1024 | 中文 | 中文文档检索 |
| `BAAI/bge-large-en-v1.5` | 1024 | 英文 | 英文文档检索 |
| `BAAI/bge-m3` | 1024 | 多语言 | 多语言/混合内容 |
| `BAAI/bge-small-zh-v1.5` | 512 | 中文 | 轻量级场景 |

### Reranker 模型

| 模型 | 语言 | 推荐场景 |
|------|------|----------|
| `BAAI/bge-reranker-v2-m3` | 多语言 | 通用重排序 |
| `BAAI/bge-reranker-large` | 中英文 | 高精度场景 |

## API 格式

### Embedding API

**请求**:
```bash
curl --request POST \
  --url https://api.siliconflow.cn/v1/embeddings \
  --header 'Authorization: Bearer sk-your-api-key' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "BAAI/bge-large-zh-v1.5",
    "input": "你好，这是一个测试文本"
  }'
```

**响应**:
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.008941804, -0.021689417, ...],
      "index": 0
    }
  ],
  "model": "BAAI/bge-large-zh-v1.5",
  "usage": {
    "prompt_tokens": 10,
    "total_tokens": 10
  }
}
```

### Reranker API

**请求**:
```bash
curl --request POST \
  --url https://api.siliconflow.cn/v1/rerank \
  --header 'Authorization: Bearer sk-your-api-key' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "BAAI/bge-reranker-v2-m3",
    "query": "什么是人工智能？",
    "documents": [
      "人工智能是计算机科学的一个分支...",
      "今天天气很好...",
      "机器学习是人工智能的子领域..."
    ]
  }'
```

**响应**:
```json
{
  "results": [
    {"index": 0, "relevance_score": 0.9987},
    {"index": 2, "relevance_score": 0.1874},
    {"index": 1, "relevance_score": 0.0000}
  ],
  "usage": {
    "total_tokens": 100
  }
}
```

## 代码示例

### Python 直接调用

```python
import httpx

# Embedding
response = httpx.post(
    "https://api.siliconflow.cn/v1/embeddings",
    headers={"Authorization": "Bearer sk-your-api-key"},
    json={
        "model": "BAAI/bge-large-zh-v1.5",
        "input": "你好世界"
    }
)
embedding = response.json()["data"][0]["embedding"]

# Reranker
response = httpx.post(
    "https://api.siliconflow.cn/v1/rerank",
    headers={"Authorization": "Bearer sk-your-api-key"},
    json={
        "model": "BAAI/bge-reranker-v2-m3",
        "query": "什么是机器学习？",
        "documents": ["文档1...", "文档2...", "文档3..."]
    }
)
results = response.json()["results"]
```

### 使用 Simba 服务

```python
from simba.services.embedding_service import get_embedding, get_embeddings
from simba.services.reranker_service import rerank_chunks

# 获取单个文本的 embedding
embedding = get_embedding("你好世界")

# 批量获取 embeddings
embeddings = get_embeddings(["文本1", "文本2", "文本3"])

# 使用 reranker（需要 RetrievedChunk 对象）
reranked = rerank_chunks(query="查询", chunks=chunks, top_k=5)
```

## 配置组合推荐

### 中文场景（推荐）

```bash
EMBEDDING_PROVIDER=api:BAAI/bge-large-zh-v1.5
EMBEDDING_DIMENSIONS=1024
RERANKER_PROVIDER=api:BAAI/bge-reranker-v2-m3
```

### 多语言场景

```bash
EMBEDDING_PROVIDER=api:BAAI/bge-m3
EMBEDDING_DIMENSIONS=1024
RERANKER_PROVIDER=api:BAAI/bge-reranker-v2-m3
```

### 轻量级场景

```bash
EMBEDDING_PROVIDER=api:BAAI/bge-small-zh-v1.5
EMBEDDING_DIMENSIONS=512
RERANKER_PROVIDER=api:BAAI/bge-reranker-v2-m3
```

## 注意事项

1. **API Key 安全**: 不要将 API Key 提交到代码仓库，使用环境变量管理
2. **维度匹配**: `EMBEDDING_DIMENSIONS` 必须与所选模型的输出维度匹配
3. **费用控制**: SiliconFlow 按 token 计费，注意监控使用量
4. **速率限制**: 注意 API 的速率限制，必要时添加重试逻辑

## 与其他提供商对比

| 特性 | SiliconFlow | OpenAI | 自托管 (vLLM) |
|------|-------------|--------|---------------|
| 中文模型 | BGE 系列 | text-embedding-3 | 任意模型 |
| Reranker | 支持 | 不支持 | 支持 |
| 成本 | 低 | 中等 | 硬件成本 |
| 延迟 | 低 | 中等 | 最低 |
| 私有化 | 否 | 否 | 是 |

## 故障排查

### 常见错误

1. **401 Unauthorized**: API Key 无效或过期
2. **429 Too Many Requests**: 超过速率限制，稍后重试
3. **400 Bad Request**: 检查请求参数格式

### 调试方法

```bash
# 测试 Embedding API
curl -v https://api.siliconflow.cn/v1/embeddings \
  -H "Authorization: Bearer $EMBEDDING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "BAAI/bge-large-zh-v1.5", "input": "test"}'

# 测试 Reranker API
curl -v https://api.siliconflow.cn/v1/rerank \
  -H "Authorization: Bearer $RERANKER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "BAAI/bge-reranker-v2-m3", "query": "test", "documents": ["doc1", "doc2"]}'
```

## 相关链接

- [SiliconFlow 官网](https://siliconflow.cn)
- [SiliconFlow API 文档](https://docs.siliconflow.cn)
- [BGE 模型介绍](https://huggingface.co/BAAI/bge-large-zh-v1.5)
