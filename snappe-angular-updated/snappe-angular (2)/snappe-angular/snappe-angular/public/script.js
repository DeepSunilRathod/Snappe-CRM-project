// SnapPe Dashboard — script.js

const DEFAULT_COLS = [
  { key:"name",          label:"Name",          type:"text",   locked:true },
  { key:"phone",         label:"Phone",         type:"text",   locked:true },
  { key:"email",         label:"Email",         type:"text",   locked:true },
  { key:"source",        label:"Source",        type:"select", locked:true,
    options:["Email","Website","Facebook","WhatsApp","Instagram","Referral"] },
  { key:"status",        label:"Status",        type:"select", locked:true,
    options:["New","Contacted","Qualified","Proposal","Won","Lost"] },
  { key:"score",         label:"Score",         type:"number", locked:true },
  { key:"assignedToName",label:"Assigned To",   type:"text",   locked:true },
  { key:"followUpDate",  label:"Follow-up Date",type:"date",   locked:true },
  { key:"city",          label:"City",          type:"text",   locked:true },
  { key:"date",          label:"Date Added",    type:"date",   locked:true },
];

const FUNNEL = [
  { key:"New",       color:"#6a11cb", w:100 },
  { key:"Contacted", color:"#3498db", w:82  },
  { key:"Qualified", color:"#10B981", w:65  },
  { key:"Proposal",  color:"#f59e0b", w:49  },
  { key:"Won",       color:"#22c55e", w:34  },
];

const PALETTE = ["#6a11cb","#3498db","#10B981","#f59e0b","#e74c3c","#8b5cf6","#06b6d4","#ec4899"];

let currentUser = null;
let leads = [], columns = [], dashboards = [], tasks = [], fieldDefinitions = [];
let widgetDefinitions = [];  // Custom widget definitions
let activeDashId = null;
let editLeadIdx  = -1;
let cfgType = null, cfgEditId = null;
let chartInst = {}, repInst = {};
let dragWid = null;
let editingWidgetDefId = null;
let editingFieldIdx = null;
let _editingColOptions = [];  // holds options while user builds a dropdown/multiselect column
let dashboardInitialized = false;
let leadsRenderToken = 0;
let selectedLeadIds = new Set();
let leadUidSeed = 0;
// Modal visibility state. Controls whether modals are shown.
const modalState = {
  userModal: false,
  leadModal: false,
  widgetDefModal: false,
  widgetColModal: false,
  newDashModal: false,
  manageWidgetsModal: false,
  fieldModal: false,
  customWidgetConfigModal: false,
  configModal: false,
  colModal: false,
  createWidgetFromColModal: false
};

const pageState = {
  dashboard: true,
  leads: false,
  reports: false,
  users: false
};

function syncPageVisibility() {
  Object.entries(pageState).forEach(([name, isVisible]) => {
    const page = document.getElementById(`pg-${name}`);
    if (!page) return;
    page.hidden = !isVisible;
    page.style.display = isVisible ? "flex" : "none";
  });
}

function renderModals() {
  const elUser = document.getElementById("userModal"); if (elUser) elUser.style.display = modalState.userModal ? "flex" : "none";
  const elLead = document.getElementById("leadModal"); if (elLead) elLead.style.display = modalState.leadModal ? "flex" : "none";
  const elWDef = document.getElementById("widgetDefModal"); if (elWDef) elWDef.style.display = modalState.widgetDefModal ? "flex" : "none";
  const elWCol = document.getElementById("widgetColModal"); if (elWCol) elWCol.style.display = modalState.widgetColModal ? "flex" : "none";
  const elNew = document.getElementById("newDashModal"); if (elNew) elNew.style.display = modalState.newDashModal ? "flex" : "none";
  const elManage = document.getElementById("manageWidgetsModal"); if (elManage) elManage.style.display = modalState.manageWidgetsModal ? "flex" : "none";
  const elField = document.getElementById("fieldModal"); if (elField) elField.style.display = modalState.fieldModal ? "flex" : "none";
  const elCustom = document.getElementById("customWidgetConfigModal"); if (elCustom) elCustom.style.display = modalState.customWidgetConfigModal ? "flex" : "none";
  const elCfg = document.getElementById("configModal"); if (elCfg) elCfg.style.display = modalState.configModal ? "flex" : "none";
  const elCol = document.getElementById("colModal"); if (elCol) elCol.style.display = modalState.colModal ? "flex" : "none";
  const elCreateWid = document.getElementById("createWidgetFromColModal"); if (elCreateWid) elCreateWid.style.display = modalState.createWidgetFromColModal ? "flex" : "none";
}

// Wrapper functions for inline onclick handlers in HTML
window.closeLeadModal = function() { modalState.leadModal = false; renderModals(); };
window.closeNewDashboardModal = function() { modalState.newDashModal = false; renderModals(); };
window.closeColModalInline = function() { modalState.colModal = false; renderModals(); };
window.closeWidgetColModalInline = function() { modalState.widgetColModal = false; renderModals(); };
window.closeUserModalInline = function() { modalState.userModal = false; renderModals(); };
window.closeCreateWidgetFromColModal = function() { modalState.createWidgetFromColModal = false; renderModals(); };
window.createWidgetFromCol = function(type) { createWidgetFromCol(type); };
const BACKEND_API_BASE = "http://localhost:8080/api";
const CORE_LEAD_KEYS = new Set([
  "id", "name", "phone", "email", "source", "status", "score",
  "city", "followUpDate", "date", "totalCalls", "assignedToName",
  "assignedToId", "notes", "activity", "customFields"
]);

const DASHBOARD_STATUS_OPTIONS = ["New","Contacted","Qualified","Proposal","Won","Lost"];
const DEFAULT_DASHBOARD_COUNT_COLS = ["source", "status", "assignedToName", "city"];

// ─── INIT ───────────────────────────────────────────────────
function startDashboardApp() {
  if (!document.getElementById("pg-dashboard")) return;

  initUsers();
  currentUser = getSession();
  if (!currentUser) {
    window.location.href = "/login";
    return;
  }

  if (dashboardInitialized) {
    renderBuilder();
    buildNotifications();
    return;
  }
  dashboardInitialized = true;

  setupUI();
  loadAll();
  renderBuilder();
  buildNotifications();
  pageState.dashboard = true;
  pageState.leads = false;
  pageState.reports = false;
  pageState.users = false;
  syncPageVisibility();

  // ensure no modal is shown by default after login
  renderModals();

  document.getElementById("pgDate").textContent =
    new Date().toLocaleDateString("en-IN",
      { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

window.startDashboardApp = startDashboardApp;
document.addEventListener("DOMContentLoaded", startDashboardApp);

// ─── UI SETUP ───────────────────────────────────────────────
function setupUI() {
  const u = currentUser;
  const dot = document.getElementById("userDot");
  dot.textContent      = u.avatar;
  dot.style.background = ROLE_COLORS[u.role] || "#888";
  document.getElementById("userName").textContent = u.name;
  document.getElementById("userRole").textContent = ROLE_LABELS[u.role];

  if (canManageUsers(u))    show("liUsers");
  if (canImportExport(u)) { show("btnImport"); show("btnExport"); }
  if (canCustomizeColumns(u)) show("btnCols");
  if (canCustomizeColumns(u)) show("btnDashCols");
  if (canCustomizeColumns(u)) show("liCustomCols");
  if (canSeeAllLeads(u))  { show("fAssign"); fillAssignFilter(); }

  setTopbar("dashboard");
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "inline-flex";
}

function showPage(name) {
  closeAllPopups();

  pageState.dashboard = name === "dashboard";
  pageState.leads = name === "leads";
  pageState.reports = name === "reports";
  pageState.users = name === "users";

  document.querySelectorAll(".nav li").forEach(l => l.classList.remove("active"));
  const navMap = { dashboard:"navDashboard", leads:"navLeads", reports:"navReports", users:"liUsers" };
  if (navMap[name]) { const el = document.getElementById(navMap[name]); if (el) el.classList.add("active"); }

  syncPageVisibility();

  const pg = document.getElementById("pg-"+name);
  if (pg) pg.style.display = "flex";

  const titles = { dashboard:"Dashboard", leads:"Leads", reports:"Reports", users:"User Management" };
  document.getElementById("pgTitle").textContent = titles[name] || name;

  setTopbar(name);
  if (name === "leads")   renderLeads();
  if (name === "reports") renderReports();
  if (name === "users")   renderUsers();
}

function setTopbar(name) {
  const el = document.getElementById("topActions");
  if (!el) return;
  el.innerHTML = "";

  // Hide the sidebar Custom Columns link when on the Dashboard page
  const liCustom = document.getElementById("liCustomCols");
  if (liCustom) {
    try {
      if (name === "dashboard") {
        liCustom.style.display = "none";
      } else {
        // show only if user can customize columns
        if (canCustomizeColumns && canCustomizeColumns(currentUser)) liCustom.style.display = "inline-flex";
        else liCustom.style.display = "none";
      }
    } catch (e) { /* ignore */ }
  }
}

// ─── DATA ───────────────────────────────────────────────────
function loadAll() {
  leads   = JSON.parse(localStorage.getItem("leads_v6")   || "[]");
  ensureLeadIds();
  columns = JSON.parse(localStorage.getItem("cols_v6")    || "null") || [...DEFAULT_COLS];
  tasks   = JSON.parse(localStorage.getItem("tasks_"+currentUser.id) || "[]");
  widgetDefinitions = JSON.parse(localStorage.getItem("widgetDefs_v1") || "[]");

  const sd = localStorage.getItem("dashes_v6");
  dashboards = sd ? JSON.parse(sd) : [{ id:"d1", name:"My Dashboard", vis:"me", widgets:[] }];

  // Try to load tenant-specific configuration from backend if available.
  (async () => {
    try {
      const customerId = window.CUSTOMER_ID || currentUser.customerId || 1;
      // fetch custom columns
      const colsResp = await fetch(`${BACKEND_API_BASE}/custom-columns?customerId=${customerId}`);
      if (colsResp.ok) {
        const cols = await colsResp.json();
        if (Array.isArray(cols) && cols.length) {
          // map to expected shape if necessary
          columns = cols.map(c => ({
            id: c.id,
            key: c.keyName || c.key || String(c.id),
            label: c.label || c.keyName,
            type: c.type || 'text',
            defaultValue: c.defaultValue || '',
            sourceType: c.sourceType || 'lead',
            relationEntity: c.relationEntity || '',
            options: normalizeColumnOptions(c.optionsJson ? JSON.parse(c.optionsJson) : undefined)
          }));
          saveCols();
        }
      }

      const fieldsResp = await fetch(`${BACKEND_API_BASE}/field-definitions/active?customerId=${customerId}`);
      if (fieldsResp.ok) {
        const defs = await fieldsResp.json();
        if (Array.isArray(defs)) {
          fieldDefinitions = defs;
          mergeFieldDefinitionsIntoColumns(defs);
        }
      }

      // fetch dashboards
      const dResp = await fetch(`${BACKEND_API_BASE}/dashboards?customerId=${customerId}`);
      if (dResp.ok) {
        const ds = await dResp.json();
        if (Array.isArray(ds) && ds.length) {
          dashboards = ds.map(normalizeDashboardFromBackend);
          saveDashes();
        }
      }

      // fetch leads for customer if backend supports it
      const lResp = await fetch(`${BACKEND_API_BASE}/leads?customerId=${customerId}`);
      if (lResp.ok) {
        const ls = await lResp.json();
        if (Array.isArray(ls)) {
          // convert API LeadResponse shape to local shape expected by UI
          leads = ls.map(l => ({ id: l.id, name: l.name, phone: l.phone, email: l.email, source: l.source, status: l.status, score: l.score, city: l.city, followUpDate: l.followUpDate, date: l.dateAdded, totalCalls: l.totalCalls, assignedToName: l.assignedToName, assignedToId: l.assignedToId, customFields: l.customFields || {} }));
          persistLeads();
        }
      }
    } catch (e) {
      // ignore and continue with local data
      console.warn('Tenant load skipped', e);
    }
    // Ensure dashboards are claimed and active is set after backend load
    const sa = localStorage.getItem("activeDash_"+currentUser.id);
    const visible = visibleDashboards();
    if (!visible.length) {
      const d = {
        id: "d_" + Date.now(),
        name: "My Dashboard",
        vis: "me",
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        filters: { source:"", status:"", assignedToName: currentUser.name },
        widgets: []
      };
      dashboards.push(d);
      saveDashes();
    }
    const refreshed = visibleDashboards();
    activeDashId = (sa && refreshed.find(d=>d.id===sa)) ? sa : refreshed[0].id;
    renderBuilder();
    populateDynamicFilters();
    injectCustomGroupByOptions();
  })();

  // Backfill owner details for legacy dashboards.
  dashboards = dashboards.map(d => ({
    ...d,
    ownerId: d.ownerId ?? (d.ownerName && d.ownerName === currentUser.name ? currentUser.id : null),
    ownerName: d.ownerName ?? (d.ownerId === currentUser.id ? currentUser.name : null),
    filters: d.filters || { source:"", status:"", assignedToName:"" }
  }));

  // If any legacy dashboard still has no owner, claim it for the logged-in user so
  // personalized dashboards remain private and accessible to their creator.
  dashboards = dashboards.map(d => {
    if (d.ownerId == null) {
      return {
        ...d,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        vis: "me"
      };
    }
    return d;
  });

  const sa = localStorage.getItem("activeDash_"+currentUser.id);
  const visible = visibleDashboards();
  if (!visible.length) {
    const d = {
      id: "d_" + Date.now(),
      name: "My Dashboard",
      vis: "me",
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      filters: { source:"", status:"", assignedToName: currentUser.name },
      widgets: []
    };
    dashboards.push(d);
    saveDashes();
  }

  const refreshed = visibleDashboards();
  activeDashId = (sa && refreshed.find(d=>d.id===sa)) ? sa : refreshed[0].id;
}

function mergeFieldDefinitionsIntoColumns(defs) {
  if (!Array.isArray(defs) || !defs.length) return;

  defs.forEach(def => {
    const key = def.keyName;
    const existing = columns.find(c => c.key === key);
    const normalizedOptions = normalizeColumnOptions(def.optionsJson ? JSON.parse(def.optionsJson) : undefined);
    const mapped = {
      fieldId: def.id,
      key,
      label: def.label || key,
      type: def.dataType === "calendar" ? "date" : def.multiSelect ? "multiselect" : (def.dataType || "text"),
      defaultValue: def.defaultValue || "",
      options: normalizedOptions,
      locked: false,
      sourceType: def.sourceType || "lead",
      relationEntity: def.relationEntity || "",
      multiSelect: !!def.multiSelect
    };

    if (existing) {
      Object.assign(existing, mapped, { locked: existing.locked });
    } else {
      columns.push(mapped);
    }
  });

  saveCols();
}

function getDashboardFieldOptions() {
  const builtIns = [
    { key: "source", label: "Lead Source" },
    { key: "status", label: "Lead Status" },
    { key: "assignedToName", label: "Assigned To" },
    { key: "city", label: "City" },
    { key: "date_month", label: "Date — By Month" },
    { key: "date_day", label: "Date — By Day" },
    { key: "score", label: "Score" },
    { key: "totalCalls", label: "Total Calls" },
    { key: "followUpDate", label: "Follow-up Date" },
    { key: "dateAdded", label: "Date Added" }
  ];

  const custom = columns
    .filter(col => !DEFAULT_COLS.some(def => def.key === col.key) || fieldDefinitions.some(def => def.keyName === col.key))
    .map(col => ({ key: col.key, label: col.label }));

  const dedup = new Map();
  [...builtIns, ...custom].forEach(item => dedup.set(item.key, item));
  return [...dedup.values()];
}

function populateFieldSelectors(selectedKey = "source") {
  const fieldSelect = document.getElementById("cfgFieldKey");
  if (fieldSelect) {
    const fields = getDashboardFieldOptions();
    let html = "";
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      html += "<option value='" + f.key + "'>" + f.label + "</option>";
    }
    fieldSelect.innerHTML = html;
    fieldSelect.value = selectedKey || "source";
  }
}

function getAnalyticsPresetKey(fieldKey = "") {
  const presetMap = {
    source: "source",
    status: "status",
    assignedToName: "assignedToName",
    city: "city",
    date_month: "date_month",
    date_day: "date_day"
  };
  return presetMap[fieldKey] || "custom";
}

function applyAnalyticsPreset() {
  const preset = document.getElementById("cfgAnalyticsPreset")?.value || "custom";
  const fieldSelect = document.getElementById("cfgFieldKey");
  const modeSelect = document.getElementById("cfgAnalyticsMode");
  if (!fieldSelect) return;

  if (preset !== "custom") {
    fieldSelect.value = preset;
    if (modeSelect && (preset === "date_month" || preset === "date_day")) {
      modeSelect.value = "chart";
    }
  }
}

const saveCols   = () => localStorage.setItem("cols_v6",   JSON.stringify(columns));
const saveDashes = () => localStorage.setItem("dashes_v6", JSON.stringify(dashboards));
const saveTasks  = () => localStorage.setItem("tasks_"+currentUser.id, JSON.stringify(tasks));
const saveWidgetDefs = () => localStorage.setItem("widgetDefs_v1", JSON.stringify(widgetDefinitions));
const saveActive = () => localStorage.setItem("activeDash_"+currentUser.id, activeDashId);

function isPersistedDashboardId(id) {
  return typeof id === "string" && /^\d+$/.test(id);
}

function normalizeDashboardFromBackend(def) {
  let parsed = {};
  if (def?.widgetsJson) {
    try {
      parsed = JSON.parse(def.widgetsJson);
    } catch (e) {
      parsed = {};
    }
  }

  const widgets = Array.isArray(parsed.widgets)
    ? parsed.widgets
    : (Array.isArray(def.widgets) ? def.widgets : []);

  return {
    id: def?.id ? String(def.id) : `d_${Date.now()}`,
    name: def?.name || "My Dashboard",
    vis: parsed.vis || def?.vis || "me",
    ownerId: def?.ownerId || currentUser.id,
    ownerName: parsed.ownerName || def?.ownerName || currentUser.name,
    filters: parsed.filters || def?.filters || { source: "", status: "", assignedToName: "" },
    widgets
  };
}

function toDashboardPayload(dash) {
  return {
    customerId: getCustomerId(),
    name: dash.name,
    ownerId: dash.ownerId || currentUser.id,
    widgetsJson: JSON.stringify({
      vis: dash.vis || "me",
      ownerName: dash.ownerName || currentUser.name,
      filters: dash.filters || { source: "", status: "", assignedToName: "" },
      widgets: Array.isArray(dash.widgets) ? dash.widgets : []
    })
  };
}

async function persistDashboardToBackend(dash) {
  try {
    const payload = toDashboardPayload(dash);
    const id = dash?.id;
    const hasPersistedId = isPersistedDashboardId(id);
    const url = hasPersistedId ? `${BACKEND_API_BASE}/dashboards/${id}` : `${BACKEND_API_BASE}/dashboards`;
    const method = hasPersistedId ? "PUT" : "POST";
    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(hasPersistedId ? { id: Number(id) } : {}), ...payload })
    });
    if (!resp.ok) return false;

    const saved = await resp.json();
    if (saved?.id) {
      dash.id = String(saved.id);
    }
    return true;
  } catch (e) {
    console.warn("Dashboard persist skipped", e);
    return false;
  }
}

async function persistCurrentDashboard() {
  const dash = getDash();
  if (!dash) return;
  await persistDashboardToBackend(dash);
  saveDashes();
}

async function syncLeadsToBackend() {
  try {
    const payload = leads.map(lead => ({
        id: lead.id || null,
      name: lead.name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      status: lead.status || "",
      score: lead.score === "" || lead.score == null ? null : Number(lead.score),
      city: lead.city || "",
      followUpDate: lead.followUpDate || null,
      totalCalls: lead.totalCalls === "" || lead.totalCalls == null ? 0 : Number(lead.totalCalls),
        assignedToName: lead.assignedToName || "",
        assignedToId: lead.assignedToId || null,
      customFields: Object.fromEntries(
        Object.entries(lead).filter(([key]) => !CORE_LEAD_KEYS.has(key)).map(([key, value]) => [key, value == null ? "" : String(value)])
      )
    }));

    await fetch(`${BACKEND_API_BASE}/leads/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("Lead sync skipped:", error);
  }
}

function persistLeads() {
  localStorage.setItem("leads_v6", JSON.stringify(leads));
  syncLeadsToBackend();
}

const saveLeads = persistLeads;

const visibleDashboards = () => dashboards.filter(d => d.ownerId === currentUser.id);
const getDash    = () => {
  const visible = visibleDashboards();
  return visible.find(d=>d.id===activeDashId) || visible[0] || dashboards[0];
};
const myLeads    = () => canSeeAllLeads(currentUser) ? leads
                         : leads.filter(l=>l.assignedToName===currentUser.name);

function ensureLeadIds() {
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (!lead) continue;
    if (!lead.id && !lead.__uid) {
      lead.__uid = "lid_" + Date.now() + "_" + (leadUidSeed++);
    }
  }
}

function getLeadStableId(lead) {
  if (!lead) return "";
  if (lead.id !== undefined && lead.id !== null && lead.id !== "") return String(lead.id);
  if (lead.__uid) return String(lead.__uid);
  lead.__uid = "lid_" + Date.now() + "_" + (leadUidSeed++);
  return lead.__uid;
}

function parseLeadDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3].length === 2 ? ("20" + m[3]) : m[3]);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function normalizeDateBoundary(value, endOfDay = false) {
  if (!value) return null;
  const d = parseLeadDateValue(value);
  if (!d) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function filterLeadList(list, f = {}) {
  const dateFrom = normalizeDateBoundary(f.dateFrom, false);
  const dateTo = normalizeDateBoundary(f.dateTo, true);

  return list.filter(l => {
    if (f.source && (l.source || "") !== f.source) return false;
    if (f.status && (l.status || "") !== f.status) return false;
    if (f.assignedToName && (l.assignedToName || "") !== f.assignedToName) return false;

    if (dateFrom || dateTo) {
      const leadDate = parseLeadDateValue(l.followUpDate || l.date || l.dateAdded || l.createdOn);
      if (!leadDate) return false;
      if (dateFrom && leadDate < dateFrom) return false;
      if (dateTo && leadDate > dateTo) return false;
    }

    return true;
  });
}

function leadsForDash(dash, widget) {
  const visibleLeads = canSeeAllLeads(currentUser) ? leads : myLeads();
  return filterLeadList(visibleLeads, { ...(dash?.filters || {}), ...(widget?.filters || {}) });
}

function getDashboardFieldValue(lead, key) {
  if (key === "date_month") {
    return lead.date ? new Date(lead.date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) : "Blank";
  }
  if (key === "date_day") {
    return lead.date || "Blank";
  }

  const directValue = lead?.[key];
  if (directValue !== undefined && directValue !== null && String(directValue).trim() !== "") {
    return String(directValue).trim();
  }

  const customValue = lead?.customFields?.[key];
  if (customValue !== undefined && customValue !== null && String(customValue).trim() !== "") {
    return String(customValue).trim();
  }

  return "Blank";
}

function getCustomerId() {
  return window.CUSTOMER_ID || currentUser.customerId || 1;
}

async function fetchFieldAnalytics(fieldKey) {
  try {
    const resp = await fetch(`${BACKEND_API_BASE}/dashboards/analytics?customerId=${getCustomerId()}&fieldKey=${encodeURIComponent(fieldKey)}`);
    if (resp.ok) {
      return await resp.json();
    }
  } catch (e) {
    console.warn("Analytics fetch skipped", e);
  }

  const counts = new Map();
  myLeads().forEach(lead => {
    const value = getDashboardFieldValue(lead, fieldKey);
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return Object.fromEntries(counts);
}

function fieldCountsToChartData(countsMap) {
  const entries = Object.entries(countsMap || {}).sort((a, b) => b[1] - a[1]);
  return { labels: entries.map(entry => entry[0]), data: entries.map(entry => entry[1]) };
}

function getDefaultCountColumns() {
  const availableKeys = new Set(columns.map(c => c.key));
  const customSelectKeys = columns
    .filter(c => c.type === "select" && !c.locked)
    .map(c => c.key);

  return [...new Set([...DEFAULT_DASHBOARD_COUNT_COLS, ...customSelectKeys])]
    .filter(key => availableKeys.has(key));
}

function countByField(arr, field) {
  const counts = new Map();

  arr.forEach(lead => {
    const value = getDashboardFieldValue(lead, field);
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function populateDashboardFilters(sourceId, statusId, assigneeId, dateFromId, dateToId, selected = {}, allowAllAssignees = false) {
  const sourceEl = document.getElementById(sourceId);
  const statusEl = document.getElementById(statusId);
  const assigneeEl = document.getElementById(assigneeId);
  const dateFromEl = dateFromId ? document.getElementById(dateFromId) : null;
  const dateToEl = dateToId ? document.getElementById(dateToId) : null;

  if (sourceEl) {
    const sources = [...new Set(leads.map(l => l.source).filter(Boolean))];
    let html = "<option value=\"\">All Sources</option>";
    for (let i = 0; i < sources.length; i++) {
      html += "<option value='" + escapeHtml(sources[i]) + "'>" + escapeHtml(sources[i]) + "</option>";
    }
    sourceEl.innerHTML = html;
    sourceEl.value = selected.source || "";
  }

  if (statusEl) {
    const statusCol = columns.find(c => c.key === "status");
    const configured = normalizeColumnOptions(statusCol?.options || []);
    const statuses = configured.length
      ? configured.map(o => o.value)
      : DASHBOARD_STATUS_OPTIONS.slice();
    let html = "<option value=\"\">All Statuses</option>";
    for (let i = 0; i < statuses.length; i++) {
      const s = statuses[i];
      html += "<option value='" + escapeHtml(s) + "'>" + escapeHtml(s) + "</option>";
    }
    statusEl.innerHTML = html;
    statusEl.value = selected.status || "";
  }

  if (assigneeEl) {
    const canChooseAll = allowAllAssignees && canSeeAllLeads(currentUser);
    if (canChooseAll) {
      const users = getUsers();
      assigneeEl.disabled = false;
      let html = "<option value=\"\">All Assignees</option>";
      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        html += "<option value='" + escapeHtml(u.name) + "'>" + escapeHtml(u.name) + "</option>";
      }
      assigneeEl.innerHTML = html;
      assigneeEl.value = selected.assignedToName || "";
    } else {
      assigneeEl.disabled = true;
      assigneeEl.innerHTML = "<option value='" + escapeHtml(currentUser.name) + "'>" + escapeHtml(currentUser.name) + "</option>";
      assigneeEl.value = currentUser.name;
    }
  }

  if (dateFromEl) {
    dateFromEl.value = selected.dateFrom || "";
  }

  if (dateToEl) {
    dateToEl.value = selected.dateTo || "";
  }
}

// ─── BUILDER: TABS ──────────────────────────────────────────
function renderBuilder() {
  renderTabs();
  renderCustomWidgetInPalette();
  renderCanvas();
}

function renderTabs() {
  const visible = visibleDashboards();
  let html = "";
  for (let i = 0; i < visible.length; i++) {
    const d = visible[i];
    html += "<div class='tab " + (d.id === activeDashId ? "active" : "") + "' onclick=\"switchDash('" + escapeHtml(d.id) + "')\">";
    html += escapeHtml(d.name);
    if (visible.length > 1) {
      html += "<span class='tab-del' onclick=\"delDash('" + escapeHtml(d.id) + "',event)\">✕</span>";
    }
    html += "</div>";
  }
  document.getElementById("dashTabs").innerHTML = html;
}

function getDashboardFieldOptions() {
  const builtIns = [
    { key: "source", label: "Lead Source" },
    { key: "status", label: "Lead Status" },
    { key: "assignedToName", label: "Assigned To" },
    { key: "city", label: "City" },
    { key: "date_month", label: "Date — By Month" },
    { key: "date_day", label: "Date — By Day" },
    { key: "score", label: "Score" },
    { key: "totalCalls", label: "Total Calls" },
    { key: "followUpDate", label: "Follow-up Date" },
    { key: "dateAdded", label: "Date Added" }
  ];

  const custom = columns
    .filter(col => !DEFAULT_COLS.some(def => def.key === col.key) || fieldDefinitions.some(def => def.keyName === col.key))
    .map(col => ({ key: col.key, label: col.label }));

  const dedup = new Map();
  [...builtIns, ...custom].forEach(item => dedup.set(item.key, item));
  return [...dedup.values()];
}

function populateFieldSelectors(selectedKey = "source") {
  const fieldSelect = document.getElementById("cfgFieldKey");
  if (fieldSelect) {
    fieldSelect.innerHTML = getDashboardFieldOptions().map(f => `<option value="${f.key}">${f.label}</option>`).join("");
    fieldSelect.value = selectedKey || "source";
  }
}

function switchDash(id) {
  closeAllPopups();
  activeDashId=id;
  saveActive();
  renderBuilder();
}

function openNewDashModal() {
  closeAllPopups();

  document.getElementById("newDashName").value = "";
  populateDashboardFilters("newDashFilterSource", "newDashFilterStatus", "newDashFilterAssignee", "newDashFilterDateFrom", "newDashFilterDateTo", {
    source: "",
    status: "",
    assignedToName: "",
    dateFrom: "",
    dateTo: ""
  }, true);

  // Widgets selection intentionally removed (no default widget options)

  // Columns option removed — no UI to select columns

  modalState.newDashModal = true; renderModals();
}
function closeNewDashModal() { modalState.newDashModal = false; renderModals(); }

async function createDashboard() {
  const name = document.getElementById("newDashName").value.trim();
  if (!name) { alert("Enter a name."); return; }
  const vis = "me";
  const filters = {
    source: document.getElementById("newDashFilterSource")?.value || "",
    status: document.getElementById("newDashFilterStatus")?.value || "",
    assignedToName: document.getElementById("newDashFilterAssignee")?.value || "",
    dateFrom: document.getElementById("newDashFilterDateFrom")?.value || "",
    dateTo: document.getElementById("newDashFilterDateTo")?.value || ""
  };

  if (!canSeeAllLeads(currentUser)) {
    filters.assignedToName = currentUser.name || "";
  }

  // collect selected widgets
  const selectedWidgetEls = Array.from(document.querySelectorAll('#newDashWidgets input[type="checkbox"]:checked'));
  const widgets = selectedWidgetEls.map((el,i)=>{
    const type = el.value;
    const w = { id: 'w_'+Date.now()+'_'+i, type, title: null, size: 'half' };
    if (type === 'table') {
      // Columns selection removed — use all columns by default
      w.columns = columns.map(c=>c.key);
      w.title = 'Lead Counts';
    } else {
      w.title = type==='kpi' ? 'KPI' : (type==='tasks' ? 'Tasks' : (type==='chart'?'Chart': (type==='funnel'?'Funnel':type)));
    }
    return w;
  });

  const d = {
    id:"d_"+Date.now(),
    name,
    vis,
    ownerId: currentUser.id,
    ownerName: currentUser.name,
    filters,
    widgets
  };
  dashboards.push(d);
  activeDashId = d.id;
  await persistDashboardToBackend(d);
  saveDashes(); saveActive();
  document.getElementById("newDashModal").style.display = "none";
  renderBuilder();

}

function delDash(id, e) {
  e.stopPropagation();
  const visible = visibleDashboards();
  if (visible.length <= 1) { alert("Need at least one dashboard."); return; }
  if (!confirm("Delete this dashboard?")) return;
  dashboards = dashboards.filter(d => d.id !== id);
  if (activeDashId === id) activeDashId = visibleDashboards()[0].id;
  if (isPersistedDashboardId(id)) {
    fetch(BACKEND_API_BASE + "/dashboards/" + id + "?customerId=" + getCustomerId(), { method: "DELETE" })
      .catch(err => console.warn("Dashboard delete sync skipped", err));
  }
  saveDashes(); saveActive(); renderBuilder();
}

// ─── BUILDER: CANVAS ────────────────────────────────────────
function renderCanvas() {
  const dash  = getDash();
  const grid  = document.getElementById("widgetsGrid");
  const empty = document.getElementById("canvasEmpty");
  const summary = document.getElementById("dashboardSummary");

  Object.values(chartInst).forEach(c => { try { c.destroy(); } catch(e){} });
  chartInst = {};

  renderDashboardSummary(summary, dash, leadsForDash(dash));

  if (!dash?.widgets.length) {
    grid.innerHTML = "";
    empty.style.display = "flex";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = dash.widgets.map(w => widgetShell(w)).join("");
  dash.widgets.forEach(w => fillWidget(w));
  enableReorder();
}

function renderDashboardSummary(container, dash, ml) {
  if (!container) return;

  const total      = ml.length;
  const newLeads   = ml.filter(l => (l.status || "").toLowerCase() === "new").length;
  const converted  = ml.filter(l => (l.status || "").toLowerCase() === "won").length;
  const followUps  = ml.filter(l => l.followUpDate).length;
  const unassigned = ml.filter(l => !l.assignedToName).length;

  const newPct  = total > 0 ? Math.round((newLeads  / total) * 100) : 0;
  const convPct = total > 0 ? Math.round((converted / total) * 100) : 0;

  const now = new Date(); now.setHours(0,0,0,0);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = ml.filter(l => {
    const d = new Date(l.date || l.dateAdded || "");
    return !isNaN(d) && d >= weekAgo;
  }).length;

  const today = new Date(); today.setHours(0,0,0,0);
  const dueToday = ml.filter(l => {
    if (!l.followUpDate) return false;
    const d = new Date(l.followUpDate); d.setHours(0,0,0,0);
    return d <= today && l.status !== "Won" && l.status !== "Lost";
  }).length;

  const mkSub = (txt, color) => "<div class='sc-sub' style='color:" + color + "'>" + txt + "</div>";

  const subTotal    = thisWeek > 0 ? mkSub("↑ +" + thisWeek + " this week",  "#6366f1") : mkSub("All time", "#94a3b8");
  const subNew      = newPct   > 0 ? mkSub("↑ " + newPct  + "% of total",  "#10b981") : mkSub("No new leads", "#94a3b8");
  const subConv     = convPct  > 0 ? mkSub("↑ " + convPct + "% win rate",  "#7c3aed") : mkSub("— no change",  "#94a3b8");
  const subFollowup = dueToday > 0 ? mkSub("⊙ " + dueToday + " due today", "#f59e0b") : mkSub("All clear",    "#10b981");
  const subUnassign = unassigned === 0 ? mkSub("— all assigned", "#10b981") : mkSub("Needs attention", "#ef4444");

  let html = "<div class='summary-grid'>";
  html += "<article class='summary-card sc-blue'  ><div class='sc-label'>TOTAL LEADS</div><div class='sc-value'>" + total      + "</div>" + subTotal    + "</article>";
  html += "<article class='summary-card sc-green' ><div class='sc-label'>NEW</div><div class='sc-value'>"        + newLeads   + "</div>" + subNew      + "</article>";
  html += "<article class='summary-card sc-purple'><div class='sc-label'>CONVERTED</div><div class='sc-value'>"  + converted  + "</div>" + subConv     + "</article>";
  html += "<article class='summary-card sc-orange'><div class='sc-label'>FOLLOW-UPS</div><div class='sc-value'>" + followUps  + "</div>" + subFollowup + "</article>";
  html += "<article class='summary-card sc-red'   ><div class='sc-label'>UNASSIGNED</div><div class='sc-value'>" + unassigned + "</div>" + subUnassign + "</article>";
  html += "</div>";

  container.innerHTML = html;
  buildActivityFeed();
}

function widgetShell(w) {
  const sizeClass = w.size === "full" ? "w-full" : "w-half";
  const manageBtn = w.type === "table" ? "<button class='wbtn' title='Manage Count Columns' onclick=\"openWidgetCols('" + escapeHtml(w.id) + "')\">⚙</button>" : "";
  
  let html = "<div class='wcard " + sizeClass + "' data-wid='" + escapeHtml(w.id) + "' draggable='true'>";
  html += "<div class='wcard-hd'>";
  html += "<span class='wdrag' title='Drag to reorder'>⠿</span>";
  html += "<span class='wcard-title'>" + escapeHtml(w.title || "Widget") + "</span>";
  html += "<div class='wcard-btns'>";
  html += manageBtn;
  html += "<button class='wbtn' onclick=\"editWidget('" + escapeHtml(w.id) + "')\">✏</button>";
  html += "<button class='wbtn del' onclick=\"delWidget('" + escapeHtml(w.id) + "')\">✕</button>";
  html += "</div>";
  html += "</div>";
  html += "<div class='wcard-body' id='wb_" + escapeHtml(w.id) + "'></div>";
  html += "</div>";
  
  return html;
}

function fillWidget(w) {
  const body = document.getElementById("wb_"+w.id);
  if (!body) return;
  const ml = leadsForDash(getDash(), w);
  
  // Check if it's a custom widget definition
  const allDefs = [...getDefaultWidgetDefinitions(), ...widgetDefinitions];
  if (allDefs.some(d => d.id === w.type)) {
    renderDynamicWidget(w, body, ml);
    return;
  }
  
  switch (w.type) {
    case "chart":
    case "comparator": drawChart(w, body, ml);   break;
    case "kpi":        drawKPI(w, body, ml);     break;
    case "funnel":     drawFunnel(w, body, ml);  break;
    case "table":      drawCountWidget(w, body, ml);   break;
    case "analytics":  drawAnalyticsWidget(w, body, ml); break;
    case "target":     drawTarget(w, body, ml);  break;
    case "tasks":      drawTasks(w, body);        break;
    case "followups":  drawFollowups(w, body, ml); break;
    default: body.innerHTML = `<div class="w-empty">Click ✏ to configure</div>`;
  }
}

// ─── WIDGET RENDERERS ────────────────────────────────────────
function drawAnalyticsWidget(w, body, ml) {
  const mode = w.analyticsMode || "chart";
  const fieldLabel = escapeHtml((columns.find(c => c.key === w.fieldKey)?.label) || w.fieldKey || "Field");

  if (!w.fieldKey) {
    body.innerHTML = `<div class="w-empty">Choose a field to build this report</div>`;
    return;
  }

  if (mode === "kpi") {
    drawKPI({ ...w, title: w.title || `${fieldLabel} KPI` }, body, ml);
    return;
  }

  if (mode === "table") {
    drawCountWidget({ ...w, title: w.title || `${fieldLabel} Breakdown` }, body, ml);
    return;
  }

  drawChart({ ...w, title: w.title || `${fieldLabel} Analytics` }, body, ml);
}

function drawChart(w, body, ml) {
  body.innerHTML = `<div class="chart-box"><canvas id="cv_${w.id}"></canvas></div>`;
  const ctx = document.getElementById("cv_"+w.id)?.getContext("2d");
  if (!ctx) return;
  const type = w.chartType==="column" ? "bar" : (w.chartType||"bar");
  const isPie = ["pie","doughnut","polarArea"].includes(type);

  if (chartInst[w.id]) { try { chartInst[w.id].destroy(); } catch(e){} }
  const render = (labels, data) => {
    const barColors = (data.length ? data : [0]).map((_,i) => PALETTE[i % PALETTE.length]);
    const bgColors  = isPie ? PALETTE : (type === "line" ? PALETTE[0]+"33" : barColors.map(c=>c+"dd"));
    const bdColors  = isPie ? "#fff"  : barColors;
    chartInst[w.id] = new Chart(ctx, {
      type,
      data: {
        labels: labels.length ? labels : ["No data"],
        datasets: [{
          label: w.title,
          data:  data.length  ? data  : [0],
          backgroundColor: bgColors,
          borderColor:     bdColors,
          borderWidth:     isPie ? 2 : 0,
          borderRadius:    type==="bar" ? 8 : 0,
          borderSkipped:   false,
          tension:         type==="line" ? 0.4 : 0,
          fill:            type==="line",
          pointRadius:     type==="line" ? 5 : 0,
          pointBackgroundColor: PALETTE[0],
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:isPie, position:"bottom", labels:{ font:{size:11}, padding:10, boxWidth:10 } }
        },
        scales: isPie ? {} : {
          y:{ beginAtZero:true, ticks:{stepSize:1,font:{size:10}}, grid:{color:"rgba(0,0,0,0.04)"} },
          x:{ ticks:{font:{size:10}}, grid:{display:false} }
        }
      }
    });
  };

  const fieldKey = w.fieldKey || "source";
  const useAnalytics = !["source","status","assignedToName","city","date_month","date_day"].includes(fieldKey);
  if (useAnalytics) {
    fetchFieldAnalytics(fieldKey).then(counts => {
      const { labels, data } = fieldCountsToChartData(counts);
      render(labels, data);
    });
  } else {
    const { labels, data } = groupData(ml, fieldKey);
    render(labels, data);
  }
}

function drawKPI(w, body, ml) {
  // Enhanced KPI card with multiple metric types, periods, and subtitles
  const color = w.kpiColor || "#6a11cb";
  const metric = (w.kpiMetric || "total").toLowerCase();
  const period = (w.kpiPeriod || "monthly").toLowerCase(); // daily | weekly | monthly

  const dash = getDash();
  const baseFilters = { ...(dash?.filters || {}), ...(w?.filters || {}) };
  const visibleLeads = canSeeAllLeads(currentUser) ? leads : myLeads();
  const now = new Date();

  // helper: get bucket start/end for period index (i=0 most recent)
  function bucketRangeForIndex(idx) {
    if (period === 'daily') {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - idx);
      const start = new Date(d); const end = new Date(d); end.setHours(23,59,59,999);
      return { start, end };
    }
    if (period === 'weekly') {
      const start = new Date(); start.setHours(0,0,0,0);
      start.setDate(start.getDate() - (start.getDay() || 7) - (7 * idx) + 1);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      return { start, end };
    }
    // monthly
    const start = new Date(now.getFullYear(), now.getMonth() - idx, 1, 0,0,0,0);
    const end = new Date(start.getFullYear(), start.getMonth()+1, 0, 23,59,59,999);
    return { start, end };
  }

  function getLeadValueForMetric(l, metricKey) {
    if (!l) return 0;
    if (metricKey === 'total') return 1;
    if (metricKey === 'won' || metricKey === 'converted') return ((l.status||'').toLowerCase() === 'won') ? 1 : 0;
    if (metricKey === 'new') return ((l.status||'').toLowerCase() === 'new') ? 1 : 0;
    if (metricKey === 'contacted') return ((l.status||'').toLowerCase() === 'contacted') ? 1 : 0;
    if (metricKey === 'lost') return ((l.status||'').toLowerCase() === 'lost') ? 1 : 0;
    if (metricKey === 'calls') return Number(l.totalCalls) || 0;
    if (metricKey === 'followups') return l.followUpDate ? 1 : 0;
    if (metricKey === 'assigned') return (l.assignedToId || l.assignedToName) ? 1 : 0;
    if (metricKey === 'revenue' || metricKey === 'revenue_sum') return Number(l.actualDealValue || l.potentialDealValue || 0) || 0;
    // fallback: property or custom field
    const v = getDashboardFieldValue(l, metricKey);
    const n = Number(v);
    return isNaN(n) ? (v ? 1 : 0) : n;
  }

  // apply base filters except date range
  const baseNoDate = { ...baseFilters, dateFrom: '', dateTo: '' };
  const filteredBase = filterLeadList(visibleLeads, baseNoDate);

  // compute current and previous period totals
  const curRange = bucketRangeForIndex(0);
  const prevRange = bucketRangeForIndex(1);

  function aggregateRange(range) {
    let sum = 0;
    for (const l of filteredBase) {
      const d = parseLeadDateValue(l.followUpDate || l.date || l.dateAdded || l.createdOn);
      if (!d) continue;
      if (range.start && d < range.start) continue;
      if (range.end && d > range.end) continue;
      sum += getLeadValueForMetric(l, metric);
    }
    return sum;
  }

  const curVal = aggregateRange(curRange);
  const prevVal = aggregateRange(prevRange);
  const pct = prevVal === 0 ? (curVal > 0 ? 100 : 0) : ((curVal - prevVal) / Math.abs(prevVal)) * 100;

  // build series for sparkline (last N buckets)
  const buckets = period === 'daily' ? 14 : (period === 'weekly' ? 12 : 12);
  const series = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const r = bucketRangeForIndex(i === 0 ? 0 : i);
    series.push(aggregateRange(r));
  }

  // icon mapping
  const icons = {
    total: '📥', converted: '🏆', won: '🏆', revenue: '💰', followups: '📅', lost: '⚠️', assigned: '👤', calls: '📞'
  };
  const icon = w.kpiIcon || icons[metric] || '🔢';

  // subtitle lines
  const periodLabel = period === 'daily' ? 'day' : (period === 'weekly' ? 'week' : 'month');
  const comparedText = `Compared to last ${periodLabel}`;
  const updatedText = `Updated ${formatRelativeDate(new Date())}`;
  const basedOn = 'Based on filtered leads';

  // render
  const displayVal = (metric === 'revenue' || metric === 'revenue_sum') ? formatCurrency(curVal) : curVal.toLocaleString();

  body.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-left">
        <div class="kpi-icon" style="background:${color};">${icon}</div>
        <div class="kpi-body">
          <div class="kpi-title">${escapeHtml(w.title || capitalizeMetric(metric))}</div>
          <div class="kpi-value">${displayVal}</div>
          <div class="kpi-meta">
            <div class="kpi-delta ${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(pct))}%</div>
            <div class="kpi-sub muted">${escapeHtml(comparedText)}</div>
          </div>
          <div class="kpi-subtitle">${escapeHtml(updatedText)} · ${escapeHtml(basedOn)}</div>
        </div>
      </div>
      <canvas class="kpi-spark" width="160" height="48"></canvas>
    </div>`;

  const cvs = body.querySelector('canvas.kpi-spark');
  if (cvs) drawSparkline(cvs, series, color);
}

function capitalizeMetric(k) {
  if (!k) return '';
  return k.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

function formatCurrency(v) {
  try { return (Number(v) || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); } catch(e) { return String(v); }
}

function formatRelativeDate(d) {
  if (!d) return '';
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return `${diff} days ago`;
}

function drawSparkline(canvas, series, color) {
  try {
    const ctx = canvas.getContext('2d');
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const max = Math.max(...series, 1);
    const min = Math.min(...series);
    const len = series.length;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * (w - 6) + 3;
      const y = h - 6 - ((series[i] - min) / Math.max(1, (max - min))) * (h - 12);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // small fill
    ctx.lineTo(w - 3, h - 6);
    ctx.lineTo(3, h - 6);
    ctx.closePath();
    ctx.fillStyle = color + '22';
    ctx.fill();
  } catch (e) { /* ignore */ }
}

function getLeadValuesForField(lead, fieldKey) {
  if (!lead || !fieldKey) return [];

  const rawDirect = lead[fieldKey];
  const rawCustom = lead.customFields?.[fieldKey];
  const raw = rawDirect !== undefined && rawDirect !== null && rawDirect !== "" ? rawDirect : rawCustom;

  if (raw === undefined || raw === null || raw === "") return [];

  if (Array.isArray(raw)) {
    return raw.map(v => String(v).trim()).filter(Boolean);
  }

  const col = columns.find(c => c.key === fieldKey);
  const txt = String(raw).trim();
  if (!txt) return [];

  if (col?.type === "multiselect" || txt.includes(",")) {
    return txt.split(",").map(v => v.trim()).filter(Boolean);
  }

  return [txt];
}

function resolveFunnelStages(fieldKey, ml) {
  const col = columns.find(c => c.key === fieldKey);
  const stageMap = new Map();

  // Priority 1: column options (supports custom business stages per client)
  const optionEntries = normalizeColumnOptions(col?.options || []);
  for (let i = 0; i < optionEntries.length; i++) {
    const o = optionEntries[i];
    if (!o?.value) continue;
    stageMap.set(String(o.value), {
      value: String(o.value),
      label: o.label || o.value,
      order: i,
      color: PALETTE[i % PALETTE.length]
    });
  }

  // Priority 2: field-definition options (if backend supplied)
  if (!stageMap.size) {
    const fd = (fieldDefinitions || []).find(def => def.keyName === fieldKey);
    let parsed = [];
    if (fd?.optionsJson) {
      try {
        parsed = normalizeColumnOptions(JSON.parse(fd.optionsJson));
      } catch (e) {
        parsed = normalizeColumnOptions(fd.optionsJson);
      }
    }
    for (let i = 0; i < parsed.length; i++) {
      const o = parsed[i];
      if (!o?.value) continue;
      stageMap.set(String(o.value), {
        value: String(o.value),
        label: o.label || o.value,
        order: i,
        color: PALETTE[i % PALETTE.length]
      });
    }
  }

  // Include data-driven values not present in options (fully dynamic fallback)
  const observed = new Map();
  for (let i = 0; i < ml.length; i++) {
    const vals = getLeadValuesForField(ml[i], fieldKey);
    for (let j = 0; j < vals.length; j++) {
      const v = vals[j];
      if (!v) continue;
      observed.set(v, (observed.get(v) || 0) + 1);
      if (!stageMap.has(v)) {
        stageMap.set(v, {
          value: v,
          label: v,
          order: 1000 + stageMap.size,
          color: PALETTE[stageMap.size % PALETTE.length]
        });
      }
    }
  }

  const stages = Array.from(stageMap.values()).sort((a, b) => a.order - b.order);
  const counts = new Map(stages.map(s => [s.value, 0]));

  for (let i = 0; i < ml.length; i++) {
    const vals = new Set(getLeadValuesForField(ml[i], fieldKey));
    vals.forEach(v => {
      if (counts.has(v)) counts.set(v, (counts.get(v) || 0) + 1);
    });
  }

  return stages.map(s => ({ ...s, count: counts.get(s.value) || 0 }));
}

function applyFunnelStageFilter(fieldKey, stageValue, widgetFilters = {}) {
  showPage("leads");

  const fSrc = document.getElementById("fSrc");
  const fStat = document.getElementById("fStat");
  const fAssign = document.getElementById("fAssign");

  if (fSrc && widgetFilters.source !== undefined) fSrc.value = widgetFilters.source || "";
  if (fStat && widgetFilters.status !== undefined) fStat.value = widgetFilters.status || "";
  if (fAssign && widgetFilters.assignedToName !== undefined) fAssign.value = widgetFilters.assignedToName || "";

  window.__leadDateDrilldown = {
    dateFrom: widgetFilters.dateFrom || "",
    dateTo: widgetFilters.dateTo || ""
  };
  window.__leadStageDrilldown = {
    fieldKey,
    stageValue
  };

  if (fieldKey === "source") {
    if (fSrc) fSrc.value = stageValue;
  } else if (fieldKey === "status") {
    if (fStat) fStat.value = stageValue;
  } else if (fieldKey === "assignedToName") {
    if (fAssign) fAssign.value = stageValue;
  } else {
    populateDynamicFilters();
    const dyn = document.querySelectorAll("select[data-dynamic-filter]");
    for (let i = 0; i < dyn.length; i++) {
      const el = dyn[i];
      if (el.getAttribute("data-dynamic-filter") === fieldKey) {
        el.value = stageValue;
        break;
      }
    }
  }

  renderLeads();
}

function drawFunnel(w, body, ml) {
  const fieldKey = w.fieldKey || "status";
  const stageData = resolveFunnelStages(fieldKey, ml);
  const total = ml.length || 1;

  if (!stageData.length) {
    body.innerHTML = `<div class="w-empty">No funnel stages available for this field</div>`;
    return;
  }

  const maxCount = Math.max(1, ...stageData.map(s => s.count));
  const widths = [];
  let prevWidth = 100;
  for (let i = 0; i < stageData.length; i++) {
    const ratio = stageData[i].count / maxCount;
    const baseWidth = Math.max(26, Math.round(40 + ratio * 60));
    const width = i === 0 ? 100 : Math.max(18, Math.min(baseWidth, prevWidth - 6));
    widths.push(width);
    prevWidth = width;
  }

  const layerHeight = 64;
  const svgWidth = 1000;
  const svgHeight = layerHeight * stageData.length;

  let polygons = "";
  for (let i = 0; i < stageData.length; i++) {
    const topW = i === 0 ? 100 : widths[i - 1];
    const botW = widths[i];
    const topPx = (topW / 100) * svgWidth;
    const botPx = (botW / 100) * svgWidth;
    const xTopLeft = (svgWidth - topPx) / 2;
    const xTopRight = xTopLeft + topPx;
    const xBotLeft = (svgWidth - botPx) / 2;
    const xBotRight = xBotLeft + botPx;
    const yTop = i * layerHeight;
    const yBot = yTop + layerHeight;

    const points = [
      `${xTopLeft},${yTop}`,
      `${xTopRight},${yTop}`,
      `${xBotRight},${yBot}`,
      `${xBotLeft},${yBot}`
    ].join(" ");

    const s = stageData[i];
    const pct = Math.round((s.count / total) * 100);
    const label = `${s.label} | ${s.count} leads | ${pct}%`;

    polygons += `
      <g class="funnel-layer" data-stage-index="${i}">
        <polygon points="${points}" fill="${s.color}" />
        <text class="funnel-text" x="${svgWidth/2}" y="${yTop + layerHeight/2}" dominant-baseline="middle" text-anchor="middle">${escapeHtml(label)}</text>
      </g>`;
  }

  const fieldLabel = (columns.find(c => c.key === fieldKey)?.label) || fieldKey;
  body.innerHTML = `<div class="funnel-container"><div class="funnel-meta">By ${escapeHtml(fieldLabel)} · ${total} leads</div><svg class="funnel-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">${polygons}</svg></div>`;

  const layers = body.querySelectorAll(".funnel-layer");
  for (let i = 0; i < layers.length; i++) {
    const s = stageData[i];
    layers[i].addEventListener("click", () => applyFunnelStageFilter(fieldKey, s.value, w.filters || {}));
  }
}

function drawCountWidget(w, body, ml) {
  const colKeys = (w && w.columns && w.columns.length) ? w.columns : [w.fieldKey || "source"];

  if (!colKeys.length) {
    body.innerHTML = `<div class="w-empty">No columns selected</div>`;
    return;
  }

  if (!ml.length) {
    body.innerHTML = `<div class="w-empty">No leads yet</div>`;
    return;
  }

  if (w.fieldKey && (!w.columns || !w.columns.length)) {
    const entries = countByField(ml, w.fieldKey);
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    body.innerHTML = `
      <div class="count-board">
        <section class="count-card">
          <div class="count-card-hd">
            <div>
              <div class="count-card-title">${escapeHtml((columns.find(c=>c.key===w.fieldKey)?.label) || w.fieldKey)}</div>
              <div class="count-card-sub">${total} leads across ${entries.length} values</div>
            </div>
            <div class="count-card-total">${total}</div>
          </div>
          <div class="count-list">
            ${entries.length ? entries.map(([value, count]) => `
              <div class="count-row">
                <span class="count-value">${escapeHtml(value)}</span>
                <span class="count-num">${count}</span>
              </div>`).join('') : `<div class="w-empty">No data</div>`}
          </div>
        </section>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="count-board">
      ${colKeys.map(key => {
        const c = columns.find(x => x.key === key);
        const entries = countByField(ml, key);
        const total = entries.reduce((sum, entry) => sum + entry[1], 0);
        const label = escapeHtml(c ? c.label : key);
        return `
          <section class="count-card">
            <div class="count-card-hd">
              <div>
                <div class="count-card-title">${label}</div>
                <div class="count-card-sub">${total} leads across ${entries.length} values</div>
              </div>
              <div class="count-card-total">${total}</div>
            </div>
            <div class="count-list">
              ${entries.length ? entries.map(([value, count]) => `
                <div class="count-row">
                  <span class="count-value">${escapeHtml(value)}</span>
                  <span class="count-num">${count}</span>
                </div>`).join('') : `<div class="w-empty">No data</div>`}
            </div>
          </section>`;
      }).join('')}
    </div>`;
}

function drawTarget(w, body, ml) {
  const goal   = Number(w.targetVal)||100;
  const actual = (w.targetMetric==="won") ? ml.filter(l=>l.status==="Won").length : ml.length;
  const pct    = Math.min(100, Math.round((actual/goal)*100));
  const color  = pct>=100?"#22c55e":pct>=60?"#f59e0b":"#e74c3c";
  body.innerHTML = `
    <div class="target-box">
      <div class="tgt-nums">
        <span class="tgt-actual" style="color:${color};">${actual}</span>
        <span class="tgt-sep">/</span>
        <span class="tgt-goal">${goal}</span>
      </div>
      <div class="tgt-bar-bg"><div class="tgt-bar" style="width:${pct}%;background:${color};"></div></div>
      <div class="tgt-pct">${pct}% of target achieved</div>
    </div>`;
}

function drawTasks(w, body) {
  const renderList = () => {
    const listEl = document.getElementById("taskListInner");
    if (!listEl) return;
    listEl.innerHTML = tasks.map((t,i)=>`
      <div class="task-item ${t.done?"done":""}">
        <input type="checkbox" ${t.done?"checked":""} onchange="toggleTask(${i})">
        <span>${t.text}</span>
        <button class="task-del" onclick="delTask(${i})">✕</button>
      </div>`).join("") || `<div class="w-empty">No tasks yet</div>`;
  };

  body.innerHTML = `
    <div class="task-inp-row">
      <input id="taskInp" placeholder="Add a task..." onkeydown="if(event.key==='Enter')addTask()">
      <button class="btn btn-primary btn-sm" onclick="addTask()">+</button>
    </div>
    <div id="taskListInner"></div>`;
  renderList();
}

function addTask() {
  const inp = document.getElementById("taskInp");
  if (!inp||!inp.value.trim()) return;
  tasks.push({ text:inp.value.trim(), done:false });
  inp.value = "";
  saveTasks();
  const dash = getDash();
  const tw = dash.widgets.find(w=>w.type==="tasks");
  if (tw) { const body=document.getElementById("wb_"+tw.id); if(body) drawTasks(tw,body); }
}

function toggleTask(i) { tasks[i].done=!tasks[i].done; saveTasks(); refreshTaskWidgets(); }
function delTask(i)    { tasks.splice(i,1); saveTasks(); refreshTaskWidgets(); }
function refreshTaskWidgets() {
  const dash = getDash();
  dash.widgets.filter(w=>w.type==="tasks").forEach(w=>{
    const body=document.getElementById("wb_"+w.id); if(body) drawTasks(w,body);
  });
}

// ─── GROUP DATA ──────────────────────────────────────────────
function groupData(arr, field) {
  const map = {};
  arr.forEach(l => {
    let k = field==="date_month"
      ? (l.date ? new Date(l.date).toLocaleDateString("en-IN",{month:"short",year:"2-digit"}) : "?")
      : field==="date_day" ? (l.date||"?") : (getLeadFieldValue(l, field)||"Unknown");
    map[k] = (map[k]||0)+1;
  });
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);
  return { labels:sorted.map(e=>e[0]), data:sorted.map(e=>e[1]) };
}

// ─── PALETTE DRAG → CANVAS DROP ─────────────────────────────
function dragFromPalette(e) {
  // Robustly find the palette item element and its data-type
  let el = e.currentTarget || e.target;
  if (el && typeof el.closest === 'function') {
    const found = el.closest('.pal-item');
    if (found) el = found;
  }
  const type = (el && el.dataset && el.dataset.type) || (el && el.getAttribute && el.getAttribute('data-type')) || "";
  if (type) {
    try { e.dataTransfer.setData('palType', type); } catch (err) { e.dataTransfer.setData('text/plain', type); }
    // debug log: palette drag started
    try { console.debug('dragFromPalette set palType=', type); } catch (e) {}
  }
}

function dropOnCanvas(e) {
  e.preventDefault();
  let type = "";
  try { type = e.dataTransfer.getData('palType') || e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text'); } catch (err) {
    try { type = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text'); } catch (e2) { type = ""; }
  }
  if (!type) return;
  try { console.debug('dropOnCanvas received type=', type); } catch (e) {}

  const allDefs = [...getDefaultWidgetDefinitions(), ...widgetDefinitions];
  let def = allDefs.find(d => d.id === type);
  // Try mapping short palette keys (e.g. 'chart') to builtin ids ('builtin_chart')
  if (!def) {
    const alt = 'builtin_' + type;
    def = allDefs.find(d => d.id === alt);
    if (def) type = alt;
  }

  if (def) {
    cfgEditId = null;
    if (def.builtin) {
      // use short key for builtin widgets (e.g. 'chart') so config modal and saveWidget behave as expected
      const short = def.id && def.id.indexOf('builtin_') === 0 ? def.id.replace('builtin_', '') : def.id;
      cfgType = short;
      openWidgetConfigModal(short, null);
    } else {
      // custom widget - use its id
      cfgType = def.id;
      openWidgetConfigModal(def.id, null);
    }
  }
}

// ─── WIDGET CONFIG: CUSTOM WIDGETS ──────────────────────────
function openWidgetConfigModal(type, existing) {
  // Determine if this is a custom widget or built-in
  const allDefs = [...getDefaultWidgetDefinitions(), ...widgetDefinitions];
  const def = allDefs.find(d => d.id === type);
  
  if (def && !def.builtin) {
    // Custom widget - show form for its fields
    closeAllPopups();
    document.getElementById("customWidgetConfigTitle").textContent = existing ? "Edit " + def.name : "Add " + def.name;
    document.getElementById("customWidgetName").value = (existing?.title || def.name);
    
    const fieldsContainer = document.getElementById("customWidgetFieldsContainer");
    if (fieldsContainer) {
      let html = "";
      for (let i = 0; i < (def.fields || []).length; i++) {
        const f = def.fields[i];
        const req = f.required ? " *" : "";
        html += "<div class='field'><label>" + f.label + req + "</label><div id='field_input_" + f.id + "'></div></div>";
      }
      fieldsContainer.innerHTML = html;
      
      for (let i = 0; i < (def.fields || []).length; i++) {
        const f = def.fields[i];
        const container = document.getElementById("field_input_" + f.id);
        if (container) {
          container.innerHTML = renderFieldInput(f, existing?.fieldValues?.[f.id]);
        }
      }
    }
    
    const szEl = document.querySelector("input[name='customWidgetSz'][value='" + (existing?.size || "half") + "']");
    if(szEl) szEl.checked = true;
    modalState.customWidgetConfigModal = true; renderModals();
    return;
  }
  
  // Built-in widget - use existing config modal
  openConfigModal(type, existing);
}

function closeCustomWidgetConfigModal() {
  modalState.customWidgetConfigModal = false; renderModals();
}

function saveCustomWidget() {
  const dash = getDash();
  if (!dash) return;

  const type = cfgType;
  const def = widgetDefinitions.find(w => w.id === type);
  if (!def) return;

  const title = document.getElementById("customWidgetName").value.trim() || def.name;
  const size = document.querySelector("input[name='customWidgetSz']:checked")?.value || "half";
  
  const fieldValues = {};
  for (let i = 0; i < (def.fields || []).length; i++) {
    const f = def.fields[i];
    const inp = document.querySelector("#field_input_" + f.id + " input, #field_input_" + f.id + " select, #field_input_" + f.id + " textarea");
    if (inp) fieldValues[f.id] = inp.value;
  }

  const w = {
    id:           cfgEditId || "w_"+Date.now(),
    type,
    title,
    size,
    fieldValues
  };

  if (cfgEditId) {
    const idx = dash.widgets.findIndex(x => x.id === cfgEditId);
    if (idx !== -1) dash.widgets[idx] = w;
  } else {
    dash.widgets.push(w);
  }

  saveDashes();
  closeCustomWidgetConfigModal();
  renderCanvas();
  persistCurrentDashboard();
}

// ─── CONFIG MODAL ────────────────────────────────────────────
function openConfigModal(type, existing) {
  closeAllPopups();

  const isChart  = type==="chart"||type==="comparator";
  const isKpi    = type==="kpi";
  const isTarget = type==="target";
  const isTable  = type==="table";
  const isFunnel = type==="funnel";
  const isAnalytics = type==="analytics";
  const showChartOptions = isChart || isAnalytics;

  document.getElementById("cfgRowChart").style.display  = showChartOptions ? "" : "none";
  // Group By UI removed — do not show cfgRowGroup
  document.getElementById("cfgRowKpi").style.display    = isKpi    ? "" : "none";
  document.getElementById("cfgRowTarget").style.display = isTarget ? "" : "none";
  document.getElementById("cfgRowField").style.display  = (isAnalytics || isChart || isKpi || isTable || isFunnel) ? "" : "none";
  const presetRow = document.getElementById("cfgRowPreset");
  if (presetRow) presetRow.style.display = isAnalytics ? "" : "none";
  document.getElementById("cfgRowAnalyticsMode").style.display = isAnalytics ? "" : "none";
  const tableFiltersRow = document.getElementById("cfgRowTableFilters");
  if (tableFiltersRow) tableFiltersRow.style.display = (isTable || isFunnel) ? "" : "none";
  const cfgRowCols = document.getElementById("cfgRowCols");
  if (cfgRowCols) cfgRowCols.style.display = isTable ? "" : "none";

  const labels={chart:"Add Chart",kpi:"Add KPI",funnel:"Add Funnel",
                table:"Add Lead Counts",target:"Add Target Meter",comparator:"Add Comparator",tasks:"Add Tasks",analytics:"Add Analytics Report"};
  document.getElementById("cfgModalTitle").textContent = existing?"Edit Widget":(labels[type]||"Add Widget");

  document.querySelectorAll(".ct").forEach(b=>b.classList.remove("active"));
  document.querySelector('.ct[data-v="bar"]')?.classList.add("active");
  populateFieldSelectors(existing?.fieldKey || "source");
  const presetSelect = document.getElementById("cfgAnalyticsPreset");
  if (presetSelect) presetSelect.value = existing?.analyticsPreset || getAnalyticsPresetKey(existing?.fieldKey || "source");

  if (existing) {
    document.getElementById("cfgName").value = existing.title||"";
    if (existing.chartType) {
      const b=document.querySelector(`.ct[data-v="${existing.chartType}"]`);
      if(b){document.querySelectorAll(".ct").forEach(x=>x.classList.remove("active")); b.classList.add("active");}
    }
    // Group By option removed; existing.groupBy is ignored
    if (existing.fieldKey)     document.getElementById("cfgFieldKey").value    = existing.fieldKey;
    if (existing.analyticsMode) document.getElementById("cfgAnalyticsMode").value = existing.analyticsMode;
    if (existing.analyticsPreset && presetSelect) presetSelect.value = existing.analyticsPreset;
    if (existing.kpiMetric)    document.getElementById("cfgKpiMetric").value   = existing.kpiMetric;
    if (existing.targetVal)    document.getElementById("cfgTargetVal").value   = existing.targetVal;
    if (existing.targetMetric) document.getElementById("cfgTargetMetric").value= existing.targetMetric;
    const szEl = document.querySelector(`input[name="cfgSz"][value="${existing.size||"half"}"]`);
    if(szEl) szEl.checked = true;
    if (existing.kpiColor) {
      document.querySelectorAll(".kc").forEach(el=>el.classList.toggle("active",el.dataset.c===existing.kpiColor));
      const kpiColorInput = document.getElementById("cfgKpiColor");
      if (kpiColorInput) kpiColorInput.value = existing.kpiColor;
    }
    if (isTable || isFunnel) {
      populateDashboardFilters("cfgTableSource", "cfgTableStatus", "cfgTableAssignee", "cfgTableDateFrom", "cfgTableDateTo", existing.filters || {}, true);
    }
    // pre-render columns for table edit
    if (isTable) renderCfgCols(existing.columns || getDefaultCountColumns());
  } else {
    document.getElementById("cfgName").value = "";
    document.querySelector('input[name="cfgSz"][value="half"]').checked = true;
    document.querySelectorAll(".kc").forEach((el,i)=>el.classList.toggle("active",i===0));
    const kpiColorInput = document.getElementById("cfgKpiColor");
    if (kpiColorInput) kpiColorInput.value = (typeof PALETTE !== 'undefined' && PALETTE.length) ? PALETTE[0] : "#6a11cb";
    populateFieldSelectors("source");
    if (presetSelect) presetSelect.value = "source";
    if (isTable || isFunnel) {
      populateDashboardFilters("cfgTableSource", "cfgTableStatus", "cfgTableAssignee", "cfgTableDateFrom", "cfgTableDateTo", {
        source: "",
        status: "",
        assignedToName: canSeeAllLeads(currentUser) ? "" : currentUser.name,
        dateFrom: "",
        dateTo: ""
      }, true);
    }
    if (isTable) {
      renderCfgCols(getDefaultCountColumns());
    }
  }

  modalState.configModal = true; renderModals();
}

function renderCfgCols(selected) {
  const sel = Array.isArray(selected) ? selected : [];
  const ccont = document.getElementById('cfgCols');
  if (!ccont) return;
  let html = "";
  for (let i = 0; i < columns.length; i++) {
    const c = columns[i];
    const checked = sel.includes(c.key) ? 'checked' : '';
    html += "<label style='display:inline-flex;align-items:center;gap:6px'><input type='checkbox' value='" + c.key + "' " + checked + "> " + c.label + "</label>";
  }
  ccont.innerHTML = html;
}

function closeConfigModal() {
  modalState.configModal = false; renderModals();
  cfgType=null; cfgEditId=null;
}

function pickCT(el) {
  document.querySelectorAll(".ct").forEach(b=>b.classList.remove("active"));
  el.classList.add("active");
}

function pickKC(el) {
  document.querySelectorAll(".kc").forEach(b=>b.classList.remove("active"));
  el.classList.add("active");
  // sync color input (if present)
  const colorInput = document.getElementById("cfgKpiColor");
  if (colorInput && el.dataset && el.dataset.c) {
    try { colorInput.value = el.dataset.c; } catch(e){}
  }
}

function onKpiColorInput(inp) {
  // clear active swatch when user picks a custom color
  document.querySelectorAll(".kc").forEach(b=>b.classList.remove("active"));
}

function saveWidget() {
  const dash = getDash();
  if (!dash) return;
  const type = cfgType || (cfgEditId ? dash.widgets.find(w=>w.id===cfgEditId)?.type : "chart");
  const defaultTitles = {chart:"New Chart",kpi:"KPI",funnel:"Lead Funnel",
                          table:"Recent Leads",target:"Target Meter",comparator:"Comparator",tasks:"Tasks",analytics:"Analytics Report"};
  const w = {
    id:           cfgEditId||"w_"+Date.now(),
    type,
    title:        document.getElementById("cfgName").value.trim()||defaultTitles[type],
    chartType:    document.querySelector(".ct.active")?.dataset.v||"bar",
    // Group By removed; use selected field as grouping key
    groupBy:      document.getElementById("cfgFieldKey")?.value||"source",
    kpiMetric:    document.getElementById("cfgKpiMetric")?.value||"total",
    kpiColor:     (document.getElementById("cfgKpiColor")?.value) || document.querySelector(".kc.active")?.dataset.c || "#6a11cb",
    targetVal:    document.getElementById("cfgTargetVal")?.value||"100",
    targetMetric: document.getElementById("cfgTargetMetric")?.value||"total",
    fieldKey:     document.getElementById("cfgFieldKey")?.value||"source",
    analyticsMode: document.getElementById("cfgAnalyticsMode")?.value||"count",
    analyticsPreset: document.getElementById("cfgAnalyticsPreset")?.value||"custom",
    size:         document.querySelector('input[name="cfgSz"]:checked')?.value||"half",
  };

  if (type === "table") {
    const sel = Array.from(document.querySelectorAll('#cfgCols input[type="checkbox"]:checked')).map(i=>i.value);
    w.columns = sel.length ? sel : columns.map(c=>c.key);
  }

  if (type === "table" || type === "funnel") {
    w.filters = {
      source: document.getElementById("cfgTableSource")?.value || "",
      status: document.getElementById("cfgTableStatus")?.value || "",
      assignedToName: document.getElementById("cfgTableAssignee")?.value || "",
      dateFrom: document.getElementById("cfgTableDateFrom")?.value || "",
      dateTo: document.getElementById("cfgTableDateTo")?.value || ""
    };
    if (!canSeeAllLeads(currentUser)) {
      w.filters.assignedToName = currentUser.name || "";
    }
  }

  if (cfgEditId) {
    const idx = dash.widgets.findIndex(x=>x.id===cfgEditId);
    if (idx!==-1) dash.widgets[idx]=w;
  } else {
    dash.widgets.push(w);
  }

  saveDashes(); closeConfigModal(); renderCanvas();
  persistCurrentDashboard();
}

function editWidget(wid) {
  const dash=getDash(); const w=dash?.widgets.find(x=>x.id===wid);
  if(!w) return;
  cfgEditId=wid; cfgType=w.type; openConfigModal(w.type,w);
}

function delWidget(wid) {
  if(!confirm("Remove this widget?")) return;
  const dash=getDash(); if(!dash) return;
  dash.widgets=dash.widgets.filter(w=>w.id!==wid);
  saveDashes(); renderCanvas();
  persistCurrentDashboard();
}

// ─── DRAG REORDER ────────────────────────────────────────────
function enableReorder() {
  const grid=document.getElementById("widgetsGrid");
  if(!grid) return;
  grid.querySelectorAll(".wcard").forEach(card=>{
    card.addEventListener("dragstart",e=>{
      dragWid=card.dataset.wid; card.classList.add("dragging");
      e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("reorder","1");
    });
    card.addEventListener("dragend",()=>{
      card.classList.remove("dragging");
      grid.querySelectorAll(".wcard").forEach(c=>c.classList.remove("dragover"));
      dragWid=null;
    });
    card.addEventListener("dragover",e=>{
      if(!e.dataTransfer.types.includes("reorder")) return;
      e.preventDefault();
      if(card.dataset.wid!==dragWid){
        grid.querySelectorAll(".wcard").forEach(c=>c.classList.remove("dragover"));
        card.classList.add("dragover");
      }
    });
    card.addEventListener("drop",e=>{
      e.preventDefault();
      if(!dragWid||dragWid===card.dataset.wid) return;
      const dash=getDash();
      const from=dash.widgets.findIndex(w=>w.id===dragWid);
      const to  =dash.widgets.findIndex(w=>w.id===card.dataset.wid);
      if(from!==-1&&to!==-1){
        const [m]=dash.widgets.splice(from,1); dash.widgets.splice(to,0,m);
        saveDashes(); renderCanvas();
        persistCurrentDashboard();
      }
    });
  });
}

// ─── LEADS ───────────────────────────────────────────────────
function renderLeads() {
  const token = ++leadsRenderToken;
  const search = (document.getElementById("searchInput")?.value||"").toLowerCase();
  const fSrc   = document.getElementById("fSrc")?.value   || "";
  const fStat  = document.getElementById("fStat")?.value  || "";
  const fAsgn  = document.getElementById("fAssign")?.value|| "";
  const drilldownDateFrom = window.__leadDateDrilldown?.dateFrom || "";
  const drilldownDateTo = window.__leadDateDrilldown?.dateTo || "";
  const drilldownStage = window.__leadStageDrilldown || null;

  // collect values from custom dynamic filter dropdowns
  const customFilters = {};
  document.querySelectorAll("select[data-dynamic-filter]").forEach(el => {
    if (el.value) customFilters[el.getAttribute("data-dynamic-filter")] = el.value;
  });

  let vis = myLeads().filter(l => {
    if (search && !["name","phone","email"].some(k => (l[k]||"").toLowerCase().includes(search))) return false;
    if (fSrc  && l.source          !== fSrc)  return false;
    if (fStat && l.status          !== fStat) return false;
    if (fAsgn && l.assignedToName  !== fAsgn) return false;

    if (drilldownDateFrom || drilldownDateTo) {
      const leadDate = parseLeadDateValue(l.followUpDate || l.date || l.dateAdded || l.createdOn);
      const from = normalizeDateBoundary(drilldownDateFrom, false);
      const to = normalizeDateBoundary(drilldownDateTo, true);
      if (!leadDate) return false;
      if (from && leadDate < from) return false;
      if (to && leadDate > to) return false;
    }

    if (drilldownStage?.fieldKey && drilldownStage?.stageValue !== undefined) {
      const vals = getLeadValuesForField(l, drilldownStage.fieldKey);
      const target = String(drilldownStage.stageValue).trim();
      if (!vals.some(v => String(v).trim() === target)) return false;
    }

    // apply custom column filters
    for (const [key, filterVal] of Object.entries(customFilters)) {
      const raw = l.customFields?.[key];
      const vals = Array.isArray(raw) ? raw : [String(raw || getLeadFieldValue(l, key))];
      if (!vals.some(v => String(v).trim() === filterVal)) return false;
    }
    return true;
  });

  const cntEl = document.getElementById("leadsCnt");
  if (cntEl) cntEl.textContent = `(${vis.length} leads)`;
  const bulkCountEl = document.getElementById("bulkLeadCount");
  const bulkBtn = document.getElementById("btnBulkDeleteLeads");
  const selectAllBtn = document.getElementById("btnSelectAllLeads");
  const selectedVisibleCount = vis.filter(l => selectedLeadIds.has(getLeadStableId(l))).length;
  if (bulkCountEl) bulkCountEl.textContent = selectedVisibleCount ? `${selectedVisibleCount} selected` : "";
  if (bulkBtn) bulkBtn.disabled = selectedVisibleCount === 0;
  if (selectAllBtn) selectAllBtn.textContent = selectedVisibleCount === vis.length && vis.length ? "☐ Clear All" : "☑ Select All";

  const head = document.getElementById("leadsHead");
  if (head) {
    let headerHtml = "<tr>";
    headerHtml += "<th class='lead-select-col'><input type='checkbox' aria-label='Select all leads' " + (vis.length && selectedVisibleCount === vis.length ? "checked" : "") + " onchange='toggleSelectAllLeads()'></th>";
    for (let i = 0; i < columns.length; i++) {
      const c = columns[i];
      headerHtml += "<th>" + c.label + "</th>";
    }
    headerHtml += "<th>Actions</th></tr>";
    head.innerHTML = headerHtml;
  }

  const body = document.getElementById("leadsBody");
  if (!body) return;

  if (!vis.length) {
    body.innerHTML=`<tr><td colspan="${columns.length+1}" class="tbl-empty">No leads found. Click + Add Lead.</td></tr>`;
    return;
  }

  const rows = vis.map(l => ({ lead: l, ri: leads.indexOf(l) }));
  body.innerHTML = "";

  const batchSize = 100;
  let cursor = 0;

  const renderBatch = () => {
    if (token !== leadsRenderToken) return;

    const end = Math.min(cursor + batchSize, rows.length);
    let chunkHtml = "";

    for (let i = cursor; i < end; i++) {
      const row = rows[i];
      const l = row.lead;
      const ri = row.ri;
      const leadId = getLeadStableId(l);
      const checked = selectedLeadIds.has(leadId) ? "checked" : "";
      chunkHtml += `<tr>
        <td class="lead-select-col"><input type="checkbox" aria-label="Select lead" ${checked} onchange="toggleLeadSelection('${escapeHtml(leadId)}', this.checked)"></td>
        ${columns.map(col=>{
          const v = getLeadFieldValue(l, col.key);
          if (col.key==="name")           return `<td><span class="lead-link" onclick="openDetail(${ri})">${v||"—"}</span></td>`;
          if (col.key==="status")         return `<td>${statusBadge(v)}</td>`;
          if (col.key==="score")          return `<td>${scoreBadge(leads[ri])}</td>`;
          if (col.key==="source")         return `<td><span class="src-tag">${v}</span></td>`;
          if (col.key==="assignedToName") return `<td><span class="asgn-tag">${v||"—"}</span></td>`;
          if (col.key==="followUpDate")   return `<td>${followupBadge(v)}</td>`;
          return `<td>${v||"—"}</td>`;
        }).join("")}
        <td class="act-col">
          <button class="btn btn-sm btn-edit" onclick="openLeadModal(${ri})">✏</button>
          ${canSeeAllLeads(currentUser)
            ? `<button class="btn btn-sm btn-del" onclick="deleteLead(${ri})">🗑</button>` : ""}
        </td>
      </tr>`;
    }

    body.insertAdjacentHTML("beforeend", chunkHtml);
    cursor = end;
    if (cursor < rows.length) {
      requestAnimationFrame(renderBatch);
    }
  };

  requestAnimationFrame(renderBatch);
}

function getLeadFieldValue(lead, key) {
  if (!lead) return "";
  const directValue = lead[key];
  if (directValue !== undefined && directValue !== null && directValue !== "") {
    return Array.isArray(directValue) ? directValue.join(", ") : directValue;
  }
  const customValue = lead.customFields?.[key];
  if (Array.isArray(customValue)) return customValue.join(", ");
  return customValue || "";
}

// ─── LEAD MODAL ──────────────────────────────────────────────
function openLeadModal(idx) {
  closeAllPopups();

  editLeadIdx = idx;
  document.getElementById("leadModalTitle").textContent = idx<0 ? "Add Lead" : "Edit Lead";
  const lead = idx>=0 ? leads[idx] : null;
  const users = getUsers();

  const fields = [];
  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    const col = columns[colIdx];
    if (col.key === "date") continue;
    
    const val = lead ? getLeadFieldValue(lead, col.key) : "";
    let inp = "";
    
    if (col.key === "assignedToName") {
      if (canAssignLeads(currentUser)) {
        let opts = "<option value=\"\">Unassigned</option>";
        for (let i = 0; i < users.length; i++) {
          const u = users[i];
          const selected = u.name === val ? "selected" : "";
          opts += "<option " + selected + ">" + escapeHtml(u.name) + "</option>";
        }
        inp = "<select id='f_" + col.key + "'>" + opts + "</select>";
      } else {
        inp = "<input type='text' value='" + escapeHtml(currentUser.name) + "' disabled style='background:#f5f5f5;'><input type='hidden' id='f_" + col.key + "' value='" + escapeHtml(currentUser.name) + "'>";
      }
    } else if (col.type === "select" || col.type === "multiselect" || col.sourceType === "relation" || col.sourceType === "database_entity") {
      const optionList = normalizeColumnOptions(col.options);
      const selectedValues = Array.isArray(val) ? val : String(val || col.defaultValue || optionList[0]?.value || "").split(",").map(v => v.trim()).filter(Boolean);
      const isCustomColumn = !DEFAULT_COLS.some(def => def.key === col.key);
      const currentValue = selectedValues[0] || "";
      const matchesOption = optionList.some(o => o.value === currentValue);
      const allowOther = isCustomColumn && col.type === "select";
      
      let opts = "";
      for (let i = 0; i < optionList.length; i++) {
        const o = optionList[i];
        const selected = (selectedValues.includes(o.value) || (!matchesOption && o.value === "__other__")) ? "selected" : "";
        const escapedVal = o.value.replaceAll('"', '&quot;');
        opts += "<option value='" + escapedVal + "' " + selected + ">" + escapeHtml(o.label) + "</option>";
      }
      if (allowOther) {
        const selected = (!matchesOption) ? "selected" : "";
        opts += "<option value='__other__' " + selected + ">Other</option>";
      }
      
      const multiple = col.type === "multiselect" ? " multiple size=4" : "";
      const onchange = allowOther ? " onchange='toggleOtherValueInput(\"" + col.key + "\")'" : "";
      inp = "<select id='f_" + col.key + "'" + multiple + onchange + ">" + opts + "</select>";
      
      if (allowOther) {
        const displayOther = matchesOption ? "none" : "block";
        inp += "<input type='text' id='f_" + col.key + "_other' class='mt8' placeholder='Type custom value' style='display:" + displayOther + ";'>";
      }
      
      if (optionList.length) {
        let metaText = "Options: ";
        for (let i = 0; i < optionList.length; i++) {
          const o = optionList[i];
          const isDefault = col.defaultValue === o.value ? " [default]" : "";
          if (i > 0) metaText += ", ";
          metaText += o.label + " (" + o.value + ")" + isDefault;
        }
        inp += "<div class='field-note'>" + metaText + "</div>";
      }
    } else if (col.type === "number") {
      inp = "<input type='number' id='f_" + col.key + "' value='" + escapeHtml(val) + "' placeholder='0'>";
    } else if (col.type === "date") {
      inp = "<input type='date' id='f_" + col.key + "' value='" + escapeHtml(val) + "' placeholder='" + escapeHtml(col.label) + "'>";
    } else {
      inp = "<input type='text' id='f_" + col.key + "' value='" + escapeHtml(val) + "' placeholder='" + escapeHtml(col.label) + "'>";
    }
    
    fields.push("<div class='field'><label>" + escapeHtml(col.label) + "</label>" + inp + "</div>");
  }

  let html = "";
  for (let i = 0; i < fields.length; i += 2) {
    html += "<div class='two-col'>" + fields[i] + (fields[i+1] || "") + "</div>";
  }
  document.getElementById("leadFormBody").innerHTML = html;
  modalState.leadModal = true; renderModals();
}

function saveLead() {
  const lead = {};
  const customFields = {};
  columns.filter(c=>c.key!=="date").forEach(col=>{
    const el=document.getElementById("f_"+col.key);
    if (!el) {
      lead[col.key] = "";
      return;
    }

    if (col.type === "multiselect") {
      const values = Array.from(el.selectedOptions).map(option => option.value).filter(Boolean);
      lead[col.key] = values;
      customFields[col.key] = values;
      if (!DEFAULT_COLS.some(def => def.key === col.key)) {
        upsertCustomColumnOptions(col.key, values);
      }
      return;
    }

    if (col.type === "select") {
      const selectedValue = el.value.trim();
      if (selectedValue === "__other__") {
        const otherValue = document.getElementById(`f_${col.key}_other`)?.value.trim() || "";
        lead[col.key] = otherValue;
        if (!DEFAULT_COLS.some(def => def.key === col.key)) {
          customFields[col.key] = otherValue;
          upsertCustomColumnOptions(col.key, otherValue);
        }
        return;
      }
    }

    lead[col.key] = el.value.trim();
    if (!DEFAULT_COLS.some(def => def.key === col.key)) {
      customFields[col.key] = lead[col.key];
      upsertCustomColumnOptions(col.key, lead[col.key]);
    }
  });
  if (isSalesRep(currentUser)&&!lead.assignedToName) lead.assignedToName=currentUser.name;
  lead.date = new Date().toLocaleDateString("en-IN");
  lead.customFields = customFields;
  lead.__uid = editLeadIdx >= 0 ? (leads[editLeadIdx]?.__uid || leads[editLeadIdx]?.id || "lid_" + Date.now() + "_" + (leadUidSeed++)) : ("lid_" + Date.now() + "_" + (leadUidSeed++));

  if (editLeadIdx>=0) leads[editLeadIdx]=lead; else leads.push(lead);
  saveLeads();
  modalState.leadModal = false; renderModals();
  renderLeads(); renderCanvas(); buildNotifications();
}

function toggleOtherValueInput(key) {
  const select = document.getElementById(`f_${key}`);
  const otherInput = document.getElementById(`f_${key}_other`);
  if (!select || !otherInput) return;
  otherInput.style.display = select.value === "__other__" ? "block" : "none";
}

function deleteLead(idx) {
  if (!confirm("Delete this lead?")) return;
  const lead = leads[idx];
  if (lead) selectedLeadIds.delete(getLeadStableId(lead));
  leads.splice(idx,1); saveLeads(); renderLeads(); renderCanvas();
}

function toggleLeadSelection(leadId, checked) {
  if (!leadId) return;
  if (checked) selectedLeadIds.add(String(leadId));
  else selectedLeadIds.delete(String(leadId));
  renderLeads();
}

function toggleSelectAllLeads() {
  const vis = myLeads().filter(l => {
    const search = (document.getElementById("searchInput")?.value||"").toLowerCase();
    const fSrc   = document.getElementById("fSrc")?.value   || "";
    const fStat  = document.getElementById("fStat")?.value  || "";
    const fAsgn  = document.getElementById("fAssign")?.value|| "";
    if (search && !["name","phone","email"].some(k => (l[k]||"").toLowerCase().includes(search))) return false;
    if (fSrc  && l.source !== fSrc) return false;
    if (fStat && l.status !== fStat) return false;
    if (fAsgn && l.assignedToName !== fAsgn) return false;
    return true;
  });

  const allSelected = vis.length && vis.every(l => selectedLeadIds.has(getLeadStableId(l)));
  if (allSelected) {
    vis.forEach(l => selectedLeadIds.delete(getLeadStableId(l)));
  } else {
    vis.forEach(l => selectedLeadIds.add(getLeadStableId(l)));
  }
  renderLeads();
}

function deleteSelectedLeads() {
  const ids = new Set(Array.from(selectedLeadIds));
  if (!ids.size) return;

  const count = leads.filter(l => ids.has(getLeadStableId(l))).length;
  if (!count) return;
  if (!confirm(`Delete ${count} selected lead(s)?`)) return;

  leads = leads.filter(l => !ids.has(getLeadStableId(l)));
  selectedLeadIds.clear();
  saveLeads();
  renderLeads();
  renderCanvas();
}

// ─── COLUMNS ─────────────────────────────────────────────────
function openColModal(editIdx = null) {
  closeAllPopups();

  renderColList();
  editingColIdx = Number.isInteger(editIdx) ? editIdx : null;
  const nameEl    = document.getElementById("newColName");
  const typeEl    = document.getElementById("newColType");
  const relationEl = document.getElementById("newColRelation");
  const actionBtn = document.getElementById("newColActionBtn");
  const statusEl  = document.getElementById("colSaveStatus");
  const existing  = editingColIdx !== null ? columns[editingColIdx] : null;

  // Reset status
  if (statusEl) statusEl.textContent = "";

  // Populate fields
  if (nameEl)     nameEl.value     = existing?.label          || "";
  if (typeEl)     typeEl.value     = existing?.type           || "";
  if (relationEl) relationEl.value = existing?.relationEntity || "";
  if (actionBtn)  actionBtn.textContent = existing ? "💾 Save Column" : "+ Add Column";

  // Load existing options into editing list
  _editingColOptions = normalizeColumnOptions(existing?.options || []);
  const optInput = document.getElementById("newOptionInput");
  if (optInput) optInput.value = "";
  renderColOptionsList();

  toggleColOpts();
  
  // Auto-focus on the name field for new columns
  if (!existing && nameEl) {
    setTimeout(() => nameEl.focus(), 100);
  }

  modalState.colModal = true;
  renderModals();
}

function renderColList() {
  const listEl = document.getElementById("colList");
  if (!listEl) return;

  if (!columns.length) {
    listEl.innerHTML = "<div style='text-align:center;padding:20px;color:#999;font-size:13px;'>No columns yet. Create your first custom column below.</div>";
    return;
  }

  let html = "";
  
  for (let i = 0; i < columns.length; i++) {
    const c = columns[i];
    const isLocked = c.locked;
    const optionSummary = (c.type === "select" || c.type === "multiselect")
      ? normalizeColumnOptions(c.options).slice(0, 3).map(o => o.label).join(", ") + (normalizeColumnOptions(c.options).length > 3 ? "..." : "")
      : "";
    const relationSummary = c.sourceType === "relation" && c.relationEntity ? "Relation: " + c.relationEntity : "";

    html += "<div class='col-item' style='border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px;background:#fafafa;'>";
    html += "<div style='display:flex;justify-content:space-between;align-items:flex-start;gap:12px;'>";
    html += "<div style='flex:1;min-width:0;'>";
    html += "<div style='display:flex;align-items:center;gap:8px;margin-bottom:6px;'>";
    html += "<strong style='color:#1f2937;font-size:14px;'>" + escapeHtml(c.label) + "</strong>";
    
    if (isLocked) {
      html += "<span style='font-size:11px;color:#9ca3af;background:#f3f4f6;padding:2px 8px;border-radius:4px;'>🔒 System</span>";
    }
    
    html += "<span style='font-size:11px;color:#6b7280;background:#f0f4f8;padding:2px 8px;border-radius:4px;'>" + c.type + "</span>";
    html += "</div>";
    
    if (optionSummary) {
      html += "<div style='font-size:12px;color:#6b7280;margin-bottom:4px;'>Values: " + escapeHtml(optionSummary) + "</div>";
    }
    if (relationSummary) {
      html += "<div style='font-size:12px;color:#6b7280;'>" + escapeHtml(relationSummary) + "</div>";
    }
    if (c.defaultValue) {
      html += "<div style='font-size:12px;color:#6b7280;'>Default: <code style='background:#f3f4f6;padding:2px 4px;border-radius:3px;'>" + escapeHtml(c.defaultValue) + "</code></div>";
    }
    
    html += "</div>";
    html += "<div style='flex-shrink:0;'>";
    
    if (!isLocked) {
      html += "<div style='display:flex;gap:6px;'>";
      html += "<button class='btn btn-sm' style='padding:4px 10px;font-size:12px;' onclick='openColModal(" + i + ")'>✏ Edit</button>";
      html += "<button class='btn btn-sm btn-del' style='padding:4px 10px;font-size:12px;' onclick='removeCol(" + i + ")'>🗑 Remove</button>";
      html += "</div>";
    } else {
      html += "<span style='font-size:12px;color:#9ca3af;'>Built-in</span>";
    }
    
    html += "</div>";
    html += "</div>";
    html += "</div>";
  }

  listEl.innerHTML = html;
}


function toggleColOpts() {
  const box         = document.getElementById("colOptsBox");
  const relationBox = document.getElementById("colRelationBox");
  const type        = document.getElementById("newColType")?.value || "text";
  const showOptions = (type === "select" || type === "multiselect");
  const isRelation  = (type === "relation" || type === "database");
  if (box)         box.style.display         = showOptions ? "block" : "none";
  if (relationBox) relationBox.style.display = isRelation  ? "flex"  : "none";
}

// ─── DYNAMIC OPTION LIST FOR COLUMN MODAL ────────────────────────────

function renderColOptionsList() {
  const listEl = document.getElementById("colOptionsList");
  if (!listEl) return;
  if (!_editingColOptions.length) {
    listEl.innerHTML = "<div style='font-size:12px;color:#999;padding:8px 0;text-align:center;font-style:italic;'>Add at least one option above</div>";
    return;
  }
  let html = "";
  for (let i = 0; i < _editingColOptions.length; i++) {
    const opt = _editingColOptions[i];
    html += "<div style='display:flex;align-items:center;gap:8px;background:#f3f4f6;padding:8px 12px;border-radius:6px;font-size:13px;border-left:3px solid #3b82f6;'>";
    html += "<span style='flex:1;word-break:break-word;'><strong>" + escapeHtml(opt.label) + "</strong></span>";
    html += "<code style='background:#e5e7eb;padding:2px 6px;border-radius:3px;font-size:11px;color:#666;'>" + escapeHtml(opt.value) + "</code>";
    html += "<button type='button' class='btn btn-sm btn-del' onclick='removeOptionFromList(" + i + ")' style='padding:3px 6px;font-size:12px;' title='Remove option'>✕</button>";
    html += "</div>";
  }
  listEl.innerHTML = html;
}

function showColSaveStatus(message, isError = false) {
  const statusEl = document.getElementById("colSaveStatus");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#dc2626" : "#059669";
  if (!isError) {
    setTimeout(() => {
      statusEl.textContent = "";
    }, 3000);
  }
}

function addOptionToList() {
  const inp = document.getElementById("newOptionInput");
  if (!inp) return;
  
  const label = inp.value.trim();
  if (!label) {
    inp.focus();
    inp.style.borderColor = "#dc2626";
    setTimeout(() => { inp.style.borderColor = ""; }, 2000);
    return;
  }

  const dup = _editingColOptions.some(o => o.label.toLowerCase() === label.toLowerCase());
  if (dup) {
    alert("⚠ That option already exists. Enter a different value.");
    inp.select();
    return;
  }

  if (label.length > 100) {
    alert("⚠ Option text is too long (max 100 characters).");
    return;
  }

  const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (!value) {
    alert("⚠ Cannot create a valid code from that text. Use letters, numbers, or spaces.");
    inp.select();
    return;
  }

  _editingColOptions.push({ label, value: value || "opt_" + Date.now() });
  inp.value = "";
  inp.focus();
  renderColOptionsList();
}

function removeOptionFromList(idx) {
  _editingColOptions.splice(idx, 1);
  renderColOptionsList();
}

function normalizeColumnOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map(option => {
      if (option && typeof option === "object") {
        const value = String(option.value ?? option.label ?? "").trim();
        const label = String(option.label ?? option.value ?? value).trim();
        return value ? { label: label || value, value } : null;
      }
      const value = String(option ?? "").trim();
      return value ? { label: value, value } : null;
    })
    .filter(Boolean);
}

function getComponentOptionPresets() {
  return DEFAULT_COLS
    .filter(col => Array.isArray(col.options) && col.options.length)
    .map(col => ({
      key: col.key,
      label: col.label,
      options: normalizeColumnOptions(col.options)
    }));
}

function getColumnPresetKey(col) {
  const presets = getComponentOptionPresets();
  if (!col || !Array.isArray(col.options) || !col.options.length) {
    return presets[0]?.key || "existing";
  }
  const optionSignature = JSON.stringify(normalizeColumnOptions(col.options).map(option => option.value));
  const matched = presets.find(preset => JSON.stringify(preset.options.map(option => option.value)) === optionSignature);
  return matched?.key || "existing";
}

function getColumnPresetSummary(col) {
  const options = normalizeColumnOptions(col?.options);
  if (!options.length) return "No component options selected yet.";
  return options.map(option => `${option.label} (${option.value})${col?.defaultValue === option.value ? " [default]" : ""}`).join(", ");
}

function populateColumnPresetOptions(col) {
  const presetEl = document.getElementById("newColPreset");
  if (!presetEl) return;

  const presets = getComponentOptionPresets();
  const existingOptions = normalizeColumnOptions(col?.options);
  const options = [
    { key: "existing", label: existingOptions.length ? "Keep existing options" : "Use component options" },
    ...presets
  ];

  let html = "";
  for (let i = 0; i < options.length; i++) {
    const preset = options[i];
    html += "<option value='" + preset.key + "'>" + escapeHtml(preset.label) + "</option>";
  }
  presetEl.innerHTML = html;
}

function applyColumnPreset() {
  const presetKey = document.getElementById("newColPreset")?.value || "existing";
  const summary = document.getElementById("newColPresetSummary");
  const col = editingColIdx !== null ? columns[editingColIdx] : null;
  if (!summary) return;

  toggleColOpts();

  if (!col) {
    summary.textContent = presetKey === "existing" ? "Options will be inherited from the selected component preset." : getComponentOptionPresets().find(p => p.key === presetKey)?.options.map(o => `${o.label} (${o.value})`).join(", ") || "";
    return;
  }

  const preset = getComponentOptionPresets().find(p => p.key === presetKey);
  summary.textContent = presetKey === "existing" ? getColumnPresetSummary(col) : (preset?.options.map(o => `${o.label} (${o.value})`).join(", ") || "");
}

function upsertCustomColumnOptions(colKey, values) {
  const col = columns.find(c => c.key === colKey);
  if (!col || DEFAULT_COLS.some(def => def.key === colKey)) return;
  if (col.type !== "select" && col.type !== "multiselect") return;

  const existing = normalizeColumnOptions(col.options);
  const normalizedValues = Array.isArray(values) ? values : [values];
  const existingValues = new Set(existing.map(option => option.value));
  let changed = false;

  normalizedValues.forEach(rawValue => {
    const value = String(rawValue || "").trim();
    if (!value || existingValues.has(value)) return;
    existing.push({ label: value, value });
    existingValues.add(value);
    changed = true;
  });

  if (!changed) return;

  col.options = existing;
  if (!col.defaultValue && existing[0]) {
    col.defaultValue = existing[0].value;
  }
  saveCols();
  renderColList();

  (async () => {
    try {
      const customerId = window.CUSTOMER_ID || currentUser.customerId || 1;
      const payload = {
        customerId,
        keyName: col.key,
        label: col.label,
        type: col.type,
        optionsJson: JSON.stringify(col.options),
        defaultValue: col.defaultValue || null
      };

      if (col.id) {
        await fetch(`${BACKEND_API_BASE}/custom-columns/${col.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (col.fieldId) {
        await fetch(`${BACKEND_API_BASE}/field-definitions/${col.fieldId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            keyName: col.key,
            label: col.label,
            dataType: col.type === 'multiselect' ? 'select' : col.type,
            sourceType: col.sourceType || 'lead',
            relationEntity: col.relationEntity || null,
            optionsJson: JSON.stringify(col.options),
            defaultValue: col.defaultValue || null,
            multiSelect: col.type === 'multiselect',
            active: true
          })
        });
      }
    } catch (e) {
      console.warn("Persist custom options skipped", e);
    }
  })();
}

function addColumn() {
  const nameEl = document.getElementById("newColName");
  const typeEl = document.getElementById("newColType");
  const actionBtn = document.getElementById("newColActionBtn");

  const name = (nameEl?.value || "").trim();
  const type = typeEl?.value || "";

  // Validation
  if (!name) {
    nameEl?.focus();
    nameEl?.style.setProperty("border-color", "#dc2626", "important");
    setTimeout(() => nameEl?.style.removeProperty("border-color"), 2000);
    alert("⚠ Please enter a column name.");
    return;
  }

  if (!type) {
    typeEl?.focus();
    alert("⚠ Please select a data type.");
    return;
  }

  if (name.length > 50) {
    alert("⚠ Column name is too long (max 50 characters).");
    nameEl?.select();
    return;
  }

  // Check for duplicate column names
  const isEditing = editingColIdx !== null;
  const isDuplicate = columns.some((col, idx) => 
    col.label.toLowerCase() === name.toLowerCase() && idx !== editingColIdx
  );
  if (isDuplicate) {
    alert("⚠ A column with this name already exists.");
    nameEl?.select();
    return;
  }

  const relationEntity = document.getElementById("newColRelation")?.value.trim();
  if ((type === "relation" || type === "database") && !relationEntity) {
    alert("⚠ Please enter a relation entity name.");
    document.getElementById("newColRelation")?.focus();
    return;
  }

  if ((type === "select" || type === "multiselect") && !_editingColOptions.length) {
    alert("⚠ Please add at least one option for this dropdown before saving.");
    document.getElementById("newOptionInput")?.focus();
    return;
  }

  // Prepare column object
  const existing = isEditing ? columns[editingColIdx] : null;
  const col = existing ? { ...existing } : {
    key: name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
    label: name,
    type,
    locked: false
  };

  col.label = name;
  col.type = type;

  if (type === "relation" || type === "database") {
    col.sourceType = "relation";
    col.relationEntity = relationEntity;
  } else {
    col.sourceType = col.sourceType === "relation" ? "lead" : (col.sourceType || "lead");
    col.relationEntity = "";
  }

  if (type === "select" || type === "multiselect") {
    col.options = [..._editingColOptions];
    col.defaultValue = col.defaultValue || _editingColOptions[0]?.value || "";
    col.multiSelect = type === "multiselect";
  } else {
    col.options = [];
    col.defaultValue = "";
    col.multiSelect = false;
  }

  // Save to local storage
  if (isEditing) {
    columns[editingColIdx] = col;
  } else {
    columns.push(col);
  }
  saveCols();
  renderColList();
  renderLeads();
  populateDynamicFilters();
  injectCustomGroupByOptions();

  // Show success message and persist to backend
  showColSaveStatus(`✓ Column "${name}" saved!`);
  actionBtn.disabled = true;
  actionBtn.textContent = "Saving...";

  (async () => {
    try {
      const customerId = window.CUSTOMER_ID || currentUser.customerId || 1;
      
      // Save to custom-columns endpoint
      const basePayload = {
        customerId,
        keyName: col.key,
        label: col.label,
        type: col.type,
        optionsJson: col.options ? JSON.stringify(col.options) : null,
        defaultValue: col.defaultValue || null
      };

      if (isEditing && col.id) {
        await fetch(`${BACKEND_API_BASE}/custom-columns/${col.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload)
        }).then(r => r.ok || Promise.reject(new Error("Save failed")));
      } else {
        const resp = await fetch(`${BACKEND_API_BASE}/custom-columns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload)
        });
        if (resp.ok) {
          const saved = await resp.json();
          if (saved?.id) col.id = saved.id;
        } else {
          throw new Error("Server returned " + resp.status);
        }
      }

      // Also save to field-definitions endpoint for compatibility
      const fieldPayload = {
        customerId,
        keyName: col.key,
        label: col.label,
        dataType: type === 'multiselect' ? 'select' : (type || 'text'),
        sourceType: col.sourceType || 'lead',
        relationEntity: col.relationEntity || null,
        optionsJson: col.options ? JSON.stringify(col.options) : null,
        defaultValue: col.defaultValue || null,
        multiSelect: type === 'multiselect',
        active: true
      };

      const fieldUrl = isEditing && col.fieldId 
        ? `${BACKEND_API_BASE}/field-definitions/${col.fieldId}` 
        : `${BACKEND_API_BASE}/field-definitions`;
      const fieldMethod = isEditing && col.fieldId ? 'PUT' : 'POST';
      const fieldResp = await fetch(fieldUrl, {
        method: fieldMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldPayload)
      });

      if (fieldResp.ok) {
        const savedField = await fieldResp.json();
        if (savedField?.id) col.fieldId = savedField.id;
        saveCols();
      }
    } catch (e) {
      console.warn('Backend persist skipped:', e);
      showColSaveStatus("✓ Saved locally (offline mode)", false);
    } finally {
      actionBtn.disabled = false;
      actionBtn.textContent = isEditing ? "💾 Save Column" : "+ Add Column";
      
      // Reset form
      if (!isEditing) {
        editingColIdx = null;
        nameEl.value = "";
        typeEl.value = "";
        _editingColOptions = [];
        renderColOptionsList();
        toggleColOpts();
        nameEl.focus();
        
        // Show post-column widget suggestion modal
        const newCol = columns[columns.length - 1];
        if (newCol) {
          setTimeout(() => openCreateWidgetFromColModal(newCol.key, newCol.label, newCol.type), 500);
        }
      }
    }
  })();
}

function removeCol(idx) {
  const col = columns[idx];
  if (!col) return;
  
  if (col.locked) {
    alert("⚠ Cannot remove system columns. They are essential for the application.");
    return;
  }

  const leadsUsingCol = leads.filter(l => l[col.key] != null && String(l[col.key]).trim() !== "").length;
  const warning = leadsUsingCol > 0 
    ? `\n\n⚠ ${leadsUsingCol} lead(s) have data in this column. This data will be lost.` 
    : "";

  if (!confirm(`Remove column "${col.label}"?${warning}`)) return;

  columns.splice(idx, 1);
  saveCols();
  renderColList();
  renderLeads();
  populateDynamicFilters();
  injectCustomGroupByOptions();

  // Delete from backend
  if (col.id) {
    const cid = window.CUSTOMER_ID || currentUser.customerId || 1;
    fetch(`${BACKEND_API_BASE}/custom-columns/${col.id}?customerId=${cid}`, { method: "DELETE" })
      .catch(err => console.warn("Backend delete skipped:", err));
  }
  if (col.fieldId) {
    const cid = window.CUSTOMER_ID || currentUser.customerId || 1;
    fetch(`${BACKEND_API_BASE}/field-definitions/${col.fieldId}?customerId=${cid}`, { method: "DELETE" })
      .catch(err => console.warn("Backend delete skipped:", err));
  }

  showColSaveStatus(`✓ Column "${col.label}" removed`);
}

let widgetColEditId = null;
let editingColIdx = null;

function openWidgetCols(wid) {
  const dash = getDash(); if(!dash) return;
  const w = dash.widgets.find(x=>x.id===wid); if(!w) return;
  if (w.type !== "table") return;
  closeAllPopups();
  widgetColEditId = wid;
  const listEl = document.getElementById('widgetColList'); if(!listEl) return;
  const sel = w.columns || [];
  listEl.innerHTML = columns.map(c=>`<label style="display:block;margin:6px 0"><input type=\"checkbox\" value=\"${c.key}\" ${sel.includes(c.key)?'checked':''}> ${c.label}</label>`).join('');
  modalState.widgetColModal = true; renderModals();
}

function openUserModal() {
  closeAllPopups();
  modalState.userModal = true; renderModals();
}

function saveWidgetCols(wid = widgetColEditId) {
  const dash = getDash(); if(!dash) return;
  const wIdx = dash.widgets.findIndex(x=>x.id===wid); if(wIdx===-1) return;
  const sel = Array.from(document.querySelectorAll('#widgetColList input[type="checkbox"]:checked')).map(i=>i.value);
  dash.widgets[wIdx].columns = sel.length ? sel : columns.map(c=>c.key);
  widgetColEditId = null;
  saveDashes(); modalState.widgetColModal = false; renderModals(); renderCanvas();
  persistCurrentDashboard();
  _editingColOptions = [];
  populateDynamicFilters();
  injectCustomGroupByOptions();
}

// ─── POST-COLUMN WIDGET CREATION ─────────────────────────────
let _pendingColForWidget = null;

function openCreateWidgetFromColModal(colKey, colLabel, colType) {
  _pendingColForWidget = { colKey, colLabel, colType };

  // Close the column editor so the widget chooser is the only active modal.
  modalState.colModal = false;
  
  const colNameEl = document.getElementById("cwColName");
  const colTypeEl = document.getElementById("cwColType");
  
  if (colNameEl) colNameEl.textContent = colLabel;
  if (colTypeEl) colTypeEl.textContent = "Type: " + colType;
  
  modalState.createWidgetFromColModal = true;
  renderModals();
}

function createWidgetFromCol(widgetType) {
  if (!_pendingColForWidget) {
    closeCreateWidgetFromColModal();
    return;
  }
  
  const { colKey, colLabel, colType } = _pendingColForWidget;
  _pendingColForWidget = null;
  
  // Close the post-column modal
  modalState.createWidgetFromColModal = false;
  
  // Create widget with column pre-selected
  const newWidget = {
    id: "w_" + Date.now(),
    type: widgetType,
    title: colLabel + " - " + widgetType.charAt(0).toUpperCase() + widgetType.slice(1),
    size: "half",
    fieldKey: colKey,  // Pre-select the new column
    columns: [colKey]
  };
  
  // Set config type and open config modal
  cfgType = widgetType;
  cfgEditId = null;
  
  // Delay to ensure modal state is properly set before opening config modal
  setTimeout(() => {
    openConfigModal(widgetType);
    
    // Pre-populate the field selector with the new column
    const fieldSelect = document.getElementById("cfgFieldKey");
    if (fieldSelect) fieldSelect.value = colKey;
  }, 100);
  
  renderModals();
}

// ─── IMPORT / EXPORT ─────────────────────────────────────────
function handleImport(event) {
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    file.name.endsWith(".json") ? importJSON(e.target.result) : importCSV(e.target.result);
  };
  reader.readAsText(file); event.target.value="";
}

function importJSON(content) {
  try {
    const raw=JSON.parse(content);
    const arr=Array.isArray(raw)?raw:(raw.leads||null);
    if(!Array.isArray(arr)){alert("❌ Unknown JSON format.");return;}
    if(arr[0]?.customColumns) autoAddCols(arr[0].customColumns);
    let added=0;
    arr.forEach(item=>{
      if(!item.customerName&&!item.name) return;
      const lead={
        __uid: "lid_" + Date.now() + "_" + (leadUidSeed++),
        name:   item.customerName||item.name||"",
        phone:  item.mobileNumber||item.phone||"",
        email:  item.email||"",
        city:   item.city||"",
        source: item.leadSource?.sourceName||item.source||"",
        status: item.leadStatus?.statusName||item.status||"New",
        assignedToName: item.assignedTo?.userName||item.assignedToName||"",
        tags:   (item.tagsDTO?.tags||[]).map(t=>t.name).join(", "),
        totalCalls: item.totalCalls||0,
        date: item.createdOn
          ? new Date(item.createdOn).toLocaleDateString("en-IN")
          : new Date().toLocaleDateString("en-IN"),
      };
      (item.customColumns||[]).forEach(col=>{
        if(col.displayName) lead[sanitizeKey(col.displayName)]=col.value||"";
      });
      leads.push(lead); added++;
    });
    saveLeads(); saveCols(); renderLeads(); renderCanvas();
    alert(`✅ Imported ${added} lead(s)!`);
  } catch(e){console.error(e);alert("❌ Invalid JSON.");}
}

function autoAddCols(customCols) {
  const tmap={Text:"text",LargeText:"text",Number:"number",Calendar:"text",
              Time:"text",DropDown:"select",Attachment:"text",DataBase:"text"};
  customCols.forEach(col=>{
    if(!col.displayName) return;
    const key=sanitizeKey(col.displayName);
    if(columns.some(c=>c.key===key)) return;
    const nc={key,label:col.displayName.trim(),type:tmap[col.dataType]||"text",locked:false};
    if(col.dataType==="DropDown"&&col.optionValueArray) nc.options=col.optionValueArray;
    columns.push(nc);
  });
}

function sanitizeKey(n) {
  return n.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")+"_api";
}

function importCSV(content) {
  const lines=content.trim().split("\n"); if(lines.length<2){alert("CSV empty.");return;}
  const headers=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/"/g,""));
  let added=0;
  for(let i=1;i<lines.length;i++){
    const vals=lines[i].split(",").map(v=>v.trim().replace(/"/g,""));
    const lead={__uid: "lid_" + Date.now() + "_" + (leadUidSeed++)}; headers.forEach((h,j)=>{lead[h]=vals[j]||"";});
    if(lead.name){leads.push({...lead,date:lead.date||new Date().toLocaleDateString("en-IN")});added++;}
  }
  saveLeads(); renderLeads(); renderCanvas();
  alert(`✅ Imported ${added} leads!`);
}

function exportCSV() {
  if(!leads.length){alert("No leads.");return;}
  const header=columns.map(c=>c.label).join(",");
  const rows=myLeads().map(l=>columns.map(c=>`"${l[c.key]||""}"`).join(",")).join("\n");
  const a=Object.assign(document.createElement("a"),{
    href:URL.createObjectURL(new Blob([header+"\n"+rows],{type:"text/csv"})),
    download:"leads.csv"
  });
  a.click();
}

// ─── REPORTS ─────────────────────────────────────────────────
function renderReports() {
  const ml=myLeads(), grid=document.getElementById("reportsGrid");
  if(!grid) return;
  const saved=JSON.parse(localStorage.getItem("repTypes_"+currentUser.id)||"{}");
  const defs=[
    {id:"rSrc", title:"Leads by Source",  grp:"source",         def:"bar"},
    {id:"rStat",title:"Status Breakdown",  grp:"status",         def:"doughnut"},
    {id:"rAsgn",title:"Team Assignments",  grp:"assignedToName", def:"bar"},
    {id:"rCity",title:"Leads by City",     grp:"city",           def:"bar"},
    {id:"rDate",title:"Leads by Month",    grp:"date_month",     def:"line"},
  ];
  grid.innerHTML = defs.map(d=>{
    const cur=saved[d.id]||d.def;
    const btns=["bar","line","pie","doughnut","polarArea"].map(t=>
      `<button class="sw-btn ${t===cur?"active":""}" onclick="switchRepChart('${d.id}','${t}',this)">${t}</button>`
    ).join("");
    return `
      <div class="rep-card">
        <div class="rep-hd"><b>${d.title}</b><div class="sw-row">${btns}</div></div>
        <div class="rep-body"><canvas id="${d.id}_cv"></canvas></div>
      </div>`;
  }).join("");
  defs.forEach(d=>drawRepChart(d.id,saved[d.id]||d.def,d.grp,ml));
}

function drawRepChart(id,type,grp,ml) {
  const ctx=document.getElementById(id+"_cv")?.getContext("2d");
  if(!ctx) return;
  if(repInst[id]){try{repInst[id].destroy();}catch(e){}}
  const {labels,data}=groupData(ml,grp);
  const t=type==="column"?"bar":type;
  const isPie=["pie","doughnut","polarArea"].includes(t);
  repInst[id]=new Chart(ctx,{
    type:t,
    data:{
      labels:labels.length?labels:["No data"],
      datasets:[{
        data:data.length?data:[0],
        backgroundColor:isPie?PALETTE:PALETTE.map(c=>c+"cc"),
        borderColor:isPie?"#fff":PALETTE, borderWidth:isPie?2:0,
        borderRadius:t==="bar"?5:0, tension:t==="line"?0.4:0, fill:t==="line",
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:isPie,position:"bottom",labels:{font:{size:11},padding:10,boxWidth:10}}},
      scales:isPie?{}:{
        y:{beginAtZero:true,ticks:{stepSize:1,font:{size:10}},grid:{color:"rgba(0,0,0,0.04)"}},
        x:{ticks:{font:{size:10}},grid:{display:false}}
      }
    }
  });
}

function switchRepChart(id,type,btn) {
  const saved=JSON.parse(localStorage.getItem("repTypes_"+currentUser.id)||"{}");
  saved[id]=type;
  localStorage.setItem("repTypes_"+currentUser.id,JSON.stringify(saved));
  btn.closest(".sw-row").querySelectorAll(".sw-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const ml=myLeads();
  const grpMap={rSrc:"source",rStat:"status",rAsgn:"assignedToName",rCity:"city",rDate:"date_month"};
  drawRepChart(id,type,grpMap[id],ml);
}

// ─── USERS ───────────────────────────────────────────────────
function renderUsers() {
  document.getElementById("usersBody").innerHTML=getUsers().map((u,i)=>{
    const lc=leads.filter(l=>l.assignedToName===u.name).length;
    const me=u.id===currentUser.id;
    return `<tr>
      <td>${i+1}</td>
      <td><span class="av-sm" style="background:${ROLE_COLORS[u.role]||"#888"}">${u.avatar}</span>${u.name}</td>
      <td>${u.username}</td>
      <td><span class="role-badge r-${u.role}">${ROLE_LABELS[u.role]}</span></td>
      <td>${lc}</td>
      <td>${!me
        ?`<button class="btn btn-sm btn-del" onclick="handleDelUser('${u.id}')">🗑 Delete</button>`
        :`<span style="font-size:11px;color:#aaa;">(You)</span>`}</td>
    </tr>`;
  }).join("");
}

function saveUser() {
  const name=document.getElementById("nuName").value.trim();
  const user=document.getElementById("nuUser").value.trim();
  const pass=document.getElementById("nuPass").value;
  const role=document.getElementById("nuRole").value;
  if(!name||!user||!pass){alert("Fill all fields.");return;}
  const r=createUser(name,user,pass,role);
  if(!r.success){alert("❌ "+r.message);return;}
  modalState.userModal = false; renderModals();
  ["nuName","nuUser","nuPass"].forEach(id=>document.getElementById(id).value="");
  renderUsers(); fillAssignFilter();
  alert(`✅ User "${name}" created!`);
}

function handleDelUser(uid) {
  const u=getUserById(uid); if(!u||!confirm(`Delete "${u.name}"?`)) return;
  const r=deleteUser(uid,currentUser.id); if(!r.success){alert("❌ "+r.message);return;}
  leads.forEach(l=>{if(l.assignedToName===u.name)l.assignedToName="";}); saveLeads();
  renderUsers(); renderCanvas();
}

function fillAssignFilter() {
  const el=document.getElementById("fAssign"); if(!el) return;
  el.innerHTML=`<option value="">All Assignees</option>`+
    getUsers().map(u=>`<option value="${u.name}">${u.name}</option>`).join("");
}

// ─── FOLLOW-UPS WIDGET ───────────────────────────────────────
function drawFollowups(w, body, ml) {
  const today     = new Date().toLocaleDateString("en-IN");
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);

  const due = ml.filter(l => {
    if (!l.followUpDate) return false;
    const d = new Date(l.followUpDate); d.setHours(0,0,0,0);
    return d <= todayDate && l.status !== "Won" && l.status !== "Lost";
  }).sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  if (!due.length) {
    body.innerHTML = `<div class="w-empty">🎉 No follow-ups due today!</div>`;
    return;
  }

  body.innerHTML = `<div class="fu-list">` + due.slice(0,8).map((l,i) => {
    const ri = leads.indexOf(l);
    const d  = new Date(l.followUpDate); d.setHours(0,0,0,0);
    const overdue = d < todayDate;
    return `
      <div class="fu-item ${overdue?"fu-overdue":"fu-today"}">
        <div class="fu-dot"></div>
        <div class="fu-info">
          <div class="fu-name" onclick="openDetail(${ri})">${l.name||"—"}</div>
          <div class="fu-meta">${l.source||""} · ${l.status||""}</div>
        </div>
        <div class="fu-date">${overdue?"⚠ Overdue":"📅 Today"}</div>
      </div>`;
  }).join("") + `</div>`;
}

// ─── LEAD DETAIL PANEL ───────────────────────────────────────
let detailLeadIdx = -1;

function openDetail(idx) {
  detailLeadIdx = idx;
  const l = leads[idx];
  if (!l) return;

  document.getElementById("dpName").textContent = l.name || "Lead";
  document.getElementById("dpSub").textContent  =
    [l.phone, l.email, l.city].filter(Boolean).join("  ·  ");

  // Status bar
  const STATUSES = ["New","Contacted","Qualified","Proposal","Won","Lost"];
  const cur = l.status || "New";
  document.getElementById("dpStatusBar").innerHTML = STATUSES.map(s => `
    <div class="dp-step ${s===cur?"dp-step-active":""} ${
      STATUSES.indexOf(s)<STATUSES.indexOf(cur)?"dp-step-done":""}"
         onclick="quickStatus(${idx},'${s}')">
      <div class="dp-step-dot"></div>
      <div class="dp-step-lbl">${s}</div>
    </div>`).join("");

  // Info fields
  const skip = ["name","phone","email","city","status","assignedToName","followUpDate","date"];
  const fields = columns.filter(c=>!skip.includes(c.key) && l[c.key]);
  document.getElementById("dpFields").innerHTML = fields.length
    ? fields.map(c=>`
        <div class="dp-field-row">
          <div class="dp-field-key">${c.label}</div>
          <div class="dp-field-val">${l[c.key]}</div>
        </div>`).join("")
    : `<div class="dp-field-row" style="color:#bbb;font-size:12px;">No additional fields filled.</div>`;

  // Follow-up
  document.getElementById("dpFollowup").value = l.followUpDate || "";

  // Assigned to
  const asgSel = document.getElementById("dpAssigned");
  asgSel.innerHTML = `<option value="">Unassigned</option>` +
    getUsers().map(u=>
      `<option value="${u.name}" ${u.name===l.assignedToName?"selected":""}>${u.name}</option>`
    ).join("");

  // Quick status buttons
  document.getElementById("dpQuickStatus").innerHTML = STATUSES.map(s=>
    `<button class="qs-btn ${s===cur?"qs-active":""}" onclick="quickStatus(${idx},'${s}')">${s}</button>`
  ).join("");

  renderNotes(idx);
  renderActivity(idx);
  switchDpTab("info", document.querySelector(".dp-tab"));

  document.getElementById("detailOverlay").classList.add("open");
  document.getElementById("detailPanel").classList.add("open");
}

function closeDetail() {
  document.getElementById("detailOverlay").classList.remove("open");
  document.getElementById("detailPanel").classList.remove("open");
  detailLeadIdx = -1;
}

function switchDpTab(name, el) {
  document.querySelectorAll(".dp-tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".dp-section").forEach(s=>s.style.display="none");
  if (el) el.classList.add("active");
  const map = { info:"dpInfo", notes:"dpNotes", activity:"dpActivity" };
  const sec = document.getElementById(map[name]);
  if (sec) sec.style.display = "flex";
}

function saveFollowup() {
  if (detailLeadIdx < 0) return;
  const val = document.getElementById("dpFollowup").value;
  const old = leads[detailLeadIdx].followUpDate;
  leads[detailLeadIdx].followUpDate = val;
  if (val !== old) logActivity(detailLeadIdx, `Follow-up set to ${val || "cleared"}`);
  saveLeads(); renderLeads(); renderCanvas();
}

function saveAssigned() {
  if (detailLeadIdx < 0) return;
  const val = document.getElementById("dpAssigned").value;
  const old = leads[detailLeadIdx].assignedToName;
  leads[detailLeadIdx].assignedToName = val;
  if (val !== old) logActivity(detailLeadIdx, `Assigned to ${val||"Unassigned"}`);
  saveLeads(); renderLeads();
}

function quickStatus(idx, status) {
  const old = leads[idx].status;
  leads[idx].status = status;
  if (old !== status) logActivity(idx, `Status changed: ${old} → ${status}`);
  saveLeads(); renderLeads(); renderCanvas();
  if (detailLeadIdx === idx) openDetail(idx); // refresh panel
}

// ─── NOTES ───────────────────────────────────────────────────
function addNote() {
  if (detailLeadIdx < 0) return;
  const inp  = document.getElementById("noteInput");
  const text = inp.value.trim();
  if (!text) return;

  const lead = leads[detailLeadIdx];
  if (!lead.notes) lead.notes = [];
  const note = {
    text,
    by:   currentUser.name,
    time: new Date().toLocaleString("en-IN")
  };
  lead.notes.unshift(note);
  logActivity(detailLeadIdx, `Note added`);
  inp.value = "";
  saveLeads();
  renderNotes(detailLeadIdx);
}

function renderNotes(idx) {
  const el = document.getElementById("notesList");
  if (!el) return;
  const notes = leads[idx]?.notes || [];
  el.innerHTML = notes.length
    ? notes.map((n,i)=>`
        <div class="note-card">
          <div class="note-text">${n.text}</div>
          <div class="note-meta">${n.by} · ${n.time}
            <button class="note-del" onclick="deleteNote(${idx},${i})">🗑</button>
          </div>
        </div>`).join("")
    : `<div style="color:#bbb;font-size:12.5px;padding:12px 0;">No notes yet. Add one above.</div>`;
}

function deleteNote(leadIdx, noteIdx) {
  leads[leadIdx].notes.splice(noteIdx, 1);
  saveLeads(); renderNotes(leadIdx);
}

// ─── ACTIVITY LOG ─────────────────────────────────────────────
function logActivity(idx, action) {
  if (!leads[idx].activity) leads[idx].activity = [];
  leads[idx].activity.unshift({
    action,
    by:   currentUser.name,
    time: new Date().toLocaleString("en-IN")
  });
}

function renderActivity(idx) {
  const el = document.getElementById("activityList");
  if (!el) return;
  const acts = leads[idx]?.activity || [];
  el.innerHTML = acts.length
    ? acts.map(a=>`
        <div class="act-item">
          <div class="act-dot"></div>
          <div>
            <div class="act-action">${a.action}</div>
            <div class="act-meta">${a.by} · ${a.time}</div>
          </div>
        </div>`).join("")
    : `<div style="color:#bbb;font-size:12.5px;padding:12px 0;">No activity yet.</div>`;
}

// ─── STEP 3: GLOBAL SEARCH ───────────────────────────────────
function globalSearchInput() {
  const q = document.getElementById("globalSearch").value.trim().toLowerCase();
  const dd = document.getElementById("gsDropdown");
  if (!q || q.length < 2) { dd.style.display = "none"; return; }

  const results = leads
    .filter(l =>
      (l.name||"").toLowerCase().includes(q) ||
      (l.phone||"").toLowerCase().includes(q) ||
      (l.email||"").toLowerCase().includes(q) ||
      (l.city||"").toLowerCase().includes(q)
    )
    .slice(0, 7);

  if (!results.length) {
    dd.innerHTML = `<div class="gs-empty">No results found</div>`;
  } else {
    dd.innerHTML = results.map(l => {
      const ri = leads.indexOf(l);
      return `
        <div class="gs-item" onclick="searchSelect(${ri})">
          <div class="gs-item-name">${highlight(l.name||"—", q)}</div>
          <div class="gs-item-sub">
            ${statusBadge(l.status)}
            <span>${l.phone||""}</span>
            <span>${l.source||""}</span>
          </div>
        </div>`;
    }).join("");
  }
  dd.style.display = "block";
}

function highlight(text, q) {
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return text.slice(0,idx)
    + `<mark style="background:#fef08a;border-radius:2px;">${text.slice(idx,idx+q.length)}</mark>`
    + text.slice(idx+q.length);
}

function showSearchDrop() {
  const q = document.getElementById("globalSearch").value.trim();
  if (q.length >= 2) globalSearchInput();
}

function closeAllPopups() {
  // reset modal state and re-render modals
  Object.keys(modalState).forEach(k => modalState[k] = false);
  renderModals();
  // also ensure the lead detail panel is closed so its backdrop doesn't block clicks
  try { closeDetail(); } catch (e) { /* ignore if not present */ }
}

function searchSelect(idx) {
  document.getElementById("gsDropdown").style.display = "none";
  document.getElementById("globalSearch").value = "";
  showPage("leads");
  setTimeout(() => openDetail(idx), 150);
}

// Close search dropdown when clicking outside
document.addEventListener("click", e => {
  if (!e.target.closest(".global-search-wrap")) {
    const dd = document.getElementById("gsDropdown");
    if (dd) dd.style.display = "none";
  }
  if (!e.target.closest(".bell-wrap") && !e.target.closest(".notif-panel")) {
    const np = document.getElementById("notifPanel");
    if (np) np.style.display = "none";
  }

  // close any popup when clicking its backdrop
  if (e.target.classList && e.target.classList.contains("modal-bg")) {
    e.target.style.display = "none";
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAllPopups();
});

// ─── STEP 3: NOTIFICATIONS ────────────────────────────────────
let notifications = [];


// ── ACTIVITY FEED ────────────────────────────────────────────────────────────
let _afVisible = true;

function toggleActivityFeed() {
  _afVisible = !_afVisible;
  const af = document.getElementById('activityFeed');
  if (af) af.style.display = _afVisible ? 'flex' : 'none';
}

function buildActivityFeed() {
  const el = document.getElementById('afBody');
  if (!el) return;

  const entries = [];
  leads.forEach(lead => {
    (lead.activity || []).slice(0,3).forEach(a => {
      entries.push({ icon: _afIcon(a.action), text: escapeHtml(lead.name||'Lead'), action: escapeHtml(a.action||''), time: a.time||'', by: a.by||'' });
    });
    (lead.notes || []).slice(0,1).forEach(n => {
      entries.push({ icon: '📝', text: escapeHtml(lead.name||'Lead'), action: '"' + escapeHtml((n.text||'').slice(0,36)) + (n.text&&n.text.length>36?'…':'') + '"', time: n.time||'', by: n.by||'' });
    });
  });

  entries.sort((a,b) => b.time.localeCompare(a.time));
  const recent = entries.slice(0, 14);

  if (!recent.length) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = recent.map(e => `
    <div class="af-row">
      <div class="af-avatar">${e.icon}</div>
      <div class="af-info">
        <div class="af-line"><b>${e.text}</b> ${e.action}</div>
        <div class="af-time">${e.by ? e.by + ' · ' : ''}${e.time}</div>
      </div>
    </div>`).join('');
}

function _afIcon(action) {
  if (!action) return '🔔';
  const a = action.toLowerCase();
  if (a.includes('status')) return '🔄';
  if (a.includes('note'))   return '📝';
  if (a.includes('follow')) return '📅';
  if (a.includes('assign')) return '👤';
  if (a.includes('call'))   return '📞';
  if (a.includes('won'))    return '🏆';
  if (a.includes('lost'))   return '❌';
  return '⚡';
}
// ─────────────────────────────────────────────────────────────────────────────

function buildNotifications() {
  notifications = [];
  const today = new Date(); today.setHours(0,0,0,0);

  myLeads().forEach(l => {
    if (!l.followUpDate) return;
    const d = new Date(l.followUpDate); d.setHours(0,0,0,0);
    const diff = Math.round((d - today) / (1000*60*60*24));

    if (diff < 0) {
      notifications.push({
        type:"overdue", icon:"⚠️",
        text:`Follow-up overdue for <b>${l.name}</b>`,
        sub: `${Math.abs(diff)} day(s) overdue`,
        lead: leads.indexOf(l), read: false
      });
    } else if (diff === 0) {
      notifications.push({
        type:"today", icon:"📅",
        text:`Follow-up due today for <b>${l.name}</b>`,
        sub: l.status || "",
        lead: leads.indexOf(l), read: false
      });
    }
  });

  // Leads without assigned user (Admin/Manager only)
  if (canSeeAllLeads(currentUser)) {
    const unassigned = leads.filter(l=>!l.assignedToName).length;
    if (unassigned > 0) {
      notifications.push({
        type:"info", icon:"👤",
        text:`<b>${unassigned}</b> lead(s) are unassigned`,
        sub: "Assign them to a team member", lead:-1, read:false
      });
    }
  }

  updateBell();
  renderNotifList();
  buildActivityFeed();
}

function updateBell() {
  const unread = notifications.filter(n=>!n.read).length;
  const badge  = document.getElementById("bellBadge");
  if (!badge) return;
  if (unread > 0) {
    badge.textContent  = unread > 9 ? "9+" : unread;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById("notifPanel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" ? "block" : "none";
  if (panel.style.display === "block") renderNotifList();
}

function renderNotifList() {
  const el = document.getElementById("notifList");
  if (!el) return;
  if (!notifications.length) {
    el.innerHTML = `<div class="notif-empty">🎉 All caught up! No notifications.</div>`;
    return;
  }
  el.innerHTML = notifications.map((n,i) => `
    <div class="notif-item ${n.read?"notif-read":""}" onclick="notifClick(${i})">
      <span class="notif-icon">${n.icon}</span>
      <div class="notif-body">
        <div class="notif-text">${n.text}</div>
        <div class="notif-sub">${n.sub}</div>
      </div>
      ${!n.read ? `<div class="notif-dot"></div>` : ""}
    </div>`).join("");
}

function notifClick(i) {
  notifications[i].read = true;
  updateBell();
  renderNotifList();
  const li = notifications[i].lead;
  if (li >= 0) {
    document.getElementById("notifPanel").style.display = "none";
    showPage("leads");
    setTimeout(() => openDetail(li), 150);
  }
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  updateBell(); renderNotifList();
}

// ─── STEP 3: LEAD SCORE ───────────────────────────────────────
// Auto-calculates score 0–100 based on lead data quality + engagement
function calcScore(lead) {
  let score = 0;

  // Status score (pipeline position)
  const statusPoints = { New:10, Contacted:25, Qualified:45, Proposal:65, Won:100, Lost:0 };
  score += statusPoints[lead.status] || 10;

  // Bonus points
  if (lead.email)          score += 5;
  if (lead.phone)          score += 5;
  if (lead.city)           score += 3;
  if (lead.followUpDate)   score += 4;
  if ((lead.notes||[]).length > 0) score += 5 * Math.min(3, lead.notes.length);
  if (lead.totalCalls > 0) score += Math.min(10, lead.totalCalls * 2);

  // Source bonus
  if (lead.source === "Referral") score += 8;

  return Math.min(100, score);
}

function scoreBadge(lead) {
  const s = calcScore(lead);
  const color = s >= 70 ? "#10B981" : s >= 40 ? "#f59e0b" : "#e74c3c";
  const label = s >= 70 ? "Hot" : s >= 40 ? "Warm" : "Cold";
  return `
    <div class="score-wrap">
      <div class="score-bar-bg">
        <div class="score-bar" style="width:${s}%;background:${color};"></div>
      </div>
      <span class="score-lbl" style="color:${color};">${s} · ${label}</span>
    </div>`;
}

// ─── STEP 4: API LAYER 
// This is the API abstraction layer.
// RIGHT NOW: uses localStorage (R&D / offline mode)
// PHASE 7: Replace localStorage calls with fetch() to real backend
// Only THIS file needs to change when backend is ready — nothing else.

const API = {
  baseURL: null, // Set this to your backend URL in Phase 7
                 // e.g. "https://api.snappe.com/v1"

  // ── GET ALL LEADS 
  async getLeads() {
    if (this.baseURL) {
      // Phase 7: uncomment this block
      // const res = await fetch(this.baseURL + "/leads", {
      //   headers: { "Authorization": "Bearer " + getAuthToken() }
      // });
      // return await res.json();
    }
    // R&D mode: localStorage
    return JSON.parse(localStorage.getItem("leads_v6") || "[]");
  },

  // ── SAVE LEAD (create or update) ──────────────────────────
  async saveLead(lead, id = null) {
    if (this.baseURL) {
      // Phase 7:
      // const method = id ? "PUT" : "POST";
      // const url    = id ? `${this.baseURL}/leads/${id}` : `${this.baseURL}/leads`;
      // const res = await fetch(url, {
      //   method, headers: { "Content-Type":"application/json", "Authorization":"Bearer "+getAuthToken() },
      //   body: JSON.stringify(lead)
      // });
      // return await res.json();
    }
    // R&D mode: localStorage
    const all = await this.getLeads();
    if (id !== null) {
      all[id] = lead;
    } else {
      all.push(lead);
    }
    localStorage.setItem("leads_v6", JSON.stringify(all));
    return lead;
  },

  // ── DELETE LEAD ───────────────────────────────────────────
  async deleteLead(id) {
    if (this.baseURL) {
      // Phase 7:
      // await fetch(`${this.baseURL}/leads/${id}`, {
      //   method: "DELETE",
      //   headers: { "Authorization": "Bearer " + getAuthToken() }
      // });
      // return;
    }
    // R&D mode: localStorage
    const all = await this.getLeads();
    all.splice(id, 1);
    localStorage.setItem("leads_v6", JSON.stringify(all));
  },

  // ── GET USERS ─────────────────────────────────────────────
  async getUsers() {
    if (this.baseURL) {
      // Phase 7:
      // const res = await fetch(this.baseURL + "/users", {
      //   headers: { "Authorization": "Bearer " + getAuthToken() }
      // });
      // return await res.json();
    }
    return getUsers(); // from auth.js
  },

  // ── AUTH TOKEN (Phase 7) ───────────────────────────────────
  getAuthToken() {
    return localStorage.getItem("authToken") || "";
  }
};

// ─── HELPERS ─────────────────────────────────────────────────
function statusBadge(s) {
  const m={New:"new",Contacted:"contacted",Qualified:"qualified",
           Proposal:"proposal",Won:"won",Lost:"lost",DEAD:"dead"};
  return `<span class="badge b-${m[s]||"new"}">${s||"—"}</span>`;
}

function followupBadge(date) {
  if (!date) return `<span style="color:#bbb;font-size:11px;">—</span>`;
  const d = new Date(date); d.setHours(0,0,0,0);
  const t = new Date();     t.setHours(0,0,0,0);
  const diff = Math.round((d-t)/(1000*60*60*24));
  if (diff < 0)  return `<span class="badge" style="background:#fee2e2;color:#b91c1c;">⚠ ${date}</span>`;
  if (diff === 0)return `<span class="badge" style="background:#fef9c3;color:#92400e;">📅 Today</span>`;
  return `<span class="badge" style="background:#f0fdf4;color:#166534;">${date}</span>`;
}

// ─── WIDGET DEFINITIONS: DYNAMIC WIDGET MANAGEMENT ───────────
// This section provides full CRUD for custom widget definitions and their fields.

function getDefaultWidgetDefinitions() {
  return [
    {
      id: "builtin_chart", name: "Chart", icon: "📊", enabled: true, builtin: true,
      fields: [
        { id: "f_type", label: "Chart Type", type: "dropdown", options: ["bar", "line", "pie", "doughnut", "polarArea", "column"], required: true }
      ]
    },
    {
      id: "builtin_kpi", name: "KPI", icon: "🔢", enabled: true, builtin: true,
      fields: [
        { id: "f_metric", label: "Metric", type: "dropdown", options: ["total", "won", "new", "lost", "calls"], required: true }
      ]
    },
    {
      id: "builtin_table", name: "Lead Counts", icon: "📋", enabled: true, builtin: true,
      fields: []
    },
    {
      id: "builtin_funnel", name: "Funnel", icon: "🔻", enabled: true, builtin: true,
      fields: []
    },
    {
      id: "builtin_target", name: "Target Meter", icon: "🎯", enabled: true, builtin: true,
      fields: [
        { id: "f_target", label: "Target Value", type: "number", required: true }
      ]
    },
    {
      id: "builtin_comparator", name: "Comparator", icon: "⚡", enabled: true, builtin: true,
      fields: []
    },
    {
      id: "builtin_tasks", name: "Tasks", icon: "✅", enabled: true, builtin: true,
      fields: []
    },
    {
      id: "builtin_followups", name: "Follow-ups", icon: "📅", enabled: true, builtin: true,
      fields: []
    }
  ];
}

function getAvailableWidgetDefinitions() {
  // Combine default widgets (filtered by enabled flag) with custom widgets
  const defaults = getDefaultWidgetDefinitions().filter(w => w.enabled);
  const custom = widgetDefinitions.filter(w => w.enabled && !w.builtin);
  return [...defaults, ...custom];
}

function openManageWidgetsModal() {
  closeAllPopups();
  renderWidgetDefList();
  modalState.manageWidgetsModal = true; renderModals();
}

function closeManageWidgetsModal() {
  modalState.manageWidgetsModal = false; renderModals();
}

function renderWidgetDefList() {
  const allDefs = [...getDefaultWidgetDefinitions(), ...widgetDefinitions];
  const listEl = document.getElementById("widgetDefList");
  if (!listEl) return;

  listEl.innerHTML = allDefs.map(w => `
    <div class="widget-def-item ${w.enabled ? "" : "disabled"}">
      <div class="wd-header">
        <div class="wd-icon">${w.icon}</div>
        <div class="wd-info">
          <div class="wd-name">${w.name}</div>
          <div class="wd-status">${w.builtin ? "Built-in" : "Custom"} · ${w.fields.length} field(s)</div>
        </div>
      </div>
      <div class="wd-actions">
        <label class="toggle-switch">
          <input type="checkbox" ${w.enabled ? "checked" : ""} onchange="toggleWidgetDef('${w.id}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
        ${!w.builtin ? `
          <button class="btn btn-sm" onclick="editWidgetDefModal('${w.id}')">✏</button>
          <button class="btn btn-sm btn-del" onclick="deleteWidgetDef('${w.id}')">🗑</button>
        ` : ""}
      </div>
    </div>
  `).join("");
}

function toggleWidgetDef(id, enabled) {
  const def = widgetDefinitions.find(w => w.id === id);
  if (def) {
    def.enabled = enabled;
    saveWidgetDefs();
    renderWidgetDefList();
    renderBuilder(); // Refresh dashboard palette
  }
}

function editWidgetDefModal(id) {
  closeAllPopups();
  editingWidgetDefId = id;
  const def = widgetDefinitions.find(w => w.id === id);
  if (!def) return;

  document.getElementById("widgetDefName").value = def.name || "";
  document.getElementById("widgetDefIcon").value = def.icon || "🧩";
  
  editingFieldIdx = null;
  renderFieldsList(def);
  modalState.widgetDefModal = true; renderModals();
}

function renderFieldsList(def) {
  const listEl = document.getElementById("widgetDefFields");
  if (!listEl) return;

  listEl.innerHTML = (def.fields || []).map((f, i) => `
    <div class="field-item">
      <div class="field-info">
        <div class="field-label">${f.label}</div>
        <div class="field-type">${f.type}${f.required ? " (required)" : ""}</div>
        ${f.type === "dropdown" || f.type === "multiselect" ? `
          <div class="field-options">Options: ${(f.options || []).join(", ")}</div>
        ` : ""}
      </div>
      <div class="field-actions">
        <button class="btn btn-sm" onclick="editFieldModal(${i})">✏</button>
        <button class="btn btn-sm btn-del" onclick="removeField(${i})">🗑</button>
      </div>
    </div>
  `).join("") + `
    <button class="btn btn-primary btn-block" onclick="openAddFieldModal()">+ Add Field</button>
  `;
}

function openAddFieldModal() {
  closeAllPopups();
  editingFieldIdx = null;
  document.getElementById("fieldName").value = "";
  document.getElementById("fieldType").value = "text";
  document.getElementById("fieldRequired").checked = false;
  document.getElementById("fieldOptions").value = "";
  document.getElementById("fieldOptionsRow").style.display = "none";
  modalState.fieldModal = true; renderModals();
}

function editFieldModal(idx) {
  closeAllPopups();
  editingFieldIdx = idx;
  const def = widgetDefinitions.find(w => w.id === editingWidgetDefId);
  if (!def || !def.fields[idx]) return;

  const f = def.fields[idx];
  document.getElementById("fieldName").value = f.label || "";
  document.getElementById("fieldType").value = f.type || "text";
  document.getElementById("fieldRequired").checked = f.required || false;
  document.getElementById("fieldOptions").value = (f.options || []).join("\n");
  toggleFieldTypeOptions();
  modalState.fieldModal = true; renderModals();
}

function toggleFieldTypeOptions() {
  const type = document.getElementById("fieldType")?.value || "text";
  const optionsRow = document.getElementById("fieldOptionsRow");
  if (optionsRow) {
    optionsRow.style.display = ["dropdown", "multiselect", "radio", "checkbox"].includes(type) ? "block" : "none";
  }
}

function saveField() {
  const name = document.getElementById("fieldName").value.trim();
  const type = document.getElementById("fieldType").value;
  const required = document.getElementById("fieldRequired").checked;
  const optionsText = document.getElementById("fieldOptions").value.trim();
  const options = optionsText ? optionsText.split("\n").map(o => o.trim()).filter(Boolean) : [];

  if (!name) { alert("Enter field name"); return; }
  if (["dropdown", "multiselect", "radio"].includes(type) && !options.length) {
    alert("Add at least one option for this field type");
    return;
  }

  const def = widgetDefinitions.find(w => w.id === editingWidgetDefId);
  if (!def) return;

  const field = {
    id: `f_${Date.now()}`,
    label: name,
    type,
    required,
    options: options.length ? options : undefined
  };

  if (editingFieldIdx !== null && def.fields[editingFieldIdx]) {
    def.fields[editingFieldIdx] = { ...def.fields[editingFieldIdx], ...field };
  } else {
    def.fields.push(field);
  }

  saveWidgetDefs();
  modalState.fieldModal = false; renderModals();
  renderFieldsList(def);
}

function removeField(idx) {
  const def = widgetDefinitions.find(w => w.id === editingWidgetDefId);
  if (!def || !def.fields[idx]) return;
  if (!confirm("Remove this field?")) return;
  def.fields.splice(idx, 1);
  saveWidgetDefs();
  renderFieldsList(def);
}

function saveWidgetDef() {
  const name = document.getElementById("widgetDefName").value.trim();
  const icon = document.getElementById("widgetDefIcon").value.trim() || "🧩";
  if (!name) { alert("Enter widget name"); return; }

  const def = widgetDefinitions.find(w => w.id === editingWidgetDefId);
  if (def) {
    def.name = name;
    def.icon = icon;
  }

  saveWidgetDefs();
  modalState.widgetDefModal = false; renderModals();
  editingWidgetDefId = null;
  renderWidgetDefList();
  renderBuilder();
  alert(`✅ Widget "${name}" saved!`);
}

function deleteWidgetDef(id) {
  const def = widgetDefinitions.find(w => w.id === id);
  if (!def || def.builtin) return;
  if (!confirm(`Delete "${def.name}"?`)) return;
  widgetDefinitions = widgetDefinitions.filter(w => w.id !== id);
  saveWidgetDefs();
  renderWidgetDefList();
  renderBuilder();
}

function openCreateWidgetDefModal() {
  closeAllPopups();
  editingWidgetDefId = null;
  editingFieldIdx = null;
  document.getElementById("widgetDefName").value = "";
  document.getElementById("widgetDefIcon").value = "🧩";
  document.getElementById("widgetDefFields").innerHTML = `
    <button class="btn btn-primary btn-block" onclick="openAddFieldModal()">+ Add Field</button>
  `;
  modalState.widgetDefModal = true; renderModals();
}

function createNewWidgetDef() {
  const name = document.getElementById("widgetDefName").value.trim();
  if (!name) { alert("Enter widget name"); return; }

  const newDef = {
    id: `custom_${Date.now()}`,
    name,
    icon: document.getElementById("widgetDefIcon").value.trim() || "🧩",
    enabled: true,
    builtin: false,
    fields: []
  };

  widgetDefinitions.push(newDef);
  editingWidgetDefId = newDef.id;
  saveWidgetDefs();
  renderFieldsList(newDef);
  alert(`✅ Widget "${name}" created! Now add fields.`);
}

function closeFieldModal() {
  modalState.fieldModal = false; renderModals();
}

function closeWidgetDefModal() {
  modalState.widgetDefModal = false; renderModals();
  editingWidgetDefId = null;
  editingFieldIdx = null;
  renderManageWidgetsModal();
}

function renderManageWidgetsModal() {
  renderWidgetDefList();
}

function renderCustomWidgetInPalette() {
  const paletteEl = document.querySelector(".palette");
  if (!paletteEl) return;
  
  const customDefs = getAvailableWidgetDefinitions().filter(w => !w.builtin);
  if (!customDefs.length) return;

  let customSection = paletteEl.querySelector(".pal-section-custom");
  if (!customSection) {
    customSection = document.createElement("div");
    customSection.className = "pal-section pal-section-custom";
    customSection.textContent = "Custom Widgets";
    paletteEl.appendChild(customSection);
  }

  let customItems = "";
  for (let i = 0; i < customDefs.length; i++) {
    const w = customDefs[i];
    customItems += "<div class='pal-item' draggable='true' data-type='" + escapeHtml(w.id) + "' ondragstart='dragFromPalette(event)'>";
    customItems += "<div class='pal-ico' style='background:#9333ea;'>" + escapeHtml(w.icon || "") + "</div>";
    customItems += "<div><div class='pal-name'>" + escapeHtml(w.name) + "</div><div class='pal-sub'>" + (w.fields ? w.fields.length : 0) + " field(s)</div></div>";
    customItems += "</div>";
  }

  let customItemsContainer = paletteEl.querySelector(".pal-custom-items");
  if (!customItemsContainer) {
    customItemsContainer = document.createElement("div");
    customItemsContainer.className = "pal-custom-items";
    paletteEl.appendChild(customItemsContainer);
  }
  customItemsContainer.innerHTML = customItems;
}

function renderDynamicWidget(w, body, ml) {
  const def = [...getDefaultWidgetDefinitions(), ...widgetDefinitions].find(d => d.id === w.type);
  if (!def) {
    body.innerHTML = "<div class='w-empty'>Widget type not found</div>";
    return;
  }

  // For custom widgets, render a form-like display of their fields and values
  if (!def.builtin) {
    let html = "<div class='custom-widget-content'>";
    html += "<div class='cw-title'>" + escapeHtml(w.title || def.name) + "</div>";
    html += "<div class='cw-fields'>";
    for (let i = 0; i < (def.fields || []).length; i++) {
      const f = def.fields[i];
      html += "<div class='cw-field'>";
      html += "<label>" + escapeHtml(f.label) + (f.required ? "*" : "") + "</label>";
      html += renderFieldInput(f, w.fieldValues?.[f.id]);
      html += "</div>";
    }
    html += "</div>";
    html += "<div class='cw-actions'>";
    html += "<button class='btn btn-sm' onclick=\"editWidget('" + escapeHtml(w.id) + "')\">✏ Edit</button>";
    html += "<button class='btn btn-sm btn-del' onclick=\"delWidget('" + escapeHtml(w.id) + "')\">✕ Remove</button>";
    html += "</div>";
    html += "</div>";
    body.innerHTML = html;
    return;
  }

  // For built-in widgets, render using existing render functions
  switch (w.type) {
    case "builtin_chart": drawChart(w, body, ml); break;
    case "builtin_kpi": drawKPI(w, body, ml); break;
    case "builtin_table": drawCountWidget(w, body, ml); break;
    case "builtin_funnel": drawFunnel(w, body, ml); break;
    case "builtin_target": drawTarget(w, body, ml); break;
    case "builtin_comparator": drawChart({ ...w, chartType: "bar" }, body, ml); break;
    case "builtin_tasks": drawTasks(w, body); break;
    case "builtin_followups": drawFollowups(w, body, ml); break;
    default: body.innerHTML = "<div class='w-empty'>Unknown widget type</div>";
  }
}

function renderFieldInput(field, value = "") {
  const v = value || "";
  switch (field.type) {
    case "text":
      return "<input type='text' value='" + escapeHtml(v) + "' onchange=\"updateWidgetFieldValue('" + field.id + "', this.value)\">";
    case "number":
      return "<input type='number' value='" + v + "' onchange=\"updateWidgetFieldValue('" + field.id + "', this.value)\">";
    case "date":
      return "<input type='date' value='" + v + "' onchange=\"updateWidgetFieldValue('" + field.id + "', this.value)\">";
    case "email":
      return "<input type='email' value='" + escapeHtml(v) + "' onchange=\"updateWidgetFieldValue('" + field.id + "', this.value)\">";
    case "phone":
      return "<input type='tel' value='" + escapeHtml(v) + "' onchange=\"updateWidgetFieldValue('" + field.id + "', this.value)\">";
    case "url":
      return "<input type='url' value='" + escapeHtml(v) + "' onchange=\"updateWidgetFieldValue('" + field.id + "', this.value)\">";
    case "textarea":
      return "<textarea onchange=\"updateWidgetFieldValue('" + field.id + "', this.value)\">" + escapeHtml(v) + "</textarea>";
    case "checkbox":
      return "<input type='checkbox' " + (v ? "checked" : "") + " onchange=\"updateWidgetFieldValue('" + field.id + "', this.checked)\">";
    case "dropdown":
    case "radio": {
      let opts = "";
      for (let i = 0; i < (field.options || []).length; i++) {
        const o = field.options[i];
        const selected = o === v ? "selected" : "";
        opts += "<option value='" + escapeHtml(o) + "' " + selected + ">" + escapeHtml(o) + "</option>";
      }
      return "<select onchange=\"updateWidgetFieldValue('" + field.id + "', this.value)\">" + opts + "</select>";
    }
    case "multiselect": {
      const vals = Array.isArray(v) ? v : (v ? String(v).split(",") : []);
      let mopts = "";
      for (let i = 0; i < (field.options || []).length; i++) {
        const o = field.options[i];
        const selected = vals.includes(o) ? "selected" : "";
        mopts += "<option value='" + escapeHtml(o) + "' " + selected + ">" + escapeHtml(o) + "</option>";
      }
      return "<select multiple onchange=\"updateWidgetFieldValue('" + field.id + "', Array.from(this.selectedOptions).map(opt => opt.value))\">" + mopts + "</select>";
    }
    default:
      return "<input type='text' value='" + escapeHtml(v) + "'>";
  }
}

function updateWidgetFieldValue(fieldId, value) {
  const w = getDash()?.widgets.find(wg => wg.id === (editingWidgetDefId || ""));
  if (w) {
    if (!w.fieldValues) w.fieldValues = {};
    w.fieldValues[fieldId] = value;
    saveDashes();
    persistCurrentDashboard();
  }  
}

// ─── DYNAMIC FILTERS (Leads page toolbar) ────────────────────────────

function populateDynamicFilters() {
  // Populate Source filter from the source column options
  const srcCol  = columns.find(c => c.key === "source");
  const statCol = columns.find(c => c.key === "status");
  const fSrc    = document.getElementById("fSrc");
  const fStat   = document.getElementById("fStat");

  if (fSrc) {
    const prevSrc = fSrc.value;
    const opts = normalizeColumnOptions(srcCol?.options || []);
    let html = "<option value=''>All Sources</option>";
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i];
      const selected = o.value === prevSrc ? " selected" : "";
      html += "<option value='" + escapeHtml(o.value) + "'" + selected + ">" + escapeHtml(o.label) + "</option>";
    }
    fSrc.innerHTML = html;
  }

  if (fStat) {
    const prevStat = fStat.value;
    const opts = normalizeColumnOptions(statCol?.options || []);
    let html = "<option value=''>All Status</option>";
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i];
      const selected = o.value === prevStat ? " selected" : "";
      html += "<option value='" + escapeHtml(o.value) + "'" + selected + ">" + escapeHtml(o.label) + "</option>";
    }
    fStat.innerHTML = html;
  }

  // Inject a filter dropdown for every custom dropdown/multiselect column
  const bar = document.getElementById("dynamicFiltersBar");
  if (!bar) return;

  const customCols = columns.filter(c =>
    !DEFAULT_COLS.some(d => d.key === c.key) &&
    (c.type === "select" || c.type === "multiselect") &&
    Array.isArray(c.options) && c.options.length
  );

  // Remove old dynamic selects
  bar.querySelectorAll("select[data-dynamic-filter]").forEach(el => el.remove());

  for (let colIdx = 0; colIdx < customCols.length; colIdx++) {
    const col = customCols[colIdx];
    const prev = bar.querySelector("select[data-dynamic-filter='" + col.key + "']")?.value || "";
    const opts = normalizeColumnOptions(col.options);
    const sel  = document.createElement("select");
    sel.setAttribute("data-dynamic-filter", col.key);
    sel.setAttribute("onchange", "renderLeads()");
    
    let html = "<option value=''>All " + escapeHtml(col.label) + "</option>";
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i];
      const selected = o.value === prev ? " selected" : "";
      html += "<option value='" + escapeHtml(o.value) + "'" + selected + ">" + escapeHtml(o.label) + "</option>";
    }
    sel.innerHTML = html;
    bar.appendChild(sel);
  }
}

// ─── INJECT CUSTOM FIELDS INTO CHART GROUP-BY ────────────────────────

function injectCustomGroupByOptions() {
  const cfgGroup = document.getElementById("cfgGroup");
  if (!cfgGroup) return;

  // Remove previously injected options
  cfgGroup.querySelectorAll("option[data-custom-inject]").forEach(o => o.remove());

  const customCols = columns.filter(c => !DEFAULT_COLS.some(d => d.key === c.key));
  if (!customCols.length) return;

  const sep = document.createElement("option");
  sep.disabled = true;
  sep.textContent = "── Custom Fields ──";
  sep.setAttribute("data-custom-inject", "true");
  cfgGroup.appendChild(sep);

  customCols.forEach(col => {
    const opt = document.createElement("option");
    opt.value = "custom:" + col.key;
    opt.textContent = col.label;
    opt.setAttribute("data-custom-inject", "true");
    cfgGroup.appendChild(opt);
  });
}
