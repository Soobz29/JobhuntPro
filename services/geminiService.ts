
import { GoogleGenAI } from "@google/genai";
import { JobApplication, AtsReport } from "../types";

/**
 * Creates a fresh instance of the AI client.
 */
const createAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please ensure it is configured in your environment.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Extracts text from a PDF file using Gemini
 */
export const extractTextFromPdf = async (base64Data: string): Promise<string> => {
  try {
    const ai = createAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            },
            {
              text: "Please extract all the text content from this resume PDF accurately. Do not add any commentary, just return the text found in the document.",
            },
          ],
        },
      ],
    });

    return response.text || "";
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    throw new Error(error.message || "Failed to extract text from PDF.");
  }
};

/**
 * Uses Google Search grounding to pull a job description from a URL.
 */
export const scrapeJobDescription = async (url: string): Promise<string> => {
  try {
    const ai = createAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Please visit this URL: ${url} and extract the full job description, including responsibilities, requirements, and company details. Format it as plain text without any markdown or conversational filler.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Scraping Error:", error);
    throw new Error("Could not pull details. You may need to paste the description manually.");
  }
};

export const analyzeAtsMatch = async (resumeText: string, jobDescription: string): Promise<AtsReport | null> => {
  if (!resumeText || !jobDescription) return null;

  try {
    const ai = createAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Compare the following Resume and Job Description for an ATS (Applicant Tracking System) check. 
      
      RESUME:
      ${resumeText}

      JOB DESCRIPTION:
      ${jobDescription}

      Return a JSON object with this exact structure:
      {
        "score": number (0-100),
        "missingKeywords": string[] (top 5 important skills/keywords missing from resume),
        "strengths": string[] (top 3 areas where the candidate matches well),
        "suggestions": string (short advice on how to improve the resume for this specific JD)
      }`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      score: result.score || 0,
      missingKeywords: result.missingKeywords || [],
      strengths: result.strengths || [],
      suggestions: result.suggestions || "No specific suggestions."
    };
  } catch (error: any) {
    console.error("ATS Analysis Error:", error);
    return null;
  }
};
