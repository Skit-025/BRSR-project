"""E3: grounded explanations from the local guidance library."""
import uuid
import logging
from app.ai.schemas import E3ExplainFieldRequest, E3ExplainFieldResponse
from app.ai.e3_rag.retriever import retrieve

logger = logging.getLogger(__name__)
CAUTION_NOTICE = "\n\n> **Caution:** No matching passage was found in the local guidance library. AI may make mistakes; verify requirements against the applicable primary source."

class GuidanceRAGEngine:
    def explain(self, req: E3ExplainFieldRequest, db_session=None) -> E3ExplainFieldResponse:
        run_id = str(uuid.uuid4())
        code = (req.indicator_code or "GENERAL").strip()
        question = (req.question or "").strip()
        chunk, citation = retrieve(indicator_code=code, question=question)
        if chunk:
            source = (chunk.get("guidance") or "").strip()
            # Keep generated explanations anchored to the retrieved text. Deterministic
            # fallback is preferable to an uncited regulatory assertion.
            prompt = (f"Answer the user's question using only the source passage below. "
                      f"Do not add requirements, thresholds, units, or facts not stated in it. "
                      f"If it does not answer the question, say so. Use 2-4 concise bullets.\n\n"
                      f"Question: {question}\nIndicator: {code}\nSource passage:\n{source[:6000]}")
            try:
                res = ai_gateway.run_structured(engine="E3", prompt=prompt, response_model=E3ExplainFieldResponse,
                    system_prompt="You are a careful retrieval-grounded reporting assistant. Treat the supplied passage as the only source of facts.",
                    input_ref=code, db_session=db_session)
                answer = (res.answer or "").strip()
                # Hard guard against empty model output; local passage remains visible.
                if not answer:
                    answer = f"- Retrieved guidance ({chunk.get('section', code)}): {source}"
                    fallback = True
                else:
                    fallback = bool(getattr(res, "is_fallback", False))
                res.run_id, res.indicator_code, res.citations = run_id, code, [citation]
                res.grounded, res.answer, res.is_fallback = True, answer, fallback
                return res
            except Exception as exc:
                logger.warning("E3 generation unavailable; returning retrieved passage: %s", exc)
            return E3ExplainFieldResponse(run_id=run_id, indicator_code=code,
                answer=f"- Retrieved guidance ({chunk.get('section', code)}): {source}",
                citations=[citation], grounded=True, is_fallback=True)
        # No retrieval: clearly say context is missing. Do not have the model invent law.
        return E3ExplainFieldResponse(run_id=run_id, indicator_code=code,
            answer=f"- I could not find a sufficiently relevant passage in the local guidance library for: {question or 'this question'}.\n- Add or select a matching source before relying on a regulatory explanation.{CAUTION_NOTICE}",
            citations=[], grounded=False, is_fallback=True)

from app.ai.gateway import ai_gateway
e3_engine = GuidanceRAGEngine()
