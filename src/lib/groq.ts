import { toast } from "sonner";

const GROQ_API_URL = "https://api.groq.com/openai/v1";

const VOICE_API_KEY = import.meta.env.VITE_GROQ_API_KEY_VOICE;
const CHAT_API_KEY = import.meta.env.VITE_GROQ_API_KEY_CHAT;

export const SYSTEM_PROMPTS = {
    INSURANCE_AGENT: `You are a friendly Insurance Assistant for 'allAgent'. 
    You help with ALL types of insurance (Crop/PMFBY, Health, Life, Vehicle, General).
    
    CRITICAL RULES:
    - Keep responses SHORT (2-4 sentences max).
    - Use simple language. Avoid long lists and bullet points.
    - Only use **bold** for key terms (no headers, no numbered lists).
    - Be conversational, not formal.
    - Support Hindi and English.
    
    CONTEXT HANDLING:
    - REMEMBER the conversation context. If user mentioned a topic, stay on it.
    - Do NOT repeat "What kind of insurance?" if user already specified one.
    - If user says "yes" or confirms, ANSWER the question directly, don't ask again.
    - Provide helpful info about the insurance type they asked about.
    
    FEATURE LIMITATIONS:
    - If user asks to DO something (file claim, check status, buy policy, make payment), say: "That feature is not yet implemented in the app. I can only answer questions for now."
    - You CAN answer QUESTIONS about any insurance topic.
    - You CANNOT perform actions like filing claims or checking policy status.`,

    VOICE_AGENT: `You are a helpful voice assistant for 'allAgent'.
    You are speaking on a phone call.
    
    Guidelines:
    - You can help with ANY insurance query (Crop, Health, Life, Vehicle).
    - Keep responses VERY short and conversational (1-2 sentences max).
    - Do not use markdown like *bold* or list items, as this will be read by Text-to-Speech.
    - Be friendly and direct.
    - Confirm details like Policy ID, Farmer Name, or Vehicle Number clearly.
    - The user is speaking to you via voice.`
};

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("language", "en"); // Start with English, can be auto-detect
    // For auto-detect language, remove the language param or set to null if API supports it, 
    // but usually Whisper works better if we don't force it unless we know.
    // However, for this MVP let's leave it flexible or default to logic.
    // Actually, let's NOT send language so it auto-detects Hindi/English.
    // formData.append("language", "en"); 

    try {
        const response = await fetch(`${GROQ_API_URL}/audio/transcriptions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${VOICE_API_KEY}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Transcription failed");
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Groq Whisper Error:", error);
        toast.error("Failed to transcribe audio");
        throw error;
    }
}

export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export async function getChatCompletion(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    try {
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 1024,
        };

        const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${CHAT_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Chat completion failed");
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Groq Chat Error:", error);
        toast.error("Failed to get AI response");
        throw error;
    }
}
