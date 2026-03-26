const STORAGE_KEY = "eos_crm_v1";
const SUPABASE_CFG_KEY = "eos_supabase_cfg_v1";

function loadSupabaseCfg() {
  const raw = localStorage.getItem(SUPABASE_CFG_KEY);
  if (!raw) return { enabled: false, url: "", anonKey: "" };
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return { enabled: false, url: "", anonKey: "" };
  const c = parsed.value ?? {};
  return {
    enabled: Boolean(c.enabled),
    url: String(c.url ?? ""),
    anonKey: String(c.anonKey ?? ""),
  };
}

function saveSupabaseCfg(cfg) {
  localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify(cfg));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function fmtDateTime(iso) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyState();
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return createEmptyState();
  const s = parsed.value;
  if (!s || typeof s !== "object") return createEmptyState();
  return normalizeState(s);
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createEmptyState() {
  return normalizeState({
    sellers: [],
    leads: [],
    visits: [],
    activity: [],
    ui: {
      lastMapCenter: { lat: 4.711, lng: -74.0721, zoom: 12 }, // Bogotá default
    },
  });
}

function normalizeState(s) {
  const state = {
    sellers: Array.isArray(s.sellers) ? s.sellers : [],
    leads: Array.isArray(s.leads) ? s.leads : [],
    visits: Array.isArray(s.visits) ? s.visits : [],
    activity: Array.isArray(s.activity) ? s.activity : [],
    ui: s.ui && typeof s.ui === "object" ? s.ui : {},
  };
  if (!state.ui.lastMapCenter) {
    state.ui.lastMapCenter = { lat: 4.711, lng: -74.0721, zoom: 12 };
  }
  return state;
}

function hasSupabaseLib() {
  return typeof window.supabase?.createClient === "function";
}

function stageLabel(stage) {
  const map = {
    nuevo: "Nuevo",
    contactado: "Contactado",
    demo: "Demo agendada",
    propuesta: "Propuesta",
    ganado: "Ganado",
    perdido: "Perdido",
  };
  return map[stage] ?? stage ?? "—";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, String(v));
  });
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function toast(message) {
  const root = qs("#modalRoot");
  const t = el(
    "div",
    { class: "modal-backdrop", role: "presentation" },
    [el("div", { class: "modal" }, [el("div", { class: "body" }, [message])])]
  );
  root.appendChild(t);
  setTimeout(() => t.remove(), 1200);
}

function openModal({ title, bodyNode, primaryText = "Guardar", onPrimary, secondaryText = "Cancelar" }) {
  const root = qs("#modalRoot");
  const backdrop = el("div", { class: "modal-backdrop" });
  const modal = el("div", { class: "modal", role: "dialog", "aria-modal": "true" });
  const header = el("header", {}, [
    el("h3", {}, [title]),
    el(
      "button",
      {
        class: "btn btn-secondary",
        type: "button",
        onClick: () => close(),
      },
      ["Cerrar"]
    ),
  ]);
  const body = el("div", { class: "body" }, [bodyNode]);
  const footer = el("div", { class: "footer" }, [
    el(
      "button",
      {
        class: "btn btn-secondary",
        type: "button",
        onClick: () => close(),
      },
      [secondaryText]
    ),
    el(
      "button",
      {
        class: "btn btn-primary",
        type: "button",
        onClick: async () => {
          const ok = await onPrimary?.();
          if (ok !== false) close();
        },
      },
      [primaryText]
    ),
  ]);
  modal.append(header, body, footer);
  backdrop.appendChild(modal);
  root.appendChild(backdrop);

  function close() {
    backdrop.remove();
  }
  return { close };
}

function getGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocalización no soportada"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    );
  });
}

function byId(list, id) {
  return list.find((x) => x.id === id) ?? null;
}

// --- App state ---
let state = loadState();
let sbCfg = loadSupabaseCfg();
let sb = null;

function isSupabaseReady() {
  return sbCfg.enabled && sbCfg.url && sbCfg.anonKey && hasSupabaseLib();
}

function ensureSupabase() {
  if (!isSupabaseReady()) return null;
  if (sb) return sb;
  sb = window.supabase.createClient(sbCfg.url, sbCfg.anonKey);
  return sb;
}

async function sbTestConnection() {
  const client = ensureSupabase();
  if (!client) return { ok: false, error: new Error("Supabase no configurado") };
  const { error } = await client.from("eos_sellers").select("id").limit(1);
  if (error) return { ok: false, error };
  return { ok: true };
}

async function sbFetchAll() {
  const client = ensureSupabase();
  if (!client) throw new Error("Supabase no configurado");

  const [sellers, leads, visits, activity] = await Promise.all([
    client.from("eos_sellers").select("*").order("created_at", { ascending: true }),
    client.from("eos_leads").select("*").order("created_at", { ascending: true }),
    client.from("eos_visits").select("*").order("at", { ascending: false }),
    client.from("eos_activity").select("*").order("at", { ascending: false }).limit(30),
  ]);

  for (const r of [sellers, leads, visits, activity]) {
    if (r.error) throw r.error;
  }

  return {
    sellers: sellers.data.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      email: r.email,
      phone: r.phone,
      zone: r.zone,
    })),
    leads: leads.data.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      city: r.city,
      contact: r.contact,
      phone: r.phone,
      email: r.email,
      stage: r.stage,
      ownerSellerId: r.owner_seller_id ?? "",
      notes: r.notes ?? "",
    })),
    visits: visits.data.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      sellerId: r.seller_id,
      leadId: r.lead_id,
      at: r.at,
      kind: r.kind,
      notes: r.notes ?? "",
      lat: r.lat,
      lng: r.lng,
      accuracyM: r.accuracy_m,
    })),
    activity: activity.data.map((r) => ({
      id: r.id,
      at: r.at,
      type: r.type,
      message: r.message,
      meta: r.meta ?? {},
    })),
  };
}

async function sbUpsertSeller(s) {
  const client = ensureSupabase();
  if (!client) return;
  const { error } = await client.from("eos_sellers").upsert(
    {
      id: s.id,
      name: s.name,
      email: s.email ?? null,
      phone: s.phone ?? null,
      zone: s.zone ?? null,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function sbDeleteSeller(id) {
  const client = ensureSupabase();
  if (!client) return;
  const { error } = await client.from("eos_sellers").delete().eq("id", id);
  if (error) throw error;
}

async function sbUpsertLead(l) {
  const client = ensureSupabase();
  if (!client) return;
  const { error } = await client.from("eos_leads").upsert(
    {
      id: l.id,
      name: l.name,
      city: l.city ?? null,
      contact: l.contact ?? null,
      phone: l.phone ?? null,
      email: l.email ?? null,
      stage: l.stage ?? "nuevo",
      owner_seller_id: l.ownerSellerId || null,
      notes: l.notes ?? null,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function sbDeleteLead(id) {
  const client = ensureSupabase();
  if (!client) return;
  const { error } = await client.from("eos_leads").delete().eq("id", id);
  if (error) throw error;
}

async function sbUpsertVisit(v) {
  const client = ensureSupabase();
  if (!client) return;
  const { error } = await client.from("eos_visits").upsert(
    {
      id: v.id,
      seller_id: v.sellerId,
      lead_id: v.leadId,
      at: v.at,
      kind: v.kind ?? "visita",
      notes: v.notes ?? null,
      lat: typeof v.lat === "number" ? v.lat : null,
      lng: typeof v.lng === "number" ? v.lng : null,
      accuracy_m: typeof v.accuracyM === "number" ? v.accuracyM : null,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function sbDeleteVisit(id) {
  const client = ensureSupabase();
  if (!client) return;
  const { error } = await client.from("eos_visits").delete().eq("id", id);
  if (error) throw error;
}

async function sbInsertActivity(a) {
  const client = ensureSupabase();
  if (!client) return;
  const { error } = await client.from("eos_activity").insert({
    id: a.id,
    at: a.at,
    type: a.type,
    message: a.message,
    meta: a.meta ?? {},
  });
  if (error) throw error;
}

async function syncFromSupabase() {
  const data = await sbFetchAll();
  state.sellers = data.sellers;
  state.leads = data.leads;
  state.visits = data.visits;
  state.activity = data.activity;
  pushActivity(state, { type: "sync", message: "Sincronizado desde Supabase" });
  saveState(state);
}

function renderSupabaseStatus() {
  const status = qs("#sbStatus");
  if (!status) return;
  if (!sbCfg.enabled) {
    status.textContent = "Estado: Local";
    return;
  }
  status.textContent = isSupabaseReady()
    ? "Estado: Supabase (configurado)"
    : "Estado: Supabase (incompleto)";
}

function pushActivity(state, item) {
  const entry = {
    id: uid("act"),
    at: nowISO(),
    type: item.type ?? "info",
    message: item.message ?? "",
    meta: item.meta ?? {},
  };
  state.activity.unshift(entry);
  state.activity = state.activity.slice(0, 30);
  if (isSupabaseReady()) {
    sbInsertActivity(entry).catch(() => {});
  }
}

// --- Router tabs ---
function setView(view) {
  qsa(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
  qsa(".view").forEach((v) => v.classList.toggle("is-hidden", v.dataset.view !== view));
  if (view === "visits") ensureMap();
  document.body.classList.remove("nav-open");
  renderAll();
}

qsa(".tab").forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view)));
qs("#homeLink")?.addEventListener("click", (e) => {
  e.preventDefault();
  setView("dashboard");
});

// Mobile nav toggle
qs("#navToggle")?.addEventListener("click", () => {
  document.body.classList.toggle("nav-open");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.body.classList.remove("nav-open");
});

// --- Map ---
let map = null;
let visitMarkers = [];
let pendingPick = null; // {resolve, reject}

function ensureMap() {
  if (map) return;
  const target = qs("#map");
  if (!target) return;

  const c = state.ui.lastMapCenter ?? { lat: 4.711, lng: -74.0721, zoom: 12 };
  map = L.map(target, { zoomControl: true }).setView([c.lat, c.lng], c.zoom ?? 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  map.on("moveend", () => {
    const center = map.getCenter();
    state.ui.lastMapCenter = { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
    saveState(state);
  });

  map.on("click", (ev) => {
    if (!pendingPick) return;
    const { resolve } = pendingPick;
    pendingPick = null;
    resolve({ lat: ev.latlng.lat, lng: ev.latlng.lng });
    toast("Ubicación seleccionada en el mapa");
  });
}

function clearVisitMarkers() {
  for (const m of visitMarkers) {
    try {
      m.remove();
    } catch {
      // ignore
    }
  }
  visitMarkers = [];
}

function renderVisitMarkers(filteredVisits) {
  ensureMap();
  if (!map) return;
  clearVisitMarkers();

  for (const v of filteredVisits) {
    if (typeof v.lat !== "number" || typeof v.lng !== "number") continue;
    const seller = byId(state.sellers, v.sellerId);
    const lead = byId(state.leads, v.leadId);
    const title = `${seller?.name ?? "Vendedor"} · ${lead?.name ?? "Lead"}`;
    const marker = L.marker([v.lat, v.lng]).addTo(map);
    marker.bindPopup(
      `<div style="font-family: Inter, system-ui; min-width: 220px;">
        <div style="font-weight: 900; margin-bottom: 6px;">${escapeHtml(title)}</div>
        <div style="color: #b6c0ea; font-size: 12px; margin-bottom: 6px;">${escapeHtml(
          fmtDateTime(v.at)
        )}</div>
        <div style="font-size: 13px;">${escapeHtml(v.notes ?? "")}</div>
      </div>`
    );
    visitMarkers.push(marker);
  }
}

function fitMapToVisits(visits) {
  ensureMap();
  if (!map) return;
  const pts = visits
    .filter((v) => typeof v.lat === "number" && typeof v.lng === "number")
    .map((v) => [v.lat, v.lng]);
  if (!pts.length) return;
  map.fitBounds(L.latLngBounds(pts).pad(0.2));
}

function pickPointOnMap() {
  setView("visits");
  ensureMap();
  toast("Haz clic en el mapa para elegir un punto…");
  return new Promise((resolve, reject) => {
    pendingPick = { resolve, reject };
    setTimeout(() => {
      if (!pendingPick) return;
      pendingPick = null;
      reject(new Error("Tiempo de espera agotado"));
    }, 20_000);
  });
}

// --- CRUD: Sellers ---
function openSellerModal(existing = null) {
  const node = el("form", { class: "form" }, [
    el("label", { class: "full" }, [
      "Nombre",
      el("input", { class: "input", name: "name", value: existing?.name ?? "", required: true }),
    ]),
    el("label", {}, ["Email", el("input", { class: "input", name: "email", value: existing?.email ?? "" })]),
    el("label", {}, [
      "Teléfono",
      el("input", { class: "input", name: "phone", value: existing?.phone ?? "" }),
    ]),
    el("label", { class: "full" }, [
      "Zona (opcional)",
      el("input", { class: "input", name: "zone", value: existing?.zone ?? "" }),
    ]),
  ]);

  openModal({
    title: existing ? "Editar vendedor" : "Agregar vendedor",
    bodyNode: node,
    primaryText: existing ? "Guardar cambios" : "Crear vendedor",
    onPrimary: async () => {
      const fd = new FormData(node);
      const name = String(fd.get("name") ?? "").trim();
      if (!name) return false;
      const patch = {
        name,
        email: String(fd.get("email") ?? "").trim(),
        phone: String(fd.get("phone") ?? "").trim(),
        zone: String(fd.get("zone") ?? "").trim(),
      };
      if (existing) {
        Object.assign(existing, patch);
        pushActivity(state, { type: "seller.updated", message: `Vendedor actualizado: ${name}` });
      } else {
        state.sellers.push({ id: uid("seller"), createdAt: nowISO(), ...patch });
        pushActivity(state, { type: "seller.created", message: `Vendedor creado: ${name}` });
      }
      saveState(state);
      const savedSeller = existing ?? state.sellers[state.sellers.length - 1];
      if (isSupabaseReady() && savedSeller) {
        sbUpsertSeller(savedSeller).catch((e) => toast(`Supabase error: ${e?.message ?? e}`));
      }
      renderAll();
      return true;
    },
  });
}

function deleteSeller(id) {
  const s = byId(state.sellers, id);
  if (!s) return;
  const usedByLeads = state.leads.some((l) => l.ownerSellerId === id);
  const usedByVisits = state.visits.some((v) => v.sellerId === id);
  if (usedByLeads || usedByVisits) {
    toast("No se puede borrar: tiene leads o visitas asociadas");
    return;
  }
  state.sellers = state.sellers.filter((x) => x.id !== id);
  pushActivity(state, { type: "seller.deleted", message: `Vendedor eliminado: ${s.name}` });
  saveState(state);
  if (isSupabaseReady()) {
    sbDeleteSeller(id).catch((e) => toast(`Supabase error: ${e?.message ?? e}`));
  }
  renderAll();
}

// --- CRUD: Leads ---
function openLeadModal(existing = null) {
  const stage = existing?.stage ?? "nuevo";
  const node = el("form", { class: "form" }, [
    el("label", { class: "full" }, [
      "Nombre / Institución",
      el("input", { class: "input", name: "name", value: existing?.name ?? "", required: true }),
    ]),
    el("label", {}, ["Ciudad", el("input", { class: "input", name: "city", value: existing?.city ?? "" })]),
    el("label", {}, [
      "Contacto",
      el("input", { class: "input", name: "contact", value: existing?.contact ?? "" }),
    ]),
    el("label", {}, [
      "Teléfono",
      el("input", { class: "input", name: "phone", value: existing?.phone ?? "" }),
    ]),
    el("label", {}, ["Email", el("input", { class: "input", name: "email", value: existing?.email ?? "" })]),
    el("label", {}, [
      "Etapa",
      (() => {
        const sel = el("select", { class: "input", name: "stage" }, [
          el("option", { value: "nuevo" }, ["Nuevo"]),
          el("option", { value: "contactado" }, ["Contactado"]),
          el("option", { value: "demo" }, ["Demo agendada"]),
          el("option", { value: "propuesta" }, ["Propuesta"]),
          el("option", { value: "ganado" }, ["Ganado"]),
          el("option", { value: "perdido" }, ["Perdido"]),
        ]);
        sel.value = stage;
        return sel;
      })(),
    ]),
    el("label", { class: "full" }, [
      "Vendedor asignado",
      (() => {
        const sel = el("select", { class: "input", name: "ownerSellerId" }, [
          el("option", { value: "" }, ["Sin asignar"]),
          ...state.sellers.map((s) => el("option", { value: s.id }, [s.name])),
        ]);
        sel.value = existing?.ownerSellerId ?? "";
        return sel;
      })(),
    ]),
    el("label", { class: "full" }, [
      "Notas",
      el("textarea", { class: "input", name: "notes" }, [existing?.notes ?? ""]),
    ]),
  ]);

  openModal({
    title: existing ? "Editar lead" : "Agregar lead",
    bodyNode: node,
    primaryText: existing ? "Guardar cambios" : "Crear lead",
    onPrimary: async () => {
      const fd = new FormData(node);
      const name = String(fd.get("name") ?? "").trim();
      if (!name) return false;
      const patch = {
        name,
        city: String(fd.get("city") ?? "").trim(),
        contact: String(fd.get("contact") ?? "").trim(),
        phone: String(fd.get("phone") ?? "").trim(),
        email: String(fd.get("email") ?? "").trim(),
        stage: String(fd.get("stage") ?? "nuevo"),
        ownerSellerId: String(fd.get("ownerSellerId") ?? ""),
        notes: String(fd.get("notes") ?? "").trim(),
      };
      if (existing) {
        Object.assign(existing, patch);
        pushActivity(state, { type: "lead.updated", message: `Lead actualizado: ${name}` });
      } else {
        state.leads.push({ id: uid("lead"), createdAt: nowISO(), ...patch });
        pushActivity(state, { type: "lead.created", message: `Lead creado: ${name}` });
      }
      saveState(state);
      const savedLead = existing ?? state.leads[state.leads.length - 1];
      if (isSupabaseReady() && savedLead) {
        sbUpsertLead(savedLead).catch((e) => toast(`Supabase error: ${e?.message ?? e}`));
      }
      renderAll();
      return true;
    },
  });
}

function deleteLead(id) {
  const l = byId(state.leads, id);
  if (!l) return;
  const usedByVisits = state.visits.some((v) => v.leadId === id);
  if (usedByVisits) {
    toast("No se puede borrar: tiene visitas asociadas");
    return;
  }
  state.leads = state.leads.filter((x) => x.id !== id);
  pushActivity(state, { type: "lead.deleted", message: `Lead eliminado: ${l.name}` });
  saveState(state);
  if (isSupabaseReady()) {
    sbDeleteLead(id).catch((e) => toast(`Supabase error: ${e?.message ?? e}`));
  }
  renderAll();
}

// --- CRUD: Visits ---
function openVisitModal(existing = null) {
  const node = el("form", { class: "form" }, [
    el("label", { class: "full" }, [
      "Vendedor",
      (() => {
        const sel = el("select", { class: "input", name: "sellerId", required: true }, [
          el("option", { value: "" }, ["Selecciona…"]),
          ...state.sellers.map((s) => el("option", { value: s.id }, [s.name])),
        ]);
        sel.value = existing?.sellerId ?? "";
        return sel;
      })(),
    ]),
    el("label", { class: "full" }, [
      "Lead",
      (() => {
        const sel = el("select", { class: "input", name: "leadId", required: true }, [
          el("option", { value: "" }, ["Selecciona…"]),
          ...state.leads.map((l) => el("option", { value: l.id }, [l.name])),
        ]);
        sel.value = existing?.leadId ?? "";
        return sel;
      })(),
    ]),
    el("label", {}, [
      "Fecha/hora",
      el("input", {
        class: "input",
        name: "at",
        value: (existing?.at ?? nowISO()).slice(0, 16),
        type: "datetime-local",
        required: true,
      }),
    ]),
    el("label", {}, [
      "Tipo",
      (() => {
        const sel = el("select", { class: "input", name: "kind" }, [
          el("option", { value: "visita" }, ["Visita"]),
          el("option", { value: "llamada" }, ["Llamada"]),
          el("option", { value: "demo" }, ["Demo"]),
          el("option", { value: "seguimiento" }, ["Seguimiento"]),
        ]);
        sel.value = existing?.kind ?? "visita";
        return sel;
      })(),
    ]),
    el("label", { class: "full" }, [
      "Notas",
      el("textarea", { class: "input", name: "notes" }, [existing?.notes ?? ""]),
    ]),
    el("div", { class: "full actions" }, [
      el(
        "button",
        { class: "btn btn-secondary", type: "button", onClick: () => useGPS() },
        ["Usar GPS (mi ubicación)"]
      ),
      el(
        "button",
        { class: "btn btn-secondary", type: "button", onClick: () => pickOnMap() },
        ["Elegir en el mapa"]
      ),
      el("span", { class: "pill", id: "locPill" }, [
        existing?.lat != null ? "Ubicación cargada" : "Sin ubicación",
      ]),
    ]),
  ]);

  let lat = existing?.lat ?? null;
  let lng = existing?.lng ?? null;
  let accuracyM = existing?.accuracyM ?? null;
  const locPill = () => qs("#locPill", node);
  const setLocLabel = () => {
    const p = locPill();
    if (!p) return;
    p.textContent =
      lat == null || lng == null
        ? "Sin ubicación"
        : `Ubicación: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  async function useGPS() {
    try {
      const g = await getGeo();
      lat = g.lat;
      lng = g.lng;
      accuracyM = g.accuracyM;
      setLocLabel();
      toast(`GPS OK (±${Math.round(accuracyM)}m)`);
      setView("visits");
      ensureMap();
      if (map) map.setView([lat, lng], Math.max(map.getZoom(), 15));
    } catch (e) {
      toast(`GPS error: ${e?.message ?? e}`);
    }
  }

  async function pickOnMap() {
    try {
      const picked = await pickPointOnMap();
      lat = picked.lat;
      lng = picked.lng;
      accuracyM = null;
      setLocLabel();
      ensureMap();
      if (map) map.setView([lat, lng], Math.max(map.getZoom(), 15));
    } catch (e) {
      toast(`No se pudo seleccionar: ${e?.message ?? e}`);
    }
  }

  setLocLabel();

  openModal({
    title: existing ? "Editar visita" : "Registrar visita",
    bodyNode: node,
    primaryText: existing ? "Guardar cambios" : "Registrar",
    onPrimary: async () => {
      if (!state.sellers.length) {
        toast("Primero crea un vendedor");
        return false;
      }
      if (!state.leads.length) {
        toast("Primero crea un lead");
        return false;
      }

      const fd = new FormData(node);
      const sellerId = String(fd.get("sellerId") ?? "");
      const leadId = String(fd.get("leadId") ?? "");
      const atRaw = String(fd.get("at") ?? "").trim();
      if (!sellerId || !leadId || !atRaw) return false;

      const at = new Date(atRaw).toISOString();
      const patch = {
        sellerId,
        leadId,
        at,
        kind: String(fd.get("kind") ?? "visita"),
        notes: String(fd.get("notes") ?? "").trim(),
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        accuracyM: typeof accuracyM === "number" ? accuracyM : null,
      };

      const seller = byId(state.sellers, sellerId);
      const lead = byId(state.leads, leadId);
      const title = `${seller?.name ?? "Vendedor"} → ${lead?.name ?? "Lead"}`;

      if (existing) {
        Object.assign(existing, patch);
        pushActivity(state, { type: "visit.updated", message: `Visita actualizada: ${title}` });
      } else {
        state.visits.unshift({ id: uid("visit"), createdAt: nowISO(), ...patch });
        pushActivity(state, { type: "visit.created", message: `Visita registrada: ${title}` });
      }
      saveState(state);
      const savedVisit = existing ?? state.visits[0];
      if (isSupabaseReady() && savedVisit) {
        sbUpsertVisit(savedVisit).catch((e) => toast(`Supabase error: ${e?.message ?? e}`));
      }
      renderAll();
      return true;
    },
  });
}

function deleteVisit(id) {
  const v = byId(state.visits, id);
  if (!v) return;
  state.visits = state.visits.filter((x) => x.id !== id);
  pushActivity(state, { type: "visit.deleted", message: `Visita eliminada` });
  saveState(state);
  if (isSupabaseReady()) {
    sbDeleteVisit(id).catch((e) => toast(`Supabase error: ${e?.message ?? e}`));
  }
  renderAll();
}

// --- Rendering ---
function renderKpis() {
  const kpis = qs("#kpis");
  if (!kpis) return;

  const totalLeads = state.leads.length;
  const totalSellers = state.sellers.length;
  const totalVisits = state.visits.length;
  const won = state.leads.filter((l) => l.stage === "ganado").length;

  kpis.innerHTML = "";
  kpis.append(
    el("div", { class: "kpi" }, [el("strong", {}, [String(totalLeads)]), el("span", {}, ["Leads"])]),
    el("div", { class: "kpi" }, [
      el("strong", {}, [String(totalSellers)]),
      el("span", {}, ["Vendedores"]),
    ]),
    el("div", { class: "kpi" }, [
      el("strong", {}, [String(totalVisits)]),
      el("span", {}, ["Visitas"]),
    ]),
    el("div", { class: "kpi" }, [el("strong", {}, [String(won)]), el("span", {}, ["Ganados"])])
  );
}

function renderActivity() {
  const root = qs("#recentActivity");
  if (!root) return;
  root.innerHTML = "";
  const items = state.activity.slice(0, 8);
  if (!items.length) {
    root.appendChild(el("div", { class: "pill" }, ["Sin actividad todavía"]));
    return;
  }
  for (const a of items) {
    root.appendChild(
      el("div", { class: "row" }, [
        el("div", {}, [el("div", { class: "title" }, [a.message])]),
        el("div", { class: "sub" }, [fmtDateTime(a.at)]),
        el("div", { class: "pill" }, [a.type]),
      ])
    );
  }
}

function filteredLeads() {
  const q = String(qs("#leadSearch")?.value ?? "").trim().toLowerCase();
  const stage = String(qs("#leadStageFilter")?.value ?? "");
  return state.leads
    .filter((l) => (stage ? l.stage === stage : true))
    .filter((l) => {
      if (!q) return true;
      const hay = `${l.name ?? ""} ${l.city ?? ""} ${l.contact ?? ""} ${l.phone ?? ""} ${l.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
}

function renderLeads() {
  const root = qs("#leadsTable");
  if (!root) return;

  const leads = filteredLeads();
  root.innerHTML = "";
  root.appendChild(
    el("div", { class: "t-head" }, [
      el("div", {}, ["Lead"]),
      el("div", {}, ["Etapa"]),
      el("div", { class: "t-hide-sm" }, ["Ciudad"]),
      el("div", { class: "t-hide-sm" }, ["Vendedor"]),
      el("div", {}, ["Creado"]),
      el("div", {}, ["Acciones"]),
    ])
  );

  if (!leads.length) {
    root.appendChild(
      el("div", { class: "t-row" }, [
        el("div", { class: "muted" }, ["No hay leads para mostrar"]),
        el("div"),
        el("div"),
        el("div"),
        el("div"),
        el("div"),
      ])
    );
    return;
  }

  for (const l of leads) {
    const seller = byId(state.sellers, l.ownerSellerId);
    root.appendChild(
      el("div", { class: "t-row" }, [
        el("div", {}, [
          el("div", { class: "main" }, [l.name]),
          el("div", { class: "minor" }, [l.contact ? `Contacto: ${l.contact}` : ""]),
        ]),
        el("div", {}, [el("span", { class: "pill" }, [stageLabel(l.stage)])]),
        el("div", { class: "t-hide-sm muted" }, [l.city ?? "—"]),
        el("div", { class: "t-hide-sm muted" }, [seller?.name ?? "Sin asignar"]),
        el("div", { class: "muted" }, [fmtDateTime(l.createdAt)]),
        el("div", { class: "actions" }, [
          el(
            "button",
            { class: "btn btn-secondary", type: "button", onClick: () => openLeadModal(l) },
            ["Editar"]
          ),
          el(
            "button",
            { class: "btn btn-danger", type: "button", onClick: () => deleteLead(l.id) },
            ["Borrar"]
          ),
        ]),
      ])
    );
  }
}

function renderSellers() {
  const root = qs("#sellersList");
  if (!root) return;
  root.innerHTML = "";
  if (!state.sellers.length) {
    root.appendChild(el("div", { class: "pill" }, ["Aún no hay vendedores"]));
    return;
  }
  for (const s of state.sellers) {
    const leadCount = state.leads.filter((l) => l.ownerSellerId === s.id).length;
    const visitCount = state.visits.filter((v) => v.sellerId === s.id).length;
    root.appendChild(
      el("div", { class: "row" }, [
        el("div", {}, [
          el("div", { class: "title" }, [s.name]),
          el("div", { class: "sub" }, [[s.email, s.phone, s.zone].filter(Boolean).join(" · ") || "—"]),
        ]),
        el("div", { class: "sub" }, [`Leads: ${leadCount} · Visitas: ${visitCount}`]),
        el("div", { class: "actions" }, [
          el(
            "button",
            { class: "btn btn-secondary", type: "button", onClick: () => openSellerModal(s) },
            ["Editar"]
          ),
          el(
            "button",
            { class: "btn btn-danger", type: "button", onClick: () => deleteSeller(s.id) },
            ["Borrar"]
          ),
        ]),
      ])
    );
  }
}

function filteredVisits() {
  const sellerId = String(qs("#visitSellerFilter")?.value ?? "");
  const q = String(qs("#visitTextFilter")?.value ?? "").trim().toLowerCase();
  return state.visits
    .filter((v) => (sellerId ? v.sellerId === sellerId : true))
    .filter((v) => {
      if (!q) return true;
      const seller = byId(state.sellers, v.sellerId);
      const lead = byId(state.leads, v.leadId);
      const hay = `${seller?.name ?? ""} ${lead?.name ?? ""} ${v.notes ?? ""} ${v.kind ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
}

function renderVisits() {
  const list = qs("#visitsList");
  if (!list) return;
  const visits = filteredVisits();
  list.innerHTML = "";
  if (!visits.length) {
    list.appendChild(el("div", { class: "pill" }, ["No hay visitas para mostrar"]));
  } else {
    for (const v of visits.slice(0, 80)) {
      const seller = byId(state.sellers, v.sellerId);
      const lead = byId(state.leads, v.leadId);
      const loc = v.lat != null && v.lng != null ? `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}` : "Sin ubicación";
      list.appendChild(
        el("div", { class: "row" }, [
          el("div", {}, [
            el("div", { class: "title" }, [`${seller?.name ?? "Vendedor"} · ${lead?.name ?? "Lead"}`]),
            el("div", { class: "sub" }, [
              `${fmtDateTime(v.at)} · ${stageLabel(lead?.stage)} · ${v.kind ?? "visita"}`,
            ]),
            v.notes ? el("div", { class: "sub" }, [v.notes]) : null,
          ]),
          el("div", { class: "sub" }, [loc]),
          el("div", { class: "actions" }, [
            el(
              "button",
              {
                class: "btn btn-secondary",
                type: "button",
                onClick: () => {
                  if (v.lat != null && v.lng != null) {
                    setView("visits");
                    ensureMap();
                    if (map) map.setView([v.lat, v.lng], Math.max(map.getZoom(), 16));
                  } else {
                    toast("Esta visita no tiene ubicación");
                  }
                },
              },
              ["Ver"]
            ),
            el(
              "button",
              { class: "btn btn-secondary", type: "button", onClick: () => openVisitModal(v) },
              ["Editar"]
            ),
            el(
              "button",
              { class: "btn btn-danger", type: "button", onClick: () => deleteVisit(v.id) },
              ["Borrar"]
            ),
          ]),
        ])
      );
    }
  }
  renderVisitMarkers(visits);
}

function renderVisitFilters() {
  const sel = qs("#visitSellerFilter");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";
  sel.appendChild(el("option", { value: "" }, ["Todos los vendedores"]));
  for (const s of state.sellers) {
    sel.appendChild(el("option", { value: s.id }, [s.name]));
  }
  sel.value = prev && state.sellers.some((s) => s.id === prev) ? prev : "";
}

function renderAll() {
  renderKpis();
  renderActivity();
  renderVisitFilters();
  renderLeads();
  renderSellers();
  renderVisits();
}

// --- Buttons wiring ---
qs("#addSellerBtn")?.addEventListener("click", () => openSellerModal());
qs("#addLeadBtn")?.addEventListener("click", () => openLeadModal());
qs("#addVisitBtn")?.addEventListener("click", () => openVisitModal());
qs("#quickAddLead")?.addEventListener("click", () => {
  setView("leads");
  openLeadModal();
});
qs("#quickAddVisit")?.addEventListener("click", () => {
  setView("visits");
  openVisitModal();
});
qs("#quickLocate")?.addEventListener("click", async () => {
  try {
    const g = await getGeo();
    setView("visits");
    ensureMap();
    if (map) map.setView([g.lat, g.lng], Math.max(map.getZoom(), 15));
    toast(`Ubicación actual (±${Math.round(g.accuracyM)}m)`);
  } catch (e) {
    toast(`GPS error: ${e?.message ?? e}`);
  }
});

qs("#leadSearch")?.addEventListener("input", () => renderLeads());
qs("#leadStageFilter")?.addEventListener("change", () => renderLeads());

qs("#visitSellerFilter")?.addEventListener("change", () => renderVisits());
qs("#visitTextFilter")?.addEventListener("input", () => renderVisits());
qs("#fitMapBtn")?.addEventListener("click", () => fitMapToVisits(filteredVisits()));

qs("#seedBtn")?.addEventListener("click", () => {
  if (state.sellers.length || state.leads.length || state.visits.length) {
    toast("Ya hay datos. Si quieres demo, borra primero.");
    return;
  }
  const s1 = {
    id: uid("seller"),
    createdAt: nowISO(),
    name: "Laura Pérez",
    email: "laura@eos.edu",
    phone: "3000000001",
    zone: "Norte",
  };
  const s2 = {
    id: uid("seller"),
    createdAt: nowISO(),
    name: "Diego Ruiz",
    email: "diego@eos.edu",
    phone: "3000000002",
    zone: "Sur",
  };
  state.sellers.push(s1, s2);
  const l1 = {
    id: uid("lead"),
    createdAt: nowISO(),
    name: "Colegio Los Robles",
    city: "Bogotá",
    contact: "Rectoría",
    phone: "6010000000",
    email: "contacto@robles.edu",
    stage: "contactado",
    ownerSellerId: s1.id,
    notes: "Interés en plataforma para grados 6-11",
  };
  const l2 = {
    id: uid("lead"),
    createdAt: nowISO(),
    name: "Instituto Aurora",
    city: "Bogotá",
    contact: "Coordinación Académica",
    phone: "6010000001",
    email: "coord@aurora.edu",
    stage: "demo",
    ownerSellerId: s2.id,
    notes: "Solicitan demo con módulo evaluaciones",
  };
  const l3 = {
    id: uid("lead"),
    createdAt: nowISO(),
    name: "Colegio San Martín",
    city: "Soacha",
    contact: "Administración",
    phone: "6010000002",
    email: "admin@sanmartin.edu",
    stage: "nuevo",
    ownerSellerId: "",
    notes: "",
  };
  state.leads.push(l1, l2, l3);
  state.visits.unshift(
    {
      id: uid("visit"),
      createdAt: nowISO(),
      sellerId: s1.id,
      leadId: l1.id,
      at: nowISO(),
      kind: "visita",
      notes: "Reunión inicial. Solicitan propuesta por sede.",
      lat: 4.6533,
      lng: -74.0836,
      accuracyM: null,
    },
    {
      id: uid("visit"),
      createdAt: nowISO(),
      sellerId: s2.id,
      leadId: l2.id,
      at: nowISO(),
      kind: "demo",
      notes: "Demo realizada con equipo académico.",
      lat: 4.7109,
      lng: -74.0721,
      accuracyM: null,
    }
  );
  pushActivity(state, { type: "seed", message: "Datos demo cargados" });
  saveState(state);
  renderAll();
  toast("Demo cargada");
});

qs("#exportBtn")?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "eos-crm-export.json" });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

qs("#importInput")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsed = safeJsonParse(text);
  if (!parsed.ok) {
    toast("JSON inválido");
    return;
  }
  state = normalizeState(parsed.value);
  pushActivity(state, { type: "import", message: "Datos importados" });
  saveState(state);
  renderAll();
  toast("Importado");
  e.target.value = "";
});

qs("#resetBtn")?.addEventListener("click", () => {
  state = createEmptyState();
  saveState(state);
  renderAll();
  toast("Borrado");
});

// --- Supabase settings wiring ---
function trimOrEmpty(v) {
  return String(v ?? "").trim();
}

function fillSupabaseInputs() {
  const url = qs("#sbUrl");
  const key = qs("#sbAnonKey");
  if (url) url.value = sbCfg.url ?? "";
  if (key) key.value = sbCfg.anonKey ?? "";
  renderSupabaseStatus();
}

qs("#sbSaveBtn")?.addEventListener("click", () => {
  const url = trimOrEmpty(qs("#sbUrl")?.value);
  const anonKey = trimOrEmpty(qs("#sbAnonKey")?.value);
  sbCfg = { enabled: Boolean(url && anonKey), url, anonKey };
  sb = null;
  saveSupabaseCfg(sbCfg);
  renderSupabaseStatus();
  toast(sbCfg.enabled ? "Supabase guardado" : "Supabase deshabilitado (incompleto)");
});

qs("#sbDisconnectBtn")?.addEventListener("click", () => {
  sbCfg = { enabled: false, url: "", anonKey: "" };
  sb = null;
  saveSupabaseCfg(sbCfg);
  fillSupabaseInputs();
  toast("Desconectado");
});

qs("#sbTestBtn")?.addEventListener("click", async () => {
  try {
    const r = await sbTestConnection();
    if (!r.ok) throw r.error;
    toast("Conexión OK");
  } catch (e) {
    toast(`Error: ${e?.message ?? e}`);
  }
});

qs("#sbSyncBtn")?.addEventListener("click", async () => {
  try {
    if (!isSupabaseReady()) {
      toast("Configura Supabase primero");
      return;
    }
    await syncFromSupabase();
    renderAll();
    toast("Sincronizado");
  } catch (e) {
    toast(`Sync error: ${e?.message ?? e}`);
  }
});

// --- Init ---
renderAll();
setView("dashboard");
fillSupabaseInputs();

