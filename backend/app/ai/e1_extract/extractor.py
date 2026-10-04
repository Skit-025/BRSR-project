"""
E1 Engine: Public Interface
Delegates to the extraction pipeline.
"""
from app.ai.schemas import E1ExtractRequest, E1ExtractResponse
from app.ai.e1_extract.pipeline import run_extraction_pipeline


class EvidenceExtractionEngine:
    def extract_from_file(self, request: E1ExtractRequest, db_session=None) -> E1ExtractResponse:
        return run_extraction_pipeline(request, db_session)


e1_engine = EvidenceExtractionEngine()
