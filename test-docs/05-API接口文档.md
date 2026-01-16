# 智云科技 API 接口文档

## 概述

智云科技提供完整的RESTful API接口，方便开发者将智能客服功能集成到自己的应用中。本文档详细介绍各接口的使用方法。

## 认证方式

所有API请求都需要在Header中携带认证信息：

```
Authorization: Bearer {your_api_key}
Content-Type: application/json
```

API Key可在"系统设置 > API管理"页面获取。

## 接口列表

### 1. 发送消息接口

**接口地址：** `POST /api/v1/messages`

**功能说明：** 向智能客服发送用户消息，获取智能回复。

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| conversation_id | string | 是 | 会话ID |
| message | string | 是 | 用户消息内容 |
| user_id | string | 否 | 用户标识 |
| metadata | object | 否 | 附加信息 |

**请求示例：**

```json
{
    "conversation_id": "conv_123456",
    "message": "你好，我想咨询一下产品价格",
    "user_id": "user_789",
    "metadata": {
        "source": "website",
        "page": "product_detail"
    }
}
```

**响应参数：**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | int | 状态码，200表示成功 |
| message | string | 状态描述 |
| data.reply | string | 智能回复内容 |
| data.confidence | float | 置信度（0-1） |
| data.sources | array | 引用的知识来源 |

**响应示例：**

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "reply": "您好！感谢您的咨询。我们的产品有多个版本...",
        "confidence": 0.95,
        "sources": [
            {
                "title": "产品定价说明",
                "id": "kb_001"
            }
        ]
    }
}
```

### 2. 创建会话接口

**接口地址：** `POST /api/v1/conversations`

**功能说明：** 创建新的客服会话。

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户标识 |
| channel | string | 是 | 渠道来源 |
| user_info | object | 否 | 用户信息 |

**请求示例：**

```json
{
    "user_id": "user_789",
    "channel": "website",
    "user_info": {
        "name": "张三",
        "phone": "13800138000"
    }
}
```

**响应示例：**

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "conversation_id": "conv_123456",
        "created_at": "2024-01-15T10:30:00Z"
    }
}
```

### 3. 获取会话历史接口

**接口地址：** `GET /api/v1/conversations/{conversation_id}/messages`

**功能说明：** 获取指定会话的历史消息记录。

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | int | 否 | 页码，默认1 |
| page_size | int | 否 | 每页数量，默认20 |

**响应示例：**

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "total": 15,
        "messages": [
            {
                "id": "msg_001",
                "role": "user",
                "content": "你好",
                "created_at": "2024-01-15T10:30:00Z"
            },
            {
                "id": "msg_002",
                "role": "assistant",
                "content": "您好！有什么可以帮助您的？",
                "created_at": "2024-01-15T10:30:01Z"
            }
        ]
    }
}
```

### 4. 知识库搜索接口

**接口地址：** `GET /api/v1/knowledge/search`

**功能说明：** 搜索知识库内容。

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| query | string | 是 | 搜索关键词 |
| category_id | string | 否 | 分类ID |
| top_k | int | 否 | 返回数量，默认5 |

**响应示例：**

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "results": [
            {
                "id": "kb_001",
                "title": "产品定价说明",
                "content": "智云科技产品定价...",
                "score": 0.92
            }
        ]
    }
}
```

## 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求参数格式 |
| 401 | 认证失败 | 检查API Key是否正确 |
| 403 | 权限不足 | 联系管理员开通权限 |
| 404 | 资源不存在 | 检查请求的资源ID |
| 429 | 请求过于频繁 | 降低请求频率 |
| 500 | 服务器内部错误 | 联系技术支持 |

## SDK下载

我们提供多种语言的SDK，方便快速集成：

- Python: `pip install zhiyun-sdk`
- Java: Maven仓库
- Node.js: `npm install zhiyun-sdk`
- Go: `go get github.com/zhiyuntech/sdk-go`

如有任何问题，请联系技术支持：api-support@zhiyuntech.com
