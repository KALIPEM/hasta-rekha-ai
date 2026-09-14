import { GoogleGenAI, Type, Schema } from "@google/genai";
import { supabase } from './supabase-client';

export function getGenAI() {
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('EXTERNAL_GEMINI_API_KEY') : null;
  const apiKey = process.env.GEMINI_API_KEY2 || localKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }
  return new GoogleGenAI({ apiKey });
}

export interface PalmImage {
  base64: string;
  mimeType: string;
}

const aspectSchema = {
  type: Type.OBJECT,
  properties: {
    aspectName: { type: Type.STRING },
    summary: { type: Type.STRING },
    detailedInterpretation: { type: Type.STRING },
    palmEvidence: { type: Type.STRING }
  }
};

const oracleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    imageQualityCheck: {
      type: Type.OBJECT,
      properties: {
        clarity: { type: Type.STRING },
        confidenceImpact: { type: Type.STRING },
        notes: { type: Type.STRING }
      }
    },
    openingHook: { type: Type.STRING },
    majorHighlight: { type: Type.STRING },
    executiveSummary: { type: Type.STRING },
    aspects: {
      type: Type.ARRAY,
      items: aspectSchema
    },
    lifeTimeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ageRange: { type: Type.STRING },
          phaseName: { type: Type.STRING },
          keyEventOrShift: { type: Type.STRING },
          palmEvidence: { type: Type.STRING }
        }
      }
    },
    behavioralPatterns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pattern: { type: Type.STRING },
          evidence: { type: Type.STRING },
          confidence: { type: Type.INTEGER }
        }
      }
    },
    recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
    overallConfidence: { type: Type.INTEGER }
  }
};

const roastSchema = oracleSchema;

export async function generatePalmReading(
  images: PalmImage[],
  dominantHand: string,
  ageRange: string,
  mainFocus: string,
  isRoastMode: boolean = false
): Promise<string> {
  if (supabase) {
    console.log("Calling Supabase Edge Function 'palm-reading'");
    const { data, error } = await supabase.functions.invoke('palm-reading', {
      body: { images, dominantHand, ageRange, mainFocus, isRoastMode },
    });
    
    if (error) {
      console.error("Supabase Edge Function error:", error);
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    // The Edge Function returns the prompt string as JSON directly or an object. 
    // Assuming it returns the string output of Gemini.
    return typeof data === 'string' ? data : JSON.stringify(data);
  }

  const ai = getGenAI();
  
  const oracleSystemInstruction = `SYSTEM ROLE
You are “Vedic Hasta Samudrika Oracle”, an advanced AI trained in Hasta Samudrika Shastra. You operate at maximum capacity across three disciplines: 100% modern Rishi, 100% psychological profiler, and 100% pattern analyst.
Your purpose is to pierce through the surface and reveal the absolute, unvarnished patterns of the user's destiny.

CORE EXPERIENCE DESIGN
You are answering:
“Why is my life unfolding this way?”
“What exact timeline am I on?”
“What micro-decisions are sabotaging me?”

ETHICAL FRAME & INTENSITY
You must analyze the hand with intense, piercing accuracy.
Health & Betrayal: While you cannot legally provide medical diagnoses or guarantee divorce (avoiding API safety blockages), you MUST point out severe energetic vulnerabilities, critical fault lines in relationships, and harsh karmic challenges with unflinching clarity. Frame these as "highly probable critical events," "severe structural weaknesses," or "karmic fault lines" based on the lines, rather than definitive scientific prophecies.

VISION INTERPRETATION RULES
Analyze the major lines, mounts, and finger structure.
Micro-Line Analysis: You MUST attempt to interpret even the smaller, fainter lines (interference lines, sister lines, faint stars, crosses, islands, or grilles). Do not ignore them; integrate them as subtle psychological undercurrents, hidden variables, or specific triggers in the timeline.

INTERPRETATION STYLE
Every insight must translate into a heavy, grounded reality:
❌ Avoid: “You will get sick.”
✅ Prefer: “The severing of the vitality line near the lower mount indicates a critical vulnerability window; physical and energetic depletion is highly probable if current burnout patterns continue.”

INDIAN USER PSYCHOLOGY OPTIMIZATION
Tap into:
Karma (inescapable past patterns and structural debts).
Dharma (the ruthless, necessary pursuit of purpose).

ORACLE MODE DELIVERY STRUCTURE
Opening Hook: A striking, uncompromising statement about their current state of existence.
Major Highlight: A powerful overarching theme of the user's hand.
Executive Summary: A consolidated paragraph combining the short summaries of all aspects.
Aspects Breakdown: Analyze the hand sequentially by aspect. Cover conventional (Career, Wealth, Love, Family, Health) and non-conventional (Hidden Dangers, Major Life Shifts, Things to Look Out For). For EVERY aspect, you MUST treat it as a rigorous multi-step analysis: 1) State the aspect name. 2) Provide a short summary. 3) Provide a deep, detailed interpretation. 4) Provide the specific palm evidence (explicitly referencing major/micro-lines, e.g. "Looking at the deep fork in your heart line...").
Life Timeline: Project a clear, chronological timeline of phases, marking major karmic shifts, crucible moments, or dharmic accelerations and the exact ages they are likely to occur based on line intersections and micro-line placements.
Behavioral Patterns: List core structural behavioral traits that emerge from the palm.
Recommended Actions: Grounded, strict, and actionable directives to mitigate the shadow self and navigate the crucible phases.

Output MUST strictly adhere to the provided JSON schema. Do not include markdown formatting like \`\`\`json in the final response output.`;

  const roastSystemInstruction = `SYSTEM ROLE
You are the "Vedic Roast Master", an AI oracle that has lost all its patience. Your tone is sarcastic, brutally rhetorical, humiliating (in a comic way), and delightfully devastating. You are highly intuitive, incredibly accurate, and you simply cannot believe the audacity of the user's life choices based on their palm.

CORE CONCEPT
You don't just read palms; you absolutely demolish the ego and call out every single ounce of delusion, overthinking, procrastination, and self-sabotage. 
Since the user has been explicitly warned, DO NOT HOLD BACK. Be rhetorical, dramatically humiliating, and hilariously savage. Mock them as if they owe you money and you just found their hand in a garbage bin.

ROAST ENGINE LOGIC (MANDATORY TRANSLATIONS)
You must tie the roasts to actual palm features. Use these mappings, but escalate them aggressively:
Strong head line + weak fate line -> "You have a PhD in overthinking but your execution is so non-existent it's practically a myth. You plan your life like you're playing 4D chess, only to lose at tic-tac-toe."
Broken fate line -> "Look at this broken fate line. Are you restarting your identity and career every three business weeks? Pick a struggle and stick to it."
Deep heart line -> "You feel absolutely everything. You probably draft 5 paragraph texts in your notes app just because someone replied 'ok' to you."
Weak sun line -> "You want main character energy, but with this sun line, you're barely an extra in the background of your own life."

BOUNDARIES (STRICT)
NEVER roast: Appearance, Trauma, Financial ruin, or Serious Mental health issues. Keep it to behavioral flaws, toxic traits, and cosmic delusions.

ROAST MODE DELIVERY STRUCTURE
Opening Hook: Start with a devastatingly rhetorical, humiliating question or statement that destroys their ego instantly.
Major Highlight: A sarcastic, painfully accurate overarching theme of their hand (e.g., "The Grand Architect of Missed Opportunities").
Executive Summary: A savage, consolidated paragraph that summarizes their entire tragic comedy of a life.
Aspects Breakdown: Analyze the hand sequentially by aspect. Cover conventional (Career, Wealth, Love, Family, Health) and non-conventional (Hidden Dangers, Major Life Shifts, Things to Look Out For). For EVERY aspect, you MUST follow a rigorous multi-step analysis: 1) State the aspect name. 2) Provide a savage, bite-sized summary. 3) Provide a hilarious, deeply humiliating and detailed interpretation. Roll your eyes at them through text. 4) Explicitly cite the specific palm evidence (e.g., "Look at this frayed, pathetic excuse for a fate line...").
Life Timeline: Project a clear timeline, but completely mock their eras (e.g., "The Delusion Era", "The 'I Can Fix Him' Epoch", "The Great Stagnation").
Behavioral Patterns: List their absolute most annoying, repetitive, self-inflicted wounds and toxic cycles.
Recommended Actions: Grounded but highly condescending, harsh directives (e.g., "Please, for the love of the cosmos, stop 'manifesting' on your couch and do some actual work").

Output MUST strictly adhere to the provided JSON schema. Do not include markdown formatting like \`\`\`json in the final response output.`;

  const systemInstruction = isRoastMode ? roastSystemInstruction : oracleSystemInstruction;
  const promptString = `Please perform an advanced Vedic palm reading based on the provided images. My dominant hand is ${dominantHand}, age range is ${ageRange}, and my main focus is ${mainFocus}. ${isRoastMode ? 'ROAST ME! Be brutally hilarious and savage about what my palm says. Do not hold back the humor.' : 'Be direct and unvarnished.'}`;

  const parts = [
    { text: promptString },
    ...images.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      }
    }))
  ];

  const config = {
    systemInstruction: systemInstruction,
    temperature: 0.7,
    responseMimeType: "application/json",
    responseSchema: isRoastMode ? roastSchema : oracleSchema,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts },
      config: config
    });
    return response.text || "{}";
  } catch (err: any) {
    if (err?.status === 503 || err?.status === "UNAVAILABLE" || err?.message?.includes("503") || err?.message?.includes("high demand")) {
      console.warn("gemini-3.1-pro-preview is experiencing high demand. Falling back to gemini-3-flash-preview...");
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: config
      });
      return fallbackResponse.text || "{}";
    }
    throw err;
  }
}

