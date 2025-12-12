import { GoogleGenAI } from "@google/genai";
import { UserPreferences, SmartQuestion, Itinerary, Activity, DayPlan } from "../types";

// Helper to extract JSON
function extractJSON(text: string): any {
  try {
    // 1. Try Markdown Code Block
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }

    // 2. Try Raw JSON finding (Object or Array)
    const firstOpenBrace = text.indexOf('{');
    const firstOpenBracket = text.indexOf('[');
    
    let startIndex = -1;
    let endIndex = -1;

    // Determine if it looks like an object or array starts first
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
        startIndex = firstOpenBrace;
        endIndex = text.lastIndexOf('}');
    } else if (firstOpenBracket !== -1) {
        startIndex = firstOpenBracket;
        endIndex = text.lastIndexOf(']');
    }

    if (startIndex !== -1 && endIndex !== -1) {
        return JSON.parse(text.substring(startIndex, endIndex + 1));
    }

    // 3. Last ditch effort
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON Extraction Failed:", e);
    return null;
  }
}

function formatDateForPrompt(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export const validateDestination = async (destination: string): Promise<{ isValid: boolean, formattedName?: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `
    Analyze destination: "${destination}".
    Return JSON: { "isValid": boolean, "formattedName": string | null }
    If valid, provide "City, Country".
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const result = extractJSON(response.text || "{}");
    return result || { isValid: true, formattedName: destination }; // Fallback to valid to prevent blocking
  } catch (error) {
    return { isValid: true, formattedName: destination };
  }
};

export const checkEventsAndGetQuestions = async (prefs: UserPreferences): Promise<SmartQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";
  
  const startDate = formatDateForPrompt(prefs.startDate);
  const endDate = formatDateForPrompt(prefs.endDate);

  const start = new Date(prefs.startDate);
  const end = new Date(prefs.endDate);
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  // Logic: Short trips (1-5 days) get 5 questions max. Long trips get 10 max.
  const targetNumQuestions = durationDays <= 5 ? 5 : 10;

  const prompt = `
    Context: Trip to ${prefs.destination}, ${startDate}-${endDate} (${durationDays} days).
    Who: ${prefs.tripType} (${JSON.stringify(prefs.demographics)}).
    Interests: ${prefs.interests.join(', ')}.

    TASK: Generate exactly ${targetNumQuestions} "Tinder-style" Yes/No questions to refine the itinerary.
    
    STRATEGY:
    1. **Events**: Check for specific events during ${startDate}-${endDate}.
    2. **Unique Activities**: Ask about specific, non-generic experiences (e.g., "Visit the Museum of Ice Cream?" instead of "Do you like museums?").
    3. **Must Include**: Everything the user says "Yes" to WILL be added to the itinerary, so ensure these fit within a ${durationDays}-day schedule.

    RULES:
    - **Short & Punchy**: Max 15 words per description.
    - **Specific**: Name actual places or events.
    - **Ignore**: Do NOT ask about "${prefs.mustVisit}".

    Return JSON array: [{ "id": "snake_case_id", "emoji": "SingleChar", "title": "Title", "description": "Short question?" }]
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    const res = extractJSON(response.text || "[]");
    return Array.isArray(res) ? res.slice(0, targetNumQuestions) : [];
  } catch (error) {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt + "\nFallback: Generate generic questions.", 
            config: { responseMimeType: "application/json" }
        });
        const res = extractJSON(response.text || "[]");
        return Array.isArray(res) ? res.slice(0, targetNumQuestions) : [];
    } catch (e) { return []; }
  }
};

// --- PASS 2: OPTIMIZATION & LOGISTICS MANAGER ---
const optimizeItineraryRoute = async (initialItinerary: Itinerary, prefs: UserPreferences): Promise<Itinerary> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-2.5-flash";

    const prompt = `
    Act as a **Travel Logistics Expert**. Review and optimize this itinerary for ${prefs.destination}.

    CURRENT ITINERARY JSON:
    ${JSON.stringify(initialItinerary)}

    YOUR MISSION:
    1. **ELIMINATE GENERIC LOCATIONS**:
       - Scan "mapsQuery" for every activity.
       - IF it says "Best Ramen", "Local Street Food", "Coffee Shop", or anything generic:
       - REPLACE it with a specific, real-world, high-rated establishment name nearby.
       - Example: Change "Local Noodle Stall" -> "Ah Hock Fried Hokkien Mee".

    2. **GEOGRAPHIC CONSISTENCY**: 
       - Check lat/long. Group activities by neighborhood.
       - IF an activity is >3km away from the day's cluster, REPLACE it with a similar activity nearby.
    
    3. **LOGICAL ROUTING**:
       - Re-order activities (Morning -> Afternoon -> Evening) for logical flow.
       
    4. **DATA COMPLETENESS**:
       - Ensure EVERY activity (except 'user-plan') has valid "priceLevel", "openingHours", and "rating".
       - Ensure "mapsQuery" is specific (Name + Address).

    5. **BADGE CLEANUP**:
       - Ensure fewer than 15% of all activities have a badge. 
       - If there are too many 'isPopular' or 'isLocalRecommendation', set them to false.

    Return the **OPTIMIZED** JSON object only.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const optimized = extractJSON(response.text || "{}");
        
        if (optimized && optimized.days && optimized.days.length > 0) {
            return optimized;
        }
        return initialItinerary;
    } catch (e) {
        console.warn("Optimization pass failed, using draft.", e);
        return initialItinerary;
    }
};

// --- PASS 1: GENERATION ---
export const generateItinerary = async (prefs: UserPreferences): Promise<Itinerary | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";
  
  const startDate = formatDateForPrompt(prefs.startDate);
  const endDate = formatDateForPrompt(prefs.endDate);
  
  // Logic for Age & Pace
  const userAge = parseInt(prefs.demographics.age || '25'); // Default to 25 if missing or NaN
  const isOlder = userAge >= 50;
  
  let paceDirective = "";
  if (prefs.pace === 'Slow' || isOlder) {
      paceDirective = `
      ** PACE: RELAXED / SENIOR FRIENDLY **
      - User is ${userAge} years old (or requested SLOW pace).
      - **MAXIMUM 3 activities per day** (excluding meals).
      - Avoid high-intensity physical activities (hiking, climbing) unless explicitly requested.
      - Ensure schedule allows for rest and leisurely dining.
      `;
  } else if (prefs.pace === 'Fast') {
       paceDirective = `
      ** PACE: FAST / PACKED **
      - User requested FAST pace.
      - Pack the day with 5+ activities.
      - Minimize downtime.
      `;
  } else {
       paceDirective = `
      ** PACE: BALANCED **
      - User requested BALANCED pace.
      - Include 3-4 main activities per day.
      `;
  }
  
  // Fixed Plans Logic - STRICT
  const fixedPlansMap = prefs.fixedPlans.map(p => 
    `DATE: ${formatDateForPrompt(p.date)} -> USER LOCKED PLAN: "${p.description}"`
  ).join("\n");
  
  const fixedPlansInstructions = prefs.fixedPlans.length > 0 
    ? `
      ** STRICT FIXED PLAN LOCK **
      The user has manually added plans:
      ${fixedPlansMap}
      
      INSTRUCTIONS FOR THESE DATES:
      1. Day Title: "${prefs.fixedPlans[0]?.description}".
      2. **Morning**: Create ONE single activity object with name "${prefs.fixedPlans[0]?.description}". Type: 'user-plan'.
      3. **Afternoon & Evening**: Leave EMPTY arrays [].
      4. **No Meals**: Do NOT generate breakfast/lunch/dinner for these days.
      5. **No Expansion**: Do NOT add anything else to this day. Just the one user plan.
      ` 
    : "";

  // Likes/Dislikes
  const likedItems = Object.entries(prefs.followUpAnswers)
    .filter(([_, liked]) => liked)
    .map(([id]) => id.replace(/_/g, ' '))
    .join(", ");

  const basePrompt = `
    Create a JSON itinerary for ${prefs.destination}.
    Dates: ${startDate} to ${endDate}.
    Who: ${prefs.tripType} ${JSON.stringify(prefs.demographics)}.
    Budget: ${prefs.budget}. Vibe: ${prefs.vibe}.
    
    ${paceDirective}

    ${fixedPlansInstructions}

    ** CORE RULES **
    1. **MEALS REQUIRED**: Include 3 meals per day (Breakfast, Lunch, Dinner) EXCEPT on "Fixed Plan" days.
    
    2. **MAPS ACCURACY - CRITICAL**
       - "mapsQuery" MUST be the **EXACT** Google Maps Name of a specific real-world place.
       - **FORBIDDEN**: "Local Noodle Shop", "Street Food Vendor", "Best Ramen in Tokyo", "Coffee Shop".
       - **REQUIRED**: "Ichiran Ramen Shibuya", "Fushimi Inari Taisha", "Chatuchak Weekend Market".
       - IF suggesting street food, name a **SPECIFIC STALL** or a **SPECIFIC MARKED LOCATION**.
       - NEVER use generic search terms.

    ** BADGE RULES (EXTREMELY RARE - MAX 15% TOTAL) **
    - **isPopular**: TRUE *only* for the absolute top 10 world-famous landmarks in the city (e.g. Eiffel Tower, Colosseum).
    - **isLocalRecommendation**: TRUE *only* for specific, named, high-quality hidden gems. MAX 1 per day.
    - **isMichelin**: TRUE *only* if verifiable Michelin Star.
    - **DEFAULT**: Set to FALSE for 85%+ of items. 
    - **DO NOT** place a badge on every card. Most cards should have NO badges.

    ** LIKED ITEMS **
    - You MUST include these agreed activities: ${likedItems}.

    ** JSON STRUCTURE **
    {
      "destination": "${prefs.destination}",
      "days": [
        {
          "dayNumber": 1,
          "date": "DD/MM/YYYY",
          "areaFocus": "Neighborhood",
          "title": "Day Theme",
          "vibe": "...",
          "vibeIcons": ["emoji"],
          "highlightEvent": { "name": "...", "description": "...", "mapsQuery": "..." },
          "morning": [{ 
             "name": "Specific Business Name", 
             "description": "...", 
             "emoji": "x", 
             "category": "...", 
             "type": "restaurant/attraction/user-plan", 
             "isLocalRecommendation": boolean, 
             "isMichelin": boolean, 
             "isPopular": boolean,
             "mapsQuery": "Specific Business Name, Address",
             "priceLevel": "$$$",
             "openingHours": "09:00 - 22:00",
             "admissionFee": "$20",
             "rating": 4.5
          }],
          "afternoon": [],
          "evening": []
        }
      ]
    }
  `;

  try {
    // Pass 1: Draft Generation
    const response = await ai.models.generateContent({
      model,
      contents: basePrompt + `\nUse Google Search to find real specific places.`,
      config: { tools: [{ googleSearch: {} }] }
    });

    const draft = extractJSON(response.text || "{}");

    if (draft && Array.isArray(draft.days)) {
        console.log("Draft created. Optimizing...");
        return await optimizeItineraryRoute(draft, prefs);
    }
    
    return null;
  } catch (e) {
    console.warn("Generation failed", e);
    return null;
  }
};

export const getAlternativeActivity = async (
  prefs: UserPreferences, 
  currentActivity: Activity, 
  context: { dayTitle: string, area: string, timeOfDay: string },
  existingActivityNames: string[] = [],
  customRequest?: string
): Promise<Activity | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `
    Suggest an ALTERNATIVE activity for: "${currentActivity.name}" in ${prefs.destination}.
    Context: ${context.timeOfDay}, ${context.area}.
    User Vibe: ${prefs.vibe}. Budget: ${prefs.budget}.
    Custom Request: ${customRequest || "Something different but nearby"}.

    Constraint:
    - Must be real.
    - Must be open.
    - MUST include priceLevel, openingHours, rating, mapsQuery.
    - mapsQuery MUST be a specific place name, NO generic search terms.
    
    Return JSON (Activity Object).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return extractJSON(response.text || "null");
  } catch (e) {
    return null;
  }
}

export const generateDayCardImage = async (dayTitle: string, area: string, destination: string, vibe: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-image-preview';
    
    const safeTitle = dayTitle.includes("Meeting") || dayTitle.includes("Plan") ? "Peaceful travel abstract" : dayTitle;

    const prompt = `
      Travel illustration for ${destination}, ${area}.
      Mood: ${vibe}, ${safeTitle}.
      Style: Flat vector art, pastel colors, cheerful, soft lighting.
      Aspect Ratio: 16:9.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
    } catch (e) {
        return null;
    }
}