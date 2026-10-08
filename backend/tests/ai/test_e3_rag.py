import pytest
from app.ai.schemas import E3ExplainFieldRequest
from app.ai.e3_rag.engine import e3_engine
from app.ai.e3_rag.retriever import retrieve


def test_retriever_grounded_by_code():
    chunk, citation = retrieve(indicator_code="ENV-ENERGY-001")
    assert chunk is not None
    assert citation is not None
    assert "Principle 6" in citation.section
    assert "gigajoules" in citation.text.lower()


def test_retriever_grounded_by_question_keywords():
    chunk, citation = retrieve(indicator_code="", question="How should I calculate water intensity and water withdrawal?")
    assert chunk is not None
    assert citation is not None
    assert "WATER" in chunk["section"] or "water" in chunk["guidance"].lower()


def test_retriever_general_unmatched_returns_none():
    chunk, citation = retrieve(indicator_code="GENERAL", question="What is the high-level philosophy of corporate governance in India?")
    assert chunk is None
    assert citation is None


def test_e3_engine_grounded_query():
    req = E3ExplainFieldRequest(
        indicator_code="ENV-ENERGY-001",
        question="What documents are needed to verify energy consumption?"
    )
    res = e3_engine.explain(req)
    assert res.run_id
    assert res.grounded is True
    assert len(res.answer) > 0
    # Must be descriptive and contain bullet points
    assert "•" in res.answer or "*" in res.answer or "-" in res.answer or len(res.citations) > 0


def test_e3_engine_general_query_with_caution():
    req = E3ExplainFieldRequest(
        indicator_code="GENERAL",
        question="Explain the difference between CSR and ESG for listed Indian companies."
    )
    res = e3_engine.explain(req)
    assert res.run_id
    assert res.grounded is False
    assert len(res.citations) == 0
    assert len(res.answer) > 0
    # Must contain the caution notice as requested
    assert "ai may make mistakes" in res.answer.lower()
    # Must have descriptive bullet points
    assert "•" in res.answer or "*" in res.answer or "-" in res.answer
