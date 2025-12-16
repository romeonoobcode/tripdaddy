import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { customAlphabet } from 'nanoid';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { Itinerary } from './models/Itinerary.js';
import * as aiService from './services/aiService.js';

dotenv.config();

const app = express();
const nanoid = customAlphabet('1234567890abcdef', 10);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors({ origin: process.env.CLIENT_URL })); // Secure CORS
app.use(express.json({ limit: '50mb' })); // Allow large payloads for image generation if needed

// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('DB Error', err));

// --- API ROUTES ---

// 1. Validation Proxy
app.post('/api/validate', async (req, res) => {
    const result = await aiService.validateDestination(req.body.destination);
    res.json(result);
});

// 2. Questions Proxy
app.post('/api/questions', async (req, res) => {
    const result = await aiService.checkEventsAndGetQuestions(req.body);
    res.json(result);
});

// 3. GENERATE PREVIEW (The Core Logic)
app.post('/api/generate', async (req, res) => {
    try {
        const prefs = req.body;
        const start = new Date(prefs.startDate);
        const end = new Date(prefs.endDate);
        const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (86400000)) + 1);

        // Preview Rule: 2-4 days -> 1 day preview. 5+ days -> 2 days preview.
        let previewCount = 1;
        if (totalDays >= 5) previewCount = 2;
        if (totalDays === 1) previewCount = 1;

        console.log(`Generating preview for ${prefs.destination}: ${previewCount} days of ${totalDays}`);

        // Generate Plan (Partial)
        const partialPlan = await aiService.generateItineraryPartial(prefs, 1, previewCount);
        
        if (!partialPlan || !partialPlan.days) {
            return res.status(500).json({ error: "Generation failed" });
        }

        // Generate Images for Preview Days Only
        const images = {};
        for (const day of partialPlan.days) {
            const img = await aiService.generateDayCardImage(day.title, day.areaFocus, prefs.destination, day.vibe);
            if (img) images[day.dayNumber] = img;
        }

        // Save to DB (Locked)
        const id = nanoid();
        const itinerary = new Itinerary({
            id,
            destination: prefs.destination,
            startDate: prefs.startDate,
            endDate: prefs.endDate,
            totalDays,
            previewDaysGenerated: previewCount,
            plan: partialPlan,
            images,
            userPreferences: prefs,
            unlocked: false
        });

        await itinerary.save();

        res.json({ id, totalDays, previewDays: previewCount });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 4. SAVE EMAIL (Triggers Preview Email)
app.post('/api/save-email', async (req, res) => {
    try {
        const { id, email } = req.body;
        const itinerary = await Itinerary.findOne({ id });
        if (!itinerary) return res.status(404).json({ error: "Not found" });

        itinerary.email = email;
        await itinerary.save();

        // Send Preview Email via Resend
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'TripDaddy <onboarding@resend.dev>',
                to: email,
                subject: `Your Trip to ${itinerary.destination} (Preview)`,
                html: `<p>Your trip preview is ready! <a href="${process.env.CLIENT_URL}/itinerary/${id}">View it here</a>. Unlock the full trip for $5.</p>`
            });
        }

        // Return the preview plan to the frontend
        res.json({ 
            plan: itinerary.plan, 
            images: itinerary.images, 
            unlocked: itinerary.unlocked,
            totalDays: itinerary.totalDays 
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 5. FETCH ITINERARY (Handles locked state)
app.get('/api/itinerary/:id', async (req, res) => {
    try {
        const itinerary = await Itinerary.findOne({ id: req.params.id });
        if (!itinerary) return res.status(404).json({ error: "Not found" });
        
        res.json({
            plan: itinerary.plan,
            images: itinerary.images,
            unlocked: itinerary.unlocked,
            totalDays: itinerary.totalDays,
            destination: itinerary.destination, // Need this for headers
            startDate: itinerary.startDate,
            endDate: itinerary.endDate
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. CREATE STRIPE CHECKOUT
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { id } = req.body;
        const itinerary = await Itinerary.findOne({ id });
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: `Full Itinerary: ${itinerary.destination}` },
                    unit_amount: 500, // $5.00
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}&trip_id=${id}`,
            cancel_url: `${process.env.CLIENT_URL}/?canceled=true`,
        });

        res.json({ url: session.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 7. VERIFY PAYMENT & UNLOCK (The Deferred Gen Logic)
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { tripId } = req.body;
        const itinerary = await Itinerary.findOne({ id: tripId });
        
        if (itinerary.unlocked) {
            return res.json({ success: true, message: "Already unlocked" });
        }

        // In production, you verify the session_id with Stripe here.
        // await stripe.checkout.sessions.retrieve(sessionId);

        // GENERATE REMAINING DAYS
        const startDay = itinerary.previewDaysGenerated + 1;
        const endDay = itinerary.totalDays;

        if (startDay <= endDay) {
            console.log(`Unlocking: Generating days ${startDay} to ${endDay}`);
            const remainingPlan = await aiService.generateItineraryPartial(itinerary.userPreferences, startDay, endDay);
            
            // Merge days
            if (remainingPlan && remainingPlan.days) {
                const newDays = [...itinerary.plan.days, ...remainingPlan.days];
                // Sort just in case
                newDays.sort((a, b) => a.dayNumber - b.dayNumber);
                
                itinerary.plan.days = newDays;
                
                // Generate images for new days
                for (const day of remainingPlan.days) {
                    const img = await aiService.generateDayCardImage(day.title, day.areaFocus, itinerary.destination, day.vibe);
                    if (img) itinerary.images[day.dayNumber] = img;
                }
            }
        }

        itinerary.unlocked = true;
        await itinerary.save();

        // Send Full Trip Email
        if (process.env.RESEND_API_KEY && itinerary.email) {
            await resend.emails.send({
                from: 'TripDaddy <onboarding@resend.dev>',
                to: itinerary.email,
                subject: `Your Full Trip to ${itinerary.destination} is Ready!`,
                html: `<p>Thanks for your purchase! <a href="${process.env.CLIENT_URL}/itinerary/${tripId}">View your complete itinerary here</a>.</p>`
            });
        }

        res.json({ success: true, plan: itinerary.plan, images: itinerary.images });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 8. REGENERATE ACTIVITY PROXY
app.post('/api/regenerate', async (req, res) => {
    const { activity, context, customRequest } = req.body;
    // We need prefs, but we can't trust client prefs alone for security, 
    // ideally we fetch from DB, but for this stateless endpoint pass prefs is fine for now
    // or pass id and fetch prefs.
    const result = await aiService.getAlternativeActivity(req.body.prefs, activity, context, customRequest);
    res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));