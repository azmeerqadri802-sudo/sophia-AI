const icons = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  campaigns: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h7M7 16h3"/></svg>',
  leads: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9z"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8.2 8.2 0 0 1-12.1 7.2L4 20l1.3-3.8A8.2 8.2 0 1 1 20 11.5Z"/><path d="M8.7 8.2c.3-.7.6-.7.9-.7h.3c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.2.2-.3.4-.1.7.3.5.8 1.1 1.4 1.6.7.6 1.4.9 1.8 1 .3.1.5.1.7-.2l.8-1c.2-.2.4-.2.7-.1l1.6.8c.3.1.4.3.4.5 0 .3-.2 1.2-.8 1.6-.6.5-1.4.6-2.2.4-.8-.2-1.8-.6-3.2-1.5-1.8-1.2-3.1-3.3-3.2-3.5-.1-.2-.7-.9-.7-1.7 0-.8.4-1.2.6-1.4z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = {
  csrf: "", leads: [], campaigns: [], integrations: {}, connections: { gemini: false, openai: false, email: false, calendar: false }, connectionErrors: { gemini: false, openai: false, email: false, calendar: false },
  view: "home", sort: { field: "score", direction: "desc" }, autopilot: false, timer: null,
  feed: Array.isArray(readLocal("sophia.activity", [])) ? readLocal("sophia.activity", []) : [], drafts: (() => { const value = readLocal("sophia.drafts", {}); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; })(), sampleNoteDismissed: readLocal("sophia.sample-note-dismissed", false),
  campaignFilter: "all", leadFilters: { search: "", status: "all", campaignId: "all" }
};

function readLocal(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } }
function writeLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast("This browser could not save that preference.", true); } }
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }
function icon(name) { return icons[name] ?? ""; }
function initials(name) { return String(name ?? "?").trim().split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() ?? "").join("") || "?"; }
function tint(name) { return [...String(name ?? "")].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4; }
function money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0); }
function relativeTime(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return "just now";
  if (seconds < 30) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}
function dateLabel(value) { if (!value) return "—"; return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value)); }
function toast(message, error = false) {
  const item = document.createElement("div");
  item.className = `toast${error ? " is-error" : ""}`;
  item.textContent = message;
  $("#toast-region").append(item);
  setTimeout(() => item.remove(), 3900);
}
function setInlineStatus(selector, message = "", error = false) {
  const element = $(selector);
  element.textContent = message;
  element.classList.toggle("is-success", Boolean(message) && !error);
  element.classList.toggle("is-error", Boolean(message) && error);
}
function setBadge(id, status, text) {
  const badge = $(id);
  badge.className = `connection-badge ${status}`;
  badge.innerHTML = `<i></i> ${esc(text)}`;
}
function setConnectionBadges() {
  const provider = $("#ai-provider")?.value ?? state.integrations.aiProvider ?? "gemini";
  const configured = state.integrations[`${provider}Configured`];
  setBadge("#ai-status-badge", state.connections[provider] ? "connected" : state.connectionErrors[provider] ? "failed" : configured ? "ready" : "neutral", state.connections[provider] ? "Connected" : state.connectionErrors[provider] ? "Check credentials" : configured ? "Active · test pending" : "Not configured");
  setBadge("#email-status-badge", state.connections.email ? "connected" : state.connectionErrors.email ? "failed" : state.integrations.emailConfigured ? "ready" : "neutral", state.connections.email ? "Connected" : state.connectionErrors.email ? "Check credentials" : state.integrations.emailConfigured ? "Active · test pending" : "Not configured");
  setBadge("#calendar-status-badge", state.connections.calendar ? "connected" : state.connectionErrors.calendar ? "failed" : state.integrations.calendarConfigured ? "ready" : "neutral", state.connections.calendar ? "Connected" : state.connectionErrors.calendar ? "Check endpoint" : state.integrations.calendarConfigured ? "Active · test pending" : "Not configured");
}
function applyIntegrationData(data) {
  state.integrations = data;
  $("#ai-provider").value = data.aiProvider ?? "gemini";
  $("#sender-email").value = data.senderEmail ?? "";
  $("#smtp-username").value = data.smtpUsername ?? "";
  $("#calendar-webhook").value = data.calendarWebhookUrl ?? "";
  $("#gemini-key-note").textContent = data.geminiConfigured ? "A key is saved securely. Leave blank to keep it." : "Not configured yet. Paste a Gemini API key to connect.";
  $("#openai-key-note").textContent = data.openaiConfigured ? "A key is saved securely. Leave blank to keep it." : "Not configured yet. Paste an OpenAI API key to connect.";
  $("#smtp-password-note").textContent = data.emailConfigured ? "A Gmail password is saved securely. Leave blank to keep it." : "Leave blank to keep the saved password. Google app passwords are required.";
  setConnectionBadges();
}
async function api(path, options = {}) {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers ?? {});
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (method !== "GET" && method !== "HEAD" && state.csrf) headers.set("X-CSRF-Token", state.csrf);
  const response = await fetch(path, { ...options, method, headers, credentials: "same-origin", body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/api/login") showLogin();
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}
function showLogin() {
  stopAutopilot();
  state.csrf = "";
  $("#application-shell").hidden = true;
  $("#login-screen").hidden = false;
  $("#admin-password").value = "";
  $("#login-error").hidden = true;
  setTimeout(() => $("#admin-password").focus(), 40);
}
async function openWorkspace(session) {
  state.csrf = session.csrf;
  applyIntegrationData(session.integrations ?? {});
  $("#login-screen").hidden = true;
  $("#application-shell").hidden = false;
  try {
    const crm = await api("/api/crm");
    state.leads = crm.leads;
    state.campaigns = crm.campaigns;
    renderAll();
    updateClock();
    setInterval(updateClock, 60_000);
    state.autopilot = readLocal("sophia.autopilot", false) === true;
    renderAutopilot();
    if (state.autopilot) startAutopilot();
  } catch (error) { toast(error.message, true); }
}
function navigate(view) {
  if (!["home", "campaigns", "leads", "settings"].includes(view)) return;
  state.view = view;
  for (const section of $$(".view-section")) section.hidden = section.id !== `view-${view}`;
  for (const button of $$(".nav-item[data-view]")) {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  }
  const label = { home: "Home", campaigns: "Active campaigns", leads: "Live leads", settings: "Settings" }[view];
  $("#page-breadcrumb").textContent = label;
  if (view === "leads") renderLeads();
  if (view === "campaigns") renderCampaigns();
  if (view === "home") renderHome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderAll() {
  $("#nav-lead-count").textContent = String(state.leads.length);
  $("#nav-campaign-count").textContent = String(state.campaigns.filter(item => item.status === "active").length);
  renderHome(); renderCampaigns(); renderLeads(); renderCampaignOptions(); renderSettingsStatus(); renderActivity();
  $("#sample-data-note").hidden = state.sampleNoteDismissed || !state.leads.some(lead => lead.sample);
  navigate(state.view);
}
function renderSettingsStatus() { setConnectionBadges(); }
function renderHome() {
  const leads = state.leads;
  const active = leads.filter(lead => lead.status === "Active Database").length;
  const qualified = leads.filter(lead => ["Qualified", "Proposal"].includes(lead.status)).length;
  const potential = leads.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
  const activeCampaigns = state.campaigns.filter(campaign => campaign.status === "active").length;
  const sent = state.campaigns.reduce((sum, campaign) => sum + (Number(campaign.sent) || 0), 0);
  const replies = state.campaigns.reduce((sum, campaign) => sum + (Number(campaign.replies) || 0), 0);
  const replyRate = sent ? `${Math.round((replies / sent) * 100)}%` : "0%";
  const metrics = [
    ["Total leads", leads.length, "Across your CRM", "leads"],
    ["Qualified", qualified, "Ready for a next step", "check"],
    ["Active campaigns", activeCampaigns, "Currently in motion", "campaigns"],
    ["Pipeline value", money(potential), "Estimated deal value", "mail"]
  ];
  $("#metrics-grid").innerHTML = metrics.map(([title, value, note, glyph]) => `<article class="metric-card"><div class="metric-top"><span>${esc(title)}</span><span class="metric-icon">${icon(glyph)}</span></div><div class="metric-value">${esc(value)}</div><div class="metric-note">${esc(note)}</div></article>`).join("");
  const first = leads.find(lead => lead.status !== "Active Database");
  $("#hero-copy").textContent = first ? `${active} in your active database · ${first.name} is ready for a thoughtful next step.` : `${active} leads are in your active database. Add a lead to keep your pipeline moving.`;
  const today = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase();
  $("#today-label").textContent = `YOUR SALES COMMAND CENTER · ${today}`;
  const hour = new Date().getHours();
  $("#home-title").innerHTML = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}<span class="accent-period">.</span>`;
  $("#autopilot-detail").textContent = state.autopilot ? `${leads.length} leads · checking every few seconds` : "Your workspace is waiting for you.";
  $("#feed-status").textContent = state.autopilot ? "Auto-pilot preview · simulation only" : "Turn on Auto-pilot for simulated activity";
  renderActivity();
}
function renderCampaigns() {
  const active = state.campaigns.filter(campaign => campaign.status === "active").length;
  const sent = state.campaigns.reduce((sum, campaign) => sum + Number(campaign.sent || 0), 0);
  const replies = state.campaigns.reduce((sum, campaign) => sum + Number(campaign.replies || 0), 0);
  const rate = sent ? `${Math.round(replies / sent * 100)}%` : "0%";
  const summaries = [["Active campaigns", active, "Currently in motion", "✧"], ["Tracked outreach", sent.toLocaleString(), "Recorded campaign sends", "↗"], ["Replies", replies.toLocaleString(), `${rate} reply rate · tracked data`, "↩"]];
  $("#campaign-summary").innerHTML = summaries.map(([label, value, hint, symbol]) => `<div class="summary-block"><span class="summary-icon">${esc(symbol)}</span><span class="summary-copy"><strong>${esc(value)}</strong><span>${esc(label)} · ${esc(hint)}</span></span></div>`).join("");
  $("#campaign-sample-note").hidden = !state.campaigns.some(campaign => campaign.sample);
  const filtered = state.campaigns.filter(campaign => state.campaignFilter === "all" || campaign.status === state.campaignFilter);
  $("#campaign-grid").innerHTML = filtered.length ? filtered.map(campaign => {
    const percentage = Number(campaign.sent) ? Math.min(100, Math.round(Number(campaign.replies) / Number(campaign.sent) * 100)) : 0;
    const campaignLeads = state.leads.filter(lead => lead.campaignId === campaign.id).length;
    return `<article class="campaign-card" data-id="${esc(campaign.id)}"><div class="campaign-card-top"><div class="campaign-title-group"><span class="campaign-icon">${icon(campaign.channel.toLowerCase().includes("email") ? "mail" : "campaigns")}</span><h3>${esc(campaign.name)}</h3></div><span class="campaign-status ${esc(campaign.status)}"><i></i>${campaign.status === "active" ? "Active" : "Paused"}</span></div><p class="campaign-audience">${esc(campaign.audience || "All prospects")} · ${esc(campaign.channel)}</p><div class="campaign-metrics"><div class="campaign-metric"><strong>${Number(campaign.sent || 0).toLocaleString()}</strong><span>Tracked sends</span></div><div class="campaign-metric"><strong>${Number(campaign.replies || 0).toLocaleString()}</strong><span>Tracked replies</span></div><div class="campaign-metric"><strong>${campaignLeads}</strong><span>CRM leads</span></div></div><div class="campaign-meter" aria-label="${percentage}% reply rate indicator"><span style="width:${percentage}%"></span></div><div class="campaign-card-footer"><button type="button" class="campaign-primary-action" data-action="campaign-leads">View leads →</button><button type="button" data-action="campaign-toggle">${campaign.status === "active" ? "Pause" : "Resume"}</button><button type="button" data-action="campaign-edit" aria-label="Edit ${esc(campaign.name)}">Edit</button><button type="button" data-action="campaign-delete" aria-label="Delete ${esc(campaign.name)}">Delete</button>${campaign.sample ? '<span class="campaign-sample-label">Starter example</span>' : `<span class="campaign-sample-label">Updated ${dateLabel(campaign.updatedAt)}</span>`}</div></article>`;
  }).join("") : `<div class="campaign-empty surface-card"><span class="empty-orb">✦</span><strong>No campaigns here</strong><span>Create one or change the filter.</span></div>`;
  renderCampaignOptions();
}
function renderCampaignOptions() {
  const previous = $("#lead-campaign-filter").value;
  const filterOptions = `<option value="all">All campaigns</option>${state.campaigns.map(campaign => `<option value="${esc(campaign.id)}">${esc(campaign.name)}</option>`).join("")}`;
  $("#lead-campaign-filter").innerHTML = filterOptions;
  if ([...$("#lead-campaign-filter").options].some(option => option.value === previous)) $("#lead-campaign-filter").value = previous;
  const chosen = $("#lead-campaign").value;
  $("#lead-campaign").innerHTML = `<option value="">No campaign</option>${state.campaigns.map(campaign => `<option value="${esc(campaign.id)}">${esc(campaign.name)}</option>`).join("")}`;
  if ([...$("#lead-campaign").options].some(option => option.value === chosen)) $("#lead-campaign").value = chosen;
}
function filteredLeads() {
  const search = state.leadFilters.search.toLowerCase();
  return state.leads.filter(lead => {
    if (state.leadFilters.status !== "all" && lead.status !== state.leadFilters.status) return false;
    if (state.leadFilters.campaignId !== "all" && lead.campaignId !== state.leadFilters.campaignId) return false;
    if (search && ![lead.name, lead.company, lead.email, lead.role, lead.source].join(" ").toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => {
    const field = state.sort.field;
    const left = a[field] ?? "";
    const right = b[field] ?? "";
    const comparison = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return comparison * state.sort.direction;
  });
}
function statusClass(status) { return `status-${String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`; }
function renderLeads() {
  const leads = filteredLeads();
  $("#lead-result-count").textContent = String(leads.length);
  $("#shown-count").textContent = String(leads.length);
  $("#total-count").textContent = String(state.leads.length);
  $("#leads-empty").hidden = leads.length !== 0;
  $("#lead-table-body").innerHTML = leads.map(lead => {
    const campaign = state.campaigns.find(item => item.id === lead.campaignId);
    const score = Math.max(0, Math.min(100, Number(lead.score) || 0));
    return `<tr data-id="${esc(lead.id)}"><td><div class="lead-cell"><span class="lead-avatar tint-${tint(lead.name)}">${esc(initials(lead.name))}</span><span class="lead-name"><button type="button" data-action="view" aria-label="Open ${esc(lead.name)} profile">${esc(lead.name)}</button><span>${esc(lead.role || lead.email)}</span></span></div></td><td><span class="company-cell"><strong>${esc(lead.company)}</strong><span>${esc(lead.source || "Manually added")}</span></span></td><td><span class="campaign-cell"><span class="campaign-mini-icon">${icon("campaigns")}</span>${esc(campaign?.name ?? "—")}</span></td><td><span class="score-cell"><span class="score-ring" style="--score:${score * 3.6}deg"><span>${score}</span></span></span></td><td><span class="status-pill ${statusClass(lead.status)}">${esc(lead.status)}</span></td><td class="value-cell">${money(lead.value)}</td><td class="action-cell"><span class="row-actions"><button class="action-icon action-check" type="button" data-action="active" title="Move to Active Database" aria-label="Move ${esc(lead.name)} to Active Database">${icon("check")}</button><button class="action-icon" type="button" data-action="draft" title="Draft a personalized email" aria-label="Draft an email for ${esc(lead.name)}">${icon("mail")}</button><button class="action-icon" type="button" data-action="whatsapp" title="Open WhatsApp message" aria-label="Message ${esc(lead.name)} on WhatsApp">${icon("whatsapp")}</button><button class="action-icon" type="button" data-action="book" title="Book a meeting" aria-label="Book a meeting with ${esc(lead.name)}">${icon("calendar")}</button><button class="action-icon" type="button" data-action="edit" title="Edit lead" aria-label="Edit ${esc(lead.name)}">${icon("edit")}</button><button class="action-icon action-remove" type="button" data-action="delete" title="Delete lead" aria-label="Delete ${esc(lead.name)}">${icon("trash")}</button></span></td></tr>`;
  }).join("");
}
function renderActivity() {
  const feed = state.feed.slice(0, 22);
  $("#activity-feed").innerHTML = feed.length ? feed.map(item => {
    const symbols = { lead: "✦", email: "↗", booking: "▦", campaign: "◎", system: "◦" };
    const kindLabel = { lead: "CRM", email: "EMAIL", booking: "MEETING", campaign: "CAMPAIGN", system: "SYSTEM" };
    return `<article class="activity-item"><span class="activity-symbol" data-kind="${esc(item.kind)}">${symbols[item.kind] ?? "✦"}</span><div class="activity-copy">${esc(item.message)}<div class="activity-meta">${esc(kindLabel[item.kind] ?? "UPDATE")}${item.simulated ? '<span class="preview-tag">PREVIEW</span>' : ""}</div></div><span class="activity-time" title="${esc(new Date(item.at).toLocaleString())}">${esc(relativeTime(item.at))}</span></article>`;
  }).join("") : `<div class="activity-item"><span class="activity-symbol">✦</span><div class="activity-copy">Your workspace is ready.<div class="activity-meta">LIVE ACTIVITY</div></div><span class="activity-time">now</span></div>`;
}
function updateClock() { const text = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date()); $("#live-clock").innerHTML = `<span class="clock-dot"></span> ${esc(text)}`; }
function addActivity(message, kind = "system", simulated = false) {
  state.feed.unshift({ id: crypto.randomUUID(), message, kind, simulated, at: new Date().toISOString() });
  state.feed = state.feed.slice(0, 60);
  writeLocal("sophia.activity", state.feed);
  renderActivity();
}
function renderAutopilot() {
  const button = $("#autopilot-toggle");
  button.setAttribute("aria-checked", String(state.autopilot));
  button.setAttribute("aria-label", state.autopilot ? "Pause Auto-pilot simulation" : "Start Auto-pilot simulation");
  $("#autopilot-state-text").textContent = state.autopilot ? "Running · preview" : "Paused";
  $("#autopilot-state-dot").classList.toggle("is-on", state.autopilot);
  $(".autopilot-card").classList.toggle("is-on", state.autopilot);
  $("#autopilot-detail").textContent = state.autopilot ? `${state.leads.length} leads · simulating every few seconds` : "Your workspace is waiting for you.";
  $("#feed-status").textContent = state.autopilot ? "Auto-pilot preview · no outreach is sent" : "Turn on Auto-pilot for simulated activity";
}
function simulateActivity() {
  if (!state.autopilot) return;
  const lead = state.leads.length ? state.leads[Math.floor(Math.random() * state.leads.length)] : null;
  const examples = lead ? [
    `Reviewed ${lead.name} at ${lead.company} for a timely follow-up.`,
    `Scanned ${lead.company} for buying signals linked to ${lead.name}.`,
    `Prepared a research note for ${lead.name} at ${lead.company}.`,
    `Flagged ${lead.name} at ${lead.company} as a follow-up opportunity.`
  ] : ["Scanned the workspace for fresh sales opportunities.", "Prepared an example research note for the sales team."];
  addActivity(examples[Math.floor(Math.random() * examples.length)], "lead", true);
}
function startAutopilot() { stopAutopilot(); state.timer = setInterval(simulateActivity, 4800); }
function stopAutopilot() { if (state.timer) clearInterval(state.timer); state.timer = null; }
function setAutopilot(enabled) {
  state.autopilot = enabled;
  writeLocal("sophia.autopilot", enabled);
  if (enabled) startAutopilot(); else stopAutopilot();
  renderAutopilot();
  addActivity(enabled ? "Auto-pilot preview is running. No outreach is being sent." : "Auto-pilot preview paused.", "system");
}
async function refreshCrm() {
  const data = await api("/api/crm");
  state.leads = data.leads;
  state.campaigns = data.campaigns;
  $("#nav-lead-count").textContent = String(state.leads.length);
  $("#nav-campaign-count").textContent = String(state.campaigns.filter(item => item.status === "active").length);
  renderHome(); renderCampaigns(); renderLeads(); renderCampaignOptions();
  $("#sample-data-note").hidden = state.sampleNoteDismissed || !state.leads.some(lead => lead.sample);
}
function openLeadDialog(lead = null) {
  const form = $("#lead-form"); form.reset(); setInlineStatus("#lead-form-status");
  $("#lead-id").value = lead?.id ?? "";
  $("#lead-dialog-title").textContent = lead ? "Edit lead" : "Add a lead";
  $("#lead-dialog-eyebrow").textContent = lead ? "CRM · UPDATE CONTACT" : "CRM · NEW CONTACT";
  $("#lead-name").value = lead?.name ?? "";
  $("#lead-company").value = lead?.company ?? "";
  $("#lead-email").value = lead?.email ?? "";
  $("#lead-phone").value = lead?.phone ?? "";
  $("#lead-role").value = lead?.role ?? "";
  $("#lead-source").value = lead?.source ?? "";
  $("#lead-value").value = lead?.value ?? 0;
  $("#lead-score").value = lead?.score ?? 50;
  renderCampaignOptions();
  $("#lead-campaign").value = lead?.campaignId ?? "";
  $("#edit-status-group").hidden = !lead;
  if (lead) $("#lead-status").value = lead.status;
  $("#lead-dialog").showModal();
  $("#lead-name").focus();
}
function openCampaignDialog(campaign = null) {
  $("#campaign-form").reset(); setInlineStatus("#campaign-form-status");
  $("#campaign-id").value = campaign?.id ?? "";
  $("#campaign-dialog-title").textContent = campaign ? "Edit campaign" : "New campaign";
  $("#campaign-name").value = campaign?.name ?? "";
  $("#campaign-channel").value = campaign?.channel ?? "Email";
  $("#campaign-audience").value = campaign?.audience ?? "";
  $("#campaign-dialog").showModal();
  $("#campaign-name").focus();
}
function openWhatsApp(lead) {
  const details = `Hello, I’m reaching out about ${lead.company}.\n\nContact: ${lead.name}${lead.role ? ` · ${lead.role}` : ""}\nEmail: ${lead.email}\n\nCould we connect?`;
  const url = `https://wa.me/923083335262?text=${encodeURIComponent(details)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
function openMeeting(lead) {
  if (!state.integrations.calendarConfigured) { navigate("settings"); toast("Connect a booking webhook in Settings to book meetings.", true); return; }
  $("#meeting-form").reset(); setInlineStatus("#meeting-form-status");
  $("#meeting-lead-id").value = lead.id;
  $("#meeting-title").textContent = `Book a conversation`;
  $("#meeting-lead-copy").textContent = `Meeting request for ${lead.name} at ${lead.company}. It will be sent to your configured booking webhook.`;
  $("#meeting-timezone").value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const start = new Date(Date.now() + 86_400_000);
  start.setHours(10, 0, 0, 0);
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  $("#meeting-time").value = local;
  $("#meeting-time").min = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  $("#meeting-dialog").showModal();
}
function openProfile(lead) {
  const campaign = state.campaigns.find(item => item.id === lead.campaignId);
  $("#profile-dialog-title").textContent = lead.company;
  $("#profile-dialog-body").innerHTML = `<div class="profile-hero"><span class="lead-avatar tint-${tint(lead.name)}">${esc(initials(lead.name))}</span><div><h3>${esc(lead.name)}</h3><p>${esc(lead.role || "Contact")} · ${esc(lead.company)}</p></div></div><div class="profile-status-row"><span class="status-pill ${statusClass(lead.status)}">${esc(lead.status)}</span><span class="profile-source">Added ${esc(dateLabel(lead.createdAt))} · ${money(lead.value)} potential</span></div><div class="profile-details"><div class="profile-detail"><span>Email address</span><strong>${esc(lead.email)}</strong></div><div class="profile-detail"><span>Phone</span><strong>${esc(lead.phone || "Not provided")}</strong></div><div class="profile-detail"><span>Lead source</span><strong>${esc(lead.source || "Manually added")}</strong></div><div class="profile-detail"><span>Campaign</span><strong>${esc(campaign?.name ?? "No campaign")}</strong></div><div class="profile-detail"><span>Lead score</span><strong>${Number(lead.score)} / 100</strong></div><div class="profile-detail"><span>Last updated</span><strong>${esc(new Date(lead.updatedAt).toLocaleDateString())}</strong></div></div>${lead.sample ? '<div class="profile-note">Starter example record. Review contact details before outreach.</div>' : ""}<div class="profile-actions"><button type="button" class="button button-outline" data-profile-action="edit" data-id="${esc(lead.id)}">${icon("edit")} Edit lead</button><button type="button" class="button button-outline" data-profile-action="draft" data-id="${esc(lead.id)}">${icon("mail")} Draft email</button><button type="button" class="button button-outline" data-profile-action="whatsapp" data-id="${esc(lead.id)}">${icon("whatsapp")} WhatsApp</button><button type="button" class="button button-outline" data-profile-action="book" data-id="${esc(lead.id)}">${icon("calendar")} Book meeting</button></div>`;
  $("#profile-dialog").showModal();
}
async function createDraft(lead) {
  if (state.drafts[lead.id]) { openDraft(lead, state.drafts[lead.id]); return; }
  const provider = state.integrations.aiProvider ?? "gemini";
  if (!state.integrations[`${provider}Configured`]) { navigate("settings"); toast(`Save a ${provider === "openai" ? "OpenAI" : "Gemini"} key to draft email with Sophia.`, true); return; }
  const button = document.activeElement;
  if (button instanceof HTMLButtonElement) button.disabled = true;
  try {
    const { draft } = await api("/api/ai/draft", { method: "POST", body: { leadId: lead.id } });
    const match = draft.match(/^Subject:\s*(.+)$/im);
    const subject = match?.[1]?.trim() ?? `A quick introduction, ${lead.name.split(" ")[0]}`;
    const body = match ? draft.replace(match[0], "").trim() : draft;
    openDraft(lead, { subject, body, provider });
    addActivity(`Sophia drafted a personalized email for ${lead.name}.`, "email");
  } catch (error) { toast(error.message, true); }
  finally { if (button instanceof HTMLButtonElement) button.disabled = false; }
}
function openDraft(lead, draft) {
  $("#draft-lead-id").value = lead.id;
  $("#draft-title").textContent = `Review for ${lead.name.split(" ")[0]}`;
  $("#draft-subject").value = draft.subject;
  $("#draft-body").value = draft.body;
  setInlineStatus("#draft-form-status");
  $("#draft-dialog").showModal();
}
function downloadLeads() {
  const columns = ["name", "company", "email", "phone", "role", "source", "status", "score", "value", "campaign"];
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = filteredLeads().map(lead => [lead.name, lead.company, lead.email, lead.phone, lead.role, lead.source, lead.status, lead.score, lead.value, state.campaigns.find(campaign => campaign.id === lead.campaignId)?.name ?? ""]);
  const csv = [columns, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `sophia-leads-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  toast(`Exported ${rows.length} leads.`);
}
async function runConnectionTest(path, service, button) {
  button.disabled = true;
  const previousText = button.textContent;
  button.textContent = "Checking…";
  try {
    await api(path, { method: "POST" });
    state.connections[service] = true;
    state.connectionErrors[service] = false;
    setConnectionBadges();
    toast(service === "email" ? "Test email sent to the configured sender." : service === "calendar" ? "Booking endpoint accepted the test event." : "AI provider is connected.");
    setInlineStatus(`#${service === "email" ? "email" : service === "calendar" ? "calendar" : "ai"}-form-status`, "Connection verified.");
  } catch (error) {
    state.connections[service] = false;
    state.connectionErrors[service] = true;
    setConnectionBadges();
    setInlineStatus(`#${service === "email" ? "email" : service === "calendar" ? "calendar" : "ai"}-form-status`, error.message, true);
  } finally { button.disabled = false; button.textContent = previousText; }
}
function setSaving(button, busy, busyText = "Saving…") {
  if (busy) { button.dataset.originalText = button.textContent; button.textContent = busyText; button.disabled = true; }
  else { button.textContent = button.dataset.originalText || button.textContent; button.disabled = false; }
}
function wireEvents() {
  for (const button of $$(".nav-item[data-view]")) button.addEventListener("click", () => navigate(button.dataset.view));
  $("#topbar-settings").addEventListener("click", () => navigate("settings"));
  $("#hero-campaign-link").addEventListener("click", () => navigate("campaigns"));
  $("#add-lead-home").addEventListener("click", () => openLeadDialog());
  $("#new-lead-button").addEventListener("click", () => openLeadDialog());
  $("#new-campaign-button").addEventListener("click", () => openCampaignDialog());
  $("#logout-button").addEventListener("click", logout);
  $("#logout-settings-button").addEventListener("click", logout);
  $("#autopilot-toggle").addEventListener("click", () => setAutopilot(!state.autopilot));
  $("#clear-activity").addEventListener("click", () => { state.feed = []; writeLocal("sophia.activity", []); renderActivity(); toast("Activity feed cleared."); });
  $("#dismiss-sample-note").addEventListener("click", () => { state.sampleNoteDismissed = true; writeLocal("sophia.sample-note-dismissed", true); $("#sample-data-note").hidden = true; });
  $("#campaign-filter").addEventListener("change", event => { state.campaignFilter = event.target.value; renderCampaigns(); });
  $("#lead-search").addEventListener("input", event => { state.leadFilters.search = event.target.value; renderLeads(); });
  $("#lead-status-filter").addEventListener("change", event => { state.leadFilters.status = event.target.value; renderLeads(); });
  $("#lead-campaign-filter").addEventListener("change", event => { state.leadFilters.campaignId = event.target.value; renderLeads(); });
  $("#export-leads-button").addEventListener("click", downloadLeads);
  $("#clear-lead-filters").addEventListener("click", () => { state.leadFilters = { search: "", status: "all", campaignId: "all" }; $("#lead-search").value = ""; $("#lead-status-filter").value = "all"; $("#lead-campaign-filter").value = "all"; renderLeads(); });
  for (const button of $$(".sort-button")) button.addEventListener("click", () => { const field = button.dataset.sort; state.sort = state.sort.field === field ? { field, direction: -state.sort.direction } : { field, direction: field === "name" ? 1 : -1 }; renderLeads(); });
  for (const button of $$('[data-toggle-password]')) button.addEventListener("click", () => { const input = $(`#${CSS.escape(button.dataset.togglePassword)}`); const show = input.type === "password"; input.type = show ? "text" : "password"; button.setAttribute("aria-label", show ? "Hide password" : "Show password"); });
  for (const button of $$('[data-close-dialog]')) button.addEventListener("click", () => $(`#${CSS.escape(button.dataset.closeDialog)}`).close());
  for (const dialog of $$("dialog")) dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

  $("#lead-form").addEventListener("submit", async event => {
    event.preventDefault();
    const id = $("#lead-id").value;
    const body = { name: $("#lead-name").value, company: $("#lead-company").value, email: $("#lead-email").value, phone: $("#lead-phone").value, role: $("#lead-role").value, source: $("#lead-source").value, value: Number($("#lead-value").value), score: Number($("#lead-score").value), campaignId: $("#lead-campaign").value };
    if (id) body.status = $("#lead-status").value;
    const button = $("#lead-form button[type=submit]"); setSaving(button, true);
    try {
      await api(id ? `/api/leads/${encodeURIComponent(id)}` : "/api/leads", { method: id ? "PATCH" : "POST", body });
      $("#lead-dialog").close();
      await refreshCrm();
      const leadName = body.name;
      addActivity(id ? `Updated CRM details for ${leadName}.` : `Added ${leadName} to the CRM.`, "lead");
      toast(id ? "Lead updated." : "Lead added to your CRM.");
    } catch (error) { setInlineStatus("#lead-form-status", error.message, true); }
    finally { setSaving(button, false); }
  });
  $("#campaign-form").addEventListener("submit", async event => {
    event.preventDefault();
    const id = $("#campaign-id").value;
    const body = { name: $("#campaign-name").value, channel: $("#campaign-channel").value, audience: $("#campaign-audience").value };
    const button = $("#campaign-form button[type=submit]"); setSaving(button, true);
    try {
      await api(id ? `/api/campaigns/${encodeURIComponent(id)}` : "/api/campaigns", { method: id ? "PATCH" : "POST", body });
      $("#campaign-dialog").close(); await refreshCrm();
      addActivity(`${id ? "Updated" : "Created"} campaign ${body.name}.`, "campaign"); toast(id ? "Campaign updated." : "Campaign created.");
    } catch (error) { setInlineStatus("#campaign-form-status", error.message, true); }
    finally { setSaving(button, false); }
  });
  $("#draft-save-button").addEventListener("click", () => {
    const id = $("#draft-lead-id").value;
    state.drafts[id] = { subject: $("#draft-subject").value, body: $("#draft-body").value, provider: state.integrations.aiProvider ?? "gemini", savedAt: new Date().toISOString() };
    writeLocal("sophia.drafts", state.drafts);
    const lead = state.leads.find(item => item.id === id);
    $("#draft-dialog").close();
    addActivity(`Saved an email draft for ${lead?.name ?? "a lead"} in this browser.`, "email");
    toast("Draft saved in this browser.");
  });
  $("#draft-form").addEventListener("submit", async event => {
    event.preventDefault();
    const id = $("#draft-lead-id").value;
    const lead = state.leads.find(item => item.id === id);
    if (!lead) { setInlineStatus("#draft-form-status", "This lead no longer exists.", true); return; }
    if (!state.integrations.emailConfigured) {
      state.drafts[id] = { subject: $("#draft-subject").value, body: $("#draft-body").value, provider: state.integrations.aiProvider ?? "gemini", savedAt: new Date().toISOString() };
      writeLocal("sophia.drafts", state.drafts);
      $("#draft-dialog").close(); navigate("settings");
      toast("Draft saved in this browser. Connect Gmail before sending.", true);
      return;
    }
    const button = $("#draft-form button[type=submit]");
    if (!window.confirm(`Send this reviewed email to ${lead.name} at ${lead.email}?`)) return;
    const body = { subject: $("#draft-subject").value, body: $("#draft-body").value };
    setSaving(button, true, "Sending…");
    try {
      await api(`/api/leads/${encodeURIComponent(id)}/send-email`, { method: "POST", body });
      delete state.drafts[id]; writeLocal("sophia.drafts", state.drafts);
      $("#draft-dialog").close(); await refreshCrm();
      addActivity(`Sent a reviewed email to ${lead.name} at ${lead.company}.`, "email"); toast("Email sent through Gmail.");
    } catch (error) { setInlineStatus("#draft-form-status", error.message, true); }
    finally { setSaving(button, false); }
  });
  $("#meeting-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("#meeting-form button[type=submit]"); setSaving(button, true, "Sending…");
    try {
      const result = await api("/api/bookings", { method: "POST", body: { leadId: $("#meeting-lead-id").value, startsAt: new Date($("#meeting-time").value).toISOString(), timezone: $("#meeting-timezone").value, notes: $("#meeting-notes").value } });
      const lead = state.leads.find(item => item.id === $("#meeting-lead-id").value);
      $("#meeting-dialog").close(); addActivity(`Sent a meeting request for ${lead?.name ?? "a lead"} · ${new Date(result.startsAt).toLocaleString()}.`, "booking"); toast("Meeting request sent to your booking webhook.");
    } catch (error) { setInlineStatus("#meeting-form-status", error.message, true); }
    finally { setSaving(button, false); }
  });

  $("#lead-table-body").addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]"); if (!button) return;
    const row = button.closest("tr"); const lead = state.leads.find(item => item.id === row?.dataset.id); if (!lead) return;
    if (button.dataset.action === "view") return openProfile(lead);
    if (button.dataset.action === "edit") return openLeadDialog(lead);
    if (button.dataset.action === "whatsapp") return openWhatsApp(lead);
    if (button.dataset.action === "draft") return createDraft(lead);
    if (button.dataset.action === "book") return openMeeting(lead);
    if (button.dataset.action === "active") {
      if (lead.status === "Active Database") return toast(`${lead.name} is already in the Active Database.`);
      button.disabled = true;
      try { await api(`/api/leads/${encodeURIComponent(lead.id)}`, { method: "PATCH", body: { ...lead, status: "Active Database" } }); await refreshCrm(); addActivity(`Moved ${lead.name} into the Active Database.`, "lead"); toast(`${lead.name} added to Active Database.`); }
      catch (error) { toast(error.message, true); }
      return;
    }
    if (button.dataset.action === "delete") {
      if (!window.confirm(`Delete ${lead.name} from the CRM? This cannot be undone.`)) return;
      const previous = state.leads;
      state.leads = state.leads.filter(item => item.id !== lead.id);
      $("#nav-lead-count").textContent = String(state.leads.length);
      renderHome(); renderLeads();
      button.disabled = true;
      try { await api(`/api/leads/${encodeURIComponent(lead.id)}`, { method: "DELETE" }); await refreshCrm(); addActivity(`Removed ${lead.name} from the CRM.`, "lead"); toast("Lead removed from your CRM."); }
      catch (error) { state.leads = previous; $("#nav-lead-count").textContent = String(state.leads.length); renderHome(); renderLeads(); toast(error.message, true); }
    }
  });
  $("#profile-dialog-body").addEventListener("click", event => {
    const button = event.target.closest("button[data-profile-action]"); if (!button) return;
    const lead = state.leads.find(item => item.id === button.dataset.id); if (!lead) return;
    $("#profile-dialog").close();
    if (button.dataset.profileAction === "edit") openLeadDialog(lead);
    if (button.dataset.profileAction === "draft") createDraft(lead);
    if (button.dataset.profileAction === "whatsapp") openWhatsApp(lead);
    if (button.dataset.profileAction === "book") openMeeting(lead);
  });
  $("#campaign-grid").addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]"); if (!button) return;
    const campaign = state.campaigns.find(item => item.id === button.closest("[data-id]")?.dataset.id); if (!campaign) return;
    if (button.dataset.action === "campaign-edit") return openCampaignDialog(campaign);
    if (button.dataset.action === "campaign-leads") { state.leadFilters.campaignId = campaign.id; $("#lead-campaign-filter").value = campaign.id; navigate("leads"); return; }
    if (button.dataset.action === "campaign-toggle") {
      button.disabled = true;
      try { await api(`/api/campaigns/${encodeURIComponent(campaign.id)}`, { method: "PATCH", body: { ...campaign, status: campaign.status === "active" ? "paused" : "active" } }); await refreshCrm(); const updated = state.campaigns.find(item => item.id === campaign.id); addActivity(`${updated.status === "active" ? "Resumed" : "Paused"} ${campaign.name}.`, "campaign"); toast(`Campaign ${updated.status === "active" ? "resumed" : "paused"}.`); }
      catch (error) { toast(error.message, true); }
    }
    if (button.dataset.action === "campaign-delete") {
      if (!window.confirm(`Delete campaign “${campaign.name}”? Leads assigned to it will remain in the CRM.`)) return;
      button.disabled = true;
      try { await api(`/api/campaigns/${encodeURIComponent(campaign.id)}`, { method: "DELETE" }); await refreshCrm(); addActivity(`Deleted campaign ${campaign.name}.`, "campaign"); toast("Campaign deleted."); }
      catch (error) { toast(error.message, true); }
    }
  });

  $("#ai-settings-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("#ai-settings-form button[type=submit]"); setSaving(button, true);
    try {
      const data = await api("/api/settings", { method: "PUT", body: { aiProvider: $("#ai-provider").value, geminiApiKey: $("#gemini-api-key").value.trim(), openaiApiKey: $("#openai-api-key").value.trim() } });
      $("#gemini-api-key").value = ""; $("#openai-api-key").value = "";
      state.connections.gemini = false; state.connections.openai = false;
      state.connectionErrors.gemini = false; state.connectionErrors.openai = false;
      applyIntegrationData(data); setInlineStatus("#ai-form-status", "AI settings saved securely."); toast("AI settings saved.");
    } catch (error) { setInlineStatus("#ai-form-status", error.message, true); }
    finally { setSaving(button, false); }
  });
  $("#test-ai-button").addEventListener("click", event => runConnectionTest(`/api/settings/test-ai?provider=${encodeURIComponent($("#ai-provider").value)}`, $("#ai-provider").value, event.currentTarget));
  $("#ai-provider").addEventListener("change", () => setConnectionBadges());
  $("#remove-ai-key-button").addEventListener("click", async () => {
    const provider = $("#ai-provider").value;
    if (!window.confirm(`Remove the saved ${provider === "openai" ? "OpenAI" : "Gemini"} API key?`)) return;
    try { const body = { [`clear${provider[0].toUpperCase()}${provider.slice(1)}ApiKey`]: true }; const data = await api("/api/settings", { method: "PUT", body }); state.connections[provider] = false; state.connectionErrors[provider] = false; applyIntegrationData(data); setInlineStatus("#ai-form-status", "Selected key removed."); toast("API key removed."); }
    catch (error) { setInlineStatus("#ai-form-status", error.message, true); }
  });
  $("#email-settings-form").addEventListener("submit", async event => {
    event.preventDefault(); const button = $("#email-settings-form button[type=submit]"); setSaving(button, true);
    try { const data = await api("/api/settings", { method: "PUT", body: { senderEmail: $("#sender-email").value.trim(), smtpUsername: $("#smtp-username").value.trim(), smtpPassword: $("#smtp-password").value } }); $("#smtp-password").value = ""; state.connections.email = false; state.connectionErrors.email = false; applyIntegrationData(data); setInlineStatus("#email-form-status", "Email settings saved securely."); toast("Gmail sender settings saved."); }
    catch (error) { setInlineStatus("#email-form-status", error.message, true); }
    finally { setSaving(button, false); }
  });
  $("#test-email-button").addEventListener("click", event => runConnectionTest("/api/settings/test-email", "email", event.currentTarget));
  $("#remove-smtp-password-button").addEventListener("click", async () => {
    if (!window.confirm("Remove the saved Gmail app password?")) return;
    try { const data = await api("/api/settings", { method: "PUT", body: { clearSmtpPassword: true } }); state.connections.email = false; state.connectionErrors.email = false; applyIntegrationData(data); setInlineStatus("#email-form-status", "Saved password removed."); toast("Gmail password removed."); }
    catch (error) { setInlineStatus("#email-form-status", error.message, true); }
  });
  $("#calendar-settings-form").addEventListener("submit", async event => {
    event.preventDefault(); const button = $("#calendar-settings-form button[type=submit]"); setSaving(button, true);
    try { const data = await api("/api/settings", { method: "PUT", body: { calendarWebhookUrl: $("#calendar-webhook").value.trim() } }); state.connections.calendar = false; state.connectionErrors.calendar = false; applyIntegrationData(data); setInlineStatus("#calendar-form-status", "Booking webhook saved."); toast("Booking webhook saved."); }
    catch (error) { setInlineStatus("#calendar-form-status", error.message, true); }
    finally { setSaving(button, false); }
  });
  $("#test-webhook-button").addEventListener("click", event => runConnectionTest("/api/settings/test-webhook", "calendar", event.currentTarget));

  $("#login-form").addEventListener("submit", async event => {
    event.preventDefault(); $("#login-error").hidden = true;
    const button = $("#login-form button[type=submit]"); setSaving(button, true, "Signing in…");
    try { const session = await api("/api/login", { method: "POST", body: { password: $("#admin-password").value } }); await openWorkspace(session); }
    catch (error) { $("#login-error").textContent = error.message; $("#login-error").hidden = false; $("#admin-password").select(); }
    finally { setSaving(button, false); }
  });
}
async function logout() {
  try { await api("/api/logout", { method: "POST" }); }
  catch (error) { if (state.csrf) toast(error.message, true); }
  showLogin();
}

for (const [selector, name] of [["[data-icon=home]", "home"], ["[data-icon=campaigns]", "campaigns"], ["[data-icon=leads]", "leads"], ["[data-icon=settings]", "settings"], ["[data-icon=search]", "search"], ["[data-icon=download]", "download"]]) {
  for (const element of $$(selector)) element.innerHTML = icon(name);
}
$("#autopilot-toggle").setAttribute("aria-checked", "false");
wireEvents();
try {
  const session = await api("/api/session");
  if (session.authenticated) await openWorkspace(session);
  else showLogin();
} catch (error) {
  showLogin();
  $("#login-error").textContent = `Could not connect to Sophia: ${error.message}`;
  $("#login-error").hidden = false;
}
