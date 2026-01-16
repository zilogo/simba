"""Text chunking service with Chinese language support."""

import re
from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

# Default separators for pure English/Latin text
DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]

# Mixed Chinese-English separators (handles both languages properly)
# Order matters: longer/stronger separators first
MIXED_SEPARATORS = [
    "\n\n",
    "\n",
    # Chinese sentence-ending punctuation
    "。",  # Chinese period
    "！",  # Chinese exclamation mark
    "？",  # Chinese question mark
    # English sentence-ending punctuation
    ". ",
    "! ",
    "? ",
    # Chinese clause-level punctuation
    "；",  # Chinese semicolon
    "：",  # Chinese colon
    # English clause-level punctuation
    "; ",
    ": ",
    # Commas (weaker breaks)
    "，",  # Chinese comma
    "、",  # Chinese enumeration comma
    ", ",  # English comma
    # Fallback
    " ",
    "",
]

# Regex pattern to detect Chinese characters
CHINESE_CHAR_PATTERN = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")


@dataclass
class Chunk:
    """Represents a text chunk with metadata."""

    content: str
    position: int  # Position in the original document (0-indexed)
    start_char: int  # Starting character position
    end_char: int  # Ending character position


def contains_chinese(text: str) -> bool:
    """Check if text contains Chinese characters.

    Args:
        text: Text to check.

    Returns:
        True if text contains Chinese characters.
    """
    return bool(CHINESE_CHAR_PATTERN.search(text))


def get_separators(text: str) -> list[str]:
    """Get appropriate separators based on text content.

    For mixed Chinese-English content, returns separators that handle
    both languages properly.

    Args:
        text: Text to analyze.

    Returns:
        List of separators appropriate for the text.
    """
    if contains_chinese(text):
        # Use mixed separators for any text containing Chinese
        # This handles pure Chinese and mixed Chinese-English content
        return MIXED_SEPARATORS
    return DEFAULT_SEPARATORS


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[Chunk]:
    """Split text into chunks with overlap.

    Automatically detects Chinese text and uses appropriate separators.

    Args:
        text: The text to split.
        chunk_size: Maximum size of each chunk in characters.
        chunk_overlap: Number of overlapping characters between chunks.

    Returns:
        List of Chunk objects with content and metadata.
    """
    separators = get_separators(text)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=separators,
    )

    # Use create_documents to get metadata about positions
    docs = splitter.create_documents([text])

    chunks = []
    current_pos = 0

    for i, doc in enumerate(docs):
        content = doc.page_content

        # Find the actual position of this chunk in the original text
        start_char = text.find(content, current_pos)
        if start_char == -1:
            # Fallback if exact match not found
            start_char = current_pos

        end_char = start_char + len(content)

        chunks.append(
            Chunk(
                content=content,
                position=i,
                start_char=start_char,
                end_char=end_char,
            )
        )

        # Update position for next search (account for overlap)
        current_pos = max(start_char + 1, end_char - chunk_overlap)

    return chunks


def chunk_text_simple(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[str]:
    """Split text into chunks (simple version returning just strings).

    Automatically detects Chinese text and uses appropriate separators.

    Args:
        text: The text to split.
        chunk_size: Maximum size of each chunk in characters.
        chunk_overlap: Number of overlapping characters between chunks.

    Returns:
        List of chunk strings.
    """
    separators = get_separators(text)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=separators,
    )

    return splitter.split_text(text)
