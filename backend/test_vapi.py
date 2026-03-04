"""
Test script for the VAPI-integrated backend endpoints.
Run: python test_vapi.py
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_incoming_call():
    """Simulate an incoming Twilio webhook."""
    print("=" * 60)
    print("TEST 1: POST /incoming-call (Twilio webhook)")
    print("=" * 60)

    payload = {
        "from": "+919876543210",
        "to": "+911234567890",
    }

    try:
        response = requests.post(f"{BASE_URL}/incoming-call", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    print()


def test_vapi_webhook_end_of_call():
    """Simulate a VAPI end-of-call-report webhook."""
    print("=" * 60)
    print("TEST 2: POST /vapi-webhook (end-of-call-report)")
    print("=" * 60)

    payload = {
        "message": {
            "type": "end-of-call-report",
            "endedReason": "hangup",
            "call": {
                "id": "test-call-001",
                "customer": {
                    "number": "+919876543210"
                }
            },
            "artifact": {
                "transcript": (
                    "Assistant: Hello! Welcome to allAgent. May I know your name?\n"
                    "User: Hi, my name is Raj Sharma.\n"
                    "Assistant: Nice to meet you, Raj! How old are you?\n"
                    "User: I am 35 years old.\n"
                    "Assistant: And where are you located?\n"
                    "User: I live in Pune, Maharashtra.\n"
                    "Assistant: What type of insurance are you interested in?\n"
                    "User: I am looking for health insurance for my family.\n"
                    "Assistant: Great! I can help you with health insurance options. "
                    "I'll have our team reach out to you with plans suited for a family in Pune.\n"
                    "User: Thank you!\n"
                    "Assistant: You're welcome, Raj! Have a great day."
                ),
                "messages": [
                    {"role": "assistant", "message": "Hello! Welcome to allAgent. May I know your name?"},
                    {"role": "user", "message": "Hi, my name is Raj Sharma."},
                    {"role": "assistant", "message": "Nice to meet you, Raj! How old are you?"},
                    {"role": "user", "message": "I am 35 years old."},
                    {"role": "assistant", "message": "And where are you located?"},
                    {"role": "user", "message": "I live in Pune, Maharashtra."},
                    {"role": "assistant", "message": "What type of insurance are you interested in?"},
                    {"role": "user", "message": "I am looking for health insurance for my family."},
                    {"role": "assistant", "message": "Great! I can help you with health insurance options."},
                    {"role": "user", "message": "Thank you!"},
                    {"role": "assistant", "message": "You're welcome, Raj! Have a great day."},
                ]
            }
        }
    }

    try:
        response = requests.post(f"{BASE_URL}/vapi-webhook", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    print()


def test_caller_profile():
    """Fetch a caller's profile."""
    print("=" * 60)
    print("TEST 3: GET /caller-profile/+919876543210")
    print("=" * 60)

    try:
        response = requests.get(f"{BASE_URL}/caller-profile/+919876543210")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    print()


def test_chat_still_works():
    """Verify chat endpoint is unaffected by migration."""
    print("=" * 60)
    print("TEST 4: POST /chat (verify chat is intact)")
    print("=" * 60)

    payload = {
        "user_identifier": "test-user-chat-001",
        "message": "I want to know about crop insurance under PMFBY.",
        "phone_number": "+919876543210"
    }

    try:
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    print()


if __name__ == "__main__":
    print("\n🧪 AllAgent VAPI Integration Tests\n")
    test_incoming_call()
    test_vapi_webhook_end_of_call()
    test_caller_profile()
    test_chat_still_works()
    print("✅ All tests completed.\n")
