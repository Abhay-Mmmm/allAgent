import requests
import json
import uuid

url = "http://localhost:8000/api/voice-chat"
payload = {
    "user_identifier": f"voice-test-{uuid.uuid4()}",
    "transcript": "Hello, I am looking for crop insurance for my farm.",
    "phone_number": "+15551234567"
}
headers = {
    "Content-Type": "application/json"
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
