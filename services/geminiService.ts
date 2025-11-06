import { GoogleGenAI, Type, Content } from "@google/genai";
import type { GtaPopulationData } from "../types";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error("API key is missing. Please check your .env file!");
}

export async function fetchGtaPopulationInfo(location: string): Promise<GtaPopulationData> {
  const prompt = `
    Act as an expert urban planning analyst for the Greater Toronto Area.
    Based on the provided context about predicting urban sprawl, generate a detailed analysis for ${location}.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            keyPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
            populationTrend: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  year: { type: Type.INTEGER },
                  population: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                },
              },
            },
            urbanSprawlPredictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
            predictedHotspots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  locationQuery: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    // 🧠 Debug logs for development
    console.log("Raw Gemini Response:", response);

    // ✅ Use safe access for .text
    const jsonText = response.text?.trim?.();
    if (!jsonText) {
      console.error("Gemini API returned empty text:", response);
      throw new Error("API returned an empty or invalid response.");
    }

    let parsedData: GtaPopulationData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse Gemini API response JSON.");
    }

    // ✅ Prevent 'sort' undefined error
    if (parsedData.populationTrend && Array.isArray(parsedData.populationTrend)) {
      parsedData.populationTrend.sort((a, b) => a.year - b.year);
    } else {
      console.warn("No populationTrend found in API response.");
      parsedData.populationTrend = [];
    }

    console.log("Parsed Data:", parsedData);
    return parsedData;
  } catch (error: any) {
    console.error("Error in Gemini API service:", error);

    // ✅ Handle specific Gemini API errors
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota")) {
      throw new Error("API quota exceeded. Please wait a few minutes and try again.");
    }

    if (error.message?.includes("503") || error.message?.includes("UNAVAILABLE")) {
      throw new Error("Gemini model is currently overloaded. Please try again later.");
    }

    throw new Error("Failed to retrieve population data. Please check API or network.");
  }
}

export async function askChatbot(question: string, history: Content[]): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const contents: Content[] = [
      ...history,
      { role: "user", parts: [{ text: question }] },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents,
      config: {
        systemInstruction:
          "You are Urbo, a helpful AI assistant powered by Google Gemini. You specialize in GTA population growth and urban planning.",
      },
    });

    const answer = response.text?.trim?.() || "No response received from Gemini.";
    return answer;
  } catch (error: any) {
    console.error("Error in chatbot service:", error);

    if (error.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("You have reached the free Gemini API request limit. Try again later.");
    }

    throw new Error("Sorry, I couldn't get a response from the AI. Please try again.");
  }
}
