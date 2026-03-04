"""
VAPI Voice AI Service
Handles all interactions with the VAPI API for voice assistant orchestration.

Responsibilities:
- Create transient voice assistant sessions for incoming calls
- Build system prompts with caller context/memory
- Process webhook events (end-of-call reports, transcripts)
- Extract structured data from transcripts via LLM
- Validate webhook signatures
"""

import os
import json
import hmac
import hashlib
import logging
from typing import Dict, Any, Optional

import httpx

logger = logging.getLogger(__name__)

VAPI_API_BASE = "https://api.vapi.ai"


class VAPIService:
    """Client for the VAPI Voice AI Platform."""

    def __init__(self):
        self.api_key = os.getenv("VAPI_API_KEY")
        self.phone_number_id = os.getenv("VAPI_PHONE_NUMBER_ID")
        self.webhook_secret = os.getenv("VAPI_WEBHOOK_SECRET", "")
        self.server_url = os.getenv("VAPI_SERVER_URL", "")  # Your public webhook URL

        if not self.api_key:
            logger.error("VAPI_API_KEY environment variable is not set")
            raise ValueError("VAPI_API_KEY environment variable is not set")

    # ──────────────────────────────────────────────
    #  SYSTEM PROMPT BUILDER
    # ──────────────────────────────────────────────

    def build_system_prompt(self, caller_context: Dict[str, Any]) -> str:
        """
        Build a structured system prompt injecting caller memory so
        the assistant never re-asks information it already knows.
        """
        name = caller_context.get("name") or "valued customer"
        age = caller_context.get("age") or "Unknown"
        occupation = caller_context.get("occupation") or "Unknown"
        location = caller_context.get("location") or "Unknown"
        interest = caller_context.get("interest") or "General"
        last_summary = caller_context.get("last_summary") or "No previous conversations."

        return f"""You are a professional insurance advisor for allAgent, an AI-powered insurance assistance platform for the Indian market.

## KNOWN CALLER INFORMATION
- Name: {name}
- Age: {age}
- Occupation: {occupation}
- Location: {location}
- Insurance Interest: {interest}
- Previous Conversation Summary: {last_summary}

## RULES
1. DO NOT re-ask any information already listed above (unless it says "Unknown").
2. Ask ONE question at a time to gather missing information efficiently.
3. Collect these structured fields during the conversation: name, age, occupation, location, insurance_interest.
4. Before saving or confirming any details, always confirm with the caller.
5. DO NOT hallucinate specific policy names, premiums, or coverage details.
6. If the caller asks about specific policy details you are unsure of, offer to transfer them to a human specialist.
7. Be warm, professional, and concise — this is a voice call, not a text chat.
8. Speak in short, natural sentences suitable for phone conversation.
9. Support both Hindi and English as the caller prefers.
10. At the end of the conversation, summarize what was discussed and any next steps.

## AVAILABLE INSURANCE CATEGORIES
- Crop Insurance (PMFBY - Pradhan Mantri Fasal Bima Yojana)
- Health Insurance
- Life Insurance
- Vehicle Insurance

## RESPONSE FORMAT
Respond naturally as a voice assistant. Do NOT output JSON or structured data — the system will extract data from the transcript automatically."""

    # ──────────────────────────────────────────────
    #  ASSISTANT CONFIGURATION
    # ──────────────────────────────────────────────

    def build_assistant_config(self, caller_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build a transient VAPI assistant configuration for an incoming call.
        Uses the caller's context to personalize the system prompt.
        """
        system_prompt = self.build_system_prompt(caller_context)
        caller_name = caller_context.get("name") or "Customer"

        return {
            "name": f"Insurance Advisor – {caller_name}",
            "firstMessage": self._build_greeting(caller_context),
            "model": {
                "provider": "groq",
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt}
                ],
                "temperature": 0.6,
                "maxTokens": 512,
            },
            "voice": {
                "provider": "11labs",
                "voiceId": "21m00Tcm4TlvDq8ikWAM",  # "Rachel" — warm, professional
            },
            "transcriber": {
                "provider": "deepgram",
                "model": "nova-2",
                "language": "en",
            },
            "serverUrl": self.server_url,
            "endCallFunctionEnabled": True,
            "silenceTimeoutSeconds": 30,
            "maxDurationSeconds": 600,
            "backgroundSound": "off",
        }

    def _build_greeting(self, caller_context: Dict[str, Any]) -> str:
        """Generate a personalized greeting based on caller memory."""
        name = caller_context.get("name")
        interest = caller_context.get("interest")

        if name and interest and interest != "General":
            return (
                f"Hello {name}! Welcome back to allAgent. "
                f"Last time we discussed {interest} insurance. "
                f"How can I help you today?"
            )
        elif name:
            return (
                f"Hello {name}! Welcome back to allAgent. "
                f"How can I assist you with your insurance needs today?"
            )
        else:
            return (
                "Hello! Welcome to allAgent — your AI-powered insurance advisor. "
                "My name is Rachel. May I know your name to get started?"
            )

    # ──────────────────────────────────────────────
    #  API CALLS
    # ──────────────────────────────────────────────

    async def create_call_for_incoming(
        self, phone_number: str, caller_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle an incoming Twilio call by creating a VAPI call
        with a transient assistant configured for this caller.
        """
        assistant_config = self.build_assistant_config(caller_context)

        payload: Dict[str, Any] = {
            "assistant": assistant_config,
            "customer": {
                "number": phone_number,
            },
        }

        # Attach phone number ID if configured
        if self.phone_number_id:
            payload["phoneNumberId"] = self.phone_number_id

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{VAPI_API_BASE}/call",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    # ──────────────────────────────────────────────
    #  WEBHOOK PROCESSING
    # ──────────────────────────────────────────────

    def validate_webhook_signature(
        self, payload_body: bytes, signature: Optional[str]
    ) -> bool:
        """
        Validate the VAPI webhook HMAC signature.
        Returns True if valid or if no secret is configured (development mode).
        """
        if not self.webhook_secret:
            logger.warning("VAPI_WEBHOOK_SECRET not set — skipping signature validation")
            return True

        if not signature:
            return False

        expected = hmac.new(
            self.webhook_secret.encode(),
            payload_body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    def extract_phone_from_webhook(self, payload: Dict[str, Any]) -> Optional[str]:
        """Extract the caller phone number from a VAPI webhook payload."""
        message = payload.get("message", {})

        # Try call.customer.number first
        call = message.get("call", {})
        customer = call.get("customer", {})
        number = customer.get("number")
        if number:
            return number

        # Try phoneNumber field
        phone = message.get("phoneNumber", {})
        if isinstance(phone, dict):
            return phone.get("number")
        if isinstance(phone, str):
            return phone

        return None

    def extract_transcript(self, payload: Dict[str, Any]) -> str:
        """Extract the full transcript from end-of-call report."""
        message = payload.get("message", {})
        artifact = message.get("artifact", {})

        # Try the formatted transcript string first
        transcript = artifact.get("transcript")
        if transcript:
            return transcript

        # Fallback: build from messages array
        messages = artifact.get("messages", [])
        if messages:
            lines = []
            for msg in messages:
                role = msg.get("role", "unknown").capitalize()
                text = msg.get("message", msg.get("content", ""))
                if text:
                    lines.append(f"{role}: {text}")
            return "\n".join(lines)

        return ""

    def extract_call_id(self, payload: Dict[str, Any]) -> Optional[str]:
        """Extract the VAPI call ID from a webhook payload."""
        message = payload.get("message", {})
        call = message.get("call", {})
        return call.get("id")

    def get_event_type(self, payload: Dict[str, Any]) -> str:
        """Get the VAPI webhook event type."""
        return payload.get("message", {}).get("type", "unknown")


class VAPIDataExtractor:
    """
    Extracts structured caller data from transcripts using the LLM service.
    This runs after a call ends to update the caller's profile.
    """

    def __init__(self):
        # Re-use the same Groq/OpenAI service used for chat
        from app.services.openai_service import OpenAIService
        self.llm = OpenAIService()

    async def extract_from_transcript(self, transcript: str) -> Dict[str, Any]:
        """
        Use LLM to extract structured fields from a voice transcript.
        Returns dict with keys: name, age, occupation, location, insurance_interest, summary.
        """
        extraction_prompt = f"""Analyze this phone call transcript between an insurance advisor AI and a caller.
Extract any personal information the caller shared. Return a JSON object with ONLY these keys:

- "name": caller's name (string or null)
- "age": caller's age (integer or null)
- "occupation": caller's occupation (string or null)
- "location": caller's city/state/location (string or null)
- "insurance_interest": type of insurance discussed (string or null, e.g. "health", "life", "crop", "vehicle")
- "summary": a 2-3 sentence summary of what was discussed and any next steps

If a field was not mentioned, set it to null. Only include information explicitly stated by the caller.

TRANSCRIPT:
{transcript}"""

        try:
            response = await self.llm.client.chat.completions.create(
                model=self.llm.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a data extraction system. "
                            "Extract structured information from call transcripts. "
                            "Return ONLY valid JSON, no other text."
                        ),
                    },
                    {"role": "user", "content": extraction_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )

            content = response.choices[0].message.content
            return json.loads(content)

        except Exception as e:
            logger.error(f"Error extracting data from transcript: {e}")
            return {
                "name": None,
                "age": None,
                "occupation": None,
                "location": None,
                "insurance_interest": None,
                "summary": "Data extraction failed for this session.",
            }
