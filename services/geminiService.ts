import { GoogleGenAI, Type } from "@google/genai";

// NOTE: In a real app, never expose keys in client code.
// However, per instructions, we access process.env.API_KEY.
// The user of this code must configure their environment/bundler to inject this.
const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  async generateQuiz(topic: string = 'Puasa Ramadhan') {
    if (!apiKey) {
      // Return fallback data if no key
      return [
        {
          question: "Apa hukum puasa Ramadhan bagi umat Islam?",
          options: ["Wajib", "Sunnah", "Makruh", "Haram"],
          correctIndex: 0
        },
        {
          question: "Malam kemuliaan di bulan Ramadhan disebut?",
          options: ["Nuzulul Quran", "Lailatul Qadar", "Idul Fitri", "Isra Miraj"],
          correctIndex: 1
        },
        {
          question: "Perang besar yang terjadi pada bulan Ramadhan adalah?",
          options: ["Perang Uhud", "Perang Badar", "Perang Khandaq", "Perang Tabuk"],
          correctIndex: 1
        }
      ];
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Buatkan 5 soal pilihan ganda tentang ${topic} untuk siswa SMP. Berikan dalam format JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING } 
                },
                correctIndex: { type: Type.INTEGER, description: "Index of correct answer (0-3)" }
              },
              required: ["question", "options", "correctIndex"]
            }
          }
        }
      });
      
      const jsonStr = response.text || "[]";
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Gemini Error:", error);
      return [];
    }
  },

  async generateStory(topic: string) {
    if (!apiKey) {
      return "Mohon maaf, API Key belum dikonfigurasi. Silakan hubungi admin untuk membaca cerita default.";
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Buatkan cerita islami pendek yang inspiratif untuk siswa SMP tentang tema: ${topic}. Maksimal 300 kata. Gaya bahasa santai tapi sopan.`,
        config: {
           thinkingConfig: { thinkingBudget: 0 } 
        }
      });
      return response.text || "Gagal memuat cerita.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Terjadi kesalahan saat memuat cerita.";
    }
  }
};
