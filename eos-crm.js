const STORAGE_KEY = "eos_crm_v2";
const SUPABASE_CFG_KEY = "eos_supabase_cfg_v1";
const DEFAULT_SB_URL = "https://rqgwhbzailzfffthaznp.supabase.co";
const DEFAULT_SB_ANON_KEY = "sb_publishable_9gXQkDsguE8xBq3VgpjqCA_8vdpLPro";
let map = null;
let visitMarkers = [];
let heatLayer = null;
let routeLines = [];
let schoolMarkers = [];
let showSchools = true;
let mapMode = "markers";
let pendingPick = null;

const SELLER_COLORS = ["#3554d1","#e84545","#f59f00","#20c997","#9b59b6","#e67e22","#1abc9c","#e91e63"];
function sellerColor(sellerId) {
  const idx = state?.sellers?.findIndex(s => s.id === sellerId) ?? -1;
  return SELLER_COLORS[idx >= 0 ? idx % SELLER_COLORS.length : 0];
}
let funnelChart = null;
let visitsChart = null;

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = (p = "id") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
const nowISO = () => new Date().toISOString();
const stageLabel = (s) => ({ nuevo: "Nuevo", contactado: "Contactado", demo: "Demo", propuesta: "Propuesta", ganado: "Ganado", perdido: "Perdido" }[s] || s || "—");
const byId = (arr, id) => arr.find((x) => x.id === id) || null;
const safeJson = (t, fb) => { try { return JSON.parse(t); } catch { return fb; } };
function fmtDateTime(iso) { try { return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)); } catch { return iso; } }
function toast(msg) { const root = qs("#modalRoot"); const b = document.createElement("div"); b.className = "modal-backdrop"; b.innerHTML = `<div class="modal"><div class="body">${msg}</div></div>`; root.appendChild(b); setTimeout(() => b.remove(), 1200); }

function loadSupabaseCfg() {
  const c = safeJson(localStorage.getItem(SUPABASE_CFG_KEY) || "null", null);
  return c || { enabled: true, url: DEFAULT_SB_URL, anonKey: DEFAULT_SB_ANON_KEY };
}
function saveSupabaseCfg(cfg) { localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify(cfg)); }

function createDefaultState() {
  const adminId = uid("user");
  return {
    users: [{ id: adminId, name: "Super Admin", email: "admin@eos.com", password: "admin123", role: "super_admin", active: true, createdAt: nowISO() }],
    sessionUserId: null,
    sellers: [],
    leads: [],
    visits: [],
    activity: [],
    ui: { lastMapCenter: { lat: 13.6929, lng: -89.2182, zoom: 13 } },
  };
}
function normalizeState(s) {
  const d = createDefaultState();
  return {
    users: Array.isArray(s.users) && s.users.length ? s.users : d.users,
    sessionUserId: s.sessionUserId || null,
    sellers: Array.isArray(s.sellers) ? s.sellers : [],
    leads: Array.isArray(s.leads) ? s.leads : [],
    visits: Array.isArray(s.visits) ? s.visits : [],
    activity: Array.isArray(s.activity) ? s.activity : [],
    ui: s.ui || d.ui,
  };
}
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return normalizeState(raw ? safeJson(raw, createDefaultState()) : createDefaultState());
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();
let sbCfg = loadSupabaseCfg();
let sb = null;
const currentUser = () => byId(state.users, state.sessionUserId);
const isSuperAdmin = () => currentUser()?.role === "super_admin";
const canManageSellers = () => isSuperAdmin();
const canManageUsers = () => isSuperAdmin();
const canManageSettings = () => isSuperAdmin();

function pushActivity(type, message) {
  state.activity.unshift({ id: uid("act"), at: nowISO(), type, message });
  state.activity = state.activity.slice(0, 30);
}

function ensureSupabase() {
  if (!(sbCfg.enabled && sbCfg.url && sbCfg.anonKey && window.supabase?.createClient)) return null;
  if (!sb) sb = window.supabase.createClient(sbCfg.url, sbCfg.anonKey);
  return sb;
}
async function sbUpsert(table, payload) {
  const c = ensureSupabase(); if (!c) return;
  const { error } = await c.from(table).upsert(payload, { onConflict: "id" });
  if (error) throw error;
}
async function sbDelete(table, id) {
  const c = ensureSupabase(); if (!c) return;
  const { error } = await c.from(table).delete().eq("id", id);
  if (error) throw error;
}
async function syncFromSupabase() {
  const c = ensureSupabase(); if (!c) throw new Error("Supabase no configurado");
  const [sellers, leads, visits] = await Promise.all([
    c.from("eos_sellers").select("*"),
    c.from("eos_leads").select("*"),
    c.from("eos_visits").select("*"),
  ]);
  if (sellers.error || leads.error || visits.error) throw new Error("Error de sync");
  state.sellers = sellers.data.map((r) => ({ id: r.id, createdAt: r.created_at, name: r.name, email: r.email, phone: r.phone, zone: r.zone }));
  state.leads = leads.data.map((r) => ({ id: r.id, createdAt: r.created_at, name: r.name, city: r.city, contact: r.contact, phone: r.phone, email: r.email, stage: r.stage, ownerSellerId: r.owner_seller_id || "", notes: r.notes || "" }));
  state.visits = visits.data.map((r) => ({ id: r.id, createdAt: r.created_at, sellerId: r.seller_id, leadId: r.lead_id, at: r.at, kind: r.kind, notes: r.notes || "", lat: r.lat, lng: r.lng, accuracyM: r.accuracy_m }));
  pushActivity("sync", "Sincronizado desde Supabase");
  saveState();
}

function openModal({ title, bodyHTML, onSave }) {
  const root = qs("#modalRoot");
  const b = document.createElement("div");
  b.className = "modal-backdrop";
  b.innerHTML = `<div class="modal"><header><h3>${title}</h3><button class="btn btn-secondary close">Cerrar</button></header><div class="body">${bodyHTML}</div><div class="footer"><button class="btn btn-secondary close">Cancelar</button><button class="btn btn-primary save">Guardar</button></div></div>`;
  root.appendChild(b);
  qsa(".close", b).forEach((x) => x.addEventListener("click", () => b.remove()));
  qs(".save", b).addEventListener("click", async () => { const ok = await onSave?.(b); if (ok !== false) b.remove(); });
}

function setView(view) {
  qsa(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.view === view));
  qsa(".view").forEach((v) => v.classList.toggle("is-hidden", v.dataset.view !== view));
  document.body.classList.remove("nav-open");
  if (view === "visits") {
    ensureMap();
    setTimeout(() => map && map.invalidateSize(), 50);
  }
  renderAll();
}

function renderSession() {
  const user = currentUser();
  qs("#sessionBadge").textContent = user ? `${user.name} (${user.role === "super_admin" ? "Super Admin" : "Vendedor"})` : "Invitado";
  qsa(".tab-admin").forEach((el) => (el.style.display = isSuperAdmin() ? "" : "none"));
  qs('[data-view="settings"]').style.display = canManageSettings() ? "" : "none";
  qs("#addSellerBtn").style.display = canManageSellers() ? "" : "none";
}

function renderKpis() {
  const root = qs("#kpis");
  const won = state.leads.filter((l) => l.stage === "ganado").length;
  root.innerHTML = `<div class="kpi"><strong>${state.leads.length}</strong><span>Leads</span></div>
  <div class="kpi"><strong>${state.sellers.length}</strong><span>Vendedores</span></div>
  <div class="kpi"><strong>${state.visits.length}</strong><span>Visitas</span></div>
  <div class="kpi"><strong>${won}</strong><span>Ganados</span></div>`;
}

function renderCharts() {
  if (!window.Chart) return;
  const stages = ["nuevo", "contactado", "demo", "propuesta", "ganado", "perdido"];
  const stageData = stages.map((s) => state.leads.filter((l) => l.stage === s).length);
  const sellerNames = state.sellers.map((s) => s.name);
  const sellerData = state.sellers.map((s) => state.visits.filter((v) => v.sellerId === s.id).length);
  if (funnelChart) funnelChart.destroy();
  if (visitsChart) visitsChart.destroy();
  const ctx1 = qs("#funnelChart")?.getContext("2d");
  const ctx2 = qs("#visitsChart")?.getContext("2d");
  if (ctx1) funnelChart = new Chart(ctx1, { type: "bar", data: { labels: stages.map(stageLabel), datasets: [{ data: stageData, backgroundColor: "#3554d1" }] }, options: { plugins: { legend: { display: false } } } });
  if (ctx2) visitsChart = new Chart(ctx2, { type: "doughnut", data: { labels: sellerNames.length ? sellerNames : ["Sin datos"], datasets: [{ data: sellerData.length ? sellerData : [1], backgroundColor: ["#3554d1", "#4f7cff", "#8ea6ff", "#c5d2ff"] }] }, options: { plugins: { legend: { position: "bottom" } } } });
}

function filteredLeads() {
  const q = (qs("#leadSearch")?.value || "").toLowerCase();
  const stage = qs("#leadStageFilter")?.value || "";
  return state.leads.filter((l) => (!stage || l.stage === stage) && `${l.name} ${l.city} ${l.contact}`.toLowerCase().includes(q));
}
function filteredVisits() {
  const sellerId = qs("#visitSellerFilter")?.value || "";
  const q = (qs("#visitTextFilter")?.value || "").toLowerCase();
  return state.visits.filter((v) => (!sellerId || v.sellerId === sellerId) && `${v.notes || ""}`.toLowerCase().includes(q));
}

function renderLeads() {
  const leads = isSuperAdmin() ? filteredLeads() : filteredLeads().filter((l) => l.ownerSellerId === currentUser()?.sellerId || !l.ownerSellerId);
  const root = qs("#leadsTable");
  root.innerHTML = `<div class="t-head"><div>Lead</div><div>Etapa</div><div>Ciudad</div><div>Vendedor</div><div>Creado</div><div>Acciones</div></div>`;
  if (!leads.length) { root.innerHTML += `<div class="t-row"><div class="muted">No hay leads para mostrar</div><div></div><div></div><div></div><div></div><div></div></div>`; return; }
  leads.forEach((l) => {
    const s = byId(state.sellers, l.ownerSellerId);
    root.innerHTML += `<div class="t-row"><div><div class="main">${l.name}</div><div class="minor">${l.contact || ""}</div></div><div><span class="pill">${stageLabel(l.stage)}</span></div><div>${l.city || "—"}</div><div>${s?.name || "Sin asignar"}</div><div>${fmtDateTime(l.createdAt)}</div><div class="actions"><button class="btn btn-secondary lead-edit" data-id="${l.id}">Editar</button><button class="btn btn-danger lead-del" data-id="${l.id}">Borrar</button></div></div>`;
  });
  qsa(".lead-edit").forEach((b) => b.addEventListener("click", () => openLeadModal(byId(state.leads, b.dataset.id))));
  qsa(".lead-del").forEach((b) => b.addEventListener("click", () => deleteLead(b.dataset.id)));
}

function renderSellers() {
  const root = qs("#sellersList");
  root.innerHTML = "";
  state.sellers.forEach((s) => {
    const leadCount = state.leads.filter((l) => l.ownerSellerId === s.id).length;
    root.innerHTML += `<div class="row"><div><div class="title">${s.name}</div><div class="sub">${[s.email, s.phone, s.zone].filter(Boolean).join(" · ") || "—"}</div></div><div class="sub">Leads: ${leadCount}</div><div class="actions">${canManageSellers() ? `<button class="btn btn-secondary seller-edit" data-id="${s.id}">Editar</button><button class="btn btn-danger seller-del" data-id="${s.id}">Borrar</button>` : ""}</div></div>`;
  });
  qsa(".seller-edit").forEach((b) => b.addEventListener("click", () => openSellerModal(byId(state.sellers, b.dataset.id))));
  qsa(".seller-del").forEach((b) => b.addEventListener("click", () => deleteSeller(b.dataset.id)));
}

function renderUsers() {
  const root = qs("#usersList");
  if (!root) return;
  root.innerHTML = canManageUsers() ? "" : `<div class="pill">Sin permisos para usuarios</div>`;
  if (!canManageUsers()) return;
  state.users.forEach((u) => {
    root.innerHTML += `<div class="row"><div><div class="title">${u.name}</div><div class="sub">${u.email}</div></div><div><span class="pill">${u.role}</span></div><div class="actions"><button class="btn btn-secondary user-edit" data-id="${u.id}">Editar</button>${u.role !== "super_admin" ? `<button class="btn btn-danger user-del" data-id="${u.id}">Borrar</button>` : ""}</div></div>`;
  });
  qsa(".user-edit").forEach((b) => b.addEventListener("click", () => openUserModal(byId(state.users, b.dataset.id))));
  qsa(".user-del").forEach((b) => b.addEventListener("click", () => { state.users = state.users.filter((u) => u.id !== b.dataset.id); saveState(); renderUsers(); }));
}

function renderVisits() {
  const visits = filteredVisits();
  const root = qs("#visitsList");
  root.innerHTML = "";
  visits.forEach((v) => {
    const s = byId(state.sellers, v.sellerId);
    const l = byId(state.leads, v.leadId);
    root.innerHTML += `<div class="row"><div><div class="title">${s?.name || "Vendedor"} · ${l?.name || "Lead"}</div><div class="sub">${fmtDateTime(v.at)} · ${v.kind || "visita"}</div><div class="sub">${v.notes || ""}</div></div><div class="sub">${v.lat && v.lng ? `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}` : "Sin ubicación"}</div><div class="actions"><button class="btn btn-secondary visit-edit" data-id="${v.id}">Editar</button><button class="btn btn-danger visit-del" data-id="${v.id}">Borrar</button></div></div>`;
  });
  qsa(".visit-edit").forEach((b) => b.addEventListener("click", () => openVisitModal(byId(state.visits, b.dataset.id))));
  qsa(".visit-del").forEach((b) => b.addEventListener("click", () => deleteVisit(b.dataset.id)));
  renderVisitMarkers(visits);
}

function renderActivity() {
  const root = qs("#recentActivity");
  root.innerHTML = state.activity.slice(0, 8).map((a) => `<div class="row"><div class="title">${a.message}</div><div class="sub">${fmtDateTime(a.at)}</div><div><span class="pill">${a.type}</span></div></div>`).join("") || `<div class="pill">Sin actividad todavía</div>`;
}
function renderVisitFilters() {
  const sel = qs("#visitSellerFilter"); const p = sel.value;
  sel.innerHTML = `<option value="">Todos los vendedores</option>` + state.sellers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  sel.value = p;
}
function renderSupabaseStatus() { const s = qs("#sbStatus"); if (s) s.textContent = sbCfg.enabled ? "Estado: Supabase" : "Estado: Local"; }
function renderAuthUI() {
  const logged = !!currentUser();
  qs("#authView").classList.toggle("is-hidden", logged);
  qs("#appView").classList.toggle("is-hidden", !logged);
  qs("#logoutBtn").style.display = logged ? "" : "none";
}
function renderAll() {
  renderAuthUI();
  renderSession();
  if (!currentUser()) return;
  renderKpis();
  renderActivity();
  renderVisitFilters();
  renderLeads();
  renderSellers();
  renderVisits();
  renderUsers();
  renderCharts();
}

function openUserModal(existing = null) {
  if (!canManageUsers()) return toast("Solo Super Admin");
  openModal({
    title: existing ? "Editar usuario" : "Nuevo usuario",
    bodyHTML: `<form class="form"><label class="full">Nombre<input class="input" name="name" value="${existing?.name || ""}" /></label><label>Email<input class="input" name="email" value="${existing?.email || ""}" /></label><label>Contraseña<input class="input" name="password" value="${existing?.password || ""}" /></label><label>Rol<select class="input" name="role"><option value="seller">Vendedor</option><option value="super_admin">Super Admin</option></select></label></form>`,
    onSave: (m) => {
      const f = qs("form", m); const fd = new FormData(f);
      const payload = { name: String(fd.get("name") || ""), email: String(fd.get("email") || "").toLowerCase(), password: String(fd.get("password") || ""), role: String(fd.get("role") || "seller"), active: true };
      if (!payload.email || !payload.password) return false;
      if (existing) Object.assign(existing, payload); else state.users.push({ id: uid("user"), createdAt: nowISO(), ...payload });
      saveState(); renderUsers(); renderSession(); return true;
    },
  });
  setTimeout(() => { const role = qs('select[name="role"]', document); if (role && existing?.role) role.value = existing.role; }, 0);
}

function openSellerModal(existing = null) {
  if (!canManageSellers()) return toast("Solo Super Admin puede gestionar vendedores");
  openModal({
    title: existing ? "Editar vendedor" : "Nuevo vendedor",
    bodyHTML: `<form class="form"><label class="full">Nombre<input class="input" name="name" value="${existing?.name || ""}"></label><label>Email<input class="input" name="email" value="${existing?.email || ""}"></label><label>Teléfono<input class="input" name="phone" value="${existing?.phone || ""}"></label><label>Zona<input class="input" name="zone" value="${existing?.zone || ""}"></label></form>`,
    onSave: async (m) => {
      const fd = new FormData(qs("form", m)); const name = String(fd.get("name") || "").trim(); if (!name) return false;
      const patch = { name, email: String(fd.get("email") || ""), phone: String(fd.get("phone") || ""), zone: String(fd.get("zone") || "") };
      const obj = existing || { id: uid("seller"), createdAt: nowISO() };
      Object.assign(obj, patch); if (!existing) state.sellers.push(obj);
      pushActivity("seller", `${existing ? "Actualizado" : "Creado"} vendedor: ${name}`);
      saveState(); renderAll();
      sbUpsert("eos_sellers", { id: obj.id, name: obj.name, email: obj.email || null, phone: obj.phone || null, zone: obj.zone || null }).catch(() => {});
      return true;
    },
  });
}
function deleteSeller(id) {
  if (!canManageSellers()) return toast("Solo Super Admin");
  if (state.leads.some((l) => l.ownerSellerId === id) || state.visits.some((v) => v.sellerId === id)) return toast("Tiene leads o visitas asociadas");
  state.sellers = state.sellers.filter((s) => s.id !== id); saveState(); renderAll(); sbDelete("eos_sellers", id).catch(() => {});
}

function openLeadModal(existing = null) {
  openModal({
    title: existing ? "Editar lead" : "Nuevo lead",
    bodyHTML: `<form class="form"><label class="full">Institución<input class="input" name="name" value="${existing?.name || ""}"></label><label>Ciudad<input class="input" name="city" value="${existing?.city || ""}"></label><label class="full">Dirección exacta<input class="input" name="address" value="${existing?.address || ""}" placeholder="Ej: Cra 7 #45-23, Bogotá"></label><label>Contacto<input class="input" name="contact" value="${existing?.contact || ""}"></label><label>Teléfono<input class="input" name="phone" value="${existing?.phone || ""}"></label><label>Email<input class="input" name="email" value="${existing?.email || ""}"></label><label>Etapa<select class="input" name="stage"><option value="nuevo">Nuevo</option><option value="contactado">Contactado</option><option value="demo">Demo</option><option value="propuesta">Propuesta</option><option value="ganado">Ganado</option><option value="perdido">Perdido</option></select></label><label class="full">Vendedor<select class="input" name="ownerSellerId"><option value="">Sin asignar</option>${state.sellers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}</select></label><label class="full">Notas<textarea class="input" name="notes">${existing?.notes || ""}</textarea></label></form>`,
    onSave: async (m) => {
      const f = qs("form", m); const fd = new FormData(f); const name = String(fd.get("name") || "").trim(); if (!name) return false;
      const obj = existing || { id: uid("lead"), createdAt: nowISO() };
      Object.assign(obj, { name, city: String(fd.get("city") || ""), address: String(fd.get("address") || ""), contact: String(fd.get("contact") || ""), phone: String(fd.get("phone") || ""), email: String(fd.get("email") || ""), stage: String(fd.get("stage") || "nuevo"), ownerSellerId: String(fd.get("ownerSellerId") || ""), notes: String(fd.get("notes") || "") });
      if (!existing) state.leads.push(obj);
      pushActivity("lead", `${existing ? "Actualizado" : "Creado"} lead: ${name}`); saveState(); renderAll();
      sbUpsert("eos_leads", { id: obj.id, name: obj.name, city: obj.city || null, contact: obj.contact || null, phone: obj.phone || null, email: obj.email || null, stage: obj.stage, owner_seller_id: obj.ownerSellerId || null, notes: obj.notes || null }).catch(() => {});
      return true;
    },
  });
  setTimeout(() => { if (existing) { qs('select[name="stage"]') && (qs('select[name="stage"]').value = existing.stage || "nuevo"); qs('select[name="ownerSellerId"]') && (qs('select[name="ownerSellerId"]').value = existing.ownerSellerId || ""); } }, 0);
}
function deleteLead(id) { if (state.visits.some((v) => v.leadId === id)) return toast("No se puede borrar: tiene visitas"); state.leads = state.leads.filter((l) => l.id !== id); saveState(); renderAll(); sbDelete("eos_leads", id).catch(() => {}); }

function ensureMap() {
  if (map || !qs("#map")) return;
  // Use saved center, or current user's login location, or browser geolocation
  const userLoc = currentUser() && state.ui.sellerLocations?.[currentUser().id];
  const saved = state.ui.lastMapCenter;
  const defaultCenter = userLoc
    ? { lat: userLoc.lat, lng: userLoc.lng, zoom: 13 }
    : saved?.zoom ? saved : null;
  const fallback = { lat: 13.6929, lng: -89.2182, zoom: 13 }; // San Salvador
  const c = defaultCenter || fallback;
  map = L.map(qs("#map")).setView([c.lat, c.lng], c.zoom || 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  map.on("moveend", () => {
    const center = map.getCenter();
    state.ui.lastMapCenter = { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
    saveState();
    if (map.getZoom() >= 12) fetchNearbySchools();
  });
  map.on("click", (ev) => { if (!pendingPick) return; const r = pendingPick; pendingPick = null; r({ lat: ev.latlng.lat, lng: ev.latlng.lng }); toast("Ubicación seleccionada"); });
  // If no saved center yet, try to auto-locate
  if (!defaultCenter && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 13);
    }, null, { timeout: 5000 });
  }
  setTimeout(() => fetchNearbySchools(), 800);
}

function clearMapLayers() {
  visitMarkers.forEach(m => m.remove()); visitMarkers = [];
  if (heatLayer) { heatLayer.remove(); heatLayer = null; }
  routeLines.forEach(l => l.remove()); routeLines = [];
}

function clearSchoolMarkers() {
  schoolMarkers.forEach(m => m.remove()); schoolMarkers = [];
}

const schoolIcon = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid #f59f00;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.25)">🏫</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

async function fetchNearbySchools() {
  if (!map || !showSchools) return;
  const b = map.getBounds();
  const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  const query = `[out:json][timeout:15];(node["amenity"="school"]["name"](${bbox});way["amenity"="school"]["name"](${bbox}););out center;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    clearSchoolMarkers();
    data.elements.forEach(el => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) return;
      const name = el.tags?.name || "Colegio";
      const addr = [el.tags?.["addr:street"], el.tags?.["addr:housenumber"], el.tags?.["addr:city"]].filter(Boolean).join(", ");
      const alreadyLead = state.leads.some(l => l.name.toLowerCase() === name.toLowerCase());
      const popupHtml = `
        <div class="map-popup">
          <div class="mp-header" style="border-left:4px solid #f59f00">
            <strong class="mp-name">${name}</strong>
            ${alreadyLead ? `<span class="mp-stage" style="background:#20c99720;color:#20c997">Ya es lead</span>` : `<span class="mp-stage" style="background:#f59f0020;color:#c87f00">Sin lead</span>`}
          </div>
          ${addr ? `<div class="mp-row">📍 ${addr}</div>` : ""}
          ${el.tags?.phone ? `<div class="mp-row">📞 <a href="tel:${el.tags.phone}">${el.tags.phone}</a></div>` : ""}
          ${el.tags?.website ? `<div class="mp-row">🌐 <a href="${el.tags.website}" target="_blank">Sitio web</a></div>` : ""}
          <div class="mp-divider"></div>
          ${!alreadyLead ? `<button class="btn btn-primary mp-add-lead" style="width:100%;margin-top:4px"
            data-name="${name.replace(/"/g,'&quot;')}"
            data-addr="${addr.replace(/"/g,'&quot;')}"
            data-lat="${lat}" data-lng="${lng}">+ Agregar como lead</button>` : ""}
        </div>`;
      const m = L.marker([lat, lng], { icon: schoolIcon }).addTo(map);
      m.bindPopup(popupHtml, { maxWidth: 260 });
      m.on("popupopen", () => {
        setTimeout(() => {
          qs(".mp-add-lead")?.addEventListener("click", (e) => {
            const { name: n, addr: a, lat: la, lng: lo } = e.target.dataset;
            openLeadFromSchool(n, a, parseFloat(la), parseFloat(lo));
            m.closePopup();
          });
        }, 0);
      });
      schoolMarkers.push(m);
    });
    qs("#schoolCount") && (qs("#schoolCount").textContent = `${schoolMarkers.length} colegios`);
  } catch { /* silencioso si falla overpass */ }
}

function openLeadFromSchool(name, address, lat, lng) {
  openModal({
    title: "Nuevo lead desde mapa",
    bodyHTML: `<form class="form">
      <label class="full">Institución<input class="input" name="name" value="${name}"></label>
      <label class="full">Dirección<input class="input" name="address" value="${address}"></label>
      <label>Ciudad<input class="input" name="city" value=""></label>
      <label>Contacto<input class="input" name="contact" value=""></label>
      <label>Teléfono<input class="input" name="phone" value=""></label>
      <label>Email<input class="input" name="email" value=""></label>
      <label>Etapa<select class="input" name="stage">
        <option value="nuevo">Nuevo</option><option value="contactado">Contactado</option>
        <option value="demo">Demo</option><option value="propuesta">Propuesta</option>
        <option value="ganado">Ganado</option><option value="perdido">Perdido</option>
      </select></label>
      <label class="full">Vendedor<select class="input" name="ownerSellerId">
        <option value="">Sin asignar</option>
        ${state.sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}
      </select></label>
      <label class="full">Notas<textarea class="input" name="notes"></textarea></label>
    </form>`,
    onSave: async (m) => {
      const fd = new FormData(qs("form", m));
      const n = String(fd.get("name") || "").trim();
      if (!n) return false;
      const obj = { id: uid("lead"), createdAt: nowISO(), lat, lng,
        name: n, address: String(fd.get("address") || ""), city: String(fd.get("city") || ""),
        contact: String(fd.get("contact") || ""), phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || ""), stage: String(fd.get("stage") || "nuevo"),
        ownerSellerId: String(fd.get("ownerSellerId") || ""), notes: String(fd.get("notes") || "") };
      state.leads.push(obj);
      pushActivity("lead", `Lead desde mapa: ${n}`); saveState(); renderAll();
      sbUpsert("eos_leads", { id: obj.id, name: obj.name, city: obj.city || null, contact: obj.contact || null, phone: obj.phone || null, email: obj.email || null, stage: obj.stage, owner_seller_id: obj.ownerSellerId || null, notes: obj.notes || null }).catch(() => {});
      return true;
    },
  });
}

function renderVisitMarkers(visits) {
  ensureMap(); if (!map) return;
  clearMapLayers();
  if (mapMode === "markers") _renderMarkers(visits);
  else if (mapMode === "routes") _renderRoutes(visits);
  else if (mapMode === "heat") _renderHeat(visits);
  _renderLegend();
}

function _renderMarkers(visits) {
  visits.forEach(v => {
    if (typeof v.lat !== "number" || typeof v.lng !== "number") return;
    const s = byId(state.sellers, v.sellerId);
    const l = byId(state.leads, v.leadId);
    const color = sellerColor(v.sellerId);
    const leadVisits = state.visits.filter(x => x.leadId === l?.id).sort((a, b) => new Date(b.at) - new Date(a.at));
    const lastVisit = leadVisits[0];
    const stageColors = { nuevo:"#5d6c8f", contactado:"#3554d1", demo:"#f59f00", propuesta:"#9b59b6", ganado:"#20c997", perdido:"#d53d55" };
    const sc = stageColors[l?.stage] || "#5d6c8f";
    const popup = `
      <div class="map-popup">
        <div class="mp-header" style="border-left:4px solid ${color}">
          <strong class="mp-name">${l?.name || "Colegio"}</strong>
          <span class="mp-stage" style="background:${sc}20;color:${sc}">${stageLabel(l?.stage)}</span>
        </div>
        ${l?.address ? `<div class="mp-row">📍 ${l.address}</div>` : ""}
        ${l?.city ? `<div class="mp-row">🏙️ ${l.city}</div>` : ""}
        ${l?.contact ? `<div class="mp-row">👤 ${l.contact}</div>` : ""}
        ${l?.phone ? `<div class="mp-row">📞 <a href="tel:${l.phone}">${l.phone}</a></div>` : ""}
        ${l?.email ? `<div class="mp-row">✉️ <a href="mailto:${l.email}">${l.email}</a></div>` : ""}
        <div class="mp-divider"></div>
        <div class="mp-row">🧑‍💼 Vendedor: <strong>${s?.name || "Sin asignar"}</strong></div>
        <div class="mp-row">📋 Visitas: <strong>${leadVisits.length}</strong></div>
        ${lastVisit ? `<div class="mp-row">🕐 Última: ${fmtDateTime(lastVisit.at)}</div>` : ""}
        ${lastVisit?.notes ? `<div class="mp-row mp-notes">"${lastVisit.notes}"</div>` : ""}
        ${l?.notes ? `<div class="mp-row mp-notes">📝 ${l.notes}</div>` : ""}
      </div>`;
    const m = L.circleMarker([v.lat, v.lng], { radius: 9, fillColor: color, color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9 }).addTo(map);
    m.bindPopup(popup, { maxWidth: 280, className: "map-popup-wrap" });
    visitMarkers.push(m);
  });
}

function _renderRoutes(visits) {
  _renderMarkers(visits);
  const bySeller = {};
  [...visits].filter(v => typeof v.lat === "number" && typeof v.lng === "number")
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .forEach(v => { (bySeller[v.sellerId] = bySeller[v.sellerId] || []).push([v.lat, v.lng]); });
  Object.entries(bySeller).forEach(([sid, pts]) => {
    if (pts.length < 2) return;
    const line = L.polyline(pts, { color: sellerColor(sid), weight: 3, opacity: 0.75, dashArray: "6 5" }).addTo(map);
    routeLines.push(line);
  });
}

function _renderHeat(visits) {
  const pts = visits.filter(v => typeof v.lat === "number" && typeof v.lng === "number").map(v => [v.lat, v.lng, 1.0]);
  if (pts.length && window.L?.heatLayer) {
    heatLayer = L.heatLayer(pts, { radius: 30, blur: 20, maxZoom: 17, gradient: { 0.3: "#4f7cff", 0.6: "#f59f00", 1.0: "#d53d55" } }).addTo(map);
  }
}

function _renderLegend() {
  const root = qs("#mapLegend"); if (!root) return;
  if (mapMode === "heat") {
    root.innerHTML = `<div class="legend-heat"><span class="legend-gradient"></span><span class="legend-label">Baja → Alta densidad</span></div>`;
    return;
  }
  root.innerHTML = state.sellers.map((s, i) => `<div class="legend-item"><span class="legend-dot" style="background:${SELLER_COLORS[i % SELLER_COLORS.length]}"></span>${s.name}</div>`).join("");
}

function fitMapToVisits(vs) {
  ensureMap();
  const pts = vs.filter(v => typeof v.lat === "number" && typeof v.lng === "number").map(v => [v.lat, v.lng]);
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.2));
}
function pickPointOnMap() { setView("visits"); return new Promise((resolve, reject) => { pendingPick = resolve; setTimeout(() => { if (pendingPick) { pendingPick = null; reject(new Error("Tiempo agotado")); } }, 20000); }); }
function getGeo() { return new Promise((res, rej) => navigator.geolocation?.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy }), rej, { enableHighAccuracy: true, timeout: 12000 })); }
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  const data = await res.json();
  if (!data.length) throw new Error("No se encontró la dirección");
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

function openVisitModal(existing = null) {
  openModal({
    title: existing ? "Editar visita" : "Nueva visita",
    bodyHTML: `<form class="form"><label class="full">Vendedor<select class="input" name="sellerId">${state.sellers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}</select></label><label class="full">Lead<select class="input" name="leadId">${state.leads.map((l) => `<option value="${l.id}">${l.name}</option>`).join("")}</select></label><label>Fecha<input class="input" type="datetime-local" name="at" value="${(existing?.at || nowISO()).slice(0,16)}"></label><label>Tipo<select class="input" name="kind"><option value="visita">Visita</option><option value="llamada">Llamada</option><option value="demo">Demo</option></select></label><label class="full">Notas<textarea class="input" name="notes">${existing?.notes || ""}</textarea></label><div class="full addr-row"><input class="input addrInput" placeholder="Dirección exacta (ej: Calle 45 #12-34, Bogotá)" style="flex:1" /><button class="btn btn-secondary addrSearch" type="button">Buscar dirección</button></div><div class="full actions"><button class="btn btn-secondary gps" type="button">Usar GPS</button><button class="btn btn-secondary mapPick" type="button">Elegir en mapa</button><span class="pill loc">Sin ubicación</span></div></form>`,
    onSave: async (m) => {
      const fd = new FormData(qs("form", m)); const obj = existing || { id: uid("visit"), createdAt: nowISO(), lat: null, lng: null, accuracyM: null };
      Object.assign(obj, { sellerId: String(fd.get("sellerId") || ""), leadId: String(fd.get("leadId") || ""), at: new Date(String(fd.get("at") || nowISO())).toISOString(), kind: String(fd.get("kind") || "visita"), notes: String(fd.get("notes") || "") });
      if (!existing) state.visits.unshift(obj);
      saveState(); renderAll();
      sbUpsert("eos_visits", { id: obj.id, seller_id: obj.sellerId, lead_id: obj.leadId, at: obj.at, kind: obj.kind, notes: obj.notes || null, lat: obj.lat, lng: obj.lng, accuracy_m: obj.accuracyM }).catch(() => {});
      return true;
    },
  });
  setTimeout(() => {
    const modal = qs(".modal:last-of-type");
    if (!modal) return;
    const loc = qs(".loc", modal);
    const setLoc = (a, b) => { loc.textContent = (typeof a === "number" && typeof b === "number") ? `Ubicación: ${a.toFixed(5)}, ${b.toFixed(5)}` : "Sin ubicación"; };
    let lat = existing?.lat ?? null; let lng = existing?.lng ?? null; let acc = existing?.accuracyM ?? null; setLoc(lat, lng);
    qs(".gps", modal).addEventListener("click", async () => { try { const g = await getGeo(); lat = g.lat; lng = g.lng; acc = g.accuracyM; if (existing) Object.assign(existing, { lat, lng, accuracyM: acc }); setLoc(lat, lng); } catch { toast("No se pudo obtener GPS"); } });
    qs(".mapPick", modal).addEventListener("click", async () => { try { const p = await pickPointOnMap(); lat = p.lat; lng = p.lng; acc = null; if (existing) Object.assign(existing, { lat, lng, accuracyM: acc }); setLoc(lat, lng); } catch {} });
    qs(".addrSearch", modal)?.addEventListener("click", async () => {
      const addr = qs(".addrInput", modal)?.value?.trim();
      if (!addr) return toast("Escribí una dirección");
      try {
        toast("Buscando…");
        const g = await geocodeAddress(addr);
        lat = g.lat; lng = g.lng; acc = null;
        if (existing) Object.assign(existing, { lat, lng, accuracyM: null });
        setLoc(lat, lng);
        toast("Dirección encontrada");
      } catch { toast("No se encontró la dirección"); }
    });
    qs(".save", modal.parentElement).addEventListener("click", () => { if (!existing) { const v = state.visits[0]; if (v) Object.assign(v, { lat, lng, accuracyM: acc }); } saveState(); });
  }, 0);
}
function deleteVisit(id) { state.visits = state.visits.filter((v) => v.id !== id); saveState(); renderAll(); sbDelete("eos_visits", id).catch(() => {}); }

function requestSellerLocation(user) {
  if (!navigator.geolocation) return;
  const root = qs("#modalRoot");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal loc-modal">
      <header><h3>Compartir ubicación</h3></header>
      <div class="body">
        <p>Hola <strong>${user.name}</strong>, para registrar tu jornada necesitamos tu ubicación actual.</p>
        <p class="hint">Esto nos ayuda a trazar tu ruta de visitas del día.</p>
        <div id="locStatus" class="pill" style="margin-top:8px">Esperando permiso…</div>
      </div>
      <div class="footer">
        <button class="btn btn-secondary" id="locSkip">Omitir por ahora</button>
        <button class="btn btn-primary" id="locAllow">Permitir ubicación</button>
      </div>
    </div>`;
  root.appendChild(backdrop);

  const status = backdrop.querySelector("#locStatus");

  function close() { backdrop.remove(); }

  backdrop.querySelector("#locSkip").addEventListener("click", close);

  backdrop.querySelector("#locAllow").addEventListener("click", () => {
    status.textContent = "Obteniendo ubicación…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!state.ui.sellerLocations) state.ui.sellerLocations = {};
        state.ui.sellerLocations[user.id] = { lat, lng, accuracy, at: nowISO() };
        saveState();
        status.textContent = `Ubicación registrada ✓ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setTimeout(close, 1200);
      },
      () => {
        status.textContent = "No se pudo obtener la ubicación. Revisá los permisos del navegador.";
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// events
qsa(".tab").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
qs("#homeLink")?.addEventListener("click", (e) => { e.preventDefault(); setView("dashboard"); });
qs("#navToggle")?.addEventListener("click", () => document.body.classList.toggle("nav-open"));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.body.classList.remove("nav-open"); });
qs("#logoutBtn")?.addEventListener("click", () => { state.sessionUserId = null; saveState(); renderAll(); });
qs("#loginForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = (qs("#loginEmail").value || "").toLowerCase().trim();
  const pass = (qs("#loginPassword").value || "").trim();
  const user = state.users.find((u) => u.email.toLowerCase() === email && u.password === pass && u.active);
  if (!user) return toast("Credenciales inválidas");
  state.sessionUserId = user.id; saveState(); setView("dashboard"); renderAll(); toast("Bienvenido");
  requestSellerLocation(user);
});
qs("#addUserBtn")?.addEventListener("click", () => openUserModal());
qs("#addSellerBtn")?.addEventListener("click", () => openSellerModal());
qs("#addLeadBtn")?.addEventListener("click", () => openLeadModal());
qs("#addVisitBtn")?.addEventListener("click", () => openVisitModal());
qs("#quickAddLead")?.addEventListener("click", () => { setView("leads"); openLeadModal(); });
qs("#quickAddVisit")?.addEventListener("click", () => { setView("visits"); openVisitModal(); });
qs("#quickLocate")?.addEventListener("click", async () => { try { const g = await getGeo(); setView("visits"); ensureMap(); map.setView([g.lat, g.lng], Math.max(map.getZoom(), 15)); } catch {} });
qs("#leadSearch")?.addEventListener("input", renderLeads);
qs("#leadStageFilter")?.addEventListener("change", renderLeads);
qs("#visitSellerFilter")?.addEventListener("change", renderVisits);
qs("#visitTextFilter")?.addEventListener("input", renderVisits);
qs("#fitMapBtn")?.addEventListener("click", () => fitMapToVisits(filteredVisits()));
qsa(".map-mode-btn").forEach(btn => btn.addEventListener("click", () => {
  mapMode = btn.dataset.mode;
  qsa(".map-mode-btn").forEach(b => b.classList.toggle("is-active", b === btn));
  renderVisitMarkers(filteredVisits());
}));
qs("#toggleSchoolsBtn")?.addEventListener("click", (e) => {
  showSchools = !showSchools;
  e.target.classList.toggle("is-active", showSchools);
  if (showSchools) fetchNearbySchools();
  else { clearSchoolMarkers(); qs("#schoolCount") && (qs("#schoolCount").textContent = ""); }
});
qs("#sbSaveBtn")?.addEventListener("click", () => { if (!canManageSettings()) return toast("Solo Super Admin"); sbCfg = { enabled: true, url: String(qs("#sbUrl").value || "").trim(), anonKey: String(qs("#sbAnonKey").value || "").trim() }; sb = null; saveSupabaseCfg(sbCfg); renderSupabaseStatus(); });
qs("#sbDisconnectBtn")?.addEventListener("click", () => { sbCfg.enabled = false; saveSupabaseCfg(sbCfg); renderSupabaseStatus(); });
qs("#sbTestBtn")?.addEventListener("click", async () => { try { const c = ensureSupabase(); if (!c) throw new Error("Sin config"); const { error } = await c.from("eos_sellers").select("id").limit(1); if (error) throw error; toast("Conexión OK"); } catch (e) { toast(`Error: ${e.message}`); } });
qs("#sbSyncBtn")?.addEventListener("click", async () => { try { await syncFromSupabase(); renderAll(); toast("Sincronizado"); } catch (e) { toast(`Sync error: ${e.message}`); } });
qs("#seedBtn")?.addEventListener("click", () => {
  if (state.sellers.length || state.leads.length || state.visits.length) return toast("Ya hay datos");
  const s1 = { id: uid("seller"), createdAt: nowISO(), name: "Laura Pérez", email: "laura@eos.edu", phone: "3000000001", zone: "Norte" };
  const s2 = { id: uid("seller"), createdAt: nowISO(), name: "Diego Ruiz", email: "diego@eos.edu", phone: "3000000002", zone: "Sur" };
  state.sellers.push(s1, s2);
  state.leads.push({ id: uid("lead"), createdAt: nowISO(), name: "Colegio Los Robles", city: "Bogotá", contact: "Rectoría", phone: "6010000000", email: "contacto@robles.edu", stage: "contactado", ownerSellerId: s1.id, notes: "" });
  state.leads.push({ id: uid("lead"), createdAt: nowISO(), name: "Instituto Aurora", city: "Bogotá", contact: "Coordinación", phone: "6010000001", email: "coord@aurora.edu", stage: "demo", ownerSellerId: s2.id, notes: "" });
  saveState(); renderAll();
});
qs("#exportBtn")?.addEventListener("click", () => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = "eos-crm-export.json"; a.click(); URL.revokeObjectURL(u); });
qs("#importInput")?.addEventListener("change", async (e) => { const f = e.target.files?.[0]; if (!f) return; state = normalizeState(safeJson(await f.text(), createDefaultState())); saveState(); renderAll(); e.target.value = ""; });
qs("#resetBtn")?.addEventListener("click", () => { state = createDefaultState(); saveState(); renderAll(); });
function fillSupabaseInputs() { qs("#sbUrl").value = sbCfg.url || ""; qs("#sbAnonKey").value = sbCfg.anonKey || ""; renderSupabaseStatus(); }

fillSupabaseInputs();
setView("dashboard");
renderAll();

