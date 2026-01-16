"""BM25 keyword search service with Chinese language support."""

import logging
import re
from dataclasses import dataclass
from typing import Any

import jieba
from rank_bm25 import BM25Okapi

logger = logging.getLogger(__name__)

# Regex pattern to detect Chinese characters
CHINESE_CHAR_PATTERN = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")


@dataclass
class BM25SearchResult:
    """Result from BM25 search."""

    index: int  # Index in the original corpus
    score: float  # BM25 score
    text: str  # Original document text


class BM25Index:
    """BM25 index for keyword-based search.

    Automatically handles Chinese text tokenization using jieba.
    """

    def __init__(self, documents: list[str]):
        """Initialize BM25 index.

        Args:
            documents: List of document texts to index.
        """
        self._documents = documents
        self._tokenized_corpus = [self._tokenize(doc) for doc in documents]
        self._bm25 = BM25Okapi(self._tokenized_corpus)
        logger.info(f"BM25 index built with {len(documents)} documents")

    def _contains_chinese(self, text: str) -> bool:
        """Check if text contains Chinese characters."""
        return bool(CHINESE_CHAR_PATTERN.search(text))

    def _tokenize(self, text: str) -> list[str]:
        """Tokenize text with intelligent Chinese-English handling.

        For mixed content, separates Chinese and English segments and uses
        the appropriate tokenizer for each:
        - Chinese segments: jieba
        - English segments: regex word boundaries + lowercase normalization

        Args:
            text: Text to tokenize.

        Returns:
            List of tokens (English tokens are lowercased).
        """
        if not self._contains_chinese(text):
            # Pure English: simple whitespace + punctuation tokenization
            tokens = re.findall(r"\b\w+\b", text.lower())
            return [t.strip() for t in tokens if t.strip()]

        # Mixed or Chinese text: separate and tokenize each segment appropriately
        tokens = []
        # Split by Chinese character sequences, keeping the delimiters
        segments = re.split(r"([\u4e00-\u9fff\u3400-\u4dbf]+)", text)

        for segment in segments:
            if not segment.strip():
                continue
            if self._contains_chinese(segment):
                # Chinese segment: use jieba
                tokens.extend(jieba.cut(segment))
            else:
                # English segment: regex + lowercase
                tokens.extend(re.findall(r"\b\w+\b", segment.lower()))

        # Filter empty tokens
        return [t.strip() for t in tokens if t.strip()]

    def search(self, query: str, top_k: int = 10) -> list[BM25SearchResult]:
        """Search the index with a query.

        Args:
            query: Search query.
            top_k: Number of top results to return.

        Returns:
            List of search results sorted by score (descending).
        """
        query_tokens = self._tokenize(query)
        scores = self._bm25.get_scores(query_tokens)

        # Get top-k indices sorted by score
        scored_indices = sorted(
            enumerate(scores),
            key=lambda x: x[1],
            reverse=True,
        )[:top_k]

        results = []
        for idx, score in scored_indices:
            if score > 0:  # Only include results with positive scores
                results.append(
                    BM25SearchResult(
                        index=idx,
                        score=float(score),
                        text=self._documents[idx],
                    )
                )

        return results

    def get_document(self, index: int) -> str:
        """Get document by index."""
        return self._documents[index]

    @property
    def document_count(self) -> int:
        """Number of documents in the index."""
        return len(self._documents)


# --- Collection-based BM25 Index Cache ---

_bm25_indices: dict[str, BM25Index] = {}


def get_bm25_index(collection_name: str) -> BM25Index | None:
    """Get BM25 index for a collection.

    Args:
        collection_name: Name of the collection.

    Returns:
        BM25Index if exists, None otherwise.
    """
    return _bm25_indices.get(collection_name)


def build_bm25_index(collection_name: str, documents: list[str]) -> BM25Index:
    """Build and cache BM25 index for a collection.

    Args:
        collection_name: Name of the collection.
        documents: List of document texts to index.

    Returns:
        Built BM25Index.
    """
    index = BM25Index(documents)
    _bm25_indices[collection_name] = index
    logger.info(f"Built BM25 index for collection '{collection_name}' with {len(documents)} docs")
    return index


def clear_bm25_index(collection_name: str) -> None:
    """Clear BM25 index for a collection.

    Args:
        collection_name: Name of the collection.
    """
    if collection_name in _bm25_indices:
        del _bm25_indices[collection_name]
        logger.info(f"Cleared BM25 index for collection '{collection_name}'")


def bm25_search(
    collection_name: str,
    query: str,
    top_k: int = 10,
) -> list[BM25SearchResult]:
    """Search a collection using BM25.

    Args:
        collection_name: Name of the collection to search.
        query: Search query.
        top_k: Number of top results to return.

    Returns:
        List of search results, empty if index doesn't exist.
    """
    index = get_bm25_index(collection_name)
    if index is None:
        logger.warning(f"BM25 index not found for collection '{collection_name}'")
        return []

    return index.search(query, top_k)


# --- Reciprocal Rank Fusion (RRF) ---


def rrf_fusion(
    results_list: list[list[tuple[Any, float]]],
    k: int = 60,
) -> list[tuple[Any, float]]:
    """Combine multiple ranked lists using Reciprocal Rank Fusion.

    RRF score = sum(1 / (k + rank_i)) for each result list

    Args:
        results_list: List of ranked results, each item is (doc_id, score).
        k: RRF constant (default 60, as per original paper).

    Returns:
        Fused results sorted by combined RRF score.
    """
    rrf_scores: dict[Any, float] = {}

    for results in results_list:
        for rank, (doc_id, _original_score) in enumerate(results):
            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = 0.0
            rrf_scores[doc_id] += 1 / (k + rank + 1)  # rank is 0-indexed

    # Sort by RRF score
    fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return fused
