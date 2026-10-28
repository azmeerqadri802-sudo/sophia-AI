require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('../database/connect');
const Lead = require('../database/models/Lead');
const Team = require('../database/models/Team');
const Campaign = require('../database/models/Campaign');
const { encryptApiKey } = require('./utils/encryption');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/omnix_sophia_crm';
const ADMIN_WHATSAPP = process.env.WHATSAPP_ADMIN_NUMBER || '923083335262';

app.use(cors());
app.use(express.json());

const INITIAL_SEED_LEADS = [
  { name: 'Michael Carter', company: 'Skyline Properties', email: 'michael@skylineprop.com', confidenceScore: 98, status: 'Hot' },
  { name: 'Sarah Wilson', company: 'Prime Real Estate', email: 'sarah@primere.com', confidenceScore: 95, status: 'Hot' },
  { name: 'James Anderson', company: 'Global Estates', email: 'james@globalestates.com', confidenceScore: 92, status: 'Hot' },
  { name: 'Emily Roberts', company: 'NextGen Realty', email: 'emily@nextgenrealty.com', confidenceScore: 90, status: 'Hot' },
  { name: 'Robert Davis', company: 'Urban Properties', email: 'robert@urbanprops.com', confidenceScore: 87, status: 'Hot' }
];

// 1. GET /api/leads - Fetch all leads in the CRM table
app.get('/api/leads', async (req, res) => {
  try {
    let leads = await Lead.find({}).sort({ confidenceScore: -1, createdAt: -1 });
    if (leads.length === 0) {
      leads = await Lead.insertMany(INITIAL_SEED_LEADS);
    }
    return res.status(200).json({ success: true, data: leads });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/leads - Add a new lead found by the AI
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, company, confidenceScore, status } = req.body;
    if (!name || !email || !company) {
      return res.status(400).json({
        success: false,
        error: 'Name, Email, and Company are required fields.'
      });
    }

    const newLead = await Lead.create({
      name,
      email,
      company,
      confidenceScore: Number(confidenceScore) || 92,
      status: status || 'Hot'
    });

    await Campaign.findOneAndUpdate({}, { $inc: { emailsSent: 1 } }, { upsert: true });

    return res.status(201).json({ success: true, data: newLead });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/leads/:id - Update Lead Status (Hot, Contacted, Rejected)
app.patch('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Hot', 'Contacted', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value.' });
    }
    const updated = await Lead.findByIdAndUpdate(id, { status }, { new: true });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/settings/ai - Securely save Admin AI API Key & Team Role in DB
app.post('/api/settings/ai', async (req, res) => {
  try {
    const { name, role, image, apiKey } = req.body;
    if (!name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Team Member Name and Role are required.'
      });
    }

    const updateData = {
      name: name.trim(),
      role: role.trim(),
      image: image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
    };

    if (apiKey && apiKey.trim() !== '') {
      updateData.API_Key = encryptApiKey(apiKey.trim());
    }

    const savedMember = await Team.findOneAndUpdate(
      { role: role.trim() },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: role + ' profile & encrypted AI API key stored securely.',
      data: {
        _id: savedMember._id,
        name: savedMember.name,
        role: savedMember.role,
        image: savedMember.image,
        keyEncrypted: Boolean(apiKey)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/settings/ai - Fetch Team list without exposing encrypted API_Key
app.get('/api/settings/ai', async (req, res) => {
  try {
    const members = await Team.find({}).select('-API_Key').sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. POST /api/contact/whatsapp - Format WhatsApp redirect or send webhook to +923083335262
app.post('/api/contact/whatsapp', async (req, res) => {
  try {
    const { leadId, name, company, email, confidenceScore } = req.body;
    if (leadId) {
      await Lead.findByIdAndUpdate(leadId, { status: 'Contacted' });
    }

    const messageText =
      '*OMNIX GLOBAL - SOPHIA AI LEAD ALERT*\n\n' +
      '*Prospect:* ' + (name || 'Valued Client') + '\n' +
      '*Company:* ' + (company || 'Enterprise') + '\n' +
      '*Email:* ' + (email || 'N/A') + '\n' +
      '*Confidence Score:* ' + (confidenceScore || 95) + '% Match\n' +
      '*Action:* Escalated to Executive Closing Desk';

    const whatsappUrl =
      'https://wa.me/' + ADMIN_WHATSAPP + '?text=' + encodeURIComponent(messageText);

    if (process.env.WHATSAPP_WEBHOOK_URL) {
      fetch(process.env.WHATSAPP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '+' + ADMIN_WHATSAPP,
          lead: { name, company, email, confidenceScore },
          message: messageText,
          timestamp: new Date().toISOString()
        })
      }).catch(() => null);
    }

    return res.status(200).json({
      success: true,
      whatsappUrl,
      recipient: '+' + ADMIN_WHATSAPP
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. GET & POST /api/campaigns - Campaign Metrics, Auto-Pilot Toggle & Live Activity Simulation
app.get('/api/campaigns', async (req, res) => {
  try {
    let campaign = await Campaign.findOne({});
    if (!campaign) {
      campaign = await Campaign.create({
        emailsSent: 243,
        openRate: 68.4,
        replies: 37,
        meetingsBooked: 8,
        autoPilot: true,
        currentFocus: 'Scraping Real Estate Agencies in New York'
      });
    }
    return res.status(200).json({ success: true, data: campaign });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const { action, autoPilot } = req.body;
    let campaign = await Campaign.findOne({});
    if (!campaign) {
      campaign = await Campaign.create({});
    }

    if (action === 'TOGGLE_AUTOPILOT') {
      campaign.autoPilot = Boolean(autoPilot);
      await campaign.save();
      return res.status(200).json({ success: true, data: campaign });
    }

    if (action === 'SIMULATE_AI_TICK' && campaign.autoPilot) {
      const events = [
        { type: 'linkedin', text: 'Sophia found 15 new leads via LinkedIn.', focus: 'Scraping Real Estate Agencies in New York' },
        { type: 'email', text: 'Sophia drafted a personalized email to John Doe.', focus: 'Searching for Property Investment Firms in London, UK' },
        { type: 'reply', text: 'New Reply! Sophia is drafting a response.', focus: 'Scanning Business Directories in Lahore, Pakistan' },
        { type: 'meeting', text: 'Meeting booked with Sarah Wilson (Real Estate Co.).', focus: 'Finding Commercial Real Estate Leads in Dubai, UAE' },
        { type: 'open', text: 'Email opened! (3rd time) by Michael Carter.', focus: 'Analyzing Real Estate Developers in Sydney, Australia' }
      ];
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      campaign.emailsSent += 1;
      if (randomEvent.type === 'reply') campaign.replies += 1;
      if (randomEvent.type === 'meeting') campaign.meetingsBooked += 1;
      campaign.currentFocus = randomEvent.focus;
      await campaign.save();

      return res.status(200).json({
        success: true,
        data: campaign,
        activityEvent: {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: randomEvent.type,
          text: randomEvent.text
        }
      });
    }

    return res.status(200).json({ success: true, data: campaign });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log('Sophia AI CRM Backend running on http://localhost:' + PORT);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });
