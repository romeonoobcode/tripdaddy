import mongoose from 'mongoose';

const itinerarySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String },
  unlocked: { type: Boolean, default: false },
  destination: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  totalDays: { type: Number, required: true },
  previewDaysGenerated: { type: Number, default: 0 },
  
  // Stores the actual itinerary JSON structure
  plan: { type: Object, default: {} },
  
  // Cache generated base64 images { "1": "base64...", "2": "base64..." }
  images: { type: Object, default: {} },
  
  // Store original user preferences to generate the rest later
  userPreferences: { type: Object, required: true },

  createdAt: { type: Date, default: Date.now }
});

export const Itinerary = mongoose.model('Itinerary', itinerarySchema);