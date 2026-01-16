"""Prompt service for loading and rendering system prompts."""

import logging
import re
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

# Directory containing default prompt templates
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Default prompts (fallback if files don't exist)
DEFAULT_PROMPT_EN = """You are {{app_name}}, a helpful assistant.

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
- If info isn't found after multiple searches, offer alternatives

## Never Do This
- Start with "I apologize" unless genuinely warranted
- Use filler phrases: "Great question!", "I'd be happy to help!"
- Repeat the question back to the user
- End with "Is there anything else I can help with?"
- Say "I don't have information" without offering an alternative path
"""

DEFAULT_PROMPT_ZH = """你是 {{app_name}}，一个有帮助的助手。

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
- 如果多次搜索后仍未找到信息，提供替代方案

## 禁止事项
- 不要以"我道歉"开头（除非真正需要）
- 不要使用填充语："好问题！"、"我很乐意帮助！"
- 不要重复用户的问题
- 不要以"还有什么可以帮您的吗？"结尾
- 不要说"我没有信息"而不提供替代方案
"""


@lru_cache(maxsize=4)
def load_default_prompt(language: str = "en") -> str:
    """Load default prompt template for the specified language.

    Args:
        language: Language code ('en' or 'zh').

    Returns:
        The default prompt template string.
    """
    filename = f"default_{language}.txt"
    filepath = PROMPTS_DIR / filename

    if filepath.exists():
        logger.debug(f"[Prompt] Loading prompt from {filepath}")
        return filepath.read_text(encoding="utf-8")

    # Fallback to hardcoded defaults
    logger.debug(f"[Prompt] Using hardcoded default for {language}")
    if language == "zh":
        return DEFAULT_PROMPT_ZH
    return DEFAULT_PROMPT_EN


def render_prompt(template: str, variables: dict[str, str]) -> str:
    """Render a prompt template with variables.

    Supports {{variable_name}} syntax for variable substitution.

    Args:
        template: The prompt template string.
        variables: Dictionary of variable names to values.

    Returns:
        The rendered prompt with variables replaced.

    Example:
        >>> render_prompt("Hello {{name}}!", {"name": "World"})
        'Hello World!'
    """

    def replace_var(match: re.Match) -> str:
        var_name = match.group(1)
        return str(variables.get(var_name, match.group(0)))

    return re.sub(r"\{\{(\w+)\}\}", replace_var, template)


def detect_language(text: str) -> str:
    """Detect if text is primarily Chinese or English.

    Uses a simple heuristic based on the proportion of Chinese characters.

    Args:
        text: The text to analyze.

    Returns:
        'zh' for Chinese, 'en' for English (default).
    """
    if not text or not text.strip():
        return "en"

    # Count Chinese characters (CJK Unified Ideographs range)
    chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
    total_chars = len(text.strip())

    # If more than 10% Chinese characters, consider it Chinese
    if chinese_chars / total_chars > 0.1:
        logger.debug(
            f"[Prompt] Detected language: zh (chinese_ratio={chinese_chars / total_chars:.2f})"
        )
        return "zh"

    logger.debug("[Prompt] Detected language: en")
    return "en"


def get_default_prompts() -> dict[str, str]:
    """Get all default prompts.

    Returns:
        Dictionary with 'en' and 'zh' keys containing default prompts.
    """
    return {
        "en": load_default_prompt("en"),
        "zh": load_default_prompt("zh"),
    }
