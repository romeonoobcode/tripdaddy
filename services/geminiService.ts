import { UserPreferences, SmartQuestion, Itinerary, Activity, DayPlan } from "../types";

// Base API URL - In production this would be an environment variable
const API_URL = 'http://localhost:3000/api';

export const validateDestination = async (destination: string): Promise<{ isValid: boolean, formattedName?: string }> => {
  try {
    const res = await fetch(`${API_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination })
    });
    return await res.json();
  } catch (e) {
    console.error("API Error", e);
    return { isValid: true, formattedName: destination };
  }
};

export const checkEventsAndGetQuestions = async (prefs: UserPreferences): Promise<SmartQuestion[]> => {
  try {
    const res = await fetch(`${API_URL}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    return await res.json();
  } catch (e) {
    console.error("API Error", e);
    return [];
  }
};

// Returns metadata about the preview generation (id, totalDays, etc.)
// The actual plan content is retrieved after email capture
export const generateItinerary = async (prefs: UserPreferences): Promise<{ id: string, totalDays: number, previewDays: number } | null> => {
  try {
    const res = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    if (!res.ok) throw new Error("Generation failed");
    return await res.json();
  } catch (e) {
    console.error("API Error", e);
    return null;
  }
};

export const saveEmailAndGetPreview = async (id: string, email: string): Promise<{ plan: Itinerary, images: Record<number, string>, unlocked: boolean, totalDays: number } | null> => {
    try {
        const res = await fetch(`${API_URL}/save-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, email })
        });
        return await res.json();
    } catch (e) {
        return null;
    }
};

export const unlockItinerary = async (tripId: string): Promise<{ success: boolean, plan?: Itinerary, images?: Record<number, string> }> => {
    try {
        const res = await fetch(`${API_URL}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId })
        });
        return await res.json();
    } catch (e) {
        return { success: false };
    }
};

export const createCheckoutSession = async (id: string): Promise<string | null> => {
    try {
        const res = await fetch(`${API_URL}/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        return data.url;
    } catch (e) {
        return null;
    }
}

export const getAlternativeActivity = async (
  prefs: UserPreferences, 
  currentActivity: Activity, 
  context: { dayTitle: string, area: string, timeOfDay: string },
  existingActivityNames: string[] = [],
  customRequest?: string
): Promise<Activity | null> => {
  try {
    const res = await fetch(`${API_URL}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefs, activity: currentActivity, context, customRequest })
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Client-side image generation is mostly deprecated in favor of server-side caching, 
// but keeping this signature to satisfy compilation if needed, though unused in new flow.
export const generateDayCardImage = async () => null;