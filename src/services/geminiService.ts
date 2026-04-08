import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateTriviaQuestion(): Promise<QuizQuestion> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a challenging technical or general trivia question for a 'gearhead' (car enthusiast). It must have exactly 3 multiple-choice options.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Exactly 3 options"
            },
            correctAnswer: { 
              type: Type.INTEGER,
              description: "Index of the correct answer (0-2)"
            }
          },
          required: ["question", "options", "correctAnswer"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return data as QuizQuestion;
  } catch (error) {
    console.error("Error generating trivia:", error);
    // Fallback question
    return {
      question: "What does 'DOHC' stand for in engine terminology?",
      options: ["Dual Over Head Cam", "Direct Oil High Compression", "Double Output High Capacity"],
      correctAnswer: 0
    };
  }
}
