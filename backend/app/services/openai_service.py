from openai import AsyncOpenAI
import json
import os
from typing import Dict, Any

class OpenAIService:
    def __init__(self):
        # We are using Groq now, but keeping the class name to avoid refactoring routes
        api_key = os.getenv("GROQ_API_KEY")
        print(f"DEBUG: ChatService (Groq) initialized. API Key present: {bool(api_key)}")
        
        if not api_key:
            # Fallback for checking old key if someone reverted env
            if os.getenv("OPENAI_API_KEY"):
                print("WARNING: GROQ_API_KEY not found, but OPENAI_API_KEY is present. Switching to OpenAI.")
                self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                self.model = "gpt-4o-mini"
            else:
                print("ERROR: GROQ_API_KEY environment variable not set")
                raise ValueError("GROQ_API_KEY environment variable not set")
        else:
            # Configure specifically for Groq
            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://api.groq.com/openai/v1"
            )
            # Use Llama 3.3 for high intelligence
            self.model = "llama-3.3-70b-versatile"
        
        self.system_prompt = """
        You are a professional insurance assistant.
        Your goal is to help users find the right insurance policy.
        Ask one question at a time to gather information efficiently.
        Do not hallucinate specific policy details; provide general guidance or ask for clarification.
        
        You must also extract structured information from the conversation if available.
        Return your response strictly in JSON format with two keys:
        - "response": The text message to display to the user.
        - "structured_data": A dictionary identifying any new information about the user (keys: name, age, location, insurance_interest). Leave empty if no new info.
        """

    async def chat(self, user_message: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        # detailed context injection
        context_description = "User Profile:\n"
        for k, v in user_context.items():
            if v:
                context_description += f"- {k}: {v}\n"
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "system", "content": context_description},
            {"role": "user", "content": user_message}
        ]
        
        try:
            print(f"DEBUG: Sending request to model: {self.model}")
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            # Debug log raw content because specific models sometimes output extra text
            print(f"DEBUG: Raw model response: {content}")
            return json.loads(content)
        except Exception as e:
            error_msg = f"Error calling AI Service: {e}"
            print(error_msg)
            
            # Log to file for debugging
            with open("error.log", "a") as f:
                f.write(error_msg + "\n")
                
            # Fallback
            return {
                "response": "I'm having trouble connecting to the AI service (Groq) right now. Please try again later.",
                "structured_data": {}
            }
