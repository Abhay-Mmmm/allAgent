import React, { createContext, useContext, useState } from "react";
import axios from "axios";

interface NovaSonicContextProps {
  isSpeaking: boolean;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  transcribeAudio: (audioBlob: Blob) => Promise<string>;
}

const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append("audio_stream", audioBlob);

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/detect-intent`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.transcription || "";
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return "Error transcribing audio.";
  }
};

const NovaSonicContext = createContext<NovaSonicContextProps | undefined>(undefined);

export const NovaSonicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const startSpeaking = () => setIsSpeaking(true);
  const stopSpeaking = () => setIsSpeaking(false);

  return (
    <NovaSonicContext.Provider value={{ isSpeaking, startSpeaking, stopSpeaking, transcribeAudio }}>
      {children}
    </NovaSonicContext.Provider>
  );
};

export const useNovaSonic = () => {
  const context = useContext(NovaSonicContext);
  if (!context) {
    throw new Error("useNovaSonic must be used within a NovaSonicProvider");
  }
  return context;
};