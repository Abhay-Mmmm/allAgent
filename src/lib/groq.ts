
// Mock implementation of OpenAI/LLM interaction for frontend.
// In a real app, this should call the backend API we just built.

export const SYSTEM_PROMPTS = {
    INSURANCE_AGENT: "You are a professional insurance agent. Help users understand policies."
};

/**
 * Sends a chat message to the backend API.
 * @param messages The conversation history.
 * @param model The model to use (ignored here as backend handles it).
 * @returns The text response from the assistant.
 */
export async function getChatCompletion(
    messages: { role: string; content: string }[],
    systemPrompt: string = ""
): Promise<string> {
    try {
        // Extract the last user message
        const lastUserMessage = messages[messages.length - 1];
        if (!lastUserMessage || lastUserMessage.role !== 'user') {
            return "I didn't catch that. Could you please repeat?";
        }

        // Call our new backend API
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_identifier: "temp-user-id", // In real app, get from auth context
                message: lastUserMessage.content,
                // phone_number could be passed if known
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;

    } catch (error) {
        console.error("Error connecting to backend chat:", error);
        return "Sorry, I'm having trouble connecting to the server right now. Please try again later.";
    }
}

/**
 * Placeholder for audio transcription.
 * @param audioBlob The audio to transcribe.
 * @returns The transcribed text.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
    console.warn("Audio transcription invoked but no backend endpoint is configured for direct transcription yet.");
    // TODO: Implement a POST /api/transcribe endpoint in backend if we want this feature.
    return "";
}
