import boto3
import json
import os
from typing import Dict, Any

class BedrockService:
    def __init__(self):
        # Force US-East-1 for Nova models availability
        self.region = "us-east-1" 
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        
        if not self.access_key or not self.secret_key:
             raise ValueError("AWS Credentials not found for Bedrock Service")

        self.client = boto3.client(
            service_name='bedrock-runtime',
            region_name=self.region,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key
        )
        # Use standard model ID for Nova Lite
        self.model_id = "amazon.nova-lite-v1:0" 

    async def chat(self, message: str, context: Dict[str, Any]) -> str:
        """
        Send a message to AWS Bedrock (Nova Lite) and return the text response.
        """
        
        # 1. Prepare Context
        context_str = "\n".join([f"{k}: {v}" for k, v in context.items() if v])
        
        prompt = f"""
        System: You are an intelligent voice assistant. Speak naturally, concisely, and clearly.
        User Context: {context_str}
        
        User: {message}
        Assistant:
        """

        # 2. Prepare Request Body for Nova/Titan/Claude (Nova uses converse API typically, or messages API)
        # For Nova Lite, correct inference parameter format is vital.
        # Assuming standard 'messages' format if supported, or robust Converse API.
        
        # New "Converse" API is recommended for Nova
        messages = [
            {
                "role": "user",
                "content": [{"text": message}]
            }
        ]
        
        system_prompts = [{"text": "You are a helpful insurance assistant. Keep answers short for voice output."}]
        
        try:
            print(f"DEBUG: Calling AWS Bedrock Model: {self.model_id}")
            response = self.client.converse(
                modelId=self.model_id,
                messages=messages,
                system=system_prompts,
                inferenceConfig={
                    "maxTokens": 512,
                    "temperature": 0.5,
                    "topP": 0.9
                }
            )
            
            output_text = response['output']['message']['content'][0]['text']
            return output_text

        except Exception as e:
            print(f"Error calling Bedrock: {e}")
            # Fallback to older invoke_model if converse fails (e.g. older boto3)
            # or return friendly error
            return "I am having trouble connecting to the AWS brain right now."
