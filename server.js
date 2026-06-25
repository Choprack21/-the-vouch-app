import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH;

app.post('/api/lookup', async (req, res) => {
  try {
    let { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    
    // Ensure E.164 format
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '+1' + phone;
    else if (!phone.startsWith('+')) phone = '+' + phone;

    const authHeader = 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    const response = await fetch(`https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=caller_name,line_type_intelligence`, {
      method: 'GET',
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      const errData = await response.json();
      return res.status(response.status).json({ error: 'Twilio API Error', details: errData });
    }

    const data = await response.json();
    const callerName = data.caller_name?.caller_name || 'Unknown / Not Found';
    const lineType = data.line_type_intelligence?.type || 'Unknown';
    const carrier = data.line_type_intelligence?.carrier_name || 'Unknown';

    res.json({ success: true, phone: data.phone_number, callerName, lineType, carrier });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'usa-people-search-public-records.p.rapidapi.com';

app.post('/api/background', async (req, res) => {
  try {
    const { firstName, lastName, state } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First and last name required' });
    }

    // Using the Name Search endpoint for this API provider
    // GET https://usa-people-search-public-records.p.rapidapi.com/SearchPeopleName?FirstName=...&LastName=...&State=...
    let queryParams = `FirstName=${encodeURIComponent(firstName)}&LastName=${encodeURIComponent(lastName)}`;
    if (state) queryParams += `&State=${encodeURIComponent(state)}`;

    const response = await fetch(`https://${RAPIDAPI_HOST}/SearchPeopleName?${queryParams}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: 'Background Check API Error', details: errData });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    console.error("Background Check Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Initialize Stripe (Mock key for MVP)
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_12345');

import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ctxyjhjxrtvzntlgrkxn.supabase.co', process.env.SUPABASE_ANON_KEY);
 

// Stripe Webhook Endpoint
// Note: We use express.raw for webhooks to verify the Stripe signature in production
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  let event;
  
  try {
    // For MVP testing, we parse the body directly.
    // In production, you would use: stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
    event = JSON.parse(req.body);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // The client_reference_id holds the Supabase user_id we passed from the frontend
    const userId = session.client_reference_id;
    
    if (userId) {
      console.log(`✅ Payment received for user: ${userId}. Upgrading to Premium...`);
      
      // Upgrade the user in Supabase
      const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan_tier: 'premium',
          status: 'active',
          current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.error("Supabase Error updating subscription:", error);
      } else {
        console.log("Database updated successfully!");
      }
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({received: true});
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Secure Backend API listening on port ${PORT}`));
