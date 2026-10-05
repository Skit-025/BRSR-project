"""
E1 Engine: Extraction Pipeline
Orchestrates the full document ingestion flow:
  1. Extract text from PDF (pypdf) or accept raw bytes for images
  2. Run heuristic relevance check — reject unrelated documents fast
  3. Call LLM (OpenRouter/Gemini) for structured extraction on relevant docs
  4. Deterministic regex fallback if LLM partially fails on specific values
  5. Validate extracted fields against BRSR plausibility bounds
"""
import uuid
import os
import re
import io
import logging
from typing import Optional, List, Dict, Any, Tuple

from app.ai.schemas import E1ExtractRequest, E1ExtractResponse, ExtractedField
from app.ai.e1_extract.validators import validate_fields

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Document relevance: ESG utility bill keyword signals
# ---------------------------------------------------------------------------

ELECTRICITY_SIGNALS = [
    "kwh", "mwh", "kilowatt", "megawatt", "electricity bill", "discom",
    "power distribution", "tsspdcl", "bescom", "msedcl", "cesc", "dhbvn",
    "dakshin haryana", "bijli vitran", "nbpdcl", "sbpdcl", "wbsedcl",
    "contracted demand", "energy charges", "billed units", "units consumed",
    "meter reading", "maximum demand", "reactive energy", "discom invoice",
    "electricity supply", "energy consumed", "tariff category", "sanctioned load",
    "connection no", "consumption charges", "fixed charges", "unit rate",
]
FUEL_SIGNALS = [
    "diesel", "high speed diesel", "hsd", "petrol", "fuel delivery",
    "tanker truck", "iocl", "hpcl", "bpcl", "fuel slip", "challan",
    "dip before discharge", "bulk fuel", "quantity delivered", "fuel receipt",
    "motor spirit", "aviation turbine fuel", "atf", "lubricant", "litres",
]
WATER_SIGNALS = [
    "water consumption", "water board", "water supply", "hmwssb", "jal board",
    "net water consumed", "water cess", "bulk water", "water demand notice",
    "cubic meter", "kilolitre", "metro water", "water treatment", "sewerage",
]
WASTE_SIGNALS = [
    "hazardous waste", "waste manifest", "form 10", "form-10", "spcb",
    "cpcb", "pollution control board", "disposal facility", "waste generator",
    "consignment note", "solid waste", "biomedical waste", "e-waste",
]
SAFETY_SIGNALS = [
    "incident report", "lost time injury", "lti", "safety training",
    "toolbox talk", "near miss report", "man-hours worked", "recordable incident",
    "fatality", "first aid injury", "near miss", "unsafe act",
]

# Strong signals that mean this is NOT a utility bill
UNRELATED_STRONG_SIGNALS = [
    ("curriculum vitae", "Curriculum Vitae / Resume"),
    ("resume", "Resume document"),
    ("job application", "Job Application document"),
    ("b.tech", "Academic transcript / Resume"),
    ("gpa:", "Academic document"),
    ("cgpa:", "Academic document"),
    ("def __init__", "Python source code"),
    ("import react", "React/JavaScript source code"),
    ("fastapi()", "Python source code"),
    ("package.json", "Node.js package file"),
    ("<!doctype html", "HTML document"),
    ("<html", "HTML document"),
]

METRIC_MAP = {
    "electricity_bill": ("ENV-ENERGY-001", "kWh"),
    "fuel_receipt":     ("ENV-ENERGY-002", "Litres"),
    "water_manifest":   ("ENV-WATER-001", "kL"),
    "waste_manifest":   ("ENV-WASTE-001", "tonnes"),
    "safety_log":       ("SOC-SAFE-001", "incidents"),
}

# User-facing hint aliases (from frontend dropdown)
HINT_ALIASES: Dict[str, str] = {
    "fuel_bill": "fuel_receipt",
    "diesel_receipt": "fuel_receipt",
    "diesel_bill": "fuel_receipt",
    "fuel_slip": "fuel_receipt",
    "water_bill": "water_manifest",
    "water_log": "water_manifest",
    "waste_log": "waste_manifest",
    "safety_report": "safety_log",
    "electricity": "electricity_bill",
    "energy_bill": "electricity_bill",
    "power_bill": "electricity_bill",
    "electric_bill": "electricity_bill",
}

VALID_DOC_TYPES = set(METRIC_MAP.keys())


# ---------------------------------------------------------------------------
# Helper: PDF text extraction
# ---------------------------------------------------------------------------

def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pypdf."""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        texts = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                texts.append(t)
        return "\n".join(texts)
    except Exception as e:
        logger.warning(f"pypdf text extraction failed: {e}")
        return ""


# ---------------------------------------------------------------------------
# Helper: Text-based relevance check (for PDFs / text docs only)
# ---------------------------------------------------------------------------

def _check_relevance(text: str) -> Tuple[bool, str, str]:
    """
    Heuristic check for ESG utility bill relevance.
    Returns: (is_relevant, doc_type, rejection_reason)
    Only call this when you have actual text content to check.
    """
    text_lower = text.lower()

    # Fast rejection for obvious non-ESG documents
    for signal, doc_desc in UNRELATED_STRONG_SIGNALS:
        if signal in text_lower:
            return (
                False,
                "unrelated",
                f"This document appears to be a {doc_desc} and is not an accepted ESG utility document. "
                "Only electricity bills, fuel/diesel receipts, water bills, waste manifests, or safety logs are accepted."
            )

    # ESG relevance classification
    if any(sig in text_lower for sig in ELECTRICITY_SIGNALS):
        return True, "electricity_bill", ""
    if any(sig in text_lower for sig in FUEL_SIGNALS):
        return True, "fuel_receipt", ""
    if any(sig in text_lower for sig in WATER_SIGNALS):
        return True, "water_manifest", ""
    if any(sig in text_lower for sig in WASTE_SIGNALS):
        return True, "waste_manifest", ""
    if any(sig in text_lower for sig in SAFETY_SIGNALS):
        return True, "safety_log", ""

    return (
        False,
        "unknown",
        "Document does not contain recognized ESG utility or compliance indicators. "
        "Please upload an electricity bill, fuel receipt, water bill, waste manifest, or safety log."
    )


# ---------------------------------------------------------------------------
# Helper: Extract common metadata fields with regex
# ---------------------------------------------------------------------------

def _extract_common_metadata(text: str) -> Dict[str, Any]:
    """Extract common metadata like invoice number, meter ID, billing period."""
    meta: Dict[str, Any] = {}

    # Invoice / Bill Number
    inv = re.search(
        r"(?:invoice|bill|challan|notice|order|account)\s*(?:no|number|#)?[:.\s]*([A-Za-z0-9\-_/]+)",
        text, re.IGNORECASE
    )
    if inv:
        meta["invoice_number"] = inv.group(1).strip()

    # Meter / CAN / Consumer Number
    meter = re.search(
        r"(?:meter|serial|can\s*no|consumer\s*no|meter\s*number|meter\s*serial|connection\s*no)[:.\s]*([A-Za-z0-9\-_/]+)",
        text, re.IGNORECASE
    )
    if meter:
        meta["meter_id"] = meter.group(1).strip()

    # Billing Period / Bill Date
    bp = re.search(
        r"(?:bill date|billing period|period|bill month|month|date)[:.\s]*([0-9A-Za-z\s\-/_,]+?)(?=\n|\||due|amount|$)",
        text, re.IGNORECASE
    )
    if bp:
        period_val = bp.group(1).strip()
        if period_val:
            meta["billing_period"] = period_val[:50]

    # Consumer / Customer Name
    name = re.search(
        r"(?:consumer name|customer name|premises|site|name of consumer)[:.\s]*(.+?)(?=\n|$)",
        text, re.IGNORECASE
    )
    if name:
        meta["consumer_name"] = name.group(1).strip()[:80]

    return meta


# ---------------------------------------------------------------------------
# Helper: Deterministic regex extraction per doc type
# ---------------------------------------------------------------------------

def _extract_deterministic(text: str, doc_type: str) -> List[ExtractedField]:
    """
    Regex-based deterministic extraction for real values in the document.
    """
    fields: List[ExtractedField] = []
    meta = _extract_common_metadata(text)

    if doc_type == "electricity_bill":
        patterns = [
            r"(?:total billed units|units consumed|billed units|total units|net energy|energy consumed|consumption)[:.\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:kwh|units)?",
            r"([0-9,]+(?:\.[0-9]+)?)\s*kwh",
        ]
        val = None
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                try:
                    val = float(m.group(1).replace(",", ""))
                    break
                except ValueError:
                    continue
        if val is not None and val > 0:
            fields.append(ExtractedField(
                metric="ENV-ENERGY-001",
                value=val,
                unit="kWh",
                confidence=0.92,
                page=1,
                metadata=meta
            ))

    elif doc_type == "fuel_receipt":
        patterns = [
            r"(?:quantity delivered|quantity|volume|fuel supplied)[:.\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:litres|liters|l|kl)?",
            r"([0-9,]+(?:\.[0-9]+)?)\s*(?:litres|liters)",
        ]
        val = None
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                try:
                    val = float(m.group(1).replace(",", ""))
                    break
                except ValueError:
                    continue
        if val is not None and val > 0:
            fields.append(ExtractedField(
                metric="ENV-ENERGY-002",
                value=val,
                unit="Litres",
                confidence=0.92,
                page=1,
                metadata=meta
            ))

    elif doc_type == "water_manifest":
        patterns = [
            r"(?:net water consumed|total water|quantity|water consumed|consumption)[:.\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:kl|kilolitres|m3|cum)?",
            r"([0-9,]+(?:\.[0-9]+)?)\s*(?:kl|kilolitres)",
        ]
        val = None
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                try:
                    val = float(m.group(1).replace(",", ""))
                    break
                except ValueError:
                    continue
        if val is not None and val > 0:
            fields.append(ExtractedField(
                metric="ENV-WATER-001",
                value=val,
                unit="kL",
                confidence=0.92,
                page=1,
                metadata=meta
            ))

    elif doc_type == "waste_manifest":
        patterns = [
            r"(?:quantity|waste generated|weight|total waste)[:.\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:tonnes|tons|mt|kg)?",
        ]
        val = None
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                try:
                    raw = float(m.group(1).replace(",", ""))
                    val = raw / 1000 if raw > 10000 else raw
                    break
                except ValueError:
                    continue
        if val is not None and val > 0:
            fields.append(ExtractedField(
                metric="ENV-WASTE-001",
                value=val,
                unit="tonnes",
                confidence=0.90,
                page=1,
                metadata=meta
            ))

    elif doc_type == "safety_log":
        lti = re.search(r"(?:lti|lost time injur\w*)[:.\s]*([0-9]+)", text, re.IGNORECASE)
        val = int(lti.group(1)) if lti else 0
        fields.append(ExtractedField(
            metric="SOC-SAFE-001",
            value=val,
            unit="incidents",
            confidence=0.88,
            page=1,
            metadata=meta
        ))

    return fields


# ---------------------------------------------------------------------------
# Helper: LLM text extraction
# ---------------------------------------------------------------------------

def _extract_with_llm(text: str, doc_type: str, evidence_id: str) -> Optional[List[ExtractedField]]:
    """Try LLM-based extraction from document text via OpenRouter."""
    from app.ai.providers.openrouter import OpenRouterProvider

    metric_code, expected_unit = METRIC_MAP.get(doc_type, ("UNKNOWN", "units"))

    prompt = (
        f"You are an expert ESG data analyst. Extract metered consumption data from this utility document.\n\n"
        f"Document Type: {doc_type}\n"
        f"Expected BRSR Metric Code: {metric_code} (unit: {expected_unit})\n\n"
        f"Rules:\n"
        f"- ONLY extract values that actually appear in the document text below. DO NOT invent data.\n"
        f"- Return the primary consumption quantity (e.g., total kWh for electricity, Litres for fuel).\n"
        f"- Include invoice_number, meter_id, billing_period in the response if found.\n"
        f"- confidence should reflect how clearly the value was found (0.0–1.0).\n\n"
        f"Document Text:\n{text[:4000]}\n\n"
        f"Return JSON: metric, value (number), unit, confidence (0.0–1.0), invoice_number, meter_id, billing_period."
    )

    schema = {
        "type": "object",
        "properties": {
            "metric": {"type": "string"},
            "value": {"type": "number"},
            "unit": {"type": "string"},
            "confidence": {"type": "number"},
            "invoice_number": {"type": "string"},
            "meter_id": {"type": "string"},
            "billing_period": {"type": "string"}
        },
        "required": ["metric", "value", "unit", "confidence"]
    }

    try:
        provider = OpenRouterProvider()
        if not provider.is_available():
            return None
        result = provider.generate_json(prompt=prompt, schema_dict=schema)
        val = result.get("value")
        if val is None or float(val) == 0:
            return None
        meta = {k: result[k] for k in ("invoice_number", "meter_id", "billing_period") if result.get(k)}
        return [ExtractedField(
            metric=result.get("metric", metric_code),
            value=float(val),
            unit=result.get("unit", expected_unit),
            confidence=float(result.get("confidence", 0.85)),
            page=1,
            metadata=meta
        )]
    except Exception as e:
        logger.warning(f"LLM text extraction failed ({doc_type}): {e}")
        return None


# ---------------------------------------------------------------------------
# Helper: Vision LLM extraction for images / scanned PDFs
# ---------------------------------------------------------------------------

def _extract_with_vision(
    file_bytes: bytes,
    mime_type: str,
    doc_type: str,
    run_relevance_check: bool = False,
) -> Tuple[bool, Optional[str], List[ExtractedField]]:
    """
    Vision LLM extraction for image files.
    Returns: (is_relevant, rejection_reason, fields)
    run_relevance_check=True -> ask the LLM to also verify relevance (for images with no user hint)
    """
    from app.ai.providers.openrouter import OpenRouterProvider

    metric_code, expected_unit = METRIC_MAP.get(doc_type, ("UNKNOWN", "units"))
    provider = OpenRouterProvider()
    if not provider.is_available():
        return True, None, []  # Optimistic pass when no vision provider

    vision_schema = {
        "type": "object",
        "properties": {
            "is_relevant": {"type": "boolean"},
            "rejection_reason": {"type": "string"},
            "doc_type_detected": {"type": "string"},
            "vendor_name": {"type": "string"},
            "consumer_name": {"type": "string"},
            "account_number": {"type": "string"},
            "invoice_number": {"type": "string"},
            "meter_id": {"type": "string"},
            "bill_date": {"type": "string"},
            "billing_period": {"type": "string"},
            "value": {"type": "number"},
            "units_kwh": {"type": "number"},
            "unit": {"type": "string"},
            "amount": {"type": "number"},
            "confidence": {"type": "number"}
        }
    }

    if run_relevance_check:
        relevance_instruction = (
            "Determine if this document is an ESG utility document (electricity bill, fuel receipt, "
            "water bill, waste manifest, or safety log). If NOT, set is_relevant=false and provide rejection_reason. "
            "If YES, set is_relevant=true and extract all consumption and invoice figures."
        )
    else:
        relevance_instruction = (
            f"This is confirmed as a '{doc_type}' document. Extract all consumption and billing data."
        )

    vision_prompt = (
        f"You are an expert ESG utility bill auditor.\n\n"
        f"{relevance_instruction}\n\n"
        f"Expected BRSR metric: {metric_code} ({expected_unit})\n\n"
        f"Extraction tasks:\n"
        f"1. Electricity bills: Extract consumption in kWh (look for 'Total Units', 'Billed Units', 'Current Reading - Previous Reading', 'Net kWh').\n"
        f"2. Fuel/Diesel receipts: Extract total Litres delivered.\n"
        f"3. Water bills: Extract total kL or cubic meters consumed.\n"
        f"4. Waste manifests: Extract total metric tonnes disposed.\n"
        f"5. Safety logs: Extract total lost-time injury incidents.\n"
        f"6. Also extract: vendor_name (Discom/Supplier), consumer_name, account_number, invoice_number, meter_id, bill_date, billing_period, and net bill amount.\n"
        f"7. Return numeric consumption in 'value' (or 'units_kwh') and unit in 'unit'. Do NOT invent values."
    )

    try:
        result = provider.generate_vision_json(
            prompt=vision_prompt,
            image_bytes=file_bytes,
            mime_type=mime_type,
            schema_dict=vision_schema
        )

        if run_relevance_check and result.get("is_relevant") is False:
            rej = result.get("rejection_reason", "Document is not a recognized ESG utility bill.")
            return False, rej, []

        # Find consumption value from multiple possible model keys
        raw_val = None
        for k in ("value", "units_kwh", "consumption", "primary_quantity", "billed_units", "units", "quantity", "litres"):
            if result.get(k) is not None:
                raw_val = result[k]
                break

        val = None
        if raw_val is not None:
            try:
                clean_str = re.sub(r"[^\d.]", "", str(raw_val).strip())
                if clean_str:
                    val = float(clean_str)
            except Exception:
                val = None

        if val is None or val <= 0:
            logger.info("Vision extracted no positive consumption value")
            return True, None, []

        # Use LLM-detected doc_type if provided
        llm_detected = result.get("doc_type_detected", "").strip().lower()
        if llm_detected and llm_detected in METRIC_MAP:
            metric_code, expected_unit = METRIC_MAP[llm_detected]

        unit_str = result.get("unit") or expected_unit

        meta = {}
        for k in ("invoice_number", "meter_id", "billing_period", "consumer_name", "vendor_name", "account_number", "bill_date", "amount", "total_amount"):
            if result.get(k):
                meta[k] = result[k]

        confidence = 0.90
        try:
            confidence = float(result.get("confidence", 0.90))
        except Exception:
            pass

        field = ExtractedField(
            metric=metric_code,
            value=val,
            unit=unit_str,
            confidence=confidence,
            page=1,
            metadata=meta
        )
        logger.info(f"E1 vision successfully extracted: {field.value} {field.unit} (metric={field.metric}, meta={meta})")
        return True, None, [field]

    except Exception as e:
        logger.warning(f"E1 vision extraction failed: {e}")
        return True, None, []  # Don't reject on LLM error


# ---------------------------------------------------------------------------
# Main: Extraction Pipeline
# ---------------------------------------------------------------------------

def run_extraction_pipeline(request: E1ExtractRequest, db_session=None) -> E1ExtractResponse:
    """
    Full E1 pipeline:
      Step 1: Resolve file bytes (from request, file path, or storage)
      Step 2: Extract text (PDF/text) or mark as image
      Step 3: Determine document type via:
               A. User-provided hint (trusted completely — user selected bill type in UI)
               B. Image with no hint → vision LLM decides relevance
               C. PDF/text → keyword relevance check on extracted text
      Step 4: LLM text extraction (PDFs)
      Step 5: Deterministic regex fallback (PDFs)
      Step 6: Vision LLM extraction (images / scanned PDFs with no text)
      Step 7: Validate fields
    """
    run_id = str(uuid.uuid4())

    # ── Step 1: Get file bytes ─────────────────────────────────────────────
    file_bytes = request.file_bytes or b""
    mime_type = request.mime_type or "application/pdf"
    filename = request.filename or ""

    if not file_bytes and request.file_path and os.path.exists(request.file_path):
        with open(request.file_path, "rb") as f:
            file_bytes = f.read()
        fname_lower = request.file_path.lower()
        if fname_lower.endswith(".png"):
            mime_type = "image/png"
        elif fname_lower.endswith((".jpg", ".jpeg")):
            mime_type = "image/jpeg"
        filename = os.path.basename(request.file_path)

    if not file_bytes:
        try:
            from app.modules.evidence.storage import storage_service
            stored = storage_service.get_file_bytes(request.evidence_id)
            if stored:
                file_bytes = stored
        except Exception as e:
            logger.warning(f"Could not load from storage: {e}")

    # ── Step 2: Text extraction ────────────────────────────────────────────
    is_image = mime_type.startswith("image/") or (
        filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"))
    )
    document_text = ""

    if is_image:
        # Images cannot be text-extracted — handled by vision LLM
        document_text = ""
    elif mime_type == "application/pdf" or filename.lower().endswith(".pdf"):
        document_text = _extract_pdf_text(file_bytes)
        logger.info(f"E1 PDF text extracted: {len(document_text)} chars")
        if not document_text and file_bytes:
            # Scanned or text-only PDF — try raw decode
            try:
                document_text = file_bytes.decode("utf-8", errors="ignore")
                logger.info(f"E1 raw UTF-8 fallback: {len(document_text)} chars")
            except Exception:
                pass
    elif mime_type in ("text/plain", "text/csv"):
        try:
            document_text = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            pass
    else:
        document_text = _extract_pdf_text(file_bytes)
        if not document_text and file_bytes:
            try:
                document_text = file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                pass

    combined_text = (filename + " " + document_text).strip()

    # ── Step 3: Determine document type ───────────────────────────────────
    #
    # Priority A: User selected bill type explicitly in the UI → trust it
    # Priority B: Image file with no hint → ask vision LLM to classify
    # Priority C: PDF/text with no hint → keyword check on extracted text

    user_hint = (request.doc_type_hint or "").strip().lower()
    # Normalize aliases (e.g. "fuel_bill" → "fuel_receipt")
    user_hint = HINT_ALIASES.get(user_hint, user_hint)

    if user_hint and user_hint in VALID_DOC_TYPES:
        # ── A: User explicitly selected bill type ────────────────────────
        doc_type = user_hint
        is_relevant = True
        rejection_reason = ""
        logger.info(f"E1 user-provided bill type trusted: '{doc_type}' for '{filename}'")

    elif is_image:
        # ── B: Image file, no hint → vision LLM decides ─────────────────
        # We cannot text-check an image. Let vision LLM classify and extract.
        logger.info(f"E1 image file '{filename}' with no user hint → vision LLM classification")
        doc_type = "electricity_bill"   # will be corrected by vision LLM
        is_relevant = True
        rejection_reason = ""
        # We'll do the actual vision extraction in Step 6 (run_relevance_check=True)

    else:
        # ── C: PDF / text → keyword relevance check ──────────────────────
        from app.ai.e1_extract.classifier import classify_document
        filename_hint = classify_document(file_path=filename or request.file_path, doc_type_hint=None)
        if filename_hint != "unknown_document":
            doc_type = filename_hint
            is_relevant, _, rejection_reason = _check_relevance(combined_text)
            if not is_relevant:
                doc_type = "unknown"
        else:
            is_relevant, doc_type, rejection_reason = _check_relevance(combined_text)

    if not is_relevant:
        logger.info(f"E1 rejected '{filename}': {rejection_reason}")
        return E1ExtractResponse(
            run_id=run_id,
            doc_type="unrelated",
            fields=[],
            is_relevant=False,
            rejection_reason=rejection_reason,
            is_fallback=False
        )

    logger.info(f"E1 accepted '{filename}' as: {doc_type}")

    # ── Step 4: LLM text extraction (PDFs with extractable text) ──────────
    extracted_fields: List[ExtractedField] = []
    if document_text:
        extracted_fields = _extract_with_llm(document_text, doc_type, request.evidence_id) or []

    # ── Step 5: Deterministic regex fallback (PDFs) ───────────────────────
    if not extracted_fields and document_text:
        logger.info(f"E1 deterministic regex for '{doc_type}'")
        extracted_fields = _extract_deterministic(document_text, doc_type)

    # ── Step 6: Vision LLM (images + scanned PDFs with no text) ───────────
    if not extracted_fields and file_bytes:
        need_vision = is_image or not document_text
        if need_vision:
            effective_mime = mime_type if is_image else "image/jpeg"
            # run_relevance_check=True only for images where the user gave no hint
            run_rel_check = is_image and not (user_hint and user_hint in VALID_DOC_TYPES)
            vis_relevant, vis_rejection, vis_fields = _extract_with_vision(
                file_bytes=file_bytes,
                mime_type=effective_mime,
                doc_type=doc_type,
                run_relevance_check=run_rel_check,
            )
            if not vis_relevant:
                return E1ExtractResponse(
                    run_id=run_id,
                    doc_type="unrelated",
                    fields=[],
                    is_relevant=False,
                    rejection_reason=vis_rejection,
                    is_fallback=False
                )
            extracted_fields = vis_fields

    if not extracted_fields:
        logger.warning(f"E1 no fields extracted from '{filename}' (type={doc_type})")

    # ── Step 7: Validate ──────────────────────────────────────────────────
    validated = validate_fields(extracted_fields)

    return E1ExtractResponse(
        run_id=run_id,
        doc_type=doc_type,
        fields=validated,
        is_relevant=True,
        rejection_reason=None,
        is_fallback=False
    )
