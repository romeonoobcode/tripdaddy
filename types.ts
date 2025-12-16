
export type TripType = 'Solo' | 'Couple' | 'Friends' | 'Family';
export type BudgetLevel = 'Low' | 'Medium' | 'High';
export type VibeType = 'Extreme/Fun' | 'Laid back/Chill' | 'Both';
export type PaceType = 'Slow' | 'Balanced' | 'Fast';
export type Interest = 'Dining' | 'Nightlife' | 'Culture' | 'Active' | 'Viewpoints' | 'Nature' | 'Shopping' | 'Local Experiences' | 'Shows & Concerts';
export type KidsAgeRange = '0-5' | '5-10' | '10-15' | '15-20';
export type Gender = 'Male' | 'Female' | 'Non-binary/Other';

export interface FixedPlan {
  id: string;
  date: string;
  description: string;
}

export interface Demographics {
  gender?: Gender;
  age?: string; // used for solo age or average age
  kidsAgeRange?: KidsAgeRange;
}

export interface UserPreferences {
  destination: string;
  startDate: string;
  endDate: string;
  hotelLocation: string;
  tripType: TripType;
  budget: BudgetLevel;
  vibe: VibeType;
  pace: PaceType;
  interests: Interest[];
  demographics: Demographics;
  fixedPlans: FixedPlan[];
  mustVisit: string;
  followUpAnswers: Record<string, boolean>;
}

export interface SmartQuestion {
  id: string;
  emoji: string;
  title: string; // e.g. "Wine Tasting"
  description: string; // e.g. "Would you be interested in a half-day tour?"
}

export interface Activity {
  name: string;
  description: string;
  duration: string;
  emoji: string;
  rating?: number;
  priceLevel?: string; // '$' | '$$' | '$$$' | '$$$$' | 'Free'
  openingHours?: string;
  admissionFee?: string; // e.g. "Approx $30"
  website?: string; // URL
  mapsQuery: string; // Specific query to find the place (e.g. "Place Name, City")
  category?: string; // New classification field
  type: 'attraction' | 'restaurant' | 'event' | 'local-gem' | 'user-plan';
  isLocalRecommendation?: boolean;
  isMichelin?: boolean;
  isPopular?: boolean;
  isFixedPlan?: boolean;
  // Geolocation fields
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

export interface DayPlan {
  dayNumber: number;
  date: string;
  areaFocus: string;
  title: string;
  vibe: string; 
  vibeIcons: string[]; 
  colors: string[]; 
  morning: Activity[];
  afternoon: Activity[];
  evening: Activity[];
  highlightEvent?: {
    name: string;
    description: string;
    mapsQuery: string; // Specific query
  };
}

export interface Itinerary {
  destination: string;
  days: DayPlan[];
}