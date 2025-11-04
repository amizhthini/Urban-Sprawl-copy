import { GoogleGenAI, Type } from "@google/genai";
import type { GtaPopulationData } from '../types';

export async function fetchGtaPopulationInfo(location: string): Promise<GtaPopulationData> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Act as an expert urban planning analyst for the Greater Toronto Area.
    Based on the provided context about predicting urban sprawl, generate a detailed analysis for ${location}. If the location is 'Greater Toronto Area', provide data for the entire region.
    
    Context on Urban Sprawl Prediction:
    "Predicting urban sprawl is a complex task that involves analyzing various factors and trends related to urban development. It is essential to consider a wide range of indicators and factors that can influence the extent and patterns of urban expansion. These indicators are typically derived from various data sources, including demographic, economic, environmental, and spatial data. Key indicators include population growth, economic indicators (job growth, income levels), Land Use and Land Cover (LULC), transportation infrastructure, zoning regulations, local politics, and proximity to services and natural features."

    Your analysis must include:
    1.  A main title for the page, specific to ${location}.
    2.  A concise summary (around 50-70 words) about ${location}'s population growth.
    3.  Exactly 3 key points, each with a short, catchy title and a detailed description (around 30-40 words each) relevant to ${location}, covering:
        - The main drivers of growth.
        - The impact on local infrastructure and housing.
        - Future population projections and trends.
    4.  Historical population data for the last 5 years and projected data for the next 5 years for a chart. For each year, provide the year, population, and whether the data is 'historical' or 'projected'.
    5.  Exactly 3 predictions about the future of urban sprawl in ${location}, based on the context provided. Each prediction needs a short, insightful title and a detailed description (around 40-50 words).
    6.  Exactly 3 predicted growth hotspots for the next 10 years. These predictions must be hyper-realistic and well-founded. Crucially, they must be STRICTLY WITHIN the geographical boundaries of ${location}. Do not suggest locations in adjacent municipalities. For each hotspot, provide:
        - 'name': A human-readable name for the area (e.g., "East Harbour").
        - 'locationQuery': A highly specific, Google Maps-searchable string for the location (e.g., "East Harbour, Toronto, ON" or "Don Roadway and Lake Shore Boulevard East, Toronto"). This is critical for map accuracy.
        - 'reason': A detailed explanation of why this specific area will experience significant growth. Your reasoning MUST be grounded in the principles from the 'Context on Urban Sprawl Prediction' provided above. Explicitly consider factors like local zoning laws, political initiatives, major transit projects (like new subway lines), housing availability/affordability, and the potential for redevelopment of underutilized land.

    Return the entire response as a single JSON object.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "The main title for the web page."
            },
            summary: {
              type: Type.STRING,
              description: "A brief summary of the location's population growth."
            },
            keyPoints: {
              type: Type.ARRAY,
              description: "A list of key insights about the population growth.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "The title of the key point." },
                  description: { type: Type.STRING, description: "The detailed description of the key point." }
                },
                required: ["title", "description"]
              }
            },
            populationTrend: {
              type: Type.ARRAY,
              description: "Historical and projected population data for the location.",
              items: {
                type: Type.OBJECT,
                properties: {
                  year: { type: Type.INTEGER, description: "The year." },
                  population: { type: Type.NUMBER, description: "The population number." },
                  type: { type: Type.STRING, description: "Either 'historical' or 'projected'." }
                },
                required: ["year", "population", "type"]
              }
            },
            urbanSprawlPredictions: {
              type: Type.ARRAY,
              description: "Predictions about the future of urban sprawl.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "The title of the prediction." },
                  description: { type: Type.STRING, description: "The detailed description of the prediction." }
                },
                required: ["title", "description"]
              }
            },
            predictedHotspots: {
              type: Type.ARRAY,
              description: "Predicted high-growth neighborhoods or areas for the next 10 years.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "The human-readable name of the hotspot area (e.g., a neighborhood)." },
                  locationQuery: { type: Type.STRING, description: "A highly specific, searchable string for Google Maps." },
                  reason: { type: Type.STRING, description: "The detailed reason for the predicted growth." }
                },
                required: ["name", "locationQuery", "reason"]
              }
            }
          },
          required: ["title", "summary", "keyPoints", "populationTrend", "urbanSprawlPredictions", "predictedHotspots"]
        }
      }
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("API returned an empty response.");
    }

    const parsedData: GtaPopulationData = JSON.parse(jsonText);
    
    // Sort data by year just in case the API doesn't
    parsedData.populationTrend.sort((a, b) => a.year - b.year);
    
    return parsedData;

  } catch (error) {
    console.error("Error fetching data from Gemini API:", error);
    throw new Error("Failed to retrieve population data. The API may be unavailable or the request failed. Please ensure your API key is configured correctly in the environment settings.");
  }
}