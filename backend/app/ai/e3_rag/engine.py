"""
E3 Engine: Guidance RAG Field Explainer
Orchestrates retrieval + LLM grounded explanation with citation guardrail.
"""
import uuid
from app.ai.schemas import E3ExplainFieldRequest, E3ExplainFieldResponse
from app.ai.gateway import ai_gateway
from app.ai.e3_rag.retriever import retrieve


class GuidanceRAGEngine:
    """E3 Engine: Guidance RAG matching PDF Page 25."""

    def explain(self, req: E3ExplainFieldRequest, db_session=None) -> E3ExplainFieldResponse:
        run_id = str(uuid.uuid4())

        # Step 1: Retrieve grounded knowledge chunk
        chunk, citation = retrieve(req.indicator_code)
        citations = [citation] if citation else []

        prompt = (
            f"User Question: {req.question}\n"
            f"Indicator: {req.indicator_code}\n"
            f"Guidance: {chunk['guidance'] if chunk else 'No specific guidance found.'}\n\n"
            f"Provide a concise, grounded explanation strictly based on the provided guidance text. "
            f"If the question cannot be answered from it, refuse politely without inventing facts."
        )

        try:
            res = ai_gateway.run_structured(
                engine="E3",
                prompt=prompt,
                response_model=E3ExplainFieldResponse,
                system_prompt="You are an official SEBI BRSR compliance assistant. Base answers only on verified guidance.",
                input_ref=req.indicator_code,
                db_session=db_session
            )
            res.run_id = run_id
            res.indicator_code = req.indicator_code
            # Always use canonical official citations regardless of what LLM returns
            if citations:
                res.citations = citations
            return res

        except Exception:
            if chunk and citation:
                return E3ExplainFieldResponse(
                    run_id=run_id,
                    indicator_code=req.indicator_code,
                    answer=f"Under SEBI BRSR {chunk['section']}: {chunk['guidance']}",
                    citations=citations,
                    grounded=True,
                    is_fallback=True
                )
            return E3ExplainFieldResponse(
                run_id=run_id,
                indicator_code=req.indicator_code,
                answer="No grounded guidance note passage found for this indicator.",
                citations=[],
                grounded=False,
                is_fallback=True
            )


e3_engine = GuidanceRAGEngine()
