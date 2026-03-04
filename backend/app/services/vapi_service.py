"""
VAPI Voice Service — Outbound Sales Mode
=========================================
Handles all VAPI API interactions for the outbound calling platform.

Responsibilities:
  - Validate incoming webhook signatures (HMAC-SHA256)
  - Parse webhook event payloads (end-of-call-report, status-update, transcript)
  - Extract phone number, transcript, call duration, and call ID from webhooks
  - Update call queue status based on events
"""

import hashlib
import hmac
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class VAPIService:
    """Lightweight VAPI webhook parser and signature validator."""

    def __init__(self):
        self.webhook_secret = os.getenv("VAPI_WEBHOOK_SECRET", "")
        if not self.webhook_secret:
            logger.warning(
                "VAPI_WEBHOOK_SECRET not set — webhook signature validation DISABLED. "
                "Set this in production!"
            )

    # ──────────────────────────────────────────────
    #  SIGNATURE VALIDATION
    # ──────────────────────────────────────────────

    def validate_webhook_signature(
        self, payload_body: bytes, signature: Optional[str]
    ) -> bool:
        """
        Validate HMAC-SHA256 webhook signature from VAPI.
        Returns True if valid or if no secret configured (dev mode).
        """
        if not self.webhook_secret:
            logger.warning("Skipping webhook signature validation — no secret configured")
            return True

        if not signature:
            logger.warning("Webhook received without signature header")
            return False

        expected = hmac.new(
            self.webhook_secret.encode(),
            payload_body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    # ──────────────────────────────────────────────
    #  PAYLOAD PARSERS
    # ──────────────────────────────────────────────

    def get_event_type(self, payload: Dict[str, Any]) -> str:
        """Extract the VAPI event type string."""
        return payload.get("message", {}).get("type", "unknown")

    def extract_phone_from_webhook(self, payload: Dict[str, Any]) -> Optional[str]:
        """Extract the lead's phone number from a VAPI webhook payload."""
        message = payload.get("message", {})

        # Primary: call.customer.number
        call = message.get("call", {})
        customer = call.get("customer", {})
        number = customer.get("number")
        if number:
            return number

        # Fallback: phoneNumber field
        phone = message.get("phoneNumber", {})
        if isinstance(phone, dict):
            return phone.get("number")
        if isinstance(phone, str):
            return phone

        return None

    def extract_transcript(self, payload: Dict[str, Any]) -> str:
        """Extract the full conversation transcript from end-of-call-report."""
        message = payload.get("message", {})
        artifact = message.get("artifact", {})

        # Try pre-formatted transcript string
        transcript = artifact.get("transcript")
        if transcript:
            return transcript

        # Build from messages array
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

    def extract_call_duration(self, payload: Dict[str, Any]) -> Optional[int]:
        """Extract call duration in seconds from end-of-call-report."""
        message = payload.get("message", {})
        call = message.get("call", {})
        duration = call.get("duration")
        if duration is not None:
            try:
                return int(round(float(duration)))
            except (ValueError, TypeError):
                pass
        return None

    def extract_call_status(self, payload: Dict[str, Any]) -> Optional[str]:
        """Extract call completion status from status-update events."""
        message = payload.get("message", {})
        return message.get("status")
