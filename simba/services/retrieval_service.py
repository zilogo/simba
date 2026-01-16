"""Retrieval service for RAG queries with hybrid search support."""

import logging
import time
from dataclasses import dataclass
from typing import TypedDict

from qdrant_client.http.exceptions import UnexpectedResponse

from simba.core.config import settings
from simba.services import bm25_service, embedding_service, qdrant_service
from simba.services.metrics_service import RETRIEVAL_LATENCY, track_latency

logger = logging.getLogger(__name__)


class LatencyBreakdown(TypedDict, total=False):
    """Latency breakdown for retrieval operations."""

    embedding_ms: float
    sparse_embedding_ms: float
    bm25_ms: float
    search_ms: float
    rerank_ms: float
    total_ms: float


@dataclass
class RetrievedChunk:
    """Represents a retrieved chunk from the vector store."""

    document_id: str
    document_name: str
    chunk_text: str
    chunk_position: int
    score: float


def retrieve(
    query: str,
    collection_name: str,
    limit: int | None = None,
    min_score: float | None = None,
    rerank: bool | None = None,
    hybrid: bool | None = None,
    return_latency: bool = False,
) -> list[RetrievedChunk] | tuple[list[RetrievedChunk], LatencyBreakdown]:
    """Retrieve relevant chunks for a query.

    Args:
        query: The search query.
        collection_name: Name of the collection to search.
        limit: Maximum number of results. Defaults to settings.retrieval_limit.
        min_score: Minimum similarity score threshold. Defaults to settings.retrieval_min_score.
        rerank: Whether to apply cross-encoder reranking. Defaults to settings.retrieval_rerank.
        hybrid: Whether to use hybrid search (dense + sparse). Defaults to settings.retrieval_hybrid.
        return_latency: Whether to return latency breakdown.

    Returns:
        List of retrieved chunks sorted by relevance.
        If return_latency=True, returns tuple of (chunks, latency_breakdown).
    """
    # Use config defaults if not specified
    limit = limit if limit is not None else settings.retrieval_limit
    min_score = min_score if min_score is not None else settings.retrieval_min_score
    rerank = rerank if rerank is not None else settings.retrieval_rerank
    hybrid = hybrid if hybrid is not None else settings.retrieval_hybrid

    # Debug logging
    logger.info("[Retrieval] === Starting retrieval ===")
    logger.info(f"[Retrieval] Collection: {collection_name}")
    logger.info(f"[Retrieval] Query: {query[:100]}...")
    logger.info(
        f"[Retrieval] Settings: min_score={min_score}, limit={limit}, rerank={rerank}, hybrid={hybrid}"
    )

    latency: LatencyBreakdown = {}
    total_start = time.perf_counter()

    with track_latency(RETRIEVAL_LATENCY):
        # Generate dense query embedding
        embed_start = time.perf_counter()
        query_dense = embedding_service.get_embedding(query)
        latency["embedding_ms"] = (time.perf_counter() - embed_start) * 1000
        logger.info(f"[Retrieval] Generated embedding in {latency['embedding_ms']:.1f}ms")

        # Search Qdrant - fetch more results if reranking or hybrid
        search_limit = limit * 4 if (rerank or hybrid) else limit
        logger.info(f"[Retrieval] Searching Qdrant with limit={search_limit}")

        search_start = time.perf_counter()
        try:
            results = qdrant_service.search(
                collection_name=collection_name,
                query_vector=query_dense,
                limit=search_limit,
            )
        except UnexpectedResponse as e:
            # Collection doesn't exist
            logger.error(f"[Retrieval] COLLECTION NOT FOUND: {collection_name}")
            logger.error(f"[Retrieval] Error: {e}")
            if return_latency:
                latency["search_ms"] = (time.perf_counter() - search_start) * 1000
                latency["total_ms"] = (time.perf_counter() - total_start) * 1000
                return [], latency
            return []
        latency["search_ms"] = (time.perf_counter() - search_start) * 1000

        # Log raw results from Qdrant
        logger.info(f"[Retrieval] Raw dense results from Qdrant: {len(results)}")

        # BM25 hybrid search if enabled
        bm25_results = []
        if hybrid:
            bm25_start = time.perf_counter()
            bm25_hits = bm25_service.bm25_search(
                collection_name=collection_name,
                query=query,
                top_k=search_limit,
            )
            latency["bm25_ms"] = (time.perf_counter() - bm25_start) * 1000
            logger.info(f"[Retrieval] BM25 results: {len(bm25_hits)} in {latency['bm25_ms']:.1f}ms")
            bm25_results = bm25_hits

        # Fuse dense and BM25 results using RRF if hybrid enabled
        if hybrid and bm25_results:
            # Create ranked lists for RRF fusion
            # Dense results: (chunk_text, score)
            dense_ranked = [(r["payload"].get("chunk_text", ""), r["score"]) for r in results]
            # BM25 results: (chunk_text, score)
            bm25_ranked = [(hit.text, hit.score) for hit in bm25_results]

            # Apply RRF fusion
            fused = bm25_service.rrf_fusion([dense_ranked, bm25_ranked])
            logger.info(f"[Retrieval] RRF fused results: {len(fused)}")

            # Build a lookup for chunk_text -> full result data
            chunk_to_result = {}
            for r in results:
                chunk_text = r["payload"].get("chunk_text", "")
                if chunk_text not in chunk_to_result:
                    chunk_to_result[chunk_text] = r

            # Rebuild results list in RRF order
            fused_results = []
            for chunk_text, rrf_score in fused[:search_limit]:
                if chunk_text in chunk_to_result:
                    result = chunk_to_result[chunk_text].copy()
                    result["score"] = rrf_score  # Use RRF score
                    fused_results.append(result)
            results = fused_results
            logger.info(f"[Retrieval] After RRF fusion: {len(results)} results")

        # Log raw results
        logger.info(f"[Retrieval] Raw results: {len(results)}")
        for i, r in enumerate(results[:5]):
            logger.info(
                f"[Retrieval]   [{i + 1}] score={r['score']:.4f}, doc={r['payload'].get('document_name', 'unknown')}"
            )

        # Filter by minimum score and convert to RetrievedChunk objects
        chunks = []
        filtered_count = 0
        for result in results:
            if result["score"] >= min_score:
                payload = result["payload"]
                chunks.append(
                    RetrievedChunk(
                        document_id=payload.get("document_id", ""),
                        document_name=payload.get("document_name", ""),
                        chunk_text=payload.get("chunk_text", ""),
                        chunk_position=payload.get("chunk_position", 0),
                        score=result["score"],
                    )
                )
            else:
                filtered_count += 1

        logger.info(
            f"[Retrieval] After min_score filter ({min_score}): {len(chunks)} kept, {filtered_count} filtered out"
        )

        # Apply reranking if enabled
        if rerank and chunks:
            from simba.services.reranker_service import rerank_chunks

            rerank_start = time.perf_counter()
            chunks = rerank_chunks(query, chunks, top_k=limit)
            latency["rerank_ms"] = (time.perf_counter() - rerank_start) * 1000
        elif rerank:
            # No chunks to rerank, just return empty
            pass
        else:
            # No reranking, truncate to limit
            chunks = chunks[:limit]

    latency["total_ms"] = (time.perf_counter() - total_start) * 1000

    logger.info(
        f"[Retrieval] === Completed: returning {len(chunks)} chunks in {latency['total_ms']:.1f}ms ==="
    )

    if return_latency:
        return chunks, latency
    return chunks


def retrieve_formatted(
    query: str,
    collection_name: str,
    limit: int | None = None,
    return_latency: bool = False,
) -> str | tuple[str, LatencyBreakdown]:
    """Retrieve and format chunks as context for LLM.

    Args:
        query: The search query.
        collection_name: Name of the collection to search.
        limit: Maximum number of results. Defaults to settings.retrieval_limit.
        return_latency: Whether to return latency breakdown.

    Returns:
        Formatted string with retrieved context.
        If return_latency=True, returns tuple of (formatted_context, latency_breakdown).
    """
    result = retrieve(query, collection_name, limit=limit, return_latency=return_latency)

    if return_latency:
        chunks, latency = result
    else:
        chunks = result
        latency = {}

    if not chunks:
        output = "No relevant information found in the knowledge base."
        if return_latency:
            return output, latency
        return output

    # Format chunks as context
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(f"[Source {i}: {chunk.document_name}]\n{chunk.chunk_text}")

    output = "\n\n---\n\n".join(context_parts)

    if return_latency:
        return output, latency
    return output
