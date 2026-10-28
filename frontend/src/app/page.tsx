'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  Target,
  Users,
  Settings,
  Mail,
  Eye,
  Reply,
  Calendar,
  Globe,
  Check,
  X,
  MessageCircle,
  Bell,
  ShieldAlert,
  Sparkles,
  PlusCircle,
  Lock,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface LeadItem {
  _id: string;
  name: string;
  company: string;
  email: string;
  confidenceScore: number;
  status: 'Hot' | 'Contacted' | 'Rejected';
}

interface TeamMember {
  _id: string;
  name: string;
  role: string;
  image?: string;
}

interface CampaignState {
  emailsSent: number;
  openRate: number;
  replies: number;
  meetingsBooked: number;
  autoPilot: boolean;
  currentFocus: string;
}

export default function SophiaDashboardPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [campaign, setCampaign] = useState<CampaignState>({
    emailsSent: 243,
    openRate: 68.4,
    replies: 37,
    meetingsBooked: 8,
    autoPilot: true,
    currentFocus: 'Scraping Real Estate Agencies in New York',
  });

  const [activityFeed, setActivityFeed] = useState([
    { id: '1', time: '10:45 AM', type: 'linkedin', text: 'Sophia found 15 new leads via LinkedIn.' },
    { id: '2', time: '10:50 AM', type: 'email', text: 'Sophia drafted a personalized email to John Doe.' },
    { id: '3', time: '11:05 AM', type: 'reply', text: 'New Reply! Sophia is drafting a response.' },
    { id: '4', time: '11:12 AM', type: 'meeting', text: 'Meeting booked with Sarah Wilson (Real Estate Co.).' },
    { id: '5', time: '11:18 AM', type: 'apollo', text: 'Sophia found 8 new leads via Apollo.' },
    { id: '6', time: '11:22 AM', type: 'open', text: 'Email opened! (3rd time) by Michael Carter.' },
    { id: '7', time: '11:24 AM', type: 'crm', text: 'Added to CRM - High Priority Lead.' },
  ]);

  const [activeNav, setActiveNav] = useState('Home');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('11:25 AM');

  // Secret Admin Panel State (Shift + Alt + A)
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState('');
  const [execForm, setExecForm] = useState({ name: '', role: 'CFO', image: '', apiKey: '' });
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    company: '',
    email: '',
    confidenceScore: 96,
  });

  const syncWithBackend = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, campaignRes, teamRes] = await Promise.all([
        fetch(API_BASE + '/api/leads'),
        fetch(API_BASE + '/api/campaigns'),
        fetch(API_BASE + '/api/settings/ai'),
      ]);

      const leadsJson = await leadsRes.json();
      const campaignJson = await campaignRes.json();
      const teamJson = await teamRes.json();

      if (leadsJson.success) setLeads(leadsJson.data);
      if (campaignJson.success) setCampaign(campaignJson.data);
      if (teamJson.success) setTeam(teamJson.data);
    } catch (error) {
      console.error('Backend sync warning:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, [syncWithBackend]);

  // Listen for Secret Admin Hotkey: Shift + Alt + A
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.altKey && (event.key === 'A' || event.key === 'a' || event.code === 'KeyA')) {
        event.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simulate Live Activity Feed & Auto-Pilot ticks via Backend API
  useEffect(() => {
    if (!campaign.autoPilot) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(API_BASE + '/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SIMULATE_AI_TICK' }),
        });
        const result = await response.json();
        if (result.success) {
          setCampaign(result.data);
          if (result.activityEvent) {
            setActivityFeed((prev) => [result.activityEvent, ...prev.slice(0, 6)]);
          }
        }
      } catch (err) {
        console.error('Auto-Pilot tick error:', err);
      }
    }, 8500);

    return () => clearInterval(interval);
  }, [campaign.autoPilot]);

  const handleToggleAutoPilot = async () => {
    const nextState = !campaign.autoPilot;
    setCampaign((prev) => ({ ...prev, autoPilot: nextState }));
    try {
      const response = await fetch(API_BASE + '/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_AUTOPILOT', autoPilot: nextState }),
      });
      const result = await response.json();
      if (result.success) setCampaign(result.data);
    } catch (err) {
      console.error('Failed to toggle Auto-Pilot:', err);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: 'Hot' | 'Contacted' | 'Rejected') => {
    try {
      const response = await fetch(API_BASE + '/api/leads/' + leadId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (result.success) {
        setLeads((prev) => prev.map((item) => (item._id === leadId ? result.data : item)));
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const handleWhatsAppContact = async (lead: LeadItem) => {
    try {
      const response = await fetch(API_BASE + '/api/contact/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead._id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          confidenceScore: lead.confidenceScore,
        }),
      });
      const result = await response.json();
      if (result.success && result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
        syncWithBackend();
      }
    } catch (err) {
      console.error('WhatsApp redirect error:', err);
    }
  };

  const handleSaveExecutiveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatus('Encrypting API key & pushing configuration to MongoDB...');
    try {
      const response = await fetch(API_BASE + '/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(execForm),
      });
      const result = await response.json();
      if (result.success) {
        setAdminStatus('Saved: ' + result.message);
        setExecForm({ name: '', role: 'CFO', image: '', apiKey: '' });
        syncWithBackend();
      } else {
        setAdminStatus('Error: ' + result.error);
      }
    } catch (err) {
      setAdminStatus('Failed to connect to backend API.');
    }
  };

  const handleAddLeadFromAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatus('Adding AI discovered lead to database...');
    try {
      const response = await fetch(API_BASE + '/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeadForm),
      });
      const result = await response.json();
      if (result.success) {
        setLeads((prev) => [result.data, ...prev]);
        setNewLeadForm({ name: '', company: '', email: '', confidenceScore: 96 });
        setAdminStatus('Lead added to MongoDB & CRM table updated!');
      } else {
        setAdminStatus('Error: ' + result.error);
      }
    } catch (err) {
      setAdminStatus('Failed to add lead.');
    }
  };

  return (
    <div className="min-h-screen flex bg-obsidian-950 text-slate-100 select-none">
      {/* SIDEBAR */}
      <aside className="w-64 glass-sidebar flex flex-col justify-between p-6 shrink-0 hidden lg:flex">
        <div>
          <div className="flex flex-col items-center text-center pb-6 mb-6 border-b border-gold-500/20">
            <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-gold-400 via-gold-500 to-cyanNeon-400 bg-clip-text text-transparent">
              OG
            </div>
            <h1 className="text-sm font-bold tracking-[0.22em] text-slate-100 mt-1">
              OMNIX <span className="text-cyanNeon-400">GLOBAL</span>
            </h1>
            <p className="text-[9px] tracking-widest text-slate-400 uppercase mt-0.5">
              Technology | Software | Global Solutions
            </p>
          </div>

          <nav className="space-y-2">
            {[
              { name: 'Home', icon: Home },
              { name: 'Active Campaigns', icon: Target },
              { name: 'Live Leads', icon: Users },
              { name: 'Settings', icon: Settings },
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveNav(item.name)}
                  className={
                    'w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all ' +
                    (isActive
                      ? 'gold-active-tab text-gold-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5')
                  }
                >
                  <IconComponent className={'w-4 h-4 ' + (isActive ? 'text-gold-400' : 'text-cyanNeon-400/70')} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4">
          {team.length > 0 && (
            <div className="p-3 rounded-lg bg-obsidian-900/90 border border-gold-500/25">
              <p className="text-[10px] uppercase tracking-wider text-gold-400 font-semibold mb-2">
                Executive Nodes
              </p>
              <div className="space-y-1.5">
                {team.slice(0, 3).map((member) => (
                  <div key={member._id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate">{member.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyanNeon-400/10 text-cyanNeon-400 border border-cyanNeon-400/30">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gold-500/20">
            <p className="text-xs font-semibold text-gold-400 leading-relaxed">
              Smarter Outreach.
              <br />
              Bigger Opportunities.
              <br />
              <span className="text-slate-100">Global Growth.</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-2">
              Admin Shortcut: <kbd className="px-1 py-0.5 bg-slate-800 text-cyanNeon-400 rounded">Shift+Alt+A</kbd>
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-6 space-y-5 overflow-y-auto">
        {/* HEADER */}
        <header className="glass-panel rounded-2xl p-4 md:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-gold-500 via-cyanNeon-400 to-blue-600 shadow-cyan-glow">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
                  alt="Sophia AI"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="bottom-0 right-0 absolute w-3.5 h-3.5 bg-emerald-400 border-2 border-obsidian-900 rounded-full animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">Sophia</h2>
                <Sparkles className="w-5 h-5 text-gold-400" />
              </div>
              <p className="text-sm text-slate-300 font-medium">AI Lead Gen Agent</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs text-cyanNeon-400 font-medium">
                  Finding. Engaging. Booking. 24/7.
                </span>
              </div>
            </div>
          </div>

          {/* AUTO-PILOT SWITCH */}
          <div className="glass-panel px-5 py-3 rounded-xl flex items-center gap-5 border border-cyanNeon-400/30">
            <div>
              <div className="text-base font-bold text-white">Auto-Pilot</div>
              <div className="text-xs text-slate-400">
                {campaign.autoPilot ? 'AI is working for you' : 'Autonomous hunting paused'}
              </div>
            </div>
            <button
              onClick={handleToggleAutoPilot}
              aria-label="Toggle Auto-Pilot"
              className={
                'w-16 h-8 rounded-full p-1 transition-all duration-300 flex items-center ' +
                (campaign.autoPilot
                  ? 'bg-cyanNeon-400/30 border border-cyanNeon-400 shadow-cyan-glow justify-end'
                  : 'bg-slate-800 border border-slate-600 justify-start')
              }
            >
              <div
                className={
                  'w-6 h-6 rounded-full transition-all ' +
                  (campaign.autoPilot ? 'bg-cyanNeon-400 shadow-lg' : 'bg-slate-400')
                }
              />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Online
              </div>
              <div className="border-l border-slate-700 pl-3 text-right">
                <div className="font-semibold text-slate-100">{currentTime}</div>
                <div className="text-[10px] text-slate-400">Omnix Cloud</div>
              </div>
            </div>

            <button
              onClick={() => setIsAdminOpen(true)}
              title="Secret Admin Panel (Shift + Alt + A)"
              className="glass-panel p-3 rounded-xl text-slate-300 hover:text-cyanNeon-400 transition"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* KPI CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Emails Sent Today', value: campaign.emailsSent, trend: '+12%', icon: Mail },
            { label: 'Open Rate', value: campaign.openRate + '%', trend: '+8%', icon: Eye },
            { label: 'Replies Received', value: campaign.replies, trend: '+22%', icon: Reply },
            { label: 'Meetings Booked', value: campaign.meetingsBooked, trend: '+60%', icon: Calendar },
          ].map((kpi) => {
            const IconComponent = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="glass-panel rounded-2xl p-4 flex items-center justify-between relative overflow-hidden"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-cyanNeon-400/10 border border-cyanNeon-400/40 flex items-center justify-center text-cyanNeon-400 shadow-cyan-glow">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 font-medium">{kpi.label}</p>
                    <p className="text-3xl font-extrabold text-white mt-0.5">{kpi.value}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-400 self-end">{kpi.trend}</span>
              </div>
            );
          })}
        </section>

        {/* MAP & LIVE ACTIVITY FEED */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden min-h-[360px]">
            <div className="flex flex-wrap items-center justify-between gap-2 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyanNeon-400" />
                  <h3 className="text-lg font-bold text-white">Live Lead Discovery Map</h3>
                </div>
                <p className="text-xs text-slate-400">Sophia is hunting for leads across the globe...</p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyanNeon-400" /> Scanning
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Found Leads
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Engaging
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> In Progress
                </span>
              </div>
            </div>

            <div className="relative my-4 flex-1 rounded-xl bg-obsidian-950/70 border border-cyanNeon-400/15 overflow-hidden flex items-center justify-center min-h-[220px]">
              <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 800 360">
                <path
                  d="M 160 130 Q 290 60 390 110 T 580 160 T 680 270"
                  fill="none"
                  stroke="#00F0FF"
                  strokeWidth="1.5"
                  strokeDasharray="5,5"
                />
                <path
                  d="M 390 110 Q 440 190 480 210 T 580 160"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="1.2"
                  strokeDasharray="4,4"
                />
                <circle cx="160" cy="130" r="5" fill="#00F0FF" />
                <circle cx="390" cy="110" r="5" fill="#10B981" />
                <circle cx="480" cy="210" r="5" fill="#F59E0B" />
                <circle cx="580" cy="160" r="6" fill="#00F0FF" />
                <circle cx="680" cy="270" r="5" fill="#A855F7" />
              </svg>

              <div className="absolute top-6 left-6 glass-panel px-3 py-2 rounded-lg border border-cyanNeon-400/40 text-[11px] max-w-[180px]">
                <div className="font-bold text-cyanNeon-400">New York, USA</div>
                <div className="text-slate-300">Scraping Real Estate Agencies...</div>
              </div>

              <div className="absolute top-4 left-[36%] glass-panel px-3 py-2 rounded-lg border border-emerald-400/40 text-[11px] max-w-[190px]">
                <div className="font-bold text-emerald-400">London, UK</div>
                <div className="text-slate-300">Searching for Property Investment Firms...</div>
              </div>

              <div className="absolute top-12 right-6 glass-panel px-3 py-2 rounded-lg border border-cyanNeon-400/40 text-[11px] max-w-[185px]">
                <div className="font-bold text-gold-400">Lahore, Pakistan</div>
                <div className="text-slate-300">Scanning Business Directories...</div>
              </div>

              <div className="absolute bottom-6 left-[34%] glass-panel px-3 py-2 rounded-lg border border-amber-400/40 text-[11px] max-w-[185px]">
                <div className="font-bold text-amber-400">Dubai, UAE</div>
                <div className="text-slate-300">Finding Commercial Real Estate Leads...</div>
              </div>

              <div className="absolute bottom-3 right-6 glass-panel px-3 py-2 rounded-lg border border-purple-400/40 text-[11px] max-w-[185px]">
                <div className="font-bold text-purple-400">Sydney, Australia</div>
                <div className="text-slate-300">Analyzing Real Estate Developers...</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 z-10">
              <div className="glass-panel px-4 py-2.5 rounded-xl flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-cyanNeon-400 animate-ping shrink-0" />
                <div className="truncate">
                  <span className="text-[11px] text-slate-400 block">Current Focus:</span>
                  <span className="text-xs font-semibold text-white truncate">{campaign.currentFocus}</span>
                </div>
              </div>

              <div className="glass-panel px-4 py-2.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Global Reach</span>
                  <span className="text-sm font-bold text-white">12 Countries</span>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <span className="text-[11px] text-slate-400 block">Active Searches</span>
                  <span className="text-sm font-bold text-cyanNeon-400">68</span>
                </div>
              </div>
            </div>
          </div>

          {/* LIVE ACTIVITY FEED */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <h3 className="text-base font-bold text-white">Live Activity Feed</h3>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-cyanNeon-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyanNeon-400 animate-ping" />
                Live
              </span>
            </div>

            <div className="space-y-3 my-3 max-h-[300px] overflow-y-auto pr-1">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 pb-2.5 border-b border-slate-800/70 last:border-none"
                >
                  <div className="w-7 h-7 rounded-full bg-cyanNeon-400/15 border border-cyanNeon-400/40 flex items-center justify-center text-cyanNeon-400 text-xs font-bold shrink-0 mt-0.5">
                    {item.type === 'linkedin' ? 'in' : 'AI'}
                  </div>
                  <div className="text-xs">
                    <span className="text-[11px] text-slate-400 block">{item.time}</span>
                    <span className="text-slate-200 font-medium">{item.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOT LEADS CRM TABLE */}
        <section className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Hot Leads</h3>
              <p className="text-xs text-slate-400">Top prospects ready for engagement</p>
            </div>

            <button
              onClick={syncWithBackend}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-cyanNeon-400/40 text-cyanNeon-400 hover:bg-cyanNeon-400/10 transition"
            >
              {loading ? 'Syncing Database...' : 'View All Leads ->'}
            </button>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Client Name</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Confidence Score</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leads.map((lead, idx) => (
                  <tr
                    key={lead._id || idx}
                    className={
                      'hover:bg-white/[0.02] transition ' +
                      (lead.status === 'Rejected' ? 'opacity-40 line-through' : '')
                    }
                  >
                    <td className="py-3 px-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {lead.name}
                      {lead.status === 'Contacted' && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyanNeon-400/15 text-cyanNeon-400">
                          Contacted
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{lead.company}</td>
                    <td className="py-3 px-3 text-slate-400 text-xs">{lead.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        {lead.confidenceScore}% Match
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateLeadStatus(lead._id, 'Contacted')}
                          title="Approve & Mark Contacted"
                          className="w-7 h-7 rounded-full border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleUpdateLeadStatus(lead._id, 'Rejected')}
                          title="Reject Lead"
                          className="w-7 h-7 rounded-full border border-rose-500/50 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleWhatsAppContact(lead)}
                          title="Escalate to WhatsApp (+923083335262)"
                          className="w-7 h-7 rounded-full border border-cyanNeon-400/50 text-cyanNeon-400 hover:bg-cyanNeon-400/20 flex items-center justify-center transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="text-gold-400 font-semibold">Omnix Global</span>
              <span>|</span>
              <span className="text-cyanNeon-400">Sophia v2.0</span>
              <span>|</span>
              <span>AI Powered - Global Reach - More Sales</span>
            </div>
            <div className="text-cyanNeon-400 animate-pulse font-medium">
              {campaign.autoPilot ? 'Processing...' : 'Standby Mode'}
            </div>
          </div>
        </section>
      </main>

      {/* SECRET ADMIN PANEL (Shift + Alt + A) */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 border border-gold-500/50 shadow-gold-glow space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 text-gold-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Omnix Global - Secret Admin Command Panel
                  </h3>
                  <p className="text-xs text-slate-400">
                    Direct Database Sync & AES-256 Encrypted AI Key Storage (Shift + Alt + A)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminStatus && (
              <div className="p-3 rounded-lg bg-cyanNeon-400/10 border border-cyanNeon-400/30 text-xs text-cyanNeon-400 font-medium">
                {adminStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleSaveExecutiveConfig} className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gold-400 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" /> Add Executive / Update AI Key
                </div>

                <input
                  type="text"
                  required
                  placeholder="Executive Name"
                  value={execForm.name}
                  onChange={(e) => setExecForm({ ...execForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-slate-700 text-xs text-white focus:border-gold-400 outline-none"
                />

                <input
                  type="text"
                  required
                  placeholder="Role (e.g. CFO, CEO, Lead Architect)"
                  value={execForm.role}
                  onChange={(e) => setExecForm({ ...execForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-slate-700 text-xs text-white focus:border-gold-400 outline-none"
                />

                <input
                  type="password"
                  placeholder="Gemini / AI API Key (Encrypted in DB)"
                  value={execForm.apiKey}
                  onChange={(e) => setExecForm({ ...execForm, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-slate-700 text-xs text-white focus:border-cyanNeon-400 outline-none"
                />

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 text-obsidian-950 font-bold text-xs hover:brightness-110 transition"
                >
                  Push Configuration to Database
                </button>
              </form>

              <form onSubmit={handleAddLeadFromAdmin} className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyanNeon-400 uppercase tracking-wider">
                  <PlusCircle className="w-3.5 h-3.5" /> Simulate AI Lead Discovery
                </div>

                <input
                  type="text"
                  required
                  placeholder="Prospect Full Name"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-slate-700 text-xs text-white focus:border-cyanNeon-400 outline-none"
                />

                <input
                  type="text"
                  required
                  placeholder="Company Name"
                  value={newLeadForm.company}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-slate-700 text-xs text-white focus:border-cyanNeon-400 outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="col-span-2 px-3 py-2 rounded-lg bg-obsidian-900 border border-slate-700 text-xs text-white focus:border-cyanNeon-400 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newLeadForm.confidenceScore}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, confidenceScore: Number(e.target.value) })
                    }
                    className="px-3 py-2 rounded-lg bg-obsidian-900 border border-slate-700 text-xs text-white focus:border-cyanNeon-400 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-cyanNeon-400/20 border border-cyanNeon-400 text-cyanNeon-400 font-bold text-xs hover:bg-cyanNeon-400/30 transition"
                >
                  Save Lead via POST /api/leads
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
