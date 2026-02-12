
import boto3
import os

try:
    client = boto3.client(
        'bedrock',
        region_name='us-east-1',
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
    )
    
    print("Listing available foundation models...")
    response = client.list_foundation_models()
    
    for model in response.get('modelSummaries', []):
        mid = model['modelId']
        if "nova" in mid.lower():
            print(f"FOUND NOVA: {mid}")
        elif "titan" in mid.lower():
            print(f"Titan: {mid}")
            
except Exception as e:
    print(f"Error listing models: {e}")
