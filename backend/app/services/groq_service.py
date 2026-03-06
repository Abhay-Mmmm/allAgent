"""
Groq AI Service — Production LLM Backend
=========================================
Sole LLM provider for the outbound AI sales platform.

Responsibilities:
  - Structured data extraction from call transcripts
  - Conversation reasoning for the Twilio TwiML AI loop
  - JSON mode responses for reliable parsing

Model: llama-3.3-70b-versatile (Groq hosted — sub-200ms TTFT)
Key:   GROQ_API_KEY from .env
"""

import json
import logging
from typing import Any, Dict, Optional

from groq import AsyncGroq

from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Model selection ───────────────────────────────────────────────────────────
REASONING_MODEL  = "llama-3.3-70b-versatile"   # High-intelligence reasoning
FAST_MODEL       = "llama-3.1-8b-instant"       # Ultra-low-latency for simple tasks

# ── System prompts ────────────────────────────────────────────────────────────
EXTRACTION_SYSTEM_PROMPT = (
    "You are a data extraction engine for an insurance sales call center. "
    "Analyze call transcripts and extract structured information. "
    "Return ONLY valid JSON — no markdown, no explanation, no extra text."
)

SALES_AGENT_SYSTEM_PROMPT = """You are an outbound insurance sales advisor for allAgent.

Your job is to conduct professional, empathetic phone calls with potential insurance leads.

## CALL OBJECTIVES
1. Introduce yourself warmly as an advisor from allAgent
2. Qualify the lead by gathering: name, age, occupation, location, insurance_interest
3. Understand their current insurance coverage and gaps
4. Recommend relevant products from our portfolio
5. End the call professionally and summarize next steps

## AVAILABLE INSURANCE PRODUCTS
- Crop Insurance (PMFBY — Pradhan Mantri Fasal Bima Yojana)
- Health Insurance (Individual, Family Floater, Senior)
- Life Insurance (Term, Whole Life, ULIP)
- Vehicle Insurance (Comprehensive, Third-Party)

## RULES
1. Ask ONE question at a time — this is a voice call, not a form
2. Never re-ask information already confirmed
3. NEVER promise specific premiums or coverage amounts you are unsure about
4. If the lead is not interested, be polite and offer to call back later
5. Speak in short, natural sentences suitable for phone conversation
6. Support both Hindi and English as the lead prefers

## RESPONSE FORMAT
Respond naturally as a voice assistant. Do NOT output JSON — the system handles structured extraction automatically."""


class GroqService:
    """
    Async Groq client for the outbound AI sales platform.

    Usage:
        groq = GroqService()
        data = await groq.extract_lead_data(transcript)
    """

    def __init__(self):
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")

        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.reasoning_model = REASONING_MODEL
        self.fast_model = FAST_MODEL
        logger.info(f"GroqService initialized — reasoning={REASONING_MODEL}")

    # ──────────────────────────────────────────────
    #  TRANSCRIPT DATA EXTRACTION
    # ──────────────────────────────────────────────

    async def extract_lead_data(self, transcript: str) -> Dict[str, Any]:
        """
        Use Groq LLM to extract structured lead data from a call transcript.

        Returns dict with keys:
            name, age, occupation, location, insurance_interest, summary,
            lead_status (interested | not_interested | follow_up | new)
        """
        extraction_prompt = f"""Analyze this outbound insurance sales call transcript.
Extract any personal information the lead shared.

Return a JSON object with EXACTLY these keys:
- "name": lead's full name (string or null)
- "age": lead's age as integer (integer or null)
- "occupation": lead's job/profession (string or null)
- "location": lead's city or state (string or null)
- "insurance_interest": type of insurance discussed, one of: health | life | crop | vehicle | general | none (string)
- "summary": 2-3 sentence summary of the call and outcome (string)
- "lead_status": one of: interested | not_interested | follow_up | unreachable (string)

If a field was not mentioned, set it to null.
Only include information explicitly stated by the lead.

TRANSCRIPT:
{transcript}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.reasoning_model,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": extraction_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=512,
            )

            content = response.choices[0].message.content
            data = json.loads(content)
            logger.info(f"Extracted lead data: status={data.get('lead_status')}, "
                        f"fields={[k for k, v in data.items() if v and k != 'summary']}")
            return data

        except Exception as e:
            logger.error(f"[GroqService] Extraction failed: {e}", exc_info=True)
            return {
                "name": None,
                "age": None,
                "occupation": None,
                "location": None,
                "insurance_interest": None,
                "summary": "Automatic extraction failed for this session.",
                "lead_status": "follow_up",
            }

    # ──────────────────────────────────────────────
    #  OUTBOUND SYSTEM PROMPT BUILDER
    # ──────────────────────────────────────────────

    def build_outbound_system_prompt(self, lead_context: Dict[str, Any]) -> str:
        """
        Build a personalized system prompt for the outbound AI assistant.
        Injects known lead details so the AI never re-asks information.
        """
        name            = lead_context.get("name") or "the prospect"
        age             = lead_context.get("age") or "Unknown"
        occupation      = lead_context.get("occupation") or "Unknown"
        location        = lead_context.get("location") or "Unknown"
        interest        = lead_context.get("insurance_interest") or "General"
        last_summary    = lead_context.get("last_summary") or "No previous conversations on record."

        return f"""{SALES_AGENT_SYSTEM_PROMPT}

## KNOWN LEAD INFORMATION (do NOT re-ask these):
- Name: {name}
- Age: {age}
- Occupation: {occupation}
- Location: {location}
- Insurance Interest: {interest}
- Previous Call Summary: {last_summary}

Start by greeting them: Hello, may I speak with {name}?"""

    # ──────────────────────────────────────────────
    #  DIRECT CHAT (for testing / fallback)
    # ──────────────────────────────────────────────

    async def chat(
        self,
        user_message: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Simple single-turn chat completion.
        Returns plain text (not JSON).
        """
        messages = [
            {"role": "system", "content": system_prompt or SALES_AGENT_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ]

        try:
            response = await self.client.chat.completions.create(
                model=self.reasoning_model,
                messages=messages,
                temperature=0.6,
                max_tokens=1024,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"[GroqService] Chat failed: {e}", exc_info=True)
            return "I am having trouble connecting to the AI service right now."


# ── Module-level singleton (lazy-initialized) ─────────────────────────────────
_groq_service: Optional[GroqService] = None


def get_groq_service() -> GroqService:
    """Return a module-level singleton GroqService. Thread-safe for async use."""
    global _groq_service
    if _groq_service is None:
        _groq_service = GroqService()
    return _groq_service
