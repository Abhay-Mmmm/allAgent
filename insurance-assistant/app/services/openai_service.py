import openai
from typing import Dict, Any, Optional
import logging
from app.config import settings
from app.services.memory_service import get_conversation_context

# Initialize OpenAI client
openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

class OpenAIService:
    def __init__(self):
        self.model = settings.OPENAI_MODEL
        self.system_prompt = self._get_system_prompt()
    
    def _get_system_prompt(self) -> str:
        """
        Get the system prompt for the insurance assistant
        """
        return """You are a professional insurance assistant for an AI system. Your role is to help users with insurance inquiries, policy recommendations, and claim assistance.

PERSONALITY:
- Be polite, patient, and professional
- Ask one question at a time
- Confirm important details before storing
- Be empathetic and understanding

CONVERSATION FLOW:
1. Greet the user and ask how you can help
2. Determine their intent (inquiry, policy recommendation, claim assistance, etc.)
3. Collect information progressively based on their needs
4. Confirm important details before proceeding
5. Provide relevant information about insurance products/services
6. Offer to connect with a human agent if needed

DATA COLLECTION RULES:
- Collect name, age, location, and insurance interest progressively
- Never ask for all information at once
- Confirm existing information if user has interacted before
- Allow corrections to previously provided information

LIMITATIONS:
- Do not make legal commitments or guarantees
- Do not quote specific policy prices without verification
- Offer to transfer to a human agent for complex cases
- Do not hallucinate policy details or benefits
- If uncertain about information, suggest speaking with a human agent

RESPONSE FORMAT:
- Keep responses concise (2-3 sentences max)
- Use simple, clear language
- Repeat important information for clarity"""
    
    async def get_chat_response(
        self, 
        user_message: str, 
        user_identifier: Optional[str] = None,
        db_session=None
    ) -> Dict[str, Any]:
        """
        Get response from OpenAI model with user context
        """
        try:
            # Get user context if identifier is provided
            context = {}
            if user_identifier and db_session:
                context = await get_conversation_context(db_session, user_identifier)
            
            # Build messages for the conversation
            messages = [{"role": "system", "content": self.system_prompt}]
            
            # Add user context to the conversation if available
            if context and not context.get("is_new_user"):
                user_info = context.get("user_info", {})
                if user_info:
                    context_str = f"Previous user information: {user_info}. "
                    context_str += f"Previous conversation summary: {context.get('previous_summary', '')}. "
                    messages.append({"role": "system", "content": context_str})
            
            # Add the current user message
            messages.append({"role": "user", "content": user_message})
            
            # Call OpenAI API
            response = openai_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}  # Request structured response
            )
            
            # Extract the response
            ai_response = response.choices[0].message.content
            
            # Attempt to parse structured data from the response
            structured_data = self._extract_structured_data(ai_response)
            
            return {
                "response": ai_response,
                "structured_data": structured_data,
                "model_used": self.model,
                "tokens_used": response.usage.total_tokens if response.usage else 0
            }
            
        except Exception as e:
            logging.error(f"Error calling OpenAI API: {str(e)}")
            return {
                "response": "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again later.",
                "structured_data": None,
                "error": str(e)
            }
    
    def _extract_structured_data(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Extract structured data from AI response
        """
        try:
            # This is a simplified extraction - in a real implementation,
            # the AI would be prompted to return structured JSON
            import json
            import re
            
            # Look for JSON-like structures in the response
            # This is a basic implementation - would be enhanced in production
            structured_data = {}
            
            # Extract potential intent
            if "policy" in response.lower():
                structured_data["intent"] = "policy_inquiry"
            elif "claim" in response.lower():
                structured_data["intent"] = "claim_assistance"
            elif "recommend" in response.lower() or "suggest" in response.lower():
                structured_data["intent"] = "policy_recommendation"
            else:
                structured_data["intent"] = "general_inquiry"
            
            # Extract topics mentioned
            topics = []
            if "health" in response.lower():
                topics.append("health_insurance")
            if "life" in response.lower():
                topics.append("life_insurance")
            if "auto" in response.lower() or "car" in response.lower():
                topics.append("auto_insurance")
            if "home" in response.lower():
                topics.append("home_insurance")
            
            if topics:
                structured_data["topics"] = topics
            
            return structured_data
            
        except Exception as e:
            logging.error(f"Error extracting structured data: {str(e)}")
            return None

# Global instance
openai_service = OpenAIService()