import { useState, useEffect, useRef, useMemo, Component, createContext, useContext } from "react";

// ════════════════════════════════════════════════════════════════════════════
// HIT-ENGINE — self-contained, deterministic music prompt engine.
// Visual system: Linear-first. One accent, graded neutral surfaces,
// precise 1px borders, tight 8pt rhythm, one typeface family (Geist).
// NO external AI APIs. All logic is local, deterministic, rule-based.
// ════════════════════════════════════════════════════════════════════════════


// ────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM TOKENS
// ────────────────────────────────────────────────────────────────────────────
const T = {
  bg:         "#08090B",
  surface:    "#0E0F12",
  elevated:   "#15171C",
  hover:      "#1A1C22",
  border:     "#1F2128",
  borderHi:   "#2A2D35",
  borderFocus:"#3A3F4B",
  text:       "#EDEEF0",
  textSec:    "#A1A4AB",
  textTer:    "#6B6E76",
  textMuted:  "#464951",
  accent:     "#5E6AD2",
  accentHi:   "#7C8BFF",
  accentLo:   "#3D47A6",
  accentBg:   "rgba(94,106,210,0.08)",
  accentBorder: "rgba(94,106,210,0.35)",
  success:    "#4ADE80",
  warning:    "#F5A524",
  danger:     "#EF4444",
  s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48, s8: 64, s9: 96, s10: 128,
  fs_xs: 11, fs_sm: 12, fs_md: 13, fs_base: 14, fs_lg: 16, fs_xl: 20,
  fs_2xl: 28, fs_3xl: 40, fs_4xl: 56, fs_5xl: 96,
  ease: "cubic-bezier(0.16, 1, 0.3, 1)",
  dur_fast: "120ms",
  dur_norm: "180ms",
  dur_slow: "240ms",
  r_sm: 4, r_md: 6, r_lg: 8,
  font_sans: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  font_mono: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  font_display: "'Instrument Serif', 'Playfair Display', Georgia, serif",
};

const CASINO_OUTLINES = ["#FF2D9C","#FFD700","#00E5FF","#FF6B00","#00FF88","#E94FEF","#FF4D4D"];

// ── CASINO VEGAS PALETTE (decorative layer overlaying the structural design system) ──
const V = {
  hotPink:   "#FF2D9C",
  neonGold:  "#FFD700",
  cyan:      "#00E5FF",
  lime:      "#00FF88",
  orange:    "#FF6B00",
  magenta:   "#E94FEF",
  red:       "#FF1744",
  purple:    "#8B5CF6",
  darkRed:   "#8B0000",
  feltGreen: "#0B3D1E",
  velvet:    "#1A0A1F",
};

// ────────────────────────────────────────────────────────────────────────────
// USER TIERS — demo/honor system. Real auth is a separate build.
// ────────────────────────────────────────────────────────────────────────────
const TIERS = {
  free:  { id: "free",  label: "Free",  color: "#6B6E76", description: "Try the engine" },
  pro:   { id: "pro",   label: "Pro",   color: "#5E6AD2", description: "Full creative access" },
  vip:   { id: "vip",   label: "VIP",   color: "#FFD700", description: "Everything + premium perks + exports" },
  admin: { id: "admin", label: "Admin", color: "#EF4444", description: "Behind-the-scenes debug view" },
};

// Ordered rank for tier comparison (higher number = higher tier)
const TIER_RANK = { free: 0, pro: 1, vip: 2, admin: 3 };

// Subscription pricing in USD — monthly. Annual is 35% off (~7.8 months cost).
// These are simulated demo prices; real payments are not processed.
const TIER_PRICE = {
  free:  { monthly: 0,    yearly: 0    },
  pro:   { monthly: 4.99, yearly: 39   },
  vip:   { monthly: 9.99, yearly: 79   },
  admin: null, // dev-only tier
};

// Helper — compute the effective monthly price on the yearly plan (for "save X%" math)
const yearlyMonthlyRate = (tier) => TIER_PRICE[tier]?.yearly / 12;
const yearlySavingsPct = (tier) => {
  const t = TIER_PRICE[tier];
  if (!t || !t.monthly) return 0;
  return Math.round((1 - (t.yearly / 12) / t.monthly) * 100);
};

// Feature flags per tier — single source of truth.
// PHILOSOPHY: Free should feel like a "demo that works" — useful but clearly
// incomplete. Pro should feel like "unlocking the full tool." VIP should feel
// like "getting ahead of everyone else" (premium perks, deep analytics).
const TIER_FEATURES = {
  free: {
    // ── Engine capabilities
    maxSlots: 1,                   // only 1 genre slot
    modes: ["simple", "moderated", "chaos"],  // 3 of 5 modes
    maxInstruments: 10,            // 10 per category (generous taste)
    maxOptionsPerSection: 5,       // first 5 options per section, rest blurred
    showOptionNames: true,         // labels shown (but blurred past index 5)
    hasOnToggle: false,            // tri-toggle capped at Off/Auto (no forced include)
    // ── Power-user tools (all Pro+)
    locks: false,                  // NO slot locks, section locks, option locks
    favorites: false,              // no favoriting chips
    presets: false,                // cannot save configurations
    // ── Analytics + visuals
    popHitMeter: false,            // Pop profile match meter hidden
    casinoFlash: false,            // no sparkle animation during roll
    // ── Output
    maxPromptVariants: 1,          // single prompt per roll
    shareableLinks: false,         // no copy-shareable-link button
    exportJSON: false,             // no JSON export
    // ── Daily Hit allocation — Free gets 10/day, paid tiers get unlimited
    dailyFuel: { free: 10, pro: 0, vip: 0 },
    // ── Genre History
    historyAccess: "main-yearly",  // only main genres, yearly graph only
    historyMaxSelect: 3,
    // ── Pages
    vipSecretsPage: false,
    adminDebug: false,
    // ── Commercial
    upgradeNudges: true,           // show "Upgrade to Pro" messaging
  },
  pro: {
    // ── Engine capabilities — fully unlocked
    maxSlots: 3,
    modes: ["simple", "moderated", "expanded", "vast", "chaos"],
    maxInstruments: Infinity,
    maxOptionsPerSection: Infinity,
    showOptionNames: true,
    hasOnToggle: true,
    // ── Power-user tools — all unlocked
    locks: true,                   // slot/section/option locks all work
    favorites: true,
    presets: true,
    maxPresetSlots: 10,
    // ── Analytics
    popHitMeter: true,             // Pop profile match meter visible
    casinoFlash: true,             // premium roll animation
    // ── Output
    maxPromptVariants: 1,
    shareableLinks: true,          // copy-to-clipboard share URLs
    exportJSON: false,             // JSON export reserved for VIP
    // ── Fuel — Pro is unlimited
    dailyFuel: { free: Infinity, pro: Infinity, vip: 0 },
    // ── History
    historyAccess: "full-yearly",
    historyMaxSelect: 5,
    // ── Pages
    vipSecretsPage: false,
    adminDebug: false,
    // ── Commercial
    upgradeNudges: false,          // clean UI, no upsell noise
  },
  vip: {
    // ── Engine — everything Pro has
    maxSlots: 3,
    modes: ["simple", "moderated", "expanded", "vast", "chaos"],
    maxInstruments: Infinity,
    maxOptionsPerSection: Infinity,
    showOptionNames: true,
    hasOnToggle: true,
    locks: true,
    favorites: true,
    presets: true,
    maxPresetSlots: 50,            // 5x more preset slots
    // ── Analytics + visuals
    popHitMeter: true,
    casinoFlash: true,
    // ── Output — VIP-exclusive extras
    maxPromptVariants: 5,          // batch generate 5 variants per roll
    shareableLinks: true,
    exportJSON: true,              // export configurations as JSON
    // ── Fuel — VIP gets its own premium fuel type with full allocation
    dailyFuel: { free: Infinity, pro: Infinity, vip: Infinity },
    // ── History — full depth
    historyAccess: "full-monthly",
    historyMaxSelect: 25,
    // ── Pages
    vipSecretsPage: true,
    adminDebug: false,
    // ── Commercial
    upgradeNudges: false,
  },
  admin: {
    // All unlocked, all infinite — dev only
    maxSlots: 3,
    modes: ["simple", "moderated", "expanded", "vast", "chaos"],
    maxInstruments: Infinity,
    maxOptionsPerSection: Infinity,
    showOptionNames: true,
    hasOnToggle: true,
    locks: true,
    favorites: true,
    presets: true,
    maxPresetSlots: Infinity,
    popHitMeter: true,
    casinoFlash: true,
    maxPromptVariants: 5,
    shareableLinks: true,
    exportJSON: true,
    dailyFuel: { free: Infinity, pro: Infinity, vip: Infinity },
    historyAccess: "full-monthly",
    historyMaxSelect: Infinity,
    vipSecretsPage: true,
    adminDebug: true,
    upgradeNudges: false,
  },
};

// ────────────────────────────────────────────────────────────────────────────
// FUEL SYSTEM — three fuel types. Daily counters persist via localStorage.
// ────────────────────────────────────────────────────────────────────────────
const FUEL_TYPES = {
  free:  { id: "free",  label: "Free Hit",  color: "#00FF88", emoji: "🟢" },
  pro:   { id: "pro",   label: "Pro Hit",   color: "#FF1744", emoji: "🔴" },
  vip:   { id: "vip",   label: "VIP Hit",   color: "#C792EA", emoji: "🟣" },
};

// Free-tier subgenre whitelist: the 3 most mainstream subgenres under each main
// genre. Free users can only roll these when using Free Hit Fuel. Pro+ fuel
// unlocks the full tree.
const FREE_SUBGENRES = {
  "Hip-Hop":              ["Trap", "Boom Bap", "Drill"],
  "R&B / Soul":           ["Contemporary R&B", "Neo-Soul", "Alt R&B"],
  "Pop":                  ["Dance-Pop", "Indie Pop", "Synth-Pop"],
  "Disco / Dance":        ["Disco", "Nu-Disco", "Dance-Pop"],
  "Electronic":           ["House", "Techno", "Dubstep"],
  "Latin":                ["Reggaeton", "Latin Trap", "Bachata"],
  "Rock":                 ["Alt-Rock", "Indie Rock", "Classic Rock"],
  "Metal":                ["Heavy Metal", "Metalcore", "Progressive Metal"],
  "World / Global":       ["Afrobeats", "Amapiano", "K-Pop"],
  "Blues":                ["Chicago Blues", "Delta Blues", "Electric Blues"],
  "Country / Americana":  ["Modern Country", "Country Pop", "Americana"],
  "Folk / Acoustic":      ["Indie Folk", "Folk Rock", "Acoustic Singer-Songwriter"],
  "Jazz":                 ["Smooth Jazz", "Jazz Fusion", "Bebop"],
  "Ambient / New Age":    ["Ambient", "Drone", "New Age"],
  "Soundtrack / Score":   ["Cinematic Orchestral", "Lo-fi Chill", "Synthwave Score"],
  "Classical / Orchestral":["Romantic-era","Baroque","Modern Minimalist"],
  "Gospel / Spiritual":   ["Gospel", "Contemporary Christian", "Gospel Soul"],
  "Experimental":         ["Glitch", "Noise", "Drone"],
};

const FuelContext = createContext({});
function useFuel() { return useContext(FuelContext); }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function FuelProvider({ children }) {
  const { tier, features } = useTier();
  const [fuels, setFuels] = useState(() => ({ ...features.dailyFuel }));
  const [activeFuel, setActiveFuel] = useState("free");
  const [lastReset, setLastReset] = useState(todayKey());

  // Load persisted fuel state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("he-fuel-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.date === todayKey() && parsed.tier === tier) {
        setFuels(parsed.fuels);
        setActiveFuel(parsed.activeFuel || "free");
      } else {
        // New day or tier changed → reset to fresh allocation
        setFuels({ ...features.dailyFuel });
        setLastReset(todayKey());
      }
    } catch {}
    // eslint-disable-next-line
  }, [tier]);

  // Persist on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("he-fuel-v1", JSON.stringify({
        date: todayKey(), tier, fuels, activeFuel,
      }));
    } catch {}
  }, [fuels, activeFuel, tier]);

  // IMPORTANT: Fuel must NOT reset on manual tier switching.
  // Fuel is refilled only in two cases:
  //   (1) The day rolls over (handled by the localStorage bootstrap above,
  //       which reseeds from features.dailyFuel when the stored date differs)
  //   (2) A tier is purchased through the shop (handled by refillForTier,
  //       called explicitly from the purchase flow)
  // Switching tiers by itself should never change the user's remaining fuel.

  // If the user's current active fuel is a type their tier doesn't have ANY
  // allocation for (e.g. free user was on VIP fuel then tier dropped),
  // fall back to free fuel — but don't touch the fuel counts themselves.
  useEffect(() => {
    const allocation = features.dailyFuel[activeFuel];
    if (allocation === 0 || allocation === undefined) {
      // This fuel isn't available at all for the current tier — bounce to free
      setActiveFuel("free");
    }
  }, [tier, activeFuel, features]);

  const consumeFuel = (type) => {
    const t = type || activeFuel;
    if (!Number.isFinite(fuels[t])) return true; // Infinity → no decrement, always allow
    if (fuels[t] <= 0) return false;
    setFuels(prev => ({ ...prev, [t]: Math.max(0, prev[t] - 1) }));
    return true;
  };

  const refillAll = () => setFuels({ ...features.dailyFuel });
  const setFuel = (type, v) => setFuels(prev => ({ ...prev, [type]: v }));

  // Refill to a SPECIFIC tier's daily allocation. Called by the purchase flow
  // when a user buys a tier upgrade. Grants full daily fuel for the new tier.
  const refillForTier = (tierId) => {
    const alloc = TIER_FEATURES[tierId]?.dailyFuel;
    if (alloc) setFuels({ ...alloc });
  };

  const value = useMemo(() => ({
    fuels, activeFuel, setActiveFuel, consumeFuel, refillAll, setFuel, refillForTier,
  }), [fuels, activeFuel]);

  return <FuelContext.Provider value={value}>{children}</FuelContext.Provider>;
}

function fuelDisplay(v) {
  if (!Number.isFinite(v)) return "∞";
  return String(v);
}

const TierContext = createContext({
  tier: "free", setTier: () => {}, features: TIER_FEATURES.free,
  ownedTiers: new Set(["free"]), purchaseTier: () => ({ ok: false }),
  revokeTier: () => {},
  streak: 0, dailyBonus: null, dismissDailyBonus: () => {},
  isDebug: false,
  toggleDevMode: () => {},
  devModeActive: false,
});

function useTier() { return useContext(TierContext); }

// ────────────────────────────────────────────────────────────────────────────
// LAYOUT CONTEXT — auto-detect phone vs desktop, allow manual override
// ────────────────────────────────────────────────────────────────────────────
const LayoutContext = createContext({ layout: "desktop", setLayout: () => {}, auto: true, setAuto: () => {} });
function useLayout() { return useContext(LayoutContext); }

function LayoutProvider({ children }) {
  // Start with a best-guess default so SSR/first paint works; real detection happens in effect
  const detect = () => {
    if (typeof window === "undefined") return "desktop";
    const narrow = window.matchMedia && window.matchMedia("(max-width: 820px)").matches;
    const ua = navigator.userAgent || "";
    const mobileUA = /iPhone|iPad|Android|Mobile|iPod/i.test(ua);
    return (narrow || mobileUA) ? "mobile" : "desktop";
  };

  const [layout, setLayoutState] = useState("desktop");
  const [auto, setAuto] = useState(true);

  // Run detection once on mount
  useEffect(() => {
    setLayoutState(detect());
  }, []);

  // While auto is on, re-run detection on resize so rotating the phone or resizing updates
  useEffect(() => {
    if (!auto) return;
    const handler = () => setLayoutState(detect());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [auto]);

  // Manual override: user clicked the toggle
  const setLayout = (next) => {
    setAuto(false);            // lock to manual choice
    setLayoutState(next);
  };
  const resetAuto = () => { setAuto(true); setLayoutState(detect()); };

  const value = useMemo(() => ({ layout, setLayout, auto, setAuto: resetAuto }), [layout, auto]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

function LayoutToggle() {
  const { layout, setLayout, auto, setAuto } = useLayout();
  return (
    <div style={{
      display: "inline-flex", alignItems: "center",
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 6, padding: 2, flexShrink: 0,
    }}>
      <button type="button"
        onClick={() => setLayout("desktop")}
        title="Desktop layout"
        style={{
          background: layout === "desktop" ? T.elevated : "transparent",
          border: "none",
          color: layout === "desktop" ? T.text : T.textTer,
          padding: "5px 9px", borderRadius: 4, cursor: "pointer",
          fontSize: 13, lineHeight: 1,
          transition: "all 120ms ease-out",
        }}>🖥</button>
      <button type="button"
        onClick={() => setLayout("mobile")}
        title="Mobile layout"
        style={{
          background: layout === "mobile" ? T.elevated : "transparent",
          border: "none",
          color: layout === "mobile" ? T.text : T.textTer,
          padding: "5px 9px", borderRadius: 4, cursor: "pointer",
          fontSize: 13, lineHeight: 1,
          transition: "all 120ms ease-out",
        }}>📱</button>
      {!auto && (
        <button type="button"
          onClick={setAuto}
          title="Revert to auto-detect"
          style={{
            background: "transparent", border: "none",
            color: T.textMuted,
            padding: "5px 6px", cursor: "pointer",
            fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
          }}>⟲</button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FUEL GEARSHIFT — car-style gearshift for choosing active fuel
// ────────────────────────────────────────────────────────────────────────────
function FuelGearshift({ compact = false }) {
  const { fuels, activeFuel, setActiveFuel, setFuel, refillAll } = useFuel();
  const { tier, features } = useTier();
  const isAdmin = tier === "admin";

  const options = [
    { id: "free",  ...FUEL_TYPES.free,  angle: 0 },
    { id: "pro",   ...FUEL_TYPES.pro,   angle: 0 },
    { id: "vip", ...FUEL_TYPES.vip, angle: 0 },
  ];

  return (
    <div style={{
      background: "linear-gradient(145deg, #1a1d24 0%, #0b0d12 100%)",
      border: `1px solid ${T.borderHi}`,
      borderRadius: compact ? 10 : 14,
      padding: compact ? 10 : 14,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.6)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: compact ? 8 : 10,
      }}>
        <span style={{
          fontSize: 9, letterSpacing: "0.25em", fontWeight: 700,
          color: T.textTer, fontFamily: T.font_mono,
        }}>FUEL SELECT</span>
        <span style={{
          fontSize: 8, letterSpacing: "0.2em", fontWeight: 700,
          color: FUEL_TYPES[activeFuel]?.color || T.textTer,
          textShadow: `0 0 6px ${FUEL_TYPES[activeFuel]?.color || T.textTer}88`,
          fontFamily: T.font_mono,
        }}>● ENGAGED</span>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
      }}>
        {options.map(o => {
          const active = activeFuel === o.id;
          const fuelLeft = fuels[o.id];
          const empty = Number.isFinite(fuelLeft) && fuelLeft <= 0;
          return (
            <button key={o.id} type="button"
              onClick={() => !empty && setActiveFuel(o.id)}
              disabled={empty}
              style={{
                position: "relative",
                background: active
                  ? `linear-gradient(145deg, ${o.color}33 0%, ${o.color}11 100%)`
                  : "rgba(0,0,0,0.4)",
                border: `2px solid ${active ? o.color : empty ? T.borderMuted : T.border}`,
                boxShadow: active
                  ? `0 0 12px ${o.color}88, inset 0 1px 0 rgba(255,255,255,0.08)`
                  : "inset 0 1px 0 rgba(255,255,255,0.04)",
                color: active ? o.color : empty ? T.textMuted : T.textSec,
                padding: compact ? "10px 8px" : "12px 10px",
                borderRadius: 8,
                cursor: empty ? "not-allowed" : "pointer",
                transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                opacity: empty ? 0.5 : 1,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                fontFamily: T.font_mono,
              }}
              onMouseEnter={e => {
                if (active || empty) return;
                e.currentTarget.style.borderColor = `${o.color}88`;
                e.currentTarget.style.boxShadow = `0 0 8px ${o.color}44`;
              }}
              onMouseLeave={e => {
                if (active || empty) return;
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
              }}>
              {/* Color-dot indicator */}
              <span style={{
                width: compact ? 10 : 12, height: compact ? 10 : 12, borderRadius: "50%",
                background: o.color,
                boxShadow: active
                  ? `0 0 8px ${o.color}, 0 0 16px ${o.color}AA`
                  : empty ? "none" : `0 0 4px ${o.color}66`,
                filter: empty ? "grayscale(100%)" : "none",
              }} />
              <span style={{
                fontSize: compact ? 9 : 10, fontWeight: 700, letterSpacing: "0.1em",
                textShadow: active ? `0 0 6px ${o.color}88` : "none",
              }}>{o.label.split(" ")[0].toUpperCase()}</span>
              <span style={{
                fontSize: compact ? 11 : 13, fontWeight: 700,
                color: empty ? T.textMuted : active ? o.color : T.text,
              }}>{fuelDisplay(fuelLeft)}</span>
            </button>
          );
        })}
      </div>

      {/* ADMIN FUEL EDITOR — only visible to admin tier */}
      {isAdmin && (
        <div style={{
          marginTop: 10, padding: "10px 12px",
          background: "#100205",
          border: `1px dashed ${T.danger}55`,
          borderRadius: 8,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8,
          }}>
            <span style={{
              color: T.danger, fontFamily: T.font_mono, fontSize: 9,
              fontWeight: 700, letterSpacing: "0.25em",
              textShadow: `0 0 4px ${T.danger}88`,
            }}>⚡ ADMIN FUEL EDITOR</span>
            <button type="button" onClick={refillAll} style={{
              background: "transparent", border: `1px solid ${T.danger}66`,
              color: T.danger, padding: "3px 8px", borderRadius: 4,
              fontFamily: T.font_mono, fontSize: 9, letterSpacing: "0.15em",
              fontWeight: 700, cursor: "pointer",
            }}>REFILL ALL</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {options.map(o => {
              const v = fuels[o.id];
              const isInf = !Number.isFinite(v);
              return (
                <div key={o.id} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8,
                  alignItems: "center",
                }}>
                  <span style={{
                    color: o.color, fontFamily: T.font_mono, fontSize: 10,
                    fontWeight: 700, letterSpacing: "0.15em",
                    textShadow: `0 0 4px ${o.color}66`,
                    minWidth: 48,
                  }}>{o.label.split(" ")[0].toUpperCase()}</span>
                  <input type="number"
                    value={isInf ? "" : v}
                    placeholder={isInf ? "∞" : ""}
                    onChange={e => {
                      const raw = e.target.value;
                      setFuel(o.id, raw === "" ? Infinity : parseInt(raw, 10) || 0);
                    }}
                    style={{
                      background: "rgba(0,0,0,0.5)",
                      border: `1px solid ${o.color}44`,
                      color: T.text,
                      padding: "4px 8px", borderRadius: 4,
                      fontFamily: T.font_mono, fontSize: 11,
                      outline: "none", width: "100%",
                    }}/>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button type="button"
                      onClick={() => setFuel(o.id, isInf ? 0 : Math.max(0, v - 1))}
                      style={{
                        background: "transparent", border: `1px solid ${T.border}`,
                        color: T.textSec, width: 22, height: 22, borderRadius: 3,
                        fontFamily: T.font_mono, fontSize: 11, cursor: "pointer",
                      }}>−</button>
                    <button type="button"
                      onClick={() => setFuel(o.id, isInf ? 1 : v + 1)}
                      style={{
                        background: "transparent", border: `1px solid ${T.border}`,
                        color: T.textSec, width: 22, height: 22, borderRadius: 3,
                        fontFamily: T.font_mono, fontSize: 11, cursor: "pointer",
                      }}>+</button>
                    <button type="button"
                      onClick={() => setFuel(o.id, Infinity)}
                      title="Set to infinite"
                      style={{
                        background: "transparent", border: `1px solid ${T.border}`,
                        color: T.textSec, width: 22, height: 22, borderRadius: 3,
                        fontFamily: T.font_mono, fontSize: 11, cursor: "pointer",
                      }}>∞</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact fuel badges for the nav — just the remaining counts
function FuelBadgesNav() {
  const { fuels, activeFuel } = useFuel();
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 8px",
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 6, fontFamily: T.font_mono, fontSize: 10, fontWeight: 700,
    }}>
      {Object.values(FUEL_TYPES).map(f => {
        const active = activeFuel === f.id;
        const v = fuels[f.id];
        return (
          <span key={f.id} title={f.label} style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            color: active ? f.color : T.textTer,
            textShadow: active ? `0 0 4px ${f.color}66` : "none",
            padding: "2px 4px", borderRadius: 3,
            background: active ? `${f.color}14` : "transparent",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: f.color,
              boxShadow: active ? `0 0 4px ${f.color}` : "none",
            }} />
            {fuelDisplay(v)}
          </span>
        );
      })}
    </div>
  );
}

function TierLock({ feature, requiredTier = "pro", compact = false }) {
  const t = TIERS[requiredTier];
  if (compact) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", fontFamily: T.font_mono, fontSize: 9,
        letterSpacing: "0.15em", fontWeight: 700,
        color: t.color, background: `${t.color}11`,
        border: `1px solid ${t.color}44`, borderRadius: 4,
        textShadow: `0 0 4px ${t.color}66`,
      }}>
        🔒 {t.label.toUpperCase()}
      </span>
    );
  }
  return (
    <div style={{
      padding: "14px 16px", marginBottom: T.s4,
      background: `${t.color}08`,
      border: `1px dashed ${t.color}44`,
      borderRadius: 8,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{
        fontSize: 16, color: t.color,
        textShadow: `0 0 8px ${t.color}`,
      }}>🔒</span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 11, fontFamily: T.font_mono, fontWeight: 700,
          letterSpacing: "0.2em", color: t.color,
          textShadow: `0 0 6px ${t.color}66`,
          marginBottom: 2,
        }}>
          {t.label.toUpperCase()} TIER
        </div>
        <div style={{
          color: T.textSec, fontSize: 12, fontFamily: T.font_sans,
        }}>
          {feature} is available in the {t.label} tier or higher.
        </div>
      </div>
    </div>
  );
}

// Storage key uses versioning so future schema changes don't silently break.
// Bumping to v2 because the v1 shape (if any existed in user browsers) didn't
// have persistent tier/credits data. On first v2 load we start fresh.
const TIER_STORAGE_KEY = "he-tier-v2";

// isDebugMode — enables admin features when URL contains ?debug=1
// Developer-only. Not user-facing.
function isDebugMode() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "1";
  } catch { return false; }
}

function TierProvider({ children }) {
  // Bootstrap from localStorage if available, else defaults
  const bootstrap = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(TIER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        tier: parsed.tier || "free",
        owned: Array.isArray(parsed.owned) ? parsed.owned : ["free"],
        lastVisit: parsed.lastVisit || null,
        streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      };
    } catch { return null; }
  };

  const seed = bootstrap();
  const [tier, _setTierInternal] = useState(seed?.tier || "free");
  const [ownedTiers, setOwnedTiers] = useState(new Set(seed?.owned || ["free"]));
  const [lastVisit, setLastVisit] = useState(seed?.lastVisit || null);
  const [streak, setStreak] = useState(seed?.streak || 0);
  // Daily bonus toast — streak-based welcome back UI
  const [dailyBonus, setDailyBonus] = useState(null);

  // Persist on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify({
        tier, owned: [...ownedTiers], lastVisit, streak,
      }));
    } catch { /* storage quota / privacy mode — ignore */ }
  }, [tier, ownedTiers, lastVisit, streak]);

  // ── LOGIN STREAK — one daily bonus per calendar day ──────────────────
  // Runs once on mount. Compares today's key to lastVisit:
  //   - Same day: no bonus, no change
  //   - Next day: streak +1, bonus = 5 + min(streak, 5) extra (caps at +10)
  //   - Gap > 1 day: streak resets to 1
  useEffect(() => {
    const today = todayKey();
    if (lastVisit === today) return; // already awarded today

    let newStreak = 1;
    if (lastVisit) {
      const [y, m, d] = lastVisit.split("-").map(Number);
      const yesterday = new Date(Date.UTC(y, m - 1, d));
      yesterday.setUTCDate(yesterday.getUTCDate() + 1);
      const yesterdayKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterday.getUTCDate()).padStart(2, "0")}`;
      newStreak = yesterdayKey === today ? streak + 1 : 1;
    }

    // Streak is purely engagement/retention metric now — no credit reward
    setStreak(newStreak);
    setLastVisit(today);
    // Only show the toast on day 2+ (day 1 is just "hello")
    if (newStreak > 1) {
      setDailyBonus({ streak: newStreak });
      const timer = setTimeout(() => setDailyBonus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, []); // once per mount

  // Only allow switching to an owned tier
  const setTier = (t) => {
    if (ownedTiers.has(t)) _setTierInternal(t);
  };

  // Subscribe to a tier — simulated monthly or yearly subscription.
  // Returns {ok, error}. billing is "monthly" | "yearly".
  const purchaseTier = (t, billing = "monthly") => {
    if (t === "admin") {
      return { ok: false, error: "Admin tier isn't for sale." };
    }
    if (ownedTiers.has(t)) {
      return { ok: false, error: "You're already subscribed to this tier." };
    }
    // Can't downgrade-buy a lower tier when you have higher
    const currentHighestOwned = Math.max(...[...ownedTiers].map(x => TIER_RANK[x] ?? 0));
    if ((TIER_RANK[t] ?? 0) < currentHighestOwned) {
      return { ok: false, error: "You're on a higher tier — downgrade from account settings instead." };
    }
    // In demo mode we don't actually charge — just activate
    setOwnedTiers(prev => {
      const next = new Set(prev);
      next.add(t);
      return next;
    });
    _setTierInternal(t);
    return { ok: true };
  };

  // Revoke a tier — used for refunds or if admin debug is toggled off.
  // Cannot revoke free. If the currently-active tier is revoked, fall back
  // to the highest remaining owned tier.
  const revokeTier = (t) => {
    if (t === "free") return;
    setOwnedTiers(prev => {
      const next = new Set(prev);
      next.delete(t);
      return next;
    });
    if (tier === t) {
      // Pick the highest remaining tier
      const remaining = [...ownedTiers].filter(x => x !== t);
      const best = remaining.sort((a, b) => (TIER_RANK[b] ?? 0) - (TIER_RANK[a] ?? 0))[0] || "free";
      _setTierInternal(best);
    }
  };

  // Auto-grant admin when ?debug=1 is in the URL. Non-persisted — comes and
  // goes with the query param.
  useEffect(() => {
    if (isDebugMode() && !ownedTiers.has("admin")) {
      setOwnedTiers(prev => {
        const next = new Set(prev);
        next.add("admin");
        return next;
      });
    }
  }, []);

  // DEV MODE — easy-access admin toggle via nav button.
  // REMOVE BEFORE PUBLIC LAUNCH.
  const toggleDevMode = () => {
    if (ownedTiers.has("admin")) {
      setOwnedTiers(prev => {
        const next = new Set(prev);
        next.delete("admin");
        return next;
      });
      if (tier === "admin") {
        const remaining = [...ownedTiers].filter(x => x !== "admin");
        const best = remaining.sort((a, b) => (TIER_RANK[b] ?? 0) - (TIER_RANK[a] ?? 0))[0] || "free";
        _setTierInternal(best);
      }
    } else {
      setOwnedTiers(prev => {
        const next = new Set(prev);
        next.add("admin");
        return next;
      });
      _setTierInternal("admin");
    }
  };

  const features = TIER_FEATURES[tier] || TIER_FEATURES.free;
  const value = useMemo(() => ({
    tier, setTier, features,
    ownedTiers, purchaseTier, revokeTier,
    streak, dailyBonus, dismissDailyBonus: () => setDailyBonus(null),
    isDebug: isDebugMode() || ownedTiers.has("admin"),
    toggleDevMode,
    devModeActive: ownedTiers.has("admin"),
  }), [tier, features, ownedTiers, streak, dailyBonus]);
  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

function TierSwitcher({ tier, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = TIERS[tier];
  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "transparent",
        border: `1px solid ${current.color}66`,
        color: current.color,
        padding: "6px 12px", borderRadius: 6, cursor: "pointer",
        fontFamily: T.font_mono, fontSize: 10,
        fontWeight: 700, letterSpacing: "0.15em",
        textShadow: `0 0 6px ${current.color}66`,
        transition: "all 120ms ease-out",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: current.color,
          boxShadow: `0 0 6px ${current.color}`,
        }} />
        {current.label.toUpperCase()}
        <span style={{ opacity: 0.5, fontSize: 9 }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 6,
          minWidth: 260, padding: 6,
          background: "#0b0c10",
          border: `1px solid ${T.borderHi}`, borderRadius: 8,
          boxShadow: "0 12px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)",
          zIndex: 200,
        }}>
          {Object.values(TIERS).map(t => {
            const isActive = t.id === tier;
            return (
              <button key={t.id} type="button"
                onClick={() => { onChange(t.id); setOpen(false); }}
                style={{
                  display: "block", width: "100%",
                  padding: "10px 12px",
                  background: isActive ? "#16181d" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  textAlign: "left", cursor: "pointer",
                  transition: "background 120ms ease-out",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#16181d"}
                onMouseLeave={e => e.currentTarget.style.background = isActive ? "#16181d" : "transparent"}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 2,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: t.color,
                    boxShadow: `0 0 8px ${t.color}`,
                  }} />
                  <span style={{
                    color: t.color, fontFamily: T.font_mono, fontSize: 10,
                    fontWeight: 700, letterSpacing: "0.15em",
                  }}>{t.label.toUpperCase()}</span>
                  {isActive && (
                    <span style={{ marginLeft: "auto", color: T.textTer, fontSize: 10 }}>●</span>
                  )}
                </div>
                <div style={{
                  color: T.textTer, fontSize: 11, fontFamily: T.font_sans,
                  lineHeight: 1.4,
                }}>{t.description}</div>
              </button>
            );
          })}
          <div style={{
            padding: "8px 12px", marginTop: 4,
            borderTop: `1px solid ${T.border}`,
            color: T.textMuted, fontSize: 10, fontFamily: T.font_mono,
            lineHeight: 1.4,
          }}>
            Demo tiers. No real auth. Switch freely.
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TIER LEVER — mechanical pulling-stick UI for tier selection
// ────────────────────────────────────────────────────────────────────────────
// Positions are arranged vertically (like a gear shift / airplane throttle).
// Free at bottom (lowest), Admin at top (highest). Click a position to snap
// the stick there. Uses absolute-positioned stick with transition on `top`.
// ────────────────────────────────────────────────────────────────────────────
// TierLever — compact horizontal badge showing current tier with crown-tier
// indicator. Fits cleanly in the nav height (36px). Click opens shop.
// Not interactive for switching — tier only changes through purchase.
function TierLever({ tier, onChange, onOpenShop }) {
  const { ownedTiers, isDebug } = useTier();
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const [hover, setHover] = useState(false);
  const t = TIERS[tier];

  // Tier icons — small visual indicator of rank
  const tierIcon = {
    free: "○",
    pro:  "◆",
    vip:  "♛",
    admin: "⚡",
  }[tier] || "○";

  // Tier ladder tooltip: shows what's owned vs what's available.
  // Desktop: hover to open. Mobile: tap-to-toggle (hover is unreliable on touch).
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // On mobile, close tooltip on outside tap
  useEffect(() => {
    if (!isMobile || !tooltipOpen) return;
    const handler = () => setTooltipOpen(false);
    // Delay so the opening tap doesn't immediately close
    const t = setTimeout(() => document.addEventListener("click", handler, { once: true }), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [isMobile, tooltipOpen]);

  return (
    <div
      onMouseEnter={() => { if (!isMobile) { setHover(true); setTooltipOpen(true); } }}
      onMouseLeave={() => { if (!isMobile) { setHover(false); setTooltipOpen(false); } }}
      style={{ position: "relative", flexShrink: 0 }}
    >
      <button type="button"
        onClick={(e) => {
          if (isMobile) {
            // First tap: open tooltip. If already open: go to shop.
            e.stopPropagation();
            if (tooltipOpen) { setTooltipOpen(false); onOpenShop?.(); }
            else setTooltipOpen(true);
          } else {
            onOpenShop?.();
          }
        }}
        title="View tier details and upgrades"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: isMobile ? "6px 12px" : "5px 10px",
          height: isMobile ? 34 : 32,
          background: hover
            ? `linear-gradient(180deg, ${t.color}22 0%, ${t.color}11 100%)`
            : `linear-gradient(180deg, ${t.color}14 0%, ${t.color}06 100%)`,
          border: `1px solid ${t.color}${hover ? "77" : "44"}`,
          borderRadius: 6,
          cursor: "pointer",
          transition: "all 180ms ease-out",
          boxShadow: hover
            ? `0 0 16px ${t.color}55, inset 0 1px 0 ${t.color}33`
            : `0 0 8px ${t.color}22, inset 0 1px 0 ${t.color}22`,
        }}
      >
        <span style={{
          color: t.color, fontSize: 13, lineHeight: 1,
          textShadow: `0 0 6px ${t.color}aa`,
        }}>{tierIcon}</span>
        <span style={{
          color: t.color,
          fontFamily: T.font_mono,
          fontSize: 10, fontWeight: 700,
          letterSpacing: "0.18em",
          textShadow: `0 0 6px ${t.color}66`,
        }}>{t.label.toUpperCase()}</span>
      </button>

      {/* Hover tooltip — ladder of tiers with owned/not-owned indicators */}
      {tooltipOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)", right: 0,
          background: "rgba(8,9,11,0.96)",
          backdropFilter: "blur(20px) saturate(150%)",
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: "10px 12px",
          minWidth: 180,
          maxWidth: "calc(100vw - 24px)", // never wider than viewport minus margins
          boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
          zIndex: 1000,
          animation: "tierTooltipIn 160ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <style>{`
            @keyframes tierTooltipIn {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{
            fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
            letterSpacing: "0.2em", color: T.textMuted,
            marginBottom: 8,
          }}>TIER LADDER</div>
          {(isDebug ? ["admin","vip","pro","free"] : ["vip","pro","free"]).map(p => {
            const tp = TIERS[p];
            const owned = ownedTiers.has(p);
            const isCurrent = p === tier;
            return (
              <div key={p} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "4px 0",
                opacity: owned ? 1 : 0.55,
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: isCurrent ? tp.color : T.textSec,
                  fontSize: 11, fontFamily: T.font_mono, fontWeight: 600,
                  letterSpacing: "0.12em",
                  textShadow: isCurrent ? `0 0 6px ${tp.color}77` : "none",
                }}>
                  <span style={{ color: tp.color, width: 10, textAlign: "center" }}>
                    {isCurrent ? "▸" : " "}
                  </span>
                  {tp.label.toUpperCase()}
                </span>
                <span style={{
                  fontSize: 9, fontFamily: T.font_mono,
                  color: owned ? tp.color : T.textMuted,
                  letterSpacing: "0.1em",
                }}>
                  {owned ? "OWNED" : p === "admin" ? "DEV" : "LOCKED"}
                </span>
              </div>
            );
          })}
          <div style={{
            borderTop: `1px solid ${T.border}`,
            marginTop: 8, paddingTop: 8,
            fontSize: 10, color: T.textMuted, fontFamily: T.font_sans,
            lineHeight: 1.4,
          }}>
            Click to view all perks & upgrade.
          </div>
        </div>
      )}
    </div>
  );
}


// ────────────────────────────────────────────────────────────────────────────
// FUEL LEVER — tactile gear-shift: FREE (green) · PRO (red) · VIP (purple)
// ────────────────────────────────────────────────────────────────────────────
function FuelLever({ currentPage, onNavigate }) {
  const { activeFuel, setActiveFuel, fuels } = useFuel();
  const { tier } = useTier();
  const [shakeKey, setShakeKey] = useState(0);

  // Horizontal gear box:
  //   green  = free (0)
  //   red    = pro  (1)
  //   purple = vip  (2)
  const positions = ["free", "pro", "vip"];
  const activeIdx = positions.indexOf(activeFuel);
  const slotW = 30;
  const gateH = 38;
  const trackPadding = 12;
  const trackInner = positions.length * slotW;
  const housingW = trackInner + trackPadding * 2;
  const activeColor = FUEL_TYPES[activeFuel]?.color || "#888";

  const handleSelect = (fuelId) => {
    if (fuelId === activeFuel) return;
    const allocation = TIER_FEATURES[tier]?.dailyFuel?.[fuelId] ?? 0;
    if (allocation === 0) return; // locked

    setShakeKey(k => k + 1);
    setActiveFuel(fuelId);
  };

  const knobX = trackPadding + activeIdx * slotW + slotW / 2 - 12; // 12 = knob half width

  return (
    <>
      <style>{`
        @keyframes gearShiftShake-${shakeKey % 100} {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          25%     { transform: translate(0.5px, -0.5px) rotate(0.4deg); }
          50%     { transform: translate(-0.5px, 0.5px) rotate(-0.3deg); }
          75%     { transform: translate(0.3px, 0.3px) rotate(0.2deg); }
        }
        @keyframes gearKnobPulse {
          0%,100% { filter: brightness(1); }
          50%     { filter: brightness(1.15); }
        }
      `}</style>
      <div style={{
        position: "relative",
        display: "inline-flex", alignItems: "center",
        padding: "4px",
        background: `
          linear-gradient(180deg, #14161c 0%, #0a0b10 50%, #050608 100%)`,
        border: `1px solid #1f232b`,
        borderRadius: 10,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.04),
          inset 0 -1px 0 rgba(0,0,0,0.6),
          0 2px 6px rgba(0,0,0,0.5),
          0 0 20px ${activeColor}22`,
        transition: "box-shadow 260ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        {/* ── HOUSING / GATE ────────────────────────────────────── */}
        <div style={{
          position: "relative",
          width: housingW, height: gateH,
          background: `
            linear-gradient(180deg, #0a0b0e 0%, #1a1c22 40%, #0a0b0e 100%)`,
          borderRadius: 6,
          border: "1px solid #2a2d36",
          boxShadow: `
            inset 0 2px 4px rgba(0,0,0,0.9),
            inset 0 -1px 0 rgba(255,255,255,0.05)`,
          overflow: "hidden",
        }}>
          {/* Deep horizontal channel the stick slides in */}
          <div style={{
            position: "absolute",
            left: trackPadding, right: trackPadding,
            top: "50%", height: 3, marginTop: -1.5,
            background: `
              linear-gradient(180deg, #000 0%, #0a0b0e 50%, #1a1c22 100%)`,
            borderRadius: 2,
            boxShadow: `inset 0 1px 2px rgba(0,0,0,1)`,
          }} />
          {/* Three gate notches — subtle dimples where stick locks */}
          {positions.map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              left: trackPadding + i * slotW + slotW / 2 - 4,
              top: "50%", marginTop: -5,
              width: 8, height: 10,
              background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)",
              borderRadius: "50%",
            }} />
          ))}

          {/* ── THE KNOB (gear-shift ball) ─────────────────────── */}
          <div
            key={`knob-shake-${shakeKey}`}
            style={{
              position: "absolute",
              left: knobX,
              top: "50%", marginTop: -12,
              width: 24, height: 24,
              animation: `gearShiftShake-${shakeKey % 100} 200ms ease-out`,
              transition: "left 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              zIndex: 2,
              pointerEvents: "none",
            }}>
            {/* Emissive glow halo — matches active fuel color */}
            <div style={{
              position: "absolute", inset: -6,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${activeColor}88 0%, ${activeColor}00 70%)`,
              filter: "blur(4px)",
              animation: "gearKnobPulse 2.4s ease-in-out infinite",
            }} />
            {/* Stick shaft — small chrome connector visible below knob */}
            <div style={{
              position: "absolute",
              left: "50%", marginLeft: -2,
              top: "80%", width: 4, height: 6,
              background: "linear-gradient(90deg, #444 0%, #999 50%, #444 100%)",
              borderRadius: 1,
            }} />
            {/* Ball / knob head */}
            <div style={{
              position: "relative",
              width: 24, height: 24, borderRadius: "50%",
              background: `
                radial-gradient(circle at 28% 28%,
                  ${activeColor}FF 0%,
                  ${activeColor}DD 25%,
                  ${activeColor}77 55%,
                  #1a1a1a 100%)`,
              boxShadow: `
                inset 0 1px 3px rgba(255,255,255,0.45),
                inset 0 -3px 4px rgba(0,0,0,0.6),
                0 0 14px ${activeColor}AA,
                0 0 28px ${activeColor}55,
                0 3px 5px rgba(0,0,0,0.8)`,
              border: `1px solid rgba(0,0,0,0.5)`,
            }}>
              {/* Specular highlight dot */}
              <div style={{
                position: "absolute",
                top: 3, left: 5,
                width: 5, height: 4,
                background: "radial-gradient(ellipse, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 80%)",
                borderRadius: "50%",
                filter: "blur(0.5px)",
              }} />
            </div>
          </div>

          {/* ── CLICK ZONES (invisible) for each position ──────── */}
          {positions.map((p, i) => {
            const locked = (TIER_FEATURES[tier]?.dailyFuel?.[p] ?? 0) === 0;
            const f = FUEL_TYPES[p];
            const isActive = p === activeFuel;
            return (
              <button key={p} type="button"
                onClick={() => handleSelect(p)}
                disabled={locked}
                title={locked
                  ? `${f.label} · Locked — upgrade tier`
                  : `${f.label} · ${fuels[p] === Infinity ? "∞" : fuels[p]} left today`}
                style={{
                  position: "absolute",
                  left: trackPadding + i * slotW, top: 0,
                  width: slotW, height: "100%",
                  background: "transparent", border: "none",
                  cursor: locked ? "not-allowed" : "pointer",
                  zIndex: 3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  padding: 0, paddingBottom: 3,
                }}>
                <span style={{
                  color: locked ? T.textMuted : (isActive ? f.color : T.textTer),
                  fontFamily: T.font_mono,
                  fontSize: 7, fontWeight: 700, letterSpacing: "0.15em",
                  textShadow: isActive && !locked ? `0 0 4px ${f.color}` : "none",
                  opacity: locked ? 0.3 : (isActive ? 1 : 0.5),
                  transition: "all 240ms ease-out",
                  lineHeight: 1,
                }}>{f.label.split(" ")[0].toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}


// ────────────────────────────────────────────────────────────────────────────
// GENRE TREE
// ────────────────────────────────────────────────────────────────────────────
const GENRE_TREE = {
  "Hip-Hop": {
    "Trap": ["Atlanta trap","futuristic trap","SoundCloud trap","southern slow","dark trap","plug-trap"],
    "Melodic Rap": ["trap ballad","sung-rap hybrid","heartbreak trap","emo-melodic","cloud-melodic"],
    "Drill": ["UK drill","NY drill","Brooklyn menace","Chicago drill","Irish drill","Bronx drill"],
    "Boom Bap": ["golden era","90s east coast","vinyl break","dirty sample","neo-boom bap"],
    "Conscious Hip-Hop": ["jazz-sample underground","spoken-word driven","modal-loop cipher","socio-political rap"],
    "Lo-Fi Hip-Hop": ["dusty chill","study-beats","tape-warped boom bap","japanese lo-fi"],
    "Phonk": ["drift phonk","Memphis revival","cowbell aggression","horror phonk","Brazilian phonk"],
    "Rage Rap": ["hyperkinetic rage","distorted 808 rage","schizophrenic rap"],
    "Plugg": ["ethereal plugg","pluggnb","dark plugg"],
    "Cloud Rap": ["dreamy ethereal","witch house-adjacent","tumblr era"],
    "Alternative Hip-Hop": ["college rap","art rap","hipster hip-hop","jazz rap"],
    "Gangsta Rap": ["West Coast G-funk","East Coast mafioso","southern gangsta","horrorcore"],
    "Grime": ["UK grime","eski beat","square-wave","road rap"],
    "French Rap": ["Paris cloud rap","Marseille hardcore","French drill"],
    "Latin Rap": ["Spanglish rap","Chicano rap","reggaeton-rap hybrid"],
    "Jersey Drill": ["Newark drill","triplet drill","bed-squeak drill"],
  },
  "R&B / Soul": {
    "Alt R&B": ["noir ballad","glass-pad ambient","fractured soul","digital gospel","cloud R&B","after-hours R&B","cinematic R&B"],
    "Trap Soul": ["808 ballad","midnight confessional","auto-tuned intimacy","sung-trap","emo trap soul"],
    "Neo-Soul": ["warm-keys groove","organic live-band","70s Philly update","bedroom neo","jazz-inflected","chamber neo-soul"],
    "Contemporary R&B": ["polished radio","slow-jam crossover","electronic R&B","retro-modern"],
    "Quiet Storm": ["90s slow jam","sensual late-night","smooth saxophone","velvet R&B"],
    "Funk": ["P-funk lineage","minimalist funk","electro-funk","boogie","funk revival","JB-style funk"],
    "Boogie": ["early-80s disco-funk","synth boogie","post-disco groove"],
    "New Jack Swing": ["80s hip-hop R&B","swing-beat","Teddy Riley lineage"],
    "Gospel Soul": ["church-derived","Sunday morning","ecstatic worship"],
    "Motown Revival": ["60s Detroit","call-and-response retro","classic pocket"],
    "UK Soul": ["London neo","sade-lineage","blue-eyed British"],
    "Doo-Wop": ["50s vocal group","street corner","harmony-led"],
  },
  "Pop": {
    "Dark Pop": ["brooding pop","cinematic dark-pop","noir pop","atmospheric pop"],
    "Bedroom Pop": ["lo-fi intimate","DIY bedroom","TikTok bedroom","Clairo-lineage"],
    "Hyperpop": ["maximalist distorted","digicore","fractured pop","deconstructed pop"],
    "Synth-Pop": ["80s revival synthpop","modern synthpop","dreamy synthpop","italo-synthpop"],
    "Dance-Pop": ["club-crossover","festival pop","radio dance-pop"],
    "Art Pop": ["avant pop","experimental pop","baroque art-pop"],
    "Indie Pop": ["twee","jangly indie-pop","glittery indie-pop"],
    "Chamber Pop": ["orchestral pop","sufjan-lineage","baroque chamber-pop"],
    "Power Pop": ["guitar-pop hooks","80s power-pop","modern power-pop"],
    "Baroque Pop": ["60s orchestral","harpsichord pop","lush-arranged pop"],
    "Electropop": ["glossy electropop","French touch pop","robotic pop"],
    "Country-Pop": ["Nashville crossover","pop-country hybrid","Shania-lineage"],
    "Latin Pop": ["crossover pop","balada","modern Latin-pop"],
    "Adult Contemporary": ["AC radio","soft-pop","middle-of-road"],
  },
  "Disco / Dance": {
    "Classic Disco": ["Philly disco","Chic-style","strings-and-strings disco","four-on-the-floor disco","70s radio disco"],
    "Euro Disco": ["Moroder-lineage","Munich sound","late-70s Euro disco"],
    "Italo Disco": ["early-80s italo","synth italo","italo classic","italo hypnotic"],
    "Hi-NRG": ["Bobby-O lineage","gay-club hi-NRG","fast synth disco"],
    "Nu-Disco": ["modern nu-disco","indie nu-disco","disco-house hybrid","French-touch nu-disco"],
    "Disco-House": ["filter disco","French filter-disco","loop disco-house"],
    "Cosmic Disco": ["Italian cosmic","Balearic cosmic","slow-disco cosmic"],
    "Space Disco": ["French space disco","cosmic-Moroder","synth-galaxy disco"],
    "Boogie Disco": ["post-disco boogie","synth-boogie","early-80s street-soul"],
    "Afro-Disco": ["Nigerian disco","West African disco","Afro-boogie"],
    "Balearic": ["Ibiza Balearic","sunset Balearic","dreamy Balearic"],
    "Disco-Punk": ["DFA-lineage","NYC dance-punk","rubber-band bass disco"],
  },
  "Electronic": {
    "House": ["Chicago house","deep house","disco house","tropical house","funky house","acid house","jackin' house","soulful house","Latin house"],
    "Tech-House": ["minimal tech-house","peaktime tech-house","percussive tech-house","deep tech-house","UK tech-house","tribal tech-house","Romanian tech-house","vocal tech-house"],
    "Melodic Techno": ["afterlife-style melodic","hypnotic melodic techno","euphoric melodic techno","dark melodic techno","progressive melodic","cinematic melodic techno","Anjunadeep melodic","organic melodic techno"],
    "Melodic House": ["afterhours euphoria","progressive-emotional","sunrise chord","organic house","indie dance","Keinemusik-style"],
    "Afro House": ["spiritual percussion","Cape Town deep","tribal trance","3-step Afro","soulful Afro","Keinemusik Afro"],
    "Amapiano": ["log-drum groove","soulful piano","Johannesburg party","private school piano","sgubhu"],
    "Techno": ["peak-time warehouse","Detroit lineage","Berlin hypnotic","schranz","acid techno","hypnotic techno"],
    "Dark Techno": ["industrial crush","Blade Runner kick","dystopian drone","warehouse darkness","raw dark techno"],
    "Minimal Techno": ["clicky-glitch","Romanian micro","reduced groove","dub techno","minimal-deep"],
    "Progressive House": ["big-room prog","emotional prog-house","long-build prog"],
    "Drum and Bass": ["liquid DnB","neuro","jump-up","hardstep","minimal DnB","atmospheric DnB","jungle"],
    "UK Garage": ["2-step soul","speed garage","bassline","future garage","breakstep"],
    "Dubstep": ["cinematic dub","riddim","deep 140","bass music","melodic dubstep"],
    "Future Bass": ["emotional drop","kawaii bass","melodic chill trap","midtempo bass"],
    "Synthwave": ["outrun","darksynth","retro-noir","dreamwave","space disco-synth","cyberpunk"],
    "Trip-Hop": ["Bristol noir","cinematic downtempo","broken sampler","abstract hop"],
    "Ambient Electronic": ["generative drift","beatless pad","deep-listen space","ambient techno"],
    "Trance": ["uplifting trance","psytrance","progressive trance","Goa trance","hard trance","vocal trance"],
    "Hardstyle": ["reverse-bass kick","hardcore hardstyle","euphoric hardstyle","rawstyle"],
    "IDM": ["Warp-lineage","braindance","melodic IDM","abstract IDM"],
    "Electro": ["electro-funk","Detroit electro","modern electro","electroclash"],
    "Jersey Club": ["Newark bounce","triplet kick","bed squeaks","TikTok club"],
    "Industrial Electronic": ["EBM revival","modular harsh","rusted machine","power noise"],
    "Vaporwave": ["mallsoft","future funk","hardvapor","signalwave"],
    "Chillwave": ["hypnagogic pop","glo-fi","dream-chillwave"],
    "Tropical House": ["Kygo-lineage","festival tropical","mellow deep-tropical"],
    "Breakbeat": ["Florida breaks","big beat","progressive breaks"],
  },
  "Latin": {
    "Reggaeton": ["perreo","neoperreo","experimental reggaeton","Latin trap-reggaeton"],
    "Latin Trap": ["bilingual trap","Puerto Rico trap","Mexican trap"],
    "Corridos Tumbados": ["Peso Pluma lineage","sierreño urbano","Mexican regional modern"],
    "Dembow": ["Dominican dembow","experimental dembow","party dembow"],
    "Regional Mexican": ["banda","norteño","mariachi modern","sierreño"],
    "Salsa": ["salsa romantica","salsa dura","timba-influenced"],
    "Bachata": ["modern bachata","traditional bachata","urban bachata"],
    "Merengue": ["classic merengue","merengue urbano","merengue tipico"],
    "Cumbia": ["cumbia digital","traditional","psychedelic cumbia","cumbia villera","Peruvian cumbia"],
    "Bossa Nova": ["Rio classic","modern bossa","jazz-bossa hybrid"],
    "Samba": ["samba de raiz","samba-rock","modern samba"],
    "Sertanejo": ["sertanejo universitário","sertanejo raiz","feminejo"],
    "Funk Carioca": ["Brazilian funk","favela funk","funk ostentação","bruxaria"],
    "Tango": ["nuevo tango","traditional tango","tango electrónico"],
    "Bolero": ["classic bolero","bolero romántico"],
  },
  "Rock": {
    "Alternative Rock": ["modern alt","90s alternative","college-radio alt","anthem alt"],
    "Indie Rock": ["jangle pop-rock","lo-fi indie","DIY indie","dream-indie"],
    "Post-Rock": ["cinematic crescendo","slowcore long-form","crystalline guitar","instrumental epic"],
    "Shoegaze": ["washed wall","dreamy distortion","bedroom wash","blackgaze-adjacent","nu-gaze"],
    "Dream Pop": ["ethereal dream-pop","shoegaze-adjacent dream","modern dream-pop"],
    "Emo Revival": ["math-twinkle","confessional acoustic","fifth-wave emo","midwest emo"],
    "Emo": ["2nd wave emo","screamo","chiptune emo","trap-emo"],
    "Post-Hardcore": ["dynamic chaos","quiet-loud violence","spoken-scream","screamo-adjacent"],
    "Math Rock": ["tapping melody","odd-meter groove","clean interlocking","polyrhythm rock"],
    "Psychedelic Rock": ["tape-echo swirl","kraut-motorik","acid jam","neo-psych","modern psych"],
    "Stoner Rock": ["desert fuzz","doom-adjacent","ritual slow","sludge rock"],
    "Grunge Revival": ["90s Seattle update","sludge grunge","neo-grunge"],
    "Post-Punk": ["80s post-punk","modern post-punk","dance-punk","cold wave"],
    "Garage Rock": ["60s revival","lo-fi garage","garage punk","fuzz revival"],
    "Punk Rock": ["hardcore punk","melodic punk","80s anthem punk","post-punk"],
    "Hardcore Punk": ["NYHC","modern hardcore","powerviolence","mosh-core"],
    "Progressive Rock": ["70s prog revival","modern prog","concept-album prog","Mellotron-led"],
    "Gothic Rock": ["80s goth","deathrock","darkwave rock"],
    "Britpop": ["classic britpop","Manchester sound","90s UK anthemic"],
  },
  "Metal": {
    "Metalcore": ["melodic metalcore","modern core","deathcore-adjacent"],
    "Deathcore": ["breakdown-heavy","slam deathcore","downtempo deathcore"],
    "Death Metal": ["technical blast","old-school OSDM","cavernous doom-death","melodic death","brutal death"],
    "Black Metal": ["second-wave cold","atmospheric cascade","raw necro","symphonic black","post-black"],
    "Blackgaze": ["post-black shoegaze","atmospheric blackgaze"],
    "Doom Metal": ["funeral slow","crushing riff","sludge low-end","stoner doom","drone doom"],
    "Post-Metal": ["cinematic heavy","ambient-to-crush","cathartic peak","sludgy post"],
    "Progressive Metal": ["djent precision","cinematic prog","modern meshuggah lineage","prog power"],
    "Thrash Metal": ["Bay Area thrash","teutonic thrash","crossover thrash"],
    "Power Metal": ["Euro power","fantasy metal","speed-power"],
    "Symphonic Metal": ["operatic metal","gothic symphonic","epic cinematic metal"],
    "Folk Metal": ["epic Nordic","pagan ritual","cinematic battle","celtic metal","Viking metal"],
    "Industrial Metal": ["90s industrial","cyber-metal","EBM-metal hybrid"],
    "Grindcore": ["classic grind","noisegrind","goregrind"],
    "Nu-Metal": ["original nu-metal","rap-metal","wigger-rock"],
  },
  "World / Global": {
    "Afrobeats": ["Lagos pop","UK-Afro crossover","amapiano-fused","Afropop","Naija-pop"],
    "Afrofusion": ["continental hybrid","jazz-Afrobeats","worldbeat","Afro-soul"],
    "Afrobeat": ["Fela-lineage","Afrobeat revival","ethio-afrobeat"],
    "Gqom": ["Durban gqom","3-step gqom","heavy gqom"],
    "Dancehall": ["modern dancehall","riddim-led","Jamaica-to-UK","dembow-dancehall"],
    "Reggae": ["roots reggae","dub","lovers rock","dancehall-roots"],
    "Soca": ["power soca","groovy soca","chutney soca"],
    "Ska": ["2-tone","traditional ska","third-wave ska"],
    "K-Pop": ["modern K-pop","K-ballad","K-hip-hop hybrid"],
    "J-Pop": ["Shibuya-kei","city pop","kawaii J-pop"],
    "City Pop": ["Japanese 80s","modern city pop","future funk-adjacent"],
    "Mandopop": ["Taiwan Mandopop","mainland Mandopop","modern Mandopop"],
    "Bollywood": ["filmi classic","contemporary Bollywood","Bollywood EDM"],
    "Indian Classical Fusion": ["raga-electronic","tabla groove","bhangra-fusion","Indo-jazz"],
    "Bhangra": ["classic bhangra","UK bhangra","modern bhangra"],
    "Arabic Electronic": ["maqam-synth","Beirut club","habibi funk-adjacent","SWANA electronic"],
    "Turkish Psych": ["Anatolian rock","Türkü revival","psych-arabesque"],
    "Qawwali": ["Sufi devotional","contemporary qawwali","Nusrat-lineage"],
    "Highlife": ["Ghanaian highlife","Nigerian highlife","modern highlife"],
    "Flamenco Fusion": ["nuevo flamenco","electronic-flamenco","cinematic gitano","rumba-flamenca"],
    "Fado": ["Portuguese fado","modern fado","fado-electronic"],
    "Balkan": ["Roma brass","Balkan electronic","gypsy punk"],
    "Klezmer": ["traditional klezmer","klezmer fusion","Yiddish revival"],
  },
  "Blues": {
    "Chicago Blues": ["electric Chicago","Muddy Waters-lineage","post-war Chicago"],
    "Delta Blues": ["Mississippi Delta","acoustic Delta","Robert Johnson-lineage"],
    "Electric Blues": ["modern electric blues","Texas electric","blues rock crossover"],
    "Blues Rock": ["60s British blues","70s Southern","modern blues-rock"],
    "Texas Blues": ["Stevie Ray-lineage","Austin blues","swamp blues"],
    "Hill Country Blues": ["Fat Possum-lineage","drone-blues","R.L. Burnside"],
    "Jump Blues": ["40s jump","swing-blues","early R&B"],
    "Soul Blues": ["60s soul-blues","contemporary soul-blues"],
    "Acoustic Blues": ["country blues","folk-blues","solo acoustic"],
  },
  "Country / Americana": {
    "Contemporary Country": ["pop-country modern","country radio","Nashville mainstream"],
    "Americana": ["alt-country","folk-country hybrid","rural storyteller"],
    "Alt-Country": ["No Depression lineage","gothic country","outlaw-adjacent"],
    "Outlaw Country": ["70s outlaw","modern outlaw","Americana outlaw"],
    "Neotraditional Country": ["honky-tonk revival","Strait-lineage","traditional country"],
    "Red Dirt / Texas Country": ["Oklahoma country","Texas country scene","Turnpike-lineage"],
    "Country-Rock": ["Eagles-lineage","Southern country-rock","Americana rock"],
    "Country-Rap": ["hick-hop","trap-country","country crossover"],
    "Honky-Tonk": ["classic honky-tonk","bar country","Haggard-lineage"],
    "Bluegrass": ["traditional bluegrass","newgrass","progressive bluegrass"],
    "Progressive Bluegrass": ["Billy Strings-lineage","jamgrass","modern newgrass"],
    "Western Swing": ["Bob Wills-lineage","Texas swing","swing-country"],
    "Appalachian Folk": ["old-time fiddle","mountain ballad","bluegrass ancestor","murder ballad"],
  },
  "Folk / Acoustic": {
    "Indie Folk": ["bedroom acoustic","warm storyteller","Americana-lite","orchestral indie folk"],
    "Acoustic Singer-Songwriter": ["intimate songwriter","James Taylor-lineage","new acoustic"],
    "Chamber Folk": ["folk with strings","orchestral folk","Sufjan-lineage"],
    "Cinematic Folk": ["orchestral folk","wide open narrative","soundtrack folk","film-folk"],
    "Folk Revival": ["60s revival","political folk","Dylan-lineage"],
    "Dark Folk": ["neofolk ritual","pagan acoustic","minor-key menace","ritual dark folk"],
    "Anti-Folk": ["lo-fi honest","bedroom punk-folk","irreverent storyteller"],
    "Psych Folk": ["tape-warp folk","Vashti-lineage","modern psych folk"],
    "Celtic Folk": ["contemporary Celtic","uilleann-pipe ambient","Scottish trad","Irish trad"],
    "Nordic Folk": ["Scandinavian folk","Sami-influenced","Nordic noir folk"],
  },
  "Jazz": {
    "Jazz-Hop": ["lo-fi sampled","boom-bap jazz","cafe chill","neo-jazz-hop"],
    "Contemporary Jazz": ["modern quartet","ECM-adjacent","chamber jazz","new-standards"],
    "Nu-Jazz": ["electronic jazz","jazztronica","broken-beat jazz"],
    "Spiritual Jazz": ["Coltrane-lineage","devotional modal","cosmic seeking"],
    "Jazz Fusion": ["electric funk-jazz","virtuoso prog","70s crossover","modern fusion"],
    "Modal Jazz": ["Miles-lineage","meditative open","quiet-storm modal","modal suite"],
    "Noir Jazz": ["smoky late-night","cinematic detective","urban lonely","film-noir jazz"],
    "Hard Bop": ["50s blue-note","soulful bop","gospel-jazz bop"],
    "Cool Jazz": ["West Coast cool","chamber-cool","relaxed bop"],
    "Bebop": ["40s bebop","Parker-lineage","fast chromatic"],
    "Free Jazz": ["spiritual ecstatic","energy-music","atonal exploration","improvised free"],
    "Vocal Jazz": ["torch singer","modern vocal jazz","piano-voice jazz"],
    "Smooth Jazz": ["radio smooth","sax-led smooth","contemporary instrumental"],
    "Latin Jazz": ["Afro-Cuban clave","samba-jazz","bossa quartet","salsa-jazz"],
    "Swing": ["big-band swing","gypsy swing","western swing"],
  },
  "Ambient / New Age": {
    "Ambient": ["Eno-lineage","beatless ambient","minimalist ambient"],
    "Dark Ambient": ["ritual ambient","horror ambient","occult drone"],
    "Drone": ["deep drift","single-tone evolution","ambient drone","drone-metal"],
    "Space Music": ["cosmic ambient","deep-space drone","Berlin school"],
    "New Age": ["healing music","meditation music","nature-ambient"],
    "Tape Ambient": ["loop-based tape","William Basinski-lineage","decay-ambient"],
  },
  "Soundtrack / Score": {
    "Orchestral Score": ["cinematic epic","film-trailer","swelling dramatic","adventure score"],
    "Film Score": ["narrative score","drama score","arthouse score"],
    "Trailer Music": ["epic trailer","teaser stinger","rise-and-hit"],
    "Game OST": ["action game score","adventure OST","RPG orchestral","chiptune OST"],
    "Anime OST": ["shōnen OST","slice-of-life OST","mecha score"],
    "Horror Score": ["minimalist horror","dissonant horror","jump-scare design"],
    "Documentary Score": ["pensive documentary","investigative score","nature-doc music"],
    "Musical Theater": ["Broadway","West End","contemporary musical"],
  },
  "Classical / Orchestral": {
    "Post-Classical": ["minimalist piano","Ólafur-lineage","string-piano introspection","film-adjacent post-classical"],
    "Neoclassical": ["contemporary chamber","cinematic solo","intimate pianism","string neoclassical"],
    "Minimalist Classical": ["phase-pattern","slow evolution","Reich-lineage","Glass-lineage"],
    "Contemporary Classical": ["post-minimalist","spectral music","new complexity"],
    "Chamber Music": ["string quartet","wind chamber","intimate ensemble","piano chamber"],
    "Symphonic": ["concert symphony","symphonic poem","orchestral suite"],
    "Dark Classical": ["tragic tonal","gothic dissonance","requiem","horror strings"],
    "Romantic": ["19th-century lyrical","virtuoso romantic","programmatic romantic"],
    "Baroque": ["Bach-lineage","harpsichord baroque","figured-bass","period performance"],
    "Opera": ["bel canto","verismo","contemporary opera"],
    "Choral": ["sacred choral","secular choral","a-cappella classical"],
  },
  "Gospel / Spiritual": {
    "Gospel Trap": ["808 choir","street gospel","modern hallelujah"],
    "Contemporary Christian": ["CCM radio","worship pop","CCM alt"],
    "Worship Music": ["modern worship","praise and worship","Hillsong-adjacent"],
    "Traditional Gospel": ["church call-and-response","organ-led","communal catharsis"],
    "Black Gospel": ["choir gospel","pentecostal","Mississippi gospel"],
    "Southern Gospel": ["quartet gospel","hymn-based","bluegrass gospel"],
    "Sacred Choral": ["Gregorian-adjacent","Byzantine chant","Anglican choral"],
    "Sufi Music": ["qawwali","whirling-derived","Sufi ambient"],
    "Devotional Indian": ["bhajan","kirtan","carnatic devotional"],
  },
  "Experimental": {
    "Avant-Garde": ["new-music composition","post-genre","academic experimental","free-improvisation"],
    "Noise": ["harsh wall","japanoise","power electronics","ambient noise"],
    "Glitch": ["clicks-and-cuts","digital-artifact","bit-broken","microsound"],
    "Musique Concrète": ["field-recording collage","tape manipulation","sound-sculpture"],
    "Sound Collage": ["cut-paste composition","radio collage","audio assemblage"],
    "Algorave": ["live-coded dance","generative dance","TidalCycles-adjacent"],
    "Digicore": ["glitchy hyperpop","emo-digicore","SoundCloud digicore"],
    "Ambient Pop": ["dreamy pop-ambient","bedroom ambient-pop","hazy melodic ambient"],
  },
};

const GENRE_FLAT = Object.entries(GENRE_TREE).flatMap(([genre, subs]) =>
  Object.entries(subs).flatMap(([subgenre, micros]) =>
    micros.map(micro => ({ genre, subgenre, micro }))
  )
);

// ────────────────────────────────────────────────────────────────────────────
// INSTRUMENTS
// ────────────────────────────────────────────────────────────────────────────
const SPECIFIC_INSTRUMENTS = {
  "Keys": {
    "Grand piano": ["felt muted","sustain-pedal heavy","staccato percussive","prepared piano","legato lyrical","rolled chords"],
    "Rhodes electric piano": ["vibrato on","dry no vibrato","tremolo","bell-like","warm mk1","bright mk2","overdriven"],
    "Hammond B3 organ": ["Leslie slow","Leslie fast","drawbars full","gospel chops","percussive stabs","jazz comp"],
    "Wurlitzer": ["vibrato","bright lead","warm bass register","overdriven"],
    "Harpsichord": ["plucked staccato","arpeggiated","baroque ornaments","coupled manuals"],
    "Celeste": ["delicate melody","arpeggio sparkle","music-box feel"],
    "Clavinet": ["funk staccato","wah pedal","muted","reggae skank"],
    "Upright piano": ["honky-tonk","saloon","felted mellow","vintage warmth"],
  },
  "Synths": {
    "Moog sub bass": ["sub-only","filter-swept","resonant plucks","wobble mod","gliding portamento"],
    "Juno-60 pads": ["chorus on","dry","slow attack pad","warm strings patch"],
    "Prophet-5 lead": ["detuned unison","bright sync lead","soft poly lead","PWM modulation"],
    "Modular Eurorack": ["generative patch","self-patched","CV-sequenced","complex west-coast"],
    "FM DX7": ["E.Piano 1","bright bell","brass stab","fantasy pad","plucked bass"],
    "Korg MS-20": ["aggressive filter","noise textures","ring mod","self-oscillation"],
    "TB-303 bass": ["acid squelch","slide and accent","open resonance"],
    "Analog poly lead": ["unison detune","portamento glide","filter envelope"],
    "Wavetable synth": ["morphing wavetable","digital harsh","glass texture"],
    "Granular synth": ["cloud of grains","time-stretched","pitched grain pad"],
  },
  "Strings": {
    "Violin solo": ["legato","staccato","pizzicato","tremolo","sul ponticello","harmonics","con sordino","spiccato"],
    "Cello": ["warm legato","aggressive down-bow","pizzicato","harmonics","double-stops"],
    "Viola": ["dark warm","spiccato","inner-voice","solo lyrical"],
    "Double bass": ["pizzicato walking","bowed","slap","arco legato"],
    "Full string section": ["legato lush","staccato rhythmic","tremolo sustained","pizzicato","marcato","sordino hushed"],
    "Pizzicato strings": ["staccato pulse","bouncy short","sustained pluck"],
    "String ensemble pad": ["slow swell","warm sustained","harmonic wash"],
  },
  "Guitars": {
    "Fender Strat clean": ["chorus clean","chicken-pickin'","single-coil twang","in-between position","tremolo picking"],
    "Les Paul distortion": ["high-gain lead","crunch rhythm","palm-muted chugs","pinch harmonics","feedback sustain"],
    "Nylon classical": ["fingerpicked","rasgueado flamenco","tremolo","classical arpeggio"],
    "Acoustic steel-string": ["strummed","fingerstyle","travis picking","percussive hits","open tunings"],
    "12-string guitar": ["chimey strumming","arpeggiated","jangly clean"],
    "Pedal steel": ["swelling legato","volume-pedal ambient","country licks","sacred steel"],
    "Resonator slide": ["bottleneck slide","open-tuning slide","Delta-style"],
    "Telecaster twang": ["bridge-pickup twang","country bend","clean rhythm"],
    "Jazz guitar hollowbody": ["chord-melody","comping","bebop lines","warm tone"],
    "Baritone guitar": ["low-tuned chords","twang baritone","bass-register lead"],
    "Lap steel": ["Hawaiian slide","country lap-steel","ambient lap-steel"],
  },
  "Bass": {
    "Upright acoustic bass": ["walking","pizzicato","bowed","slap-bass","jazz quarter-note"],
    "Precision bass": ["fingerstyle rock","pick attack","flatwounds mellow","rounds bright"],
    "Jazz bass": ["bridge pickup bite","neck pickup warm","slap funk","fingerstyle"],
    "Synth bass": ["analog sub","FM pluck","resonant acid","square-wave sub"],
    "808 sub bass": ["pitched 808","distorted 808","slide 808","long-tail 808"],
    "Fretless bass": ["sliding fretless","mwah tone","jazz-fusion"],
  },
  "Drums": {
    "Acoustic kit close-mic": ["tight compressed","ambient room","brushes","rods","hot-rod attack","dynamic build"],
    "TR-808": ["classic 808","distorted 808","pitched cowbell","muted toms","clap-heavy"],
    "TR-909": ["classic 909","analog kick boom","ride-bell dominant","house-pattern"],
    "Linn LM-1": ["80s gated kick","80s claps","vintage tom fills"],
    "SP-1200 sampler": ["12-bit chopped","vinyl-warm samples","swung groove"],
    "MPC-style drums": ["boom-bap chops","sidechained","quantized tight","shuffled groove"],
    "Brushes on snare": ["soft jazz brushes","circular sweep","brushed groove"],
    "Breakbeat chops": ["Amen-chopped","Funky Drummer","Think break"],
    "Gated reverb kit": ["80s gated snare","big reverb kit","power-ballad drums"],
  },
  "Percussion": {
    "Congas": ["open tones","slaps","heel-tip","rumba pattern"],
    "Djembe": ["bass tones","slap tones","rolling","West-African rhythm"],
    "Bongos": ["martillo pattern","open tone","slap"],
    "Darbuka": ["dum-tek-tek","Arabic maqsoum","Turkish pattern"],
    "Hand claps": ["layered claps","single slap","call-and-response"],
    "Shakers": ["16th shaker","triplet shaker","cabasa"],
    "Taiko drums": ["deep oodaiko","chu-daiko pattern","cinematic taiko"],
    "Tambourine": ["jingle accent","shake groove","gospel tambourine"],
  },
  "Brass": {
    "Trumpet solo": ["muted wah","open blazing","piccolo trumpet","flugelhorn warm","half-valve"],
    "Muted trumpet": ["Harmon mute","cup mute","plunger mute"],
    "French horn": ["warm lyrical","bold heroic","stopped horn"],
    "Trombone": ["legato smear","staccato punches","gliss","bass trombone low"],
    "Saxophone alto": ["altissimo cry","breathy sub-tone","bebop lines","ballad lyrical"],
    "Saxophone tenor": ["growl low","Coltrane sheets","R&B honk","smooth sub-tone"],
    "Saxophone soprano": ["smooth soprano","Coltrane spiritual","piercing lead"],
    "Full brass section": ["stabs","sustained pad","fall-off glisses","big-band shout","Latin stabs"],
  },
  "Woodwinds": {
    "Flute": ["classical pure","jazz breathy","rock flute","Native-American wood flute"],
    "Clarinet": ["klezmer wail","classical lyrical","chalumeau low","altissimo high"],
    "Bass clarinet": ["dark low","atmospheric","free-jazz fluttering"],
    "Oboe": ["plaintive solo","pastoral lyrical"],
    "English horn": ["melancholic solo","orchestral inner-voice"],
    "Bassoon": ["deep comic","orchestral bass","solo lyrical"],
    "Duduk": ["Armenian lament","ambient drone","film-score solo"],
    "Tin whistle": ["Celtic jig","haunting solo","ornament-heavy"],
  },
  "World": {
    "Sitar": ["drone strings","bending meends","jhala fast strum","raga solo"],
    "Oud": ["taqsim improvisation","fingerpicked melody","Arabic modal"],
    "Erhu": ["plaintive lead","traditional Chinese","legato lyrical"],
    "Shakuhachi": ["breathy attack","bent notes","Zen meditation"],
    "Koto": ["traditional pluck","modern bent notes","ambient"],
    "Kora": ["West-African harp","cyclical melody","griot storytelling"],
    "Didgeridoo": ["drone with overtones","circular breathing","vocal tones"],
    "Tabla": ["bol patterns","tintal 16-beat","jhaptal 10-beat","dadra 6-beat"],
    "Kalimba": ["thumb-piano melodic","interlocking patterns","ambient tines"],
    "Hang drum": ["meditative melodic","ambient","ethereal resonance"],
  },
  "Mallet": {
    "Marimba": ["4-mallet chords","fast single-line","African balafon-style"],
    "Vibraphone": ["motor vibrato","no-vibrato ECM","bowed long tones"],
    "Glockenspiel": ["crystalline melody","chime-like accents"],
    "Tubular bells": ["church-bell accent","ceremonial tolling"],
    "Steel pan": ["Caribbean lead","double-second accompaniment","full steel-orchestra"],
  },
  "Voice / Choir": {
    "Gospel choir": ["full ensemble","call-and-response","ecstatic runs","hum-only underlay"],
    "Children's choir": ["unison innocent","harmonized","wordless oohs"],
    "Gregorian chant": ["monastic unison","Latin plainchant","sacred"],
    "Throat singing": ["Tuvan khoomei","Tibetan overtone","Inuit throat"],
    "Sample-chopped vocal": ["pitched-up chop","time-stretched","reverse chop","granular vocal"],
    "Operatic soprano": ["coloratura fioritura","sustained legato","vibrato heavy"],
    "Bulgarian women's choir": ["open-throat harmony","dissonant clusters","folk modal"],
    "Vocalise wordless": ["ahh sustained","ooh legato","scatting"],
    "Orchestral choir stab": ["cinematic hit","dramatic sforzando","trailer-style"],
  },
  "Folk": {
    "Banjo": ["clawhammer","bluegrass 3-finger","fingerpicked melodic","strummed rhythm"],
    "Mandolin": ["tremolo sustained","chopped chord","bluegrass lead","Celtic jig"],
    "Harmonica": ["blues cross-harp","folk melodic","chromatic jazz","country first-position"],
    "Dobro resonator": ["Delta blues slide","country lap-style","bluegrass lead"],
    "Accordion": ["French musette","Cajun zydeco","Italian folk","tango bandoneón","polka bellows"],
    "Fiddle": ["bluegrass breakdown","Celtic reel","country shuffle","Cajun double-stops"],
    "Ukulele": ["soft strumming","fingerpicked","Hawaiian slack-key","indie jangle"],
    "Autoharp": ["strummed chords","arpeggiated","Appalachian folk"],
  },
  "Latin": {
    "Cuatro": ["Puerto Rican jibaro","Venezuelan llanero","strummed rhythm"],
    "Charango": ["Andean folk","tremolo melody","strummed rhythm"],
    "Timbales": ["cascara rim","mambo bell","salsa fills"],
    "Guiro": ["salsa scrape","cumbia shuffle","merengue"],
    "Marimbula": ["Caribbean bass","Cuban son","kalimba-like tuning"],
    "Bandoneon": ["tango lament","milonga rhythm","nuevo tango atmospheric"],
    "Pandeiro": ["samba groove","choro lilt","capoeira rhythm"],
  },
  "Modern / Trap": {
    "808 melodic bells": ["trap bell melody","detuned chimes","pitched bells","arp pattern"],
    "Pluck lead": ["trap pluck","future-bass pluck","dancehall pluck","staccato melody"],
    "Supersaw lead": ["big-room unison","trance detune","hyperpop harsh","EDM anthem"],
    "Vocal chop synth": ["pitched-up chop","future-bass chop","deep house vocal","chopped hook"],
    "Hip-hop drum loop": ["boom-bap loop","trap hi-hats","drill sliding 808","plugg flutters"],
    "House piano stabs": ["chicago piano","french house filtered","deep house chord","rave stab"],
    "Amapiano log drum": ["sliding log drum","melodic log sub","amapiano signature"],
    "Reese bass": ["dnb reese","dubstep wub","detuned growl"],
    "Drill slide 808": ["NY drill slide","UK drill 808","Jersey drill clipped"],
  },
  "Afrobeats / Global": {
    "Shekere": ["afrobeats shaker","gourd rattle","yoruba pattern"],
    "Talking drum": ["dùndún pitch-bend","yoruba talking","call-response"],
    "Udu": ["clay pot bass","West-African pattern","ambient low-end"],
    "Log drum": ["amapiano signature","melodic sub","South African house"],
    "Mbira / Thumb piano": ["Zimbabwean mbira","kalimba-like","cyclic pattern"],
    "Balafon": ["West-African marimba","pentatonic melody","Griot tradition"],
  },
  "FX": {
    "Granular texture": ["dense cloud","sparse grains","pitch-shifted grains"],
    "Vocoder": ["Kraftwerk classic","robotic speech","harmonized pad-vocoder"],
    "Pitched risers": ["whoosh build","noise riser","tonal riser"],
    "Vinyl crackle": ["lo-fi crackle","surface noise","sampled vinyl"],
    "Reverse cymbals": ["pre-downbeat swell","snare reverse","long reverse crash"],
    "Field recording": ["urban ambience","nature field","crowd noise","rain"],
    "Sound design hit": ["cinematic boom","sub-drop","metallic clang"],
    "Impact / braam": ["trailer braam","orchestral hit","cinematic tension"],
    "Atmosphere pad": ["dark drone","ethereal wash","sub-bass drone","noise textural"],
  },
};

const SPECIFIC_INSTRUMENT_FLAT = Object.entries(SPECIFIC_INSTRUMENTS).flatMap(
  ([cat, insts]) => Object.keys(insts).map(i => ({ cat, name: i }))
);

// ── INSTRUMENT ESSENTIALS — curated starter picks ─────────────────────
// These are the "no-brainer" instruments users reach for most often.
// Organized by use-case rather than category so users pick intent first.
// Each combo includes 3-5 instruments that work well together.
const INSTRUMENT_COMBOS = [
  {
    id: "modern-pop",
    label: "Modern pop",
    desc: "Radio-ready production",
    icon: "◉",
    instruments: ["Grand piano", "Acoustic kit close-mic", "Precision bass", "Supersaw lead", "Vocal chop synth"],
  },
  {
    id: "trap",
    label: "Trap / drill",
    desc: "Dark, hi-hat rolls, 808s",
    icon: "◆",
    instruments: ["808 sub bass", "Hip-hop drum loop", "808 melodic bells", "Pluck lead"],
  },
  {
    id: "boom-bap",
    label: "Boom-bap",
    desc: "Classic head-nod hip-hop",
    icon: "▣",
    instruments: ["SP-1200 sampler", "MPC-style drums", "Jazz guitar hollowbody", "Upright acoustic bass"],
  },
  {
    id: "rnb",
    label: "R&B / neo-soul",
    desc: "Warm, organic groove",
    icon: "♡",
    instruments: ["Rhodes electric piano", "Bass", "Acoustic kit close-mic", "Saxophone tenor"],
  },
  {
    id: "afrobeats",
    label: "Afrobeats",
    desc: "Global dance energy",
    icon: "●",
    instruments: ["Log drum", "Shekere", "Talking drum", "Synth bass", "Pluck lead"],
  },
  {
    id: "amapiano",
    label: "Amapiano",
    desc: "South-African house",
    icon: "◊",
    instruments: ["Amapiano log drum", "Shekere", "House piano stabs", "Synth bass"],
  },
  {
    id: "indie-folk",
    label: "Indie folk",
    desc: "Intimate, acoustic",
    icon: "✦",
    instruments: ["Acoustic steel-string", "Banjo", "Mandolin", "Brushes on snare", "Upright acoustic bass"],
  },
  {
    id: "rock",
    label: "Rock",
    desc: "Guitars, drums, attitude",
    icon: "▲",
    instruments: ["Les Paul distortion", "Fender Strat clean", "Precision bass", "Acoustic kit close-mic"],
  },
  {
    id: "house",
    label: "House / tech house",
    desc: "4-on-the-floor dance",
    icon: "◆",
    instruments: ["TR-909", "House piano stabs", "Synth bass", "Supersaw lead", "Vocal chop synth"],
  },
  {
    id: "dubstep-bass",
    label: "Dubstep / bass music",
    desc: "Heavy wobble & drops",
    icon: "▼",
    instruments: ["Reese bass", "TR-909", "Pluck lead", "Sound design hit"],
  },
  {
    id: "cinematic",
    label: "Cinematic / trailer",
    desc: "Epic orchestral weight",
    icon: "⬢",
    instruments: ["Full string section", "Full brass section", "Taiko drums", "Impact / braam", "Orchestral choir stab"],
  },
  {
    id: "jazz",
    label: "Jazz",
    desc: "Real-instrument trio",
    icon: "♪",
    instruments: ["Grand piano", "Upright acoustic bass", "Brushes on snare", "Saxophone tenor"],
  },
  {
    id: "country",
    label: "Country",
    desc: "Nashville session",
    icon: "✧",
    instruments: ["Telecaster twang", "Pedal steel", "Fiddle", "Acoustic steel-string", "Acoustic kit close-mic"],
  },
  {
    id: "latin",
    label: "Latin / reggaeton",
    desc: "Perreo / dembow",
    icon: "♛",
    instruments: ["Timbales", "Congas", "Guiro", "Synth bass", "Pluck lead"],
  },
];

// The 12 most universal "reach-first" instruments — works across many genres
const INSTRUMENT_ESSENTIALS = [
  "Grand piano",
  "Acoustic steel-string",
  "Fender Strat clean",
  "Les Paul distortion",
  "Rhodes electric piano",
  "Moog sub bass",
  "Precision bass",
  "808 sub bass",
  "Acoustic kit close-mic",
  "TR-808",
  "Full string section",
  "Saxophone tenor",
];


// Lookup: instrument name → its articulation list (flattened across categories)
const ARTICULATIONS_BY_INSTRUMENT = Object.entries(SPECIFIC_INSTRUMENTS).reduce(
  (acc, [, insts]) => {
    Object.entries(insts).forEach(([name, arts]) => { acc[name] = arts || []; });
    return acc;
  },
  {}
);

// ────────────────────────────────────────────────────────────────────────────
// OTHER OPTION SETS
// ────────────────────────────────────────────────────────────────────────────
const MOODS = [
  "Dark & brooding","Euphoric","Nostalgic","Defiant","Tender",
  "Desperate","Triumphant","Sensual","Melancholic","Spiritual",
  "Bittersweet","Unbothered","Haunted","Ecstatic","Anxious",
  "Serene","Electric","Lonely","Dreamlike","Furious",
];

const GROOVES = [
  { id: "default", label: "Default", desc: "let downstream tool choose" },
  { id: "straight", label: "Straight", desc: "rigid, quantized, on-the-grid" },
  { id: "swing", label: "Swing", desc: "shuffled, human, laid-back pocket" },
  { id: "half-time", label: "Half-time", desc: "double weight, slower feel" },
  { id: "broken", label: "Broken", desc: "syncopated, off-kilter" },
  { id: "experimental", label: "Experimental", desc: "polyrhythmic, shifting" },
  { id: "shuffle", label: "Shuffle", desc: "triplet-based eighth note feel" },
  { id: "polyrhythm", label: "Polyrhythm", desc: "multiple rhythms simultaneously" },
  { id: "motorik", label: "Motorik", desc: "steady driving 4/4 pulse" },
  { id: "syncopated", label: "Syncopated", desc: "accent on weak beats" },
  { id: "rubato", label: "Rubato", desc: "flexible, expressive timing" },
];

const ENERGIES = [
  "Slow burn to explosion","Steady groove throughout",
  "Intimate & bare throughout","Euphoric continuous build",
  "Sparse to wall of sound","Driving & relentless",
  "Starts huge then strips back","Tension without full release",
];

const VOCALISTS = [
  "Breathy female lead","Raw male baritone","Androgynous voice",
  "Melismatic soprano","Smooth tenor","Gospel ensemble",
  "Screamed verse / melodic chorus","Whisper to full belt",
  "Spoken word over melody","Layered harmonies no lead",
  "Auto-tuned melodic delivery","Falsetto-led",
];

const LANGUAGES = [
  { code: "en", label: "English", default: true },
  { code: "es", label: "Spanish" }, { code: "pt", label: "Portuguese" },
  { code: "fr", label: "French" }, { code: "de", label: "German" },
  { code: "zh", label: "Chinese" }, { code: "he", label: "Hebrew" },
  { code: "ja", label: "Japanese" }, { code: "ko", label: "Korean" },
  { code: "hi", label: "Hindi" }, { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" }, { code: "id", label: "Indonesian" },
  { code: "tr", label: "Turkish" }, { code: "fa", label: "Persian" },
  { code: "it", label: "Italian" }, { code: "th", label: "Thai" },
  { code: "bn", label: "Bengali" }, { code: "sw", label: "Swahili" },
  { code: "vi", label: "Vietnamese" }, { code: "ur", label: "Urdu" },
  { code: "pa", label: "Punjabi" },
];

const MIX_CHARS = [
  "Intimate close-mic","Wide cinematic","Lo-fi tape warmth",
  "Ultra clean & polished","Raw & uncompressed",
  "Heavy reverb cathedral","Punchy & compressed",
  "Vintage analog","Futuristic digital","Dry & direct",
];

const HARMONIC_STYLES = [
  "Minor-key introspection","Major-key lift","Modal ambiguity",
  "Dissonant tension","Jazz extensions","Drone-based static harmony",
  "Classical voice-leading","Bluesy dominant","Microtonal",
];

const SOUND_TEXTURES = [
  "Granular & particulate","Smooth & liquid","Crystalline & brittle",
  "Thick & saturated","Airy & weightless","Metallic & reflective",
  "Organic & breathing","Digital & precise","Distressed & decayed",
];

const LYRICAL_VIBES = [
  "Confessional diary","Nostalgic storytelling","Defiant anthem",
  "Abstract poetry","Braggadocio flex","Heartbreak elegy",
  "Political protest","Surreal dreamscape","Romantic devotion",
  "Existential questioning","Party celebration","Spiritual seeking",
  "Coming-of-age narrative","Cinematic scene-setting","Stream-of-consciousness",
  "Mythic / allegorical","Hedonistic escapism","Social commentary",
  "Letter to self","Ode to a place",
];

// ────────────────────────────────────────────────────────────────────────────
// MODES
// ────────────────────────────────────────────────────────────────────────────
const MODES = [
  { id: "simple",    label: "Simple",    limit: 100, sub: "bare essentials",      level: 1 },
  { id: "moderated", label: "Moderated", limit: 250, sub: "balanced detail",      level: 2 },
  { id: "expanded",  label: "Expanded",  limit: 499, sub: "rich description",     level: 3 },
  { id: "vast",      label: "Vast",      limit: 600, sub: "full production brief",level: 4 },
  { id: "chaos",     label: "Chaos",     limit: 800, sub: "unhinged creative mode — weird fusions, wild imagery", level: 5 },
];

// ────────────────────────────────────────────────────────────────────────────
// CHAOS INJECTIONS — Bank of unhinged creative imagery to spike Chaos mode
// with. Randomly selects 2–4 of these and weaves them into the prompt.
// These are not genre-specific — the jarring decontextualization is the point.
// ────────────────────────────────────────────────────────────────────────────
const CHAOS_ATMOSPHERES = [
  "recorded in an empty cathedral at 4am",
  "as if playing through a broken car radio from 1983",
  "muffled through the wall of a neighboring apartment",
  "at the end of a long tunnel, reverb swallowing the upper frequencies",
  "broadcast from a rotating radio tower on a foggy coast",
  "played backwards at first, then reversed halfway through the verse",
  "with the sound of distant thunder and rain pooling under every phrase",
  "inside a submerged submarine, instruments warped by pressure",
  "from a tape left in the sun, warbled and stretched",
  "with crowd noise bleeding in from an unseen party next door",
  "as if recorded on the last day of a long summer",
  "underwater, then surfacing for the chorus",
  "at the bottom of an empty swimming pool, concrete echo",
  "through the walls of a moving train",
  "in a room with one lightbulb swinging, captured on a handheld mic",
];
const CHAOS_TEXTURES = [
  "with subharmonic bass that shakes the foundations",
  "layered with field recordings of a coastal storm",
  "with tape hiss, vinyl crackle, and AM-radio drift folded into every bar",
  "interrupted briefly by silence, as if the signal cut out",
  "harmonized by a choir that only appears in the final chorus",
  "with a distant, half-remembered melody ghosting beneath the lead",
  "punctuated by the sound of heavy industrial machinery at key moments",
  "drenched in analog warmth, like a Rhodes through a cracked amp",
  "surgical in its mix — no reverb, everything bone dry",
  "with granular-synthesis textures that shimmer and dissolve",
];
const CHAOS_CHARACTERS = [
  "told from the perspective of someone who just lost everything",
  "as a conversation between two ghosts",
  "imagined as the last song before the world ends",
  "as if the protagonist is running out of time",
  "from the point of view of a letter never sent",
  "as a lullaby for someone who can no longer hear it",
  "as a confession delivered through a broken phone line",
  "as a memory slowly dissolving in real time",
];

const MODE_SECTION_LIMITS = {
  simple:    [3, 4],
  moderated: [5, 6],
  expanded:  [7, 8],
  vast:      [9, 10],
  chaos:     [11, 12],
};

// ────────────────────────────────────────────────────────────────────────────
// PRESETS — first-visit quick starts. Each applies a full state snapshot.
// ────────────────────────────────────────────────────────────────────────────
const PRESETS = [
  {
    id: "modern-trap",
    name: "Modern trap hit",
    emoji: "🔥",
    lyricsOn: true,
    mode: "expanded",
    state: {
      slots: [
        { genre: "Trap", sub: "Atlanta trap", micro: null },
        { genre: "Melodic Rap", sub: "sung-rap hybrid", micro: null },
        null,
      ],
      mood: "Confident",
      energy: "Slow-building then exploding",
      groove: "halftime trap",
      vocalist: "Auto-tuned melodic rapper",
      language: "en",
      lyricalVibe: "Braggadocio flex",
      specificInstruments: ["TR-808", "Rhodes electric piano", "Acoustic kit close-mic"],
      specificArticulations: { "TR-808": "slide 808", "Rhodes electric piano": "vibrato on" },
      specificCount: 3,
      harmonic: "Minor-key modal",
      texture: "Thick & saturated",
      mix: "Polished radio",
    },
  },
  {
    id: "afrobeats-summer",
    name: "Afrobeats summer",
    emoji: "🌴",
    lyricsOn: true,
    mode: "moderated",
    state: {
      slots: [
        { genre: "Afrobeats", sub: null, micro: null },
        null,
        null,
      ],
      mood: "Euphoric",
      energy: "Steady dance pulse",
      groove: "afrobeats log-drum",
      vocalist: "Smooth melodic lead",
      language: "en",
      lyricalVibe: "Party celebration",
      specificInstruments: ["Log drum", "Shakers", "Synth bass"],
      specificArticulations: { "Shakers": "16th shaker" },
      specificCount: 3,
      harmonic: "Major pop diatonic",
      texture: "Organic & breathing",
      mix: "Polished radio",
    },
  },
  {
    id: "moody-rnb",
    name: "Moody R&B ballad",
    emoji: "🌙",
    lyricsOn: true,
    mode: "moderated",
    state: {
      slots: [
        { genre: "Alt R&B", sub: "noir ballad", micro: null },
        null,
        null,
      ],
      mood: "Sensual",
      energy: "Slow burn",
      groove: "halftime trap",
      vocalist: "Whispered intimate vocal",
      language: "en",
      lyricalVibe: "Confessional diary",
      specificInstruments: ["Rhodes electric piano", "808 sub bass", "Brushes on snare"],
      specificArticulations: { "Rhodes electric piano": "warm mk1", "808 sub bass": "long-tail 808" },
      specificCount: 3,
      harmonic: "Jazz-influenced extended",
      texture: "Smooth & liquid",
      mix: "Polished radio",
    },
  },
  {
    id: "synthpop-80s",
    name: "80s synthpop",
    emoji: "✨",
    lyricsOn: true,
    mode: "moderated",
    state: {
      slots: [
        { genre: "Synth-Pop", sub: "80s revival synthpop", micro: null },
        null,
        null,
      ],
      mood: "Nostalgic",
      energy: "Euphoric arc",
      groove: "4-on-the-floor",
      vocalist: "Anthemic clear lead",
      language: "en",
      lyricalVibe: "Romantic devotion",
      specificInstruments: ["Juno-60 pads", "Linn LM-1", "Prophet-5 lead"],
      specificArticulations: { "Juno-60 pads": "chorus on", "Linn LM-1": "80s gated kick" },
      specificCount: 3,
      harmonic: "Major pop diatonic",
      texture: "Crystalline & brittle",
      mix: "Polished radio",
    },
  },
  {
    id: "dark-pop",
    name: "Dark pop",
    emoji: "🖤",
    lyricsOn: true,
    mode: "moderated",
    state: {
      slots: [
        { genre: "Dark Pop", sub: "cinematic dark-pop", micro: null },
        null,
        null,
      ],
      mood: "Dark & brooding",
      energy: "Cinematic rise",
      groove: "halftime trap",
      vocalist: "Breathy pop vocal",
      language: "en",
      lyricalVibe: "Heartbreak elegy",
      specificInstruments: ["Grand piano", "808 sub bass", "Full string section"],
      specificArticulations: { "Grand piano": "felt muted", "Full string section": "tremolo sustained" },
      specificCount: 3,
      harmonic: "Minor-key modal",
      texture: "Digital & precise",
      mix: "Cinematic wide",
    },
  },
];

function getModeById(id) { return MODES.find(m => m.id === id) || MODES[1]; }

// ────────────────────────────────────────────────────────────────────────────
// PROMPT ENGINE
// ────────────────────────────────────────────────────────────────────────────

const PHRASE_COMPRESSIONS = {
  "Intimate close-mic": "close-mic", "Wide cinematic": "wide cinematic",
  "Lo-fi tape warmth": "lo-fi tape", "Ultra clean & polished": "polished",
  "Raw & uncompressed": "raw", "Heavy reverb cathedral": "cathedral reverb",
  "Punchy & compressed": "punchy", "Vintage analog": "analog",
  "Futuristic digital": "digital", "Dry & direct": "dry",
  "Minor-key introspection": "minor-key", "Major-key lift": "major lift",
  "Modal ambiguity": "modal", "Dissonant tension": "dissonant",
  "Jazz extensions": "jazz harmony", "Drone-based static harmony": "drone",
  "Classical voice-leading": "classical", "Bluesy dominant": "blues",
  "Granular & particulate": "granular", "Smooth & liquid": "liquid",
  "Crystalline & brittle": "crystalline", "Thick & saturated": "saturated",
  "Airy & weightless": "airy", "Metallic & reflective": "metallic",
  "Organic & breathing": "organic", "Digital & precise": "precise",
  "Distressed & decayed": "distressed",
  "Slow burn to explosion": "slow-burn build",
  "Steady groove throughout": "steady groove",
  "Intimate & bare throughout": "bare intimate",
  "Euphoric continuous build": "euphoric build",
  "Sparse to wall of sound": "sparse-to-wall",
  "Driving & relentless": "driving",
  "Starts huge then strips back": "big-to-sparse",
  "Tension without full release": "unresolved",
  "Breathy female lead": "breathy fem lead","Raw male baritone": "raw baritone",
  "Androgynous voice": "androgynous","Melismatic soprano": "melismatic soprano",
  "Smooth tenor": "smooth tenor","Gospel ensemble": "gospel choir",
  "Screamed verse / melodic chorus": "scream/sing",
  "Whisper to full belt": "whisper-to-belt","Spoken word over melody": "spoken",
  "Layered harmonies no lead": "layered harmonies",
  "Auto-tuned melodic delivery": "autotuned","Falsetto-led": "falsetto",
  "Dark & brooding": "dark",
};
function compressPhrase(s) { return s ? (PHRASE_COMPRESSIONS[s] || s) : s; }

function inferBPM(state) {
  const g = state.groove, e = (state.energy || "").toLowerCase();
  const base = g === "half-time" ? 75 : g === "swing" ? 92 : g === "broken" ? 128 :
               g === "experimental" ? 105 : g === "shuffle" ? 98 : g === "motorik" ? 120 :
               g === "polyrhythm" ? 112 : g === "syncopated" ? 105 : g === "rubato" ? 72 : 110;
  if (e.includes("driving") || e.includes("relentless")) return base + 20;
  if (e.includes("euphoric") && e.includes("build")) return base + 10;
  if (e.includes("intimate") || e.includes("bare")) return base - 20;
  return base;
}

function genreTagsFromSlots(slots) {
  return slots.filter(Boolean).map(s => {
    const bits = [s.genre];
    if (s.sub) bits.push(s.sub);
    if (s.micro) bits.push(s.micro);
    return bits.join(" ");
  }).join(", ");
}

function useField(toggle, value, fallback) {
  if (toggle === "off") return null;
  if (toggle === "on") return value || fallback || null;
  return value || null;
}

function resolveSpecificInstruments(state) {
  if (state.toggles.specificInstruments === "off") return [];
  const cap = Math.max(1, Math.min(10, state.specificCount || 3));
  const selected = state.specificInstruments || [];
  if (state.toggles.specificInstruments === "on" && selected.length < cap) {
    const pool = SPECIFIC_INSTRUMENT_FLAT.map(x => x.name).filter(n => !selected.includes(n));
    const need = cap - selected.length;
    const autoPicks = pool.slice(0, need);
    const combined = [...selected, ...autoPicks];
    return combined.map(name => ({ name, articulation: state.specificArticulations?.[name] || null }));
  }
  return selected.slice(0, cap).map(name => ({
    name, articulation: state.specificArticulations?.[name] || null,
  }));
}

function specificInstrumentsToString(items) {
  return items.map(it => it.articulation ? `${it.name} with ${it.articulation}` : it.name).join(", ");
}

function shortPromptL0(state, lyricsOn) {
  const parts = [];
  const gs = genreTagsFromSlots(state.slots);
  if (gs) parts.push(gs);
  parts.push(`${inferBPM(state)} BPM`);
  const mood = useField(state.toggles.mood, state.mood);
  if (mood) parts.push(mood.toLowerCase());
  const groove = useField(state.toggles.groove, state.groove !== "default" ? state.groove : null);
  if (groove) parts.push(`${groove} groove`);
  const energy = useField(state.toggles.energy, state.energy);
  if (energy) parts.push(energy.toLowerCase());
  if (lyricsOn) {
    const vocal = useField(state.toggles.vocalist, state.vocalist) || "sung lead vocal";
    parts.push(vocal.toLowerCase());
    const langLabel = LANGUAGES.find(l => l.code === state.language)?.label || "English";
    if (state.toggles.language !== "off") parts.push(`${langLabel.toLowerCase()} lyrics`);
    const vibe = useField(state.toggles.lyricalVibe, state.lyricalVibe);
    if (vibe) parts.push(`${vibe.toLowerCase()} lyrics`);
  } else parts.push("no vocals, wordless arrangement");
  const si = resolveSpecificInstruments(state);
  if (si.length) parts.push(specificInstrumentsToString(si).toLowerCase());
  const harm = useField(state.toggles.harmonic, state.harmonic);
  if (harm) parts.push(harm.toLowerCase());
  const tex = useField(state.toggles.texture, state.texture);
  if (tex) parts.push(tex.toLowerCase());
  const mix = useField(state.toggles.mix, state.mix);
  if (mix) parts.push(mix.toLowerCase());
  return parts.join(", ");
}

function shortPromptL1(state, lyricsOn) {
  const parts = [];
  const gs = genreTagsFromSlots(state.slots.map(s => s ? { ...s, micro: undefined } : s));
  if (gs) parts.push(gs);
  parts.push(`${inferBPM(state)} BPM`);
  const mood = useField(state.toggles.mood, state.mood);
  if (mood) parts.push(mood.toLowerCase());
  const groove = useField(state.toggles.groove, state.groove !== "default" ? state.groove : null);
  if (groove) parts.push(`${groove} groove`);
  const energy = useField(state.toggles.energy, state.energy);
  if (energy) parts.push(energy.toLowerCase());
  if (lyricsOn) {
    const vocal = useField(state.toggles.vocalist, state.vocalist) || "sung lead vocal";
    parts.push(vocal.toLowerCase());
    const langLabel = LANGUAGES.find(l => l.code === state.language)?.label || "English";
    if (state.toggles.language !== "off") parts.push(`${langLabel.toLowerCase()} lyrics`);
  } else parts.push("no vocals");
  const si = resolveSpecificInstruments(state).slice(0, 4);
  if (si.length) parts.push(specificInstrumentsToString(si).toLowerCase());
  const mix = useField(state.toggles.mix, state.mix);
  if (mix) parts.push(mix.toLowerCase());
  return parts.join(", ");
}

function shortPromptL2(state, lyricsOn) {
  const parts = [];
  const gs = genreTagsFromSlots(state.slots.map(s => s ? { ...s, micro: undefined } : s));
  if (gs) parts.push(gs);
  parts.push(`${inferBPM(state)}bpm`);
  const mood = useField(state.toggles.mood, state.mood);
  if (mood) parts.push(compressPhrase(mood));
  const groove = useField(state.toggles.groove, state.groove !== "default" ? state.groove : null);
  if (groove) parts.push(groove);
  const energy = useField(state.toggles.energy, state.energy);
  if (energy) parts.push(compressPhrase(energy));
  if (lyricsOn) {
    const vocal = useField(state.toggles.vocalist, state.vocalist) || "sung vocal";
    parts.push(compressPhrase(vocal));
    const langLabel = LANGUAGES.find(l => l.code === state.language)?.label || "English";
    if (state.toggles.language !== "off" && state.language !== "en") parts.push(`${langLabel.toLowerCase()} lyrics`);
  } else parts.push("no vocals");
  const si = resolveSpecificInstruments(state).slice(0, 3);
  if (si.length) parts.push(si.map(i => compressPhrase(i.name)).join(", "));
  const mix = useField(state.toggles.mix, state.mix);
  if (mix) parts.push(compressPhrase(mix));
  return parts.join(", ");
}

function shortPromptL3(state, lyricsOn) {
  const parts = [];
  const gs = state.slots.filter(Boolean).map(s => s.sub ? `${s.genre} ${s.sub}` : s.genre).join(", ");
  if (gs) parts.push(gs);
  parts.push(`${inferBPM(state)}bpm`);
  if (state.groove && state.groove !== "default" && state.groove !== "straight") parts.push(state.groove);
  if (!lyricsOn) parts.push("no vocals");
  else {
    parts.push(compressPhrase(state.vocalist || "sung vocal"));
    if (state.toggles.language !== "off" && state.language !== "en") {
      const langLabel = LANGUAGES.find(l => l.code === state.language)?.label;
      if (langLabel) parts.push(`${langLabel.toLowerCase()} lyrics`);
    }
  }
  if (state.mood) parts.push(compressPhrase(state.mood));
  return parts.join(", ");
}

function shortPromptL4(state, lyricsOn) {
  const parts = [];
  const gs = state.slots.filter(Boolean).map(s => s.genre).join("/");
  if (gs) parts.push(gs);
  parts.push(`${inferBPM(state)}bpm`);
  if (!lyricsOn) parts.push("no vox");
  else if (state.toggles.language !== "off" && state.language !== "en") {
    const langLabel = LANGUAGES.find(l => l.code === state.language)?.label;
    if (langLabel) parts.push(`${langLabel.toLowerCase()} lyrics`);
  }
  if (state.mood) parts.push(compressPhrase(state.mood));
  return parts.join(", ");
}

// Detailed prompt format: structured, compact, label-driven.
// The target generator's description field responds best to clear declarative lines, not
// flowing prose. Each line is a self-contained instruction. No meta-
// commentary about what the AI should aim for — just facts.
function buildDetailedSentences(state, lyricsOn, mode) {
  const slots = state.slots.filter(Boolean);
  const primary = slots[0];
  const bpm = inferBPM(state);
  const sentences = [];

  // ── LINE 1: GENRE HEADLINE ──────────────────────────────────────────
  if (slots.length === 1) {
    const s = slots[0];
    const path = [s.genre, s.sub, s.micro].filter(Boolean).join(", ");
    sentences.push({ priority: 1, text: `Genre: ${path.toLowerCase()}.` });
  } else if (slots.length === 2) {
    const a = [slots[0].genre, slots[0].sub].filter(Boolean).join(" ").toLowerCase();
    const b = [slots[1].genre, slots[1].sub].filter(Boolean).join(" ").toLowerCase();
    sentences.push({ priority: 1, text: `Genre: ${a} crossed with ${b}.` });
  } else if (slots.length === 3) {
    const labels = slots.map(s => [s.genre, s.sub].filter(Boolean).join(" ").toLowerCase());
    sentences.push({ priority: 1, text: `Genre: ${labels[0]}, blended with ${labels[1]} and ${labels[2]}.` });
  }

  // ── LINE 2: TEMPO + GROOVE (single compact tempo line) ─────────────
  const groove = useField(state.toggles.groove, state.groove !== "default" ? state.groove : null);
  const tempoBits = [`${bpm} BPM`];
  if (groove) tempoBits.push(`${groove.toLowerCase()} groove`);
  sentences.push({ priority: 2, text: `Tempo: ${tempoBits.join(", ")}.` });

  // ── LINE 3: VOCALS (explicit and early — critical for the generator) ────────
  if (lyricsOn) {
    const vocal = useField(state.toggles.vocalist, state.vocalist) || "clear lead vocal, confident and forward in the mix";
    const langLabel = state.toggles.language !== "off"
      ? (LANGUAGES.find(l => l.code === state.language)?.label || "English")
      : null;
    const langBit = langLabel ? `, ${langLabel.toLowerCase()} lyrics` : "";
    sentences.push({ priority: 3,
      text: `Vocals: ${vocal.toLowerCase()}${langBit}.` });
  } else {
    sentences.push({ priority: 3,
      text: `Vocals: none. Fully wordless arrangement, melody carried by instruments.` });
  }

  // ── LINE 4: LYRICAL VIBE (only when lyrics on) ─────────────────────
  if (lyricsOn) {
    const vibe = useField(state.toggles.lyricalVibe, state.lyricalVibe);
    if (vibe) sentences.push({ priority: 4,
      text: `Lyrical tone: ${vibe.toLowerCase()}, using concrete imagery over abstract emotional labels.` });
  }

  // ── LINE 5: MOOD + ENERGY (combined, short) ────────────────────────
  const mood = useField(state.toggles.mood, state.mood);
  const energy = useField(state.toggles.energy, state.energy);
  if (mood || energy) {
    const bits = [];
    if (mood)   bits.push(mood.toLowerCase());
    if (energy) bits.push(`${energy.toLowerCase()} energy arc`);
    sentences.push({ priority: 5, text: `Mood: ${bits.join(", ")}.` });
  }

  // ── LINE 6: INSTRUMENTATION (explicit list, generator-parseable) ────────
  const si = resolveSpecificInstruments(state);
  if (si.length) {
    const detailed = si.map(it =>
      it.articulation
        ? `${it.name.toLowerCase()} with ${it.articulation.toLowerCase()}`
        : it.name.toLowerCase()
    ).join(", ");
    sentences.push({ priority: 6, text: `Instrumentation: ${detailed}.` });
  }

  // ── LINE 7: HARMONY ────────────────────────────────────────────────
  const harm = useField(state.toggles.harmonic, state.harmonic);
  if (harm) sentences.push({ priority: 7,
    text: `Harmony: ${harm.toLowerCase()} voicings and melodic contour.` });

  // ── LINE 8: TEXTURE + MIX (combined) ───────────────────────────────
  const tex = useField(state.toggles.texture, state.texture);
  const mix = useField(state.toggles.mix, state.mix);
  if (tex || mix) {
    const bits = [];
    if (tex) bits.push(tex.toLowerCase());
    if (mix) bits.push(`${mix.toLowerCase()} mix`);
    sentences.push({ priority: 8, text: `Sound: ${bits.join(", ")}.` });
  }

  // ── LINE 9: STRUCTURE HINT (brief, the generator responds to this) ──────────
  if (lyricsOn) {
    sentences.push({ priority: 10,
      text: `Structure: intro, verse, chorus, verse, chorus, bridge, chorus, outro.` });
  } else {
    sentences.push({ priority: 10,
      text: `Structure: intro, main theme, development, climax, resolution.` });
  }

  // ── LINE 10: PRODUCTION DIRECTIVES (concrete, generator-actionable) ─────
  sentences.push({ priority: 11,
    text: `Production: modern, professional, radio-ready, cohesive mix, full frequency balance.` });

  // ── LINE 11: AVOID LIST (Negatives that improve output) ───────
  if (primary) {
    const genreLow = primary.genre.toLowerCase();
    sentences.push({ priority: 12,
      text: `Avoid: generic ${genreLow} tropes, MIDI-stock presets, thin mixing, loop-based repetition without variation.` });
  }

  // ── CHAOS MODE — unhinged creative injections ───────────────────────
  // Pick one atmosphere + one texture + one character angle. Each adds a
  // jarring imaginative frame the generator will try to interpret — which pushes
  // the generation toward weirder, more distinctive results.
  if (mode === "chaos") {
    const atm = CHAOS_ATMOSPHERES[Math.floor(Math.random() * CHAOS_ATMOSPHERES.length)];
    const tex = CHAOS_TEXTURES[Math.floor(Math.random() * CHAOS_TEXTURES.length)];
    sentences.push({ priority: 13, text: `Atmosphere: ${atm}.` });
    sentences.push({ priority: 14, text: `Texture: ${tex}.` });
    if (lyricsOn) {
      const chr = CHAOS_CHARACTERS[Math.floor(Math.random() * CHAOS_CHARACTERS.length)];
      sentences.push({ priority: 15, text: `Narrative frame: ${chr}.` });
    }
  }

  return sentences.sort((a, b) => a.priority - b.priority);
}

function packSentencesToLimit(sentences, limit) {
  let current = "";
  for (const s of sentences) {
    const cand = current ? `${current}\n${s.text}` : s.text;
    if (cand.length <= limit) current = cand;
  }
  if (!current && sentences.length > 0) return safeTruncate(sentences[0].text, limit);
  return current;
}
function safeTruncate(text, limit) {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const lp = slice.lastIndexOf(".");
  const lc = slice.lastIndexOf(",");
  const ls = slice.lastIndexOf(" ");
  const cutAt = lp > limit - 60 ? lp + 1 : lc > limit - 30 ? lc : ls > limit - 15 ? ls : limit;
  return slice.slice(0, cutAt).trim();
}
// ── Grammar sanitizer ────────────────────────────────────────────────
// AI music generators parse commas, periods, and plain words
// well. Em-dashes, semicolons, parentheticals, and bracket notation can
// cause prompt drift. This pass normalizes to generator-friendly punctuation.
// Note: hyphens inside words (Hip-Hop, TR-808, Lo-Fi, 12-string) are kept
// because they are part of proper names — removing them would damage meaning.
// Sanitizer: normalize punctuation to generator-friendly forms, but
// preserve structural newlines and label colons that generators use to parse
// directives. Only convert mid-sentence em/en-dashes and semicolons.
function sunoSanitize(text) {
  if (!text) return text;
  return text
    .replace(/\s*—\s*/g, ", ")          // em-dash → comma
    .replace(/\s*–\s*/g, ", ")          // en-dash → comma
    .replace(/\s*;\s*/g, ", ")          // semicolon → comma
    .replace(/\(([^)]*)\)/g, "$1")      // strip parentheses, keep contents
    .replace(/\s*,\s*,+/g, ", ")        // collapse duplicate commas
    .replace(/[ \t]{2,}/g, " ")         // collapse spaces/tabs but NOT newlines
    .replace(/ *\n *\n+/g, "\n")        // collapse 2+ blank lines to 1
    .replace(/ *\n */g, "\n")           // trim each line
    .replace(/,\s*\./g, ".")            // ", ." → "."
    .replace(/,\s*\n/g, "\n")           // trailing comma before newline
    .replace(/,\s*$/g, "")              // trailing comma at end
    .replace(/\.\s*\./g, ".")           // double period
    .trim();
}

function compressDetailedPrompt(state, lyricsOn, limit, mode) {
  const sentences = buildDetailedSentences(state, lyricsOn, mode);
  const packed = packSentencesToLimit(sentences, limit);
  const raw = packed.length > limit ? safeTruncate(packed, limit) : packed;
  const finalText = sunoSanitize(raw);
  return {
    text: finalText, length: finalText.length,
    compressed: finalText.length < sentences.reduce((a, s) => a + s.text.length + 1, 0),
    level: 0,
  };
}
const SHORT_FILLERS = ["modern production","full arrangement","cohesive mix","detailed sonics","clean master"];
function padShortToBudget(text, limit, state) {
  let result = text;
  const candidates = [];
  if (state.harmonic && !text.toLowerCase().includes(state.harmonic.toLowerCase())) candidates.push(state.harmonic.toLowerCase());
  if (state.texture && !text.toLowerCase().includes(state.texture.toLowerCase())) candidates.push(state.texture.toLowerCase());
  if (state.energy && !text.toLowerCase().includes(state.energy.toLowerCase())) candidates.push(state.energy.toLowerCase());
  candidates.push(...SHORT_FILLERS);
  for (const extra of candidates) {
    if (result.length >= limit - 10) break;
    const cand = result + ", " + extra;
    if (cand.length <= limit) result = cand; else break;
  }
  return result;
}
function compressShortPrompt(state, lyricsOn, limit) {
  const cands = [shortPromptL0, shortPromptL1, shortPromptL2, shortPromptL3, shortPromptL4]
    .map((fn, i) => ({ text: fn(state, lyricsOn), level: i }));
  const fitting = cands.filter(c => c.text.length <= limit);
  if (fitting.length === 0) return { text: sunoSanitize(safeTruncate(cands[cands.length - 1].text, limit)), compressed: true, level: 5 };
  const best = fitting.sort((a, b) => b.text.length - a.text.length)[0];
  let text = best.text;
  if (text.length < limit - 10) text = padShortToBudget(text, limit, state);
  if (text.length > limit) text = safeTruncate(text, limit);
  text = sunoSanitize(text);
  return { text, compressed: best.level > 0 || text !== best.text, level: best.level };
}

// ── Pop-hit probability scorer ───────────────────────────────────────────
// Rule-based 0–100 score reflecting how closely the current selection
// matches contemporary worldwide pop-hit characteristics (chart-friendly
// genre, production norms, BPM window, vocal accessibility).
const POP_HIT_SCORE = {
  GENRE_TOP:   ["Pop","Hip-Hop","R&B / Soul","Latin","Electronic","Country","K-Pop","Afrobeats"],
  GENRE_HIGH:  ["Trap","Melodic Rap","Dance-Pop","Synth-Pop","Hyperpop","Alt R&B","Trap Soul","Reggaeton","Afrobeats","Amapiano","Dancehall"],
  GENRE_MID:   ["Indie","Alternative","Rock","House","EDM","Dance","Disco"],
  GENRE_NICHE: ["Jazz","Classical","Folk","Ambient","Experimental","Noise","Drone","Free Jazz","Gabber","Breakcore","Industrial","Metal","Black Metal","Doom","Drum & Bass","Hardcore","Grindcore","Post-Rock","Post-Punk","Math Rock","Krautrock"],
  MOOD_HIT: ["Euphoric","Uplifting","Catchy","Summery","Romantic","Confident","Sensual","Playful","Hopeful","Dreamy","Nostalgic"],
  MOOD_OK:  ["Melancholic","Tender","Pensive","Mysterious","Moody"],
  MOOD_LOW: ["Abrasive","Unsettling","Hostile","Dissonant","Chaotic","Bleak","Tortured","Nihilistic"],
  LANG_HIGH: ["en","es","pt","ko","hi","zh"],
  LANG_MID:  ["fr","ja","id","ar","tr","de","it","ru","bn"],
  VIBE_HIT: ["Party celebration","Romantic devotion","Braggadocio flex","Confessional diary","Nostalgic storytelling","Coming-of-age narrative","Hedonistic escapism","Heartbreak elegy"],
  VIBE_LOW: ["Surreal dreamscape","Abstract poetry","Mythic / allegorical","Political protest","Spiritual seeking","Existential questioning"],
};

function calcPopHitScore(state, lyricsOn) {
  let score = 50;
  const notes = [];

  const slots = (state.slots || []).filter(Boolean);
  if (slots.length > 0) {
    let gScore = 0;
    slots.forEach(slot => {
      const g = slot.genre || "";
      if (POP_HIT_SCORE.GENRE_TOP.includes(g))         gScore += 10;
      else if (POP_HIT_SCORE.GENRE_HIGH.includes(g))   gScore += 7;
      else if (POP_HIT_SCORE.GENRE_MID.includes(g))    gScore += 2;
      else if (POP_HIT_SCORE.GENRE_NICHE.includes(g))  gScore -= 10;
      else gScore += 1;
    });
    gScore = Math.max(-15, Math.min(22, gScore));
    score += gScore;
    if (gScore >= 15)       notes.push("Mainstream genre mix");
    else if (gScore >= 7)   notes.push("Commercial genre lean");
    else if (gScore <= -8)  notes.push("Niche genre for mass pop");
  } else {
    score -= 8;
    notes.push("No genre anchor selected");
  }

  const bpm = inferBPM(state);
  if (bpm >= 95 && bpm <= 130)       { score += 10; notes.push("BPM in pop sweet spot"); }
  else if (bpm >= 80 && bpm <= 140)  { score += 5; }
  else if (bpm < 70 || bpm > 170)    { score -= 8; notes.push("BPM outside mass appeal"); }

  if (lyricsOn) {
    score += 10;
    const langCode = state.language;
    if (POP_HIT_SCORE.LANG_HIGH.includes(langCode))     { score += 6; notes.push("Top streaming language"); }
    else if (POP_HIT_SCORE.LANG_MID.includes(langCode)) { score += 2; }
    else if (langCode && langCode !== "en")             { notes.push("Less commercial language"); }
    const vibe = state.lyricalVibe || "";
    if (POP_HIT_SCORE.VIBE_HIT.includes(vibe))          { score += 2; }
    else if (POP_HIT_SCORE.VIBE_LOW.includes(vibe))     { score -= 6; notes.push("Abstract lyric framing"); }
  } else {
    score -= 14;
    notes.push("Modern hits are vocal driven");
  }

  const mood = state.mood || "";
  if (POP_HIT_SCORE.MOOD_HIT.includes(mood))       { score += 8; notes.push("Chart friendly mood"); }
  else if (POP_HIT_SCORE.MOOD_OK.includes(mood))   { score += 2; }
  else if (POP_HIT_SCORE.MOOD_LOW.includes(mood))  { score -= 10; notes.push("Mood skews uncommercial"); }

  const groove = state.groove || "";
  const POP_GROOVE = ["4-on-the-floor","reggaeton","dembow","trap","afrobeats","amapiano","halftime"];
  if (POP_GROOVE.some(g => groove.toLowerCase().includes(g))) score += 4;

  const mix = (state.mix || "").toLowerCase();
  if (mix.includes("polished") || mix.includes("clean") || mix.includes("radio")) score += 3;
  if (mix.includes("lo-fi") || mix.includes("distressed") || mix.includes("raw")) score -= 3;

  score = Math.max(3, Math.min(99, Math.round(score)));

  let verdict;
  if (score >= 85)      verdict = "Very high hit potential";
  else if (score >= 70) verdict = "Strong commercial potential";
  else if (score >= 55) verdict = "Moderate chart chance";
  else if (score >= 40) verdict = "Niche / cult appeal";
  else if (score >= 25) verdict = "Low mainstream potential";
  else                  verdict = "Deliberately uncommercial";

  return { score, verdict, notes: notes.slice(0, 4) };
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────────────────────
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickMany(arr, n) { return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length)); }

function copyToClipboard(text) {
  return new Promise((resolve) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => resolve(true)).catch(() => resolve(fallbackCopy(text)));
    } else resolve(fallbackCopy(text));
  });
}
function fallbackCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// ════════════════════════════════════════════════════════════════════════════
// UI PRIMITIVES — Linear-inspired design system components
// ════════════════════════════════════════════════════════════════════════════

// Mono label — small uppercase tracking label (section headers, status)
function Label({ children, color = T.textTer, size = T.fs_xs, style }) {
  return (
    <span style={{
      fontFamily: T.font_mono, fontSize: size,
      letterSpacing: "0.08em", color, textTransform: "uppercase",
      fontWeight: 500, ...style,
    }}>{children}</span>
  );
}

// Button primitive — primary and secondary variants only
function Button({ children, variant = "secondary", size = "md", onClick, disabled, type = "button", style, title }) {
  const sizes = {
    sm: { padding: "6px 10px", fontSize: T.fs_sm, height: 28 },
    md: { padding: "8px 14px", fontSize: T.fs_md, height: 32 },
    lg: { padding: "10px 18px", fontSize: T.fs_base, height: 40 },
  };
  const variants = {
    primary: {
      background: T.text, color: T.bg,
      border: `1px solid ${T.text}`,
    },
    secondary: {
      background: T.elevated, color: T.text,
      border: `1px solid ${T.border}`,
    },
    ghost: {
      background: "transparent", color: T.textSec,
      border: "1px solid transparent",
    },
    danger: {
      background: "transparent", color: T.danger,
      border: `1px solid ${T.border}`,
    },
  };
  const [hover, setHover] = useState(false);
  const base = variants[variant];
  const hoverStyle = hover && !disabled ? (
    variant === "primary"   ? { background: "#FFFFFF" } :
    variant === "secondary" ? { background: T.hover, borderColor: T.borderHi } :
    variant === "ghost"     ? { background: T.hover, color: T.text } :
    variant === "danger"    ? { background: "rgba(239,68,68,0.08)", borderColor: T.danger } : {}
  ) : {};
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        ...sizes[size], ...base, ...hoverStyle,
        fontFamily: T.font_sans, fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        borderRadius: T.r_md, userSelect: "none",
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: `all ${T.dur_fast} ${T.ease}`,
        outline: "none",
        ...style,
      }}>{children}</button>
  );
}

// Chip — single select / multi-select option. Casino outline randomly applied during rolling.
// tierLocked: option exists in the catalog but is hidden behind a tier gate. Displayed
// with the label blurred and completely non-interactive — cannot be clicked, favorited,
// locked, or included in random rolls.
function Chip({ label, selected, onClick, onDoubleClick, onLockToggle, favorite, locked, disabled, size = "md", casinoOutline, tierLocked }) {
  const [hover, setHover] = useState(false);
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const inactive = disabled || tierLocked;
  const sizes = isMobile ? {
    sm: { padding: "9px 14px", fontSize: T.fs_md, minHeight: 40 },
    md: { padding: "11px 16px", fontSize: T.fs_md, minHeight: 44 },
  } : {
    sm: { padding: "4px 10px", fontSize: T.fs_sm, height: 24 },
    md: { padding: "6px 12px", fontSize: T.fs_md, height: 28 },
  };
  const borderColor = casinoOutline
    ? casinoOutline
    : locked
      ? V.neonGold
      : selected
        ? T.accentBorder
        : T.border;
  const base = {
    background: selected ? T.accentBg : (hover && !inactive ? T.hover : "transparent"),
    color: selected ? T.accentHi : (hover && !inactive ? T.text : T.textSec),
    border: `1px solid ${tierLocked ? T.border : borderColor}`,
    boxShadow: tierLocked
      ? "none"
      : casinoOutline
        ? `0 0 0 1px ${casinoOutline}, 0 0 12px ${casinoOutline}66`
        : locked
          ? `0 0 0 1px ${V.neonGold}, 0 0 10px ${V.neonGold}55`
          : "none",
  };
  return (
    <span
      onClick={inactive ? undefined : onClick}
      onDoubleClick={inactive ? undefined : onDoubleClick}
      onContextMenu={inactive ? undefined : (e) => {
        if (onLockToggle) { e.preventDefault(); onLockToggle(); }
      }}
      onMouseEnter={() => !inactive && setHover(true)} onMouseLeave={() => setHover(false)}
      title={tierLocked
        ? "Upgrade tier to unlock this option"
        : onLockToggle
          ? "Click: select · Double-click: favorite · Right-click: lock"
          : undefined}
      style={{
        ...sizes[size], ...base,
        fontFamily: T.font_sans,
        fontWeight: 450,
        cursor: inactive ? "not-allowed" : "pointer",
        borderRadius: T.r_md, userSelect: "none",
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: `background ${T.dur_fast} ${T.ease}, color ${T.dur_fast} ${T.ease}, border-color ${T.dur_fast} ${T.ease}, box-shadow ${T.dur_fast} ${T.ease}`,
        opacity: tierLocked ? 0.7 : disabled ? 0.35 : 1,
        position: "relative", overflow: "hidden",
        pointerEvents: tierLocked ? "none" : "auto",
      }}
      aria-label={tierLocked ? "Locked option — upgrade tier to unlock" : undefined}>
      {/* Diagonal-stripe overlay for locked state — visually distinct from loading */}
      {tierLocked && (
        <span aria-hidden="true" style={{
          position: "absolute", inset: 0,
          backgroundImage: `repeating-linear-gradient(135deg,
            rgba(148,158,182,0.06) 0 4px,
            transparent 4px 8px)`,
          pointerEvents: "none",
        }} />
      )}
      {locked && !tierLocked && (
        <span style={{
          color: V.neonGold, fontSize: T.fs_xs, lineHeight: 1,
          textShadow: `0 0 6px ${V.neonGold}`,
        }}>🔒</span>
      )}
      {favorite && !locked && !tierLocked && (
        <span style={{ color: T.warning, fontSize: T.fs_xs, lineHeight: 1 }}>●</span>
      )}
      {tierLocked && (
        <span aria-hidden="true" style={{
          color: T.accentHi, fontSize: T.fs_xs, lineHeight: 1,
          fontFamily: T.font_mono, fontWeight: 700, letterSpacing: "0.08em",
          padding: "1px 4px", borderRadius: 2,
          background: `${T.accent}22`,
          border: `1px solid ${T.accent}55`,
          textShadow: `0 0 4px ${T.accent}66`,
          position: "relative", zIndex: 1,
          flexShrink: 0,
        }}>🔒 PRO</span>
      )}
      <span
        aria-hidden={tierLocked ? "true" : undefined}
        style={{
          filter: tierLocked ? "blur(5px)" : "none",
          transition: "filter 180ms ease-out",
          userSelect: tierLocked ? "none" : "auto",
          position: "relative", zIndex: 1,
        }}>
        {label}
      </span>
    </span>
  );
}

// TriToggle — Off / Auto / On. Linear-style segmented control.
function TriToggle({ value, onChange }) {
  const { features } = useTier();
  const onAllowed = features ? features.hasOnToggle !== false : true;
  const states = [
    { id: "off",  label: "Off",  locked: false },
    { id: "auto", label: "Auto", locked: false },
    { id: "on",   label: "On",   locked: !onAllowed },
  ];
  // If current value is "on" but tier blocks it, fall back to auto
  useEffect(() => {
    if (!onAllowed && value === "on") onChange("auto");
  }, [onAllowed, value]);

  const activeIdx = states.findIndex(s => s.id === value);
  return (
    <div style={{
      display: "inline-flex", position: "relative",
      background: T.bg, border: `1px solid ${T.border}`,
      borderRadius: T.r_md, padding: 2, height: 26,
    }}>
      <div style={{
        position: "absolute",
        top: 2, bottom: 2,
        left: `calc(${activeIdx * 33.333}% + 2px)`,
        width: "calc(33.333% - 4px)",
        background: value === "on" ? T.accent : T.elevated,
        borderRadius: T.r_sm,
        transition: `all ${T.dur_norm} ${T.ease}`,
      }} />
      {states.map(s => {
        const active = s.id === value;
        return (
          <button key={s.id} type="button"
            onClick={() => !s.locked && onChange(s.id)}
            disabled={s.locked}
            title={s.locked ? "Upgrade to Pro to use the On state" : undefined}
            style={{
              position: "relative", zIndex: 1,
              background: "transparent", border: "none",
              color: s.locked
                ? T.textMuted
                : active ? (s.id === "on" ? "#FFFFFF" : T.text) : T.textTer,
              padding: "0 12px", fontSize: T.fs_xs, minWidth: 46,
              fontFamily: T.font_sans, fontWeight: 500,
              cursor: s.locked ? "not-allowed" : "pointer",
              transition: `color ${T.dur_fast} ${T.ease}`,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3,
            }}>
            {s.label}
            {s.locked && <span style={{ fontSize: 8, opacity: 0.6 }}>🔒</span>}
          </button>
        );
      })}
    </div>
  );
}

// Section — wraps a group of options. Single consistent shell.
function Section({ title, children, hint, toggle, onToggleChange, extra }) {
  const disabled = toggle === "off";
  return (
    <div style={{ paddingTop: T.s6, paddingBottom: T.s2 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: T.s4, marginBottom: T.s4, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: T.s3 }}>
          <Label color={disabled ? T.textMuted : T.textSec} size={T.fs_sm}>{title}</Label>
          {hint && <span style={{ fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_sans }}>{hint}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: T.s3 }}>
          {extra}
          {toggle !== undefined && onToggleChange && (
            <TriToggle value={toggle} onChange={onToggleChange} />
          )}
        </div>
      </div>
      <div style={{
        opacity: disabled ? 0.35 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: `opacity ${T.dur_norm} ${T.ease}`,
      }}>{children}</div>
    </div>
  );
}

// ErrorBoundary — isolate any failing widget from bringing down the rest
class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch() {}
  render() {
    if (this.state.err) {
      return (
        <div style={{
          padding: `${T.s3}px ${T.s4}px`, margin: `${T.s3}px 0`,
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r_md,
          color: T.textSec, fontSize: T.fs_sm, fontFamily: T.font_sans,
        }}>Component isolated. <button onClick={() => this.setState({ err: null })} style={{
          background: "none", border: "none", color: T.accent, cursor: "pointer",
          fontFamily: T.font_sans, fontSize: T.fs_sm, textDecoration: "underline",
        }}>Retry</button></div>
      );
    }
    return this.props.children;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LOGO — Steady, no animation on HIT. Star pattern interior. ENGINE sweeps.
// ════════════════════════════════════════════════════════════════════════════

function HitLogo({ size = 96 }) {
  // Rich starfield: two layers (bright nearby stars + dim distant stars)
  const stars = useMemo(() => {
    const bright = 60;
    const dim = 120;
    let seed = 1337;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const layer1 = Array.from({ length: bright }, () => ({
      x: rand() * 260, y: rand() * 110,
      r: 0.7 + rand() * 1.6, o: 0.7 + rand() * 0.3,
      twinkle: rand() * 2,
    }));
    const layer2 = Array.from({ length: dim }, () => ({
      x: rand() * 260, y: rand() * 110,
      r: 0.3 + rand() * 0.5, o: 0.3 + rand() * 0.3,
      twinkle: rand() * 2,
    }));
    return { layer1, layer2 };
  }, []);

  const fontSize = size;
  const svgW = size * 2.6;
  const svgH = size * 1.15;
  const clipId = useMemo(() => `hit-clip-${Math.random().toString(36).slice(2, 9)}`, []);
  const nebulaId = useMemo(() => `hit-neb-${Math.random().toString(36).slice(2, 9)}`, []);
  const chromeId = useMemo(() => `hit-chrome-${Math.random().toString(36).slice(2, 9)}`, []);

  return (
    <span style={{
      display: "inline-block", verticalAlign: "baseline",
      lineHeight: 1, fontFamily: T.font_display,
    }}>
      <style>{`
        @keyframes hitTwinkle {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.3; }
        }
      `}</style>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: "block", overflow: "visible" }}>
        <defs>
          {/* Clip path from letter shapes */}
          <clipPath id={clipId}>
            <text
              x="0" y={svgH * 0.82}
              fontFamily={T.font_display}
              fontSize={fontSize}
              fontWeight={400}
              letterSpacing="-0.02em"
            >HIT</text>
          </clipPath>
          {/* Nebula gradient — deep purple → black core with blue tint */}
          <radialGradient id={nebulaId} cx="50%" cy="40%" r="70%">
            <stop offset="0%"  stopColor="#1a0f3e" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#0a0524" stopOpacity="1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </radialGradient>
          {/* Chrome stroke gradient — bright silver top, darker steel bottom */}
          <linearGradient id={chromeId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="25%"  stopColor="#D8DFE8" />
            <stop offset="55%"  stopColor="#8A95A5" />
            <stop offset="100%" stopColor="#3D4552" />
          </linearGradient>
        </defs>

        {/* Layer 1: nebula fill inside letters */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={svgW} height={svgH} fill={`url(#${nebulaId})`} />
          {/* Dim background stars */}
          {stars.layer2.map((s, i) => (
            <circle key={`d-${i}`} cx={s.x} cy={s.y} r={s.r}
              fill="#9EB8FF" opacity={s.o}
              style={{
                animation: `hitTwinkle ${3 + s.twinkle * 2}s ease-in-out infinite`,
                animationDelay: `${s.twinkle}s`,
              }} />
          ))}
          {/* Bright foreground stars */}
          {stars.layer1.map((s, i) => (
            <g key={`b-${i}`}>
              <circle cx={s.x} cy={s.y} r={s.r * 2} fill="#FFFFFF" opacity={s.o * 0.2} />
              <circle cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.o}
                style={{
                  animation: `hitTwinkle ${2 + s.twinkle * 1.5}s ease-in-out infinite`,
                  animationDelay: `${s.twinkle * 0.7}s`,
                }} />
            </g>
          ))}
        </g>

        {/* Layer 2: chrome stroke on letters — no fill, just the beveled edge */}
        <text
          x="0" y={svgH * 0.82}
          fontFamily={T.font_display}
          fontSize={fontSize}
          fontWeight={400}
          letterSpacing="-0.02em"
          fill="none"
          stroke={`url(#${chromeId})`}
          strokeWidth="2.5"
          paintOrder="stroke"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
          }}
        >HIT</text>
        {/* Thin inner highlight stroke */}
        <text
          x="0" y={svgH * 0.82}
          fontFamily={T.font_display}
          fontSize={fontSize}
          fontWeight={400}
          letterSpacing="-0.02em"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="0.5"
        >HIT</text>
      </svg>
    </span>
  );
}

function EngineLogo({ size = 96 }) {
  const id = useMemo(() => `eng-${Math.random().toString(36).slice(2, 9)}`, []);
  return (
    <>
      <style>{`
        @keyframes engineHalo-${id} {
          0%   { color: #1E40AF; }
          33%  { color: #D946EF; }
          66%  { color: #FB923C; }
          100% { color: #1E40AF; }
        }
        @keyframes engineChromeSweep-${id} {
          0%   { background-position: 0% 50%; }
          100% { background-position: 0% 150%; }
        }
        .engine-chrome-wrap-${id} {
          position: relative;
          display: inline-block;
          font-family: ${T.font_display};
          font-style: italic;
          font-weight: 400;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .engine-chrome-halo-${id} {
          position: absolute;
          inset: 0;
          color: #1E40AF;
          animation: engineHalo-${id} 7s linear infinite;
          filter: blur(16px);
          opacity: 0.85;
          z-index: 0;
          pointer-events: none;
        }
        .engine-chrome-fill-${id} {
          position: relative;
          z-index: 1;
          background-image: linear-gradient(180deg,
            #FFFFFF 0%, #E5EAF3 18%, #B4BFCE 38%,
            #6A7385 52%, #B4BFCE 68%, #E5EAF3 88%, #FFFFFF 100%);
          background-size: 100% 220%;
          background-position: 0% 50%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: engineChromeSweep-${id} 5s ease-in-out infinite alternate;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.9));
        }
      `}</style>
      <span className={`engine-chrome-wrap-${id}`} style={{ fontSize: size }}>
        <span className={`engine-chrome-halo-${id}`} aria-hidden="true">ENGINE</span>
        <span className={`engine-chrome-fill-${id}`}>ENGINE</span>
      </span>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════════════════════════════════

function Nav({ page, onNavigate }) {
  const { tier, setTier, features, devModeActive, toggleDevMode } = useTier();
  const { refillForTier } = useFuel();
  const { layout } = useLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = layout === "mobile";

  // Wrap DEV MODE toggle to also refill fuel when turning admin ON
  // (so the admin "unlimited fuel" state is reflected immediately).
  const handleDevToggle = () => {
    const wasActive = devModeActive;
    toggleDevMode();
    if (!wasActive) {
      // Was off, now turning ON — grant admin fuel
      refillForTier("admin");
    }
  };
  const links = [
    { id: "engine",  label: "Engine" },
    { id: "history", label: "Genre History" },
    { id: "future",  label: "Future of Sound" },
    { id: "shop",    label: "Shop ★" },
    ...(features.vipSecretsPage ? [{ id: "secrets", label: "The Playbook" }] : []),
  ];

  return (
    <nav style={{
      padding: isMobile ? `${T.s2}px ${T.s4}px` : `${T.s3}px ${T.s6}px`,
      borderBottom: `1px solid ${T.border}`,
      background: "rgba(8,9,11,0.88)",
      backdropFilter: "blur(20px) saturate(150%)",
      position: "sticky", top: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: isMobile ? 52 : 56, gap: isMobile ? T.s2 : T.s4,
    }}>
      {/* Mini chrome HIT-ENGINE logo */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, cursor: "pointer", flexShrink: 0 }}
        onClick={() => { onNavigate("engine"); setMenuOpen(false); }}>
        <HitLogo size={isMobile ? 18 : 22} />
        <span style={{ color: T.textMuted, fontSize: isMobile ? 14 : 18, fontStyle: "italic", fontFamily: T.font_display }}>·</span>
        <EngineLogo size={isMobile ? 18 : 22} />
      </div>

      {/* Page links — desktop inline, mobile hamburger */}
      {!isMobile ? (
        <div style={{ display: "flex", gap: T.s1, flex: 1, justifyContent: "center" }}>
          {links.map(l => (
            <button key={l.id} type="button" onClick={() => onNavigate(l.id)}
              style={{
                background: page === l.id ? T.elevated : "transparent",
                border: "none",
                color: page === l.id ? T.text : T.textSec,
                padding: `${T.s2}px ${T.s3}px`, cursor: "pointer",
                fontSize: T.fs_md, fontFamily: T.font_sans, fontWeight: 500,
                borderRadius: T.r_md,
                transition: `all ${T.dur_fast} ${T.ease}`,
              }}
              onMouseEnter={e => { if (page !== l.id) e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { if (page !== l.id) e.currentTarget.style.color = T.textSec; }}
            >{l.label}</button>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Right side — DEV toggle, layout, gear-shift, tier on desktop; hamburger on mobile */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {/* DEV MODE toggle — desktop shows label, mobile shows icon only */}
        {/* TODO: REMOVE BEFORE PUBLIC LAUNCH */}
        <button type="button"
          onClick={handleDevToggle}
          title={devModeActive ? "DEV MODE ACTIVE — click to disable" : "Enable DEV MODE (grants admin tier)"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: isMobile ? "6px 8px" : "5px 10px",
            height: isMobile ? 34 : 32,
            minWidth: isMobile ? 34 : "auto",
            justifyContent: "center",
            background: devModeActive
              ? "linear-gradient(180deg, rgba(255,23,68,0.22) 0%, rgba(255,23,68,0.10) 100%)"
              : "linear-gradient(180deg, rgba(255,23,68,0.06) 0%, rgba(255,23,68,0.02) 100%)",
            border: `1px ${devModeActive ? "solid" : "dashed"} ${devModeActive ? "#FF1744" : "#FF174477"}`,
            borderRadius: 6,
            color: "#FF5577",
            cursor: "pointer",
            transition: "all 180ms ease-out",
            boxShadow: devModeActive
              ? "0 0 12px rgba(255,23,68,0.45), inset 0 1px 0 rgba(255,100,120,0.3)"
              : "none",
            animation: devModeActive ? "devModePulse 2.2s ease-in-out infinite" : "none",
          }}>
          <style>{`
            @keyframes devModePulse {
              0%, 100% { box-shadow: 0 0 12px rgba(255,23,68,0.45), inset 0 1px 0 rgba(255,100,120,0.3); }
              50%      { box-shadow: 0 0 20px rgba(255,23,68,0.7),  inset 0 1px 0 rgba(255,100,120,0.5); }
            }
          `}</style>
          <span style={{ fontSize: isMobile ? 13 : 10, lineHeight: 1 }}>⚡</span>
          {!isMobile && (
            <span style={{
              fontFamily: T.font_mono, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.18em", textShadow: "0 0 4px rgba(255,23,68,0.6)",
            }}>DEV</span>
          )}
        </button>
        {!isMobile && <LayoutToggle />}
        {!isMobile && (
          <>
            <FuelLever currentPage={page} onNavigate={onNavigate} />
            <TierLever tier={tier} onChange={setTier} onOpenShop={() => onNavigate("shop")} />
          </>
        )}
        {isMobile && (
          <TierLever tier={tier} onChange={setTier} onOpenShop={() => onNavigate("shop")} />
        )}
        {isMobile && (
          <button type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: menuOpen ? T.elevated : T.surface,
              border: `1px solid ${menuOpen ? T.borderFocus : T.border}`,
              color: T.text,
              width: 44, height: 34,
              borderRadius: 6, cursor: "pointer",
              display: "grid", placeItems: "center",
              fontSize: 18, lineHeight: 1,
            }}>{menuOpen ? "×" : "≡"}</button>
        )}
      </div>

      {/* Mobile menu overlay — nav links + fuel lever + layout toggle */}
      {isMobile && menuOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "rgba(8,9,11,0.98)",
          borderBottom: `1px solid ${T.border}`,
          backdropFilter: "blur(20px) saturate(150%)",
          padding: T.s3,
          display: "flex", flexDirection: "column", gap: 2,
          zIndex: 99,
          maxHeight: "calc(100vh - 52px)",
          overflowY: "auto",
        }}>
          {/* Nav links */}
          {links.map(l => (
            <button key={l.id} type="button"
              onClick={() => { onNavigate(l.id); setMenuOpen(false); }}
              style={{
                background: page === l.id ? T.elevated : "transparent",
                border: "none",
                color: page === l.id ? T.text : T.textSec,
                padding: "14px 18px",
                minHeight: 48, // thumb target
                cursor: "pointer",
                fontSize: 15, fontFamily: T.font_sans, fontWeight: 500,
                borderRadius: 8,
                textAlign: "left",
              }}>{l.label}</button>
          ))}

          {/* Separator */}
          <div style={{ height: 1, background: T.border, margin: `${T.s2}px 0` }} />

          {/* Fuel selector — in mobile menu since nav is too tight */}
          <div style={{ padding: "8px 12px" }}>
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              letterSpacing: "0.2em", color: T.textMuted, marginBottom: 8,
            }}>FUEL SELECTOR</div>
            <FuelLever currentPage={page} onNavigate={(p) => { onNavigate(p); setMenuOpen(false); }} />
          </div>

          {/* Layout toggle — in mobile menu */}
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              letterSpacing: "0.2em", color: T.textMuted,
            }}>VIEW AS</span>
            <LayoutToggle />
          </div>
        </div>
      )}
    </nav>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODE SELECTOR — 5 segmented tabs, Linear-style
// ════════════════════════════════════════════════════════════════════════════

function ModeSelector({ value, onChange, allowedModes }) {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const activeIdx = MODES.findIndex(m => m.id === value);
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: T.s3, gap: T.s2,
      }}>
        <Label color={T.textSec}>Prompt depth</Label>
        {!isMobile && (
          <span style={{ fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_sans, textAlign: "right" }}>
            {getModeById(value).sub}
          </span>
        )}
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r_md,
        padding: 2, position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: 2, bottom: 2,
          left: `calc(${activeIdx * 20}% + 2px)`,
          width: "calc(20% - 4px)",
          background: T.elevated,
          border: `1px solid ${T.borderHi}`,
          borderRadius: T.r_sm,
          transition: `all ${T.dur_norm} ${T.ease}`,
        }} />
        {MODES.map(m => {
          const active = value === m.id;
          const locked = allowedModes && !allowedModes.includes(m.id);
          return (
            <button key={m.id} type="button"
              onClick={() => !locked && onChange(m.id)}
              disabled={locked}
              title={locked ? "Pro tier unlocks all modes" : ""}
              style={{
                position: "relative", zIndex: 1,
                background: "transparent", border: "none",
                color: locked ? T.textMuted : active ? T.text : T.textTer,
                padding: isMobile ? `${T.s2}px 2px` : `${T.s3}px ${T.s2}px`,
                minHeight: isMobile ? 40 : "auto",
                cursor: locked ? "not-allowed" : "pointer",
                fontFamily: T.font_sans, fontSize: isMobile ? 12 : T.fs_sm, fontWeight: 500,
                transition: `color ${T.dur_fast} ${T.ease}`,
                textAlign: "center",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
              {m.label}
              {locked && <span style={{ fontSize: 9, opacity: 0.6 }}>🔒</span>}
            </button>
          );
        })}
      </div>
      {isMobile && (
        <div style={{
          fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_sans,
          marginTop: T.s2, textAlign: "center",
        }}>
          {getModeById(value).sub}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LYRICAL SWITCH — Instrumental / Song segmented
// ════════════════════════════════════════════════════════════════════════════

function LyricalSwitch({ value, onChange }) {
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: T.s3,
      }}>
        <Label color={T.textSec}>Type</Label>
        <span style={{ fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_sans }}>
          {value ? "vocal descriptors active" : "no vocals, wordless arrangement"}
        </span>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r_md,
        padding: 2, position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: 2, bottom: 2,
          left: value ? "50%" : 2,
          width: "calc(50% - 2px)",
          background: T.elevated, border: `1px solid ${T.borderHi}`,
          borderRadius: T.r_sm,
          transition: `all ${T.dur_norm} ${T.ease}`,
        }} />
        <button type="button" onClick={() => onChange(false)}
          style={{
            position: "relative", zIndex: 1,
            background: "transparent", border: "none",
            color: !value ? T.text : T.textTer,
            padding: `${T.s3}px ${T.s4}px`,
            cursor: "pointer",
            fontFamily: T.font_sans, fontSize: T.fs_md, fontWeight: 500,
            transition: `color ${T.dur_fast} ${T.ease}`,
          }}>Instrumental</button>
        <button type="button" onClick={() => onChange(true)}
          style={{
            position: "relative", zIndex: 1,
            background: "transparent", border: "none",
            color: value ? T.text : T.textTer,
            padding: `${T.s3}px ${T.s4}px`,
            cursor: "pointer",
            fontFamily: T.font_sans, fontSize: T.fs_md, fontWeight: 500,
            transition: `color ${T.dur_fast} ${T.ease}`,
          }}>Song with vocals</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COUNT STEPPER — 1-10
// ════════════════════════════════════════════════════════════════════════════

function CountStepper({ value, onChange, min = 1, max = 10 }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center",
      border: `1px solid ${T.border}`,
      background: T.surface, borderRadius: T.r_md, height: 26,
    }}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          background: "transparent", border: "none", color: T.textSec,
          padding: "0 10px", cursor: "pointer", fontSize: T.fs_base,
          fontFamily: T.font_sans,
        }}>−</button>
      <span style={{
        padding: "0 10px", minWidth: 32, textAlign: "center",
        color: T.text, fontSize: T.fs_sm, fontWeight: 500,
        fontFamily: T.font_mono,
        borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`,
        height: "100%", display: "grid", placeItems: "center",
      }}>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          background: "transparent", border: "none", color: T.textSec,
          padding: "0 10px", cursor: "pointer", fontSize: T.fs_base,
          fontFamily: T.font_sans,
        }}>+</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HIT BUTTON — Vegas slot machine pull-lever with marquee lights + LEDs
// ════════════════════════════════════════════════════════════════════════════

function HitButton({ onRandomize, isRolling, disabled, compact = false, fuelType = "pro" }) {
  const [hover, setHover] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [burstKey, setBurstKey] = useState(0); // remount burst on each press
  const ledCount = compact ? 10 : 16;
  const btnPad = compact ? "22px 16px" : "34px 20px";
  const btnFontSize = compact ? 52 : 72;
  const fuelColor = FUEL_TYPES[fuelType]?.color || V.red;

  const handleClick = () => {
    if (disabled || isRolling) return;
    setBurstKey(k => k + 1);
    onRandomize();
  };

  const MARQUEE_COLORS = [V.hotPink, V.neonGold, V.cyan, V.orange, V.lime, V.magenta, V.red, V.purple];

  return (
    <>
      <style>{`
        /* Conic gradient halo rotating around the entire button */
        @keyframes hitHaloRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        /* Idle breathing — subtle alive state */
        @keyframes hitBreathe {
          0%,100% { transform: scale(1);    filter: brightness(1); }
          50%     { transform: scale(1.015); filter: brightness(1.08); }
        }
        /* Dopamine glow pulse */
        @keyframes hitGlowPulse {
          0%,100% { box-shadow:
            0 0 30px ${V.red},
            0 0 60px ${V.hotPink}aa,
            0 0 100px ${V.hotPink}55,
            inset 0 6px 0 rgba(255,255,255,0.35),
            inset 0 -10px 20px rgba(0,0,0,0.6); }
          50%     { box-shadow:
            0 0 50px ${V.red},
            0 0 90px ${V.hotPink}cc,
            0 0 140px ${V.neonGold}55,
            inset 0 6px 0 rgba(255,255,255,0.45),
            inset 0 -10px 20px rgba(0,0,0,0.6); }
        }
        /* Press ring burst — expanding circle that fades */
        @keyframes hitRingBurst {
          0%   { transform: scale(0.5); opacity: 0.9; border-width: 4px; }
          100% { transform: scale(2.4); opacity: 0;   border-width: 1px; }
        }
        /* Particle burst */
        @keyframes hitParticle {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: var(--tr) scale(0.3);    opacity: 0; }
        }
        /* Rolling strobe */
        @keyframes hitStrobe {
          0%,100% { filter: brightness(1.1) saturate(1.2); }
          50%     { filter: brightness(2.2) saturate(1.6); }
        }
        /* Text shimmer */
        @keyframes hitTextShimmer {
          0%,100% { text-shadow:
            0 0 18px rgba(255,255,255,0.9),
            0 0 36px ${V.hotPink},
            0 0 72px ${V.neonGold},
            2px 2px 0 rgba(0,0,0,0.8); }
          50%     { text-shadow:
            0 0 24px rgba(255,255,255,1),
            0 0 48px ${V.neonGold},
            0 0 96px ${V.hotPink},
            2px 2px 0 rgba(0,0,0,0.8); }
        }
        /* Marquee LED flicker */
        @keyframes hitLed {
          0%,49%   { opacity: 1; box-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
          50%,100% { opacity: 0.2; box-shadow: 0 0 3px currentColor; }
        }
        /* Chrome ring rotation */
        @keyframes hitRingRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }

        .hit-wrapper {
          position: relative;
          animation: hitBreathe 3.2s ease-in-out infinite;
          transition: transform 120ms cubic-bezier(.5,1.5,.5,1);
        }
        .hit-wrapper:hover { animation-duration: 1.4s; }
        .hit-core {
          transition: transform 80ms cubic-bezier(.3,1.5,.4,1), box-shadow 180ms ease-out;
        }
        .hit-core:hover:not(:disabled) { transform: translateY(-3px) scale(1.02); }
        .hit-core:active:not(:disabled) { transform: translateY(4px) scale(0.97); }
      `}</style>

      <div className="hit-wrapper" style={{ position: "relative" }}>
        {/* ── EXCLAMATION BADGE — top-right notification dot ──────────── */}
        <div style={{
          position: "absolute",
          top: -14, right: -14,
          width: 36, height: 36,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${V.neonGold} 0%, ${V.orange} 70%, ${V.darkRed} 100%)`,
          border: `2px solid ${V.neonGold}`,
          boxShadow: `0 0 12px ${V.neonGold}, 0 0 24px ${V.orange}88, inset 0 2px 4px rgba(255,255,255,0.4)`,
          display: "grid", placeItems: "center",
          fontSize: 20, fontWeight: 900, fontFamily: T.font_display,
          fontStyle: "italic",
          color: "#4A0000",
          textShadow: "0 1px 1px rgba(255,255,255,0.4)",
          zIndex: 10,
          animation: "hitGlowPulse 1.8s ease-in-out infinite",
          pointerEvents: "none",
        }}>!</div>

        {/* ── FUEL-COLOR CORONA — outer ring tinted by active fuel ────── */}
        <div style={{
          position: "absolute",
          inset: -22,
          borderRadius: 26,
          background: `radial-gradient(ellipse at center, ${fuelColor}44 0%, ${fuelColor}00 70%)`,
          filter: "blur(8px)",
          pointerEvents: "none",
          zIndex: -1,
          opacity: isRolling ? 1 : hover ? 0.8 : 0.55,
          transition: "opacity 180ms ease-out",
        }} />

        {/* ── OUTER CONIC HALO ─────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          inset: -18,
          borderRadius: 24,
          background: `conic-gradient(from 0deg,
            ${V.hotPink} 0%, ${V.neonGold} 14%, ${V.cyan} 28%,
            ${V.lime} 42%, ${V.orange} 56%, ${V.magenta} 70%,
            ${V.red} 84%, ${V.hotPink} 100%)`,
          filter: `blur(14px)`,
          opacity: isRolling ? 0.95 : hover ? 0.75 : 0.42,
          animation: `hitHaloRotate ${isRolling ? "1.2s" : "7s"} linear infinite`,
          pointerEvents: "none",
          transition: "opacity 180ms ease-out",
          zIndex: 0,
        }} />

        {/* ── FRAME WITH MARQUEE LIGHTS ────────────────────────────── */}
        <div style={{
          position: "relative", zIndex: 1,
          padding: 5,
          background: `linear-gradient(180deg, #120010 0%, #05000a 100%)`,
          backgroundImage: `
            linear-gradient(180deg, #120010 0%, #05000a 100%),
            conic-gradient(from 0deg,
              ${V.hotPink}, ${V.neonGold}, ${V.cyan}, ${V.lime},
              ${V.orange}, ${V.magenta}, ${V.red}, ${V.hotPink})`,
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          border: "3px solid transparent",
          borderRadius: 18,
          boxShadow: `0 20px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.8)`,
          overflow: "hidden",
        }}>
          {/* Top marquee */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px 4px", gap: 6,
          }}>
            {Array.from({ length: ledCount }).map((_, i) => {
              const color = MARQUEE_COLORS[i % MARQUEE_COLORS.length];
              return (
                <span key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: color, color,
                  animation: `hitLed ${isRolling ? 0.1 + (i % 4) * 0.02 : 0.45 + (i % 4) * 0.08}s ease-in-out infinite`,
                  animationDelay: `${i * (isRolling ? 0.012 : 0.05)}s`,
                  flex: "0 0 auto",
                }} />
              );
            })}
          </div>

          {/* Status readout */}
          <div style={{
            margin: "0 14px 10px",
            padding: "7px 12px",
            background: "rgba(0,0,0,0.75)",
            border: `1px solid ${V.neonGold}66`,
            borderRadius: 4,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontFamily: T.font_mono, fontSize: 10, letterSpacing: "0.25em", fontWeight: 700,
          }}>
            <span style={{ color: V.neonGold, textShadow: `0 0 8px ${V.neonGold}` }}>
              ★ JACKPOT
            </span>
            <span style={{
              color: isRolling ? V.orange : V.lime,
              textShadow: `0 0 8px currentColor`,
              animation: isRolling ? "hitStrobe 0.18s linear infinite" : "none",
            }}>
              {isRolling ? "◉ SPINNING" : "● READY"}
            </span>
          </div>

          {/* ── THE BUTTON ITSELF ─────────────────────────────────────── */}
          <div style={{ padding: "0 14px 14px", position: "relative" }}>
            {/* Expanding ring burst — one per press */}
            <div key={burstKey} style={{
              position: "absolute", top: "50%", left: "50%",
              width: 200, height: 200,
              marginTop: -100, marginLeft: -100,
              border: `4px solid ${V.neonGold}`,
              borderRadius: "50%",
              pointerEvents: "none",
              animation: burstKey > 0 ? "hitRingBurst 0.8s ease-out forwards" : "none",
              opacity: 0,
              zIndex: 3,
            }} />
            <div key={`r2-${burstKey}`} style={{
              position: "absolute", top: "50%", left: "50%",
              width: 200, height: 200,
              marginTop: -100, marginLeft: -100,
              border: `3px solid ${V.hotPink}`,
              borderRadius: "50%",
              pointerEvents: "none",
              animation: burstKey > 0 ? "hitRingBurst 1.0s ease-out 0.12s forwards" : "none",
              opacity: 0,
              zIndex: 3,
            }} />

            {/* Particle burst — 12 sparks flying outward on press */}
            {burstKey > 0 && (
              <div key={`particles-${burstKey}`} style={{
                position: "absolute", top: "50%", left: "50%",
                pointerEvents: "none", zIndex: 4,
              }}>
                {Array.from({ length: 14 }).map((_, i) => {
                  const angle = (i / 14) * Math.PI * 2;
                  const dist = 80 + Math.random() * 60;
                  const dx = Math.cos(angle) * dist;
                  const dy = Math.sin(angle) * dist;
                  const color = MARQUEE_COLORS[i % MARQUEE_COLORS.length];
                  return (
                    <span key={i} style={{
                      position: "absolute",
                      width: 6, height: 6, borderRadius: "50%",
                      background: color, color,
                      left: 0, top: 0,
                      boxShadow: `0 0 10px currentColor, 0 0 20px currentColor`,
                      "--tr": `translate(${dx}px, ${dy}px)`,
                      animation: "hitParticle 0.9s cubic-bezier(.2,.8,.3,1) forwards",
                    }} />
                  );
                })}
              </div>
            )}

            <button type="button"
              className="hit-core"
              onClick={handleClick}
              disabled={disabled || isRolling}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => { setHover(false); setPressing(false); }}
              onMouseDown={() => setPressing(true)}
              onMouseUp={() => setPressing(false)}
              style={{
                width: "100%",
                padding: btnPad,
                background: isRolling
                  ? `radial-gradient(circle at 50% 30%, #FF7070 0%, ${V.red} 45%, #5a0000 100%)`
                  : `radial-gradient(circle at 50% 25%, #FF4848 0%, ${V.red} 45%, #6a0000 100%)`,
                border: `4px solid ${V.neonGold}`,
                color: "#FFFFFF",
                fontSize: btnFontSize,
                fontWeight: 900,
                letterSpacing: "0.15em",
                fontFamily: T.font_display,
                cursor: disabled ? "not-allowed" : isRolling ? "wait" : "pointer",
                borderRadius: 12,
                position: "relative",
                overflow: "hidden",
                opacity: disabled ? 0.5 : 1,
                animation: isRolling
                  ? "hitStrobe 0.13s linear infinite"
                  : "hitGlowPulse 2.4s ease-in-out infinite",
              }}>
              {/* Spinning chrome ring behind text */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: 180, height: 180,
                marginTop: -90, marginLeft: -90,
                borderRadius: "50%",
                border: `2px dashed rgba(255,215,0,0.35)`,
                animation: `hitRingRotate ${isRolling ? "2s" : "12s"} linear infinite`,
                pointerEvents: "none",
              }} />
              {/* Secondary inner ring */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: 130, height: 130,
                marginTop: -65, marginLeft: -65,
                borderRadius: "50%",
                border: `1px solid rgba(255,255,255,0.25)`,
                animation: `hitHaloRotate ${isRolling ? "1.2s" : "18s"} linear infinite`,
                pointerEvents: "none",
              }} />
              {/* Top gloss */}
              <span style={{
                position: "absolute", top: 0, left: "6%", right: "6%", height: "45%",
                background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
                pointerEvents: "none",
                borderRadius: "0 0 50% 50% / 0 0 100% 100%",
              }} />
              {/* Inner scanlines for texture */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `repeating-linear-gradient(0deg,
                  rgba(0,0,0,0.08) 0 2px,
                  transparent 2px 4px)`,
                pointerEvents: "none",
                mixBlendMode: "multiply",
                opacity: 0.4,
              }} />
              {/* Hot spot */}
              <div style={{
                position: "absolute", top: "15%", left: "50%",
                width: 80, height: 40,
                marginLeft: -40,
                background: "radial-gradient(ellipse, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)",
                pointerEvents: "none",
                filter: "blur(4px)",
              }} />
              {/* HIT LABEL */}
              <span style={{
                position: "relative", zIndex: 1,
                display: "inline-block",
                animation: isRolling ? "none" : "hitTextShimmer 1.8s ease-in-out infinite",
                fontStyle: "italic",
              }}>
                {isRolling ? "◉" : "HIT"}
              </span>
            </button>

            {/* Subtitle under button */}
            <div style={{
              marginTop: 8,
              display: "flex", justifyContent: "center", alignItems: "center", gap: 6,
              fontFamily: T.font_mono, fontSize: 9, letterSpacing: "0.3em",
              color: V.neonGold, textShadow: `0 0 6px ${V.neonGold}88`,
              fontWeight: 700,
            }}>
              <span style={{ opacity: 0.6 }}>▸</span>
              PRESS TO ROLL
              <span style={{ opacity: 0.6 }}>◂</span>
            </div>
          </div>

          {/* Bottom marquee */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "4px 14px 10px", gap: 6,
          }}>
            {Array.from({ length: ledCount }).map((_, i) => {
              const color = MARQUEE_COLORS[(i + 3) % MARQUEE_COLORS.length];
              return (
                <span key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: color, color,
                  animation: `hitLed ${isRolling ? 0.11 + (i % 4) * 0.02 : 0.5 + (i % 4) * 0.07}s ease-in-out infinite`,
                  animationDelay: `${i * (isRolling ? 0.015 : 0.06) + (isRolling ? 0.05 : 0.3)}s`,
                  flex: "0 0 auto",
                }} />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GENRE SLOT PICKER — allows main-only, main+sub, or main+sub+micro commits
// ════════════════════════════════════════════════════════════════════════════

function GenreSlotPicker({ slots, onChange, slotLocks, onToggleSlotLock, maxSlots = 3, restrictSubgenres = false, locksDisabled = false }) {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const [activeSlot, setActiveSlot] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [activeGenre, setActiveGenre] = useState(null);
  const [activeMicro, setActiveMicro] = useState(null);

  const openSlot = (idx) => {
    setActiveSlot(idx);
    const ex = slots[idx];
    if (ex) {
      const cat = Object.keys(GENRE_TREE).find(c => Object.keys(GENRE_TREE[c]).includes(ex.genre));
      setActiveCat(cat || null); setActiveGenre(ex.genre); setActiveMicro(ex.sub || null);
    } else { setActiveCat(null); setActiveGenre(null); setActiveMicro(null); }
  };
  const closeSlot = () => { setActiveSlot(null); setActiveCat(null); setActiveGenre(null); setActiveMicro(null); };

  // INSTANT COMMIT: any selection mutates the slot immediately
  const commitSlot = (mainCat, subGenre, micro) => {
    const next = [...slots];
    if (subGenre) {
      next[activeSlot] = { genre: subGenre, sub: micro || null, micro: null };
    } else if (mainCat) {
      next[activeSlot] = { genre: mainCat, sub: null, micro: null };
    } else {
      next[activeSlot] = null;
    }
    onChange(next);
  };

  const clear = (idx) => { const next = [...slots]; next[idx] = null; onChange(next); };

  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: T.s2,
      }}>
        {[0, 1, 2].map(i => {
          // If this slot is beyond tier max, show a locked placeholder
          if (i >= maxSlots) {
            return (
              <div key={i} style={{
                position: "relative", minHeight: 82, padding: T.s3,
                background: T.surface,
                border: `1px dashed ${T.border}`,
                borderRadius: T.r_md,
                display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "flex-start",
                gap: 6, opacity: 0.65,
              }}>
                <Label color={T.textTer}>Slot {i + 1}</Label>
                <TierLock feature="" requiredTier="pro" compact={true} />
              </div>
            );
          }
          const slot = slots[i]; const isActive = activeSlot === i;
          const isLocked = slotLocks?.[i];
          return (
            <div key={i}
              onClick={() => isActive ? closeSlot() : openSlot(i)}
              style={{
                position: "relative", minHeight: 82, padding: T.s3,
                background: slot ? T.elevated : T.surface,
                border: `1px solid ${isLocked ? V.neonGold : isActive ? T.accent : slot ? T.borderHi : T.border}`,
                boxShadow: isLocked ? `0 0 0 1px ${V.neonGold}, 0 0 16px ${V.neonGold}55` : "none",
                borderRadius: T.r_md, cursor: "pointer",
                transition: `all ${T.dur_fast} ${T.ease}`,
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: T.s1 }}>
                <Label color={isLocked ? V.neonGold : slot ? T.accentHi : T.textTer}>
                  Slot {i + 1}{isLocked ? " · LOCKED" : ""}
                </Label>
                {/* Per-slot lock button — dimmed + shows upgrade hint for Free tier */}
                <button type="button"
                  onClick={e => { e.stopPropagation(); onToggleSlotLock?.(i); }}
                  title={locksDisabled ? "Pro feature — locks preserve slots during randomize" : (isLocked ? "Unlock slot" : "Lock slot against randomize")}
                  style={{
                    background: isLocked ? `${V.neonGold}22` : "transparent",
                    border: `1px ${locksDisabled ? "dashed" : "solid"} ${isLocked ? V.neonGold : T.border}`,
                    color: isLocked ? V.neonGold : (locksDisabled ? T.textMuted : T.textTer),
                    padding: "2px 8px", cursor: "pointer",
                    fontSize: T.fs_xs, fontFamily: T.font_mono, fontWeight: 700,
                    letterSpacing: "0.15em",
                    textShadow: isLocked ? `0 0 6px ${V.neonGold}` : "none",
                    borderRadius: T.r_sm,
                    transition: `all ${T.dur_fast} ${T.ease}`,
                    opacity: locksDisabled ? 0.5 : 1,
                  }}>
                  {locksDisabled ? "🔒" : (isLocked ? "🔒" : "🔓")}
                </button>
              </div>
              {slot ? (
                <>
                  <div style={{ fontSize: T.fs_base, color: T.text, fontWeight: 500, lineHeight: 1.3, fontFamily: T.font_sans }}>
                    {slot.genre}
                  </div>
                  {slot.sub && (
                    <div style={{ fontSize: T.fs_sm, color: T.textSec, marginTop: 2, lineHeight: 1.3, fontFamily: T.font_sans }}>
                      {slot.sub}
                    </div>
                  )}
                  <button type="button" onClick={e => { e.stopPropagation(); clear(i); }} style={{
                    position: "absolute", bottom: T.s2, right: T.s2,
                    background: "transparent", border: "none", color: T.textTer,
                    fontSize: T.fs_sm, cursor: "pointer", lineHeight: 1,
                    width: 20, height: 20, display: "grid", placeItems: "center",
                    borderRadius: T.r_sm, fontFamily: T.font_mono,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.hover; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textTer; }}
                  >clear</button>
                </>
              ) : (
                <div style={{ fontSize: T.fs_md, color: T.textSec, fontFamily: T.font_sans }}>
                  {isActive ? "Pick a genre…" : "+ Add genre"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeSlot !== null && (
        <div style={{
          marginTop: T.s4,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: T.r_lg, padding: T.s5,
          boxShadow: "0 1px 0 rgba(255,255,255,0.03)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: T.s4 }}>
            <Label color={T.text} size={T.fs_sm}>
              Configuring slot {activeSlot + 1} — picks commit instantly
            </Label>
            <Button variant="ghost" size="sm" onClick={closeSlot}>Close</Button>
          </div>

          <div style={{ marginBottom: T.s4 }}>
            <Label color={T.textTer} style={{ display: "block", marginBottom: T.s2 }}>Main genre (commits immediately)</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {Object.keys(GENRE_TREE).map(cat => (
                <Chip key={cat} label={cat} selected={activeCat === cat}
                  onClick={() => {
                    if (activeCat === cat) {
                      // deselect — clear slot
                      setActiveCat(null); setActiveGenre(null); setActiveMicro(null);
                      commitSlot(null, null, null);
                    } else {
                      setActiveCat(cat); setActiveGenre(null); setActiveMicro(null);
                      commitSlot(cat, null, null); // INSTANT commit main-only
                    }
                  }} size="sm" />
              ))}
            </div>
          </div>

          {activeCat && (
            <div style={{ marginBottom: T.s4 }}>
              <Label color={T.textTer} style={{ display: "block", marginBottom: T.s2 }}>
                Subgenre <span style={{ color: T.textMuted, textTransform: "none", letterSpacing: 0 }}>
                  (optional · refines your selection){restrictSubgenres ? " · free-fuel list" : ""}
                </span>
              </Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
                {Object.keys(GENRE_TREE[activeCat])
                  .filter(g => !restrictSubgenres || (FREE_SUBGENRES[activeCat] || []).includes(g))
                  .map(g => (
                    <Chip key={g} label={g} selected={activeGenre === g}
                      onClick={() => {
                        if (activeGenre === g) {
                          setActiveGenre(null); setActiveMicro(null);
                          commitSlot(activeCat, null, null);
                        } else {
                          setActiveGenre(g); setActiveMicro(null);
                          commitSlot(activeCat, g, null);
                        }
                      }} size="sm" />
                  ))}
              </div>
            </div>
          )}

          {activeCat && activeGenre && !restrictSubgenres && (
            <div>
              <Label color={T.textTer} style={{ display: "block", marginBottom: T.s2 }}>
                Microstyle <span style={{ color: T.textMuted, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
                {(GENRE_TREE[activeCat]?.[activeGenre] || []).map(m => (
                  <Chip key={m} label={m} selected={activeMicro === m}
                    onClick={() => {
                      const nextMicro = activeMicro === m ? null : m;
                      setActiveMicro(nextMicro);
                      commitSlot(activeCat, activeGenre, nextMicro);
                    }} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SPECIFIC INSTRUMENTS PICKER
// ════════════════════════════════════════════════════════════════════════════

function SpecificInstrumentsPicker({ state, setState, favorites, onFavorite, casinoOutlines, maxPerCategory = Infinity }) {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const [expanded, setExpanded] = useState(null);
  const [openCategories, setOpenCategories] = useState(() => new Set(["Keys"]));
  const [search, setSearch] = useState("");
  const selected = state.specificInstruments || [];
  const arts = state.specificArticulations || {};

  const toggleInst = (inst) => {
    const isSel = selected.includes(inst);
    const next = isSel ? selected.filter(x => x !== inst) : [...selected, inst];
    const nextArts = { ...arts };
    if (isSel) delete nextArts[inst];
    setState(s => ({ ...s, specificInstruments: next, specificArticulations: nextArts }));
    if (isSel && expanded === inst) setExpanded(null);
  };
  const setArticulation = (inst, art) => {
    setState(s => ({ ...s, specificArticulations: { ...(s.specificArticulations || {}), [inst]: art } }));
  };
  const toggleCategory = (cat) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const searchLower = search.trim().toLowerCase();
  const isSearching = searchLower.length > 0;

  return (
    <div>
      <div style={{
        display: "flex", gap: T.s2, alignItems: "center",
        marginBottom: T.s3,
        flexWrap: isMobile ? "wrap" : "nowrap",
      }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search instruments"
          style={{
            flex: isMobile ? "1 1 100%" : 1, minWidth: 140,
            background: T.surface, border: `1px solid ${T.border}`,
            color: T.text,
            padding: isMobile ? "10px 12px" : `${T.s2}px ${T.s3}px`,
            fontSize: isMobile ? 16 : T.fs_md, // 16px prevents iOS auto-zoom
            fontFamily: T.font_sans, outline: "none",
            borderRadius: T.r_md,
            height: isMobile ? 40 : 32,
            boxSizing: "border-box",
            WebkitAppearance: "none",
          }}
          onFocus={e => e.currentTarget.style.borderColor = T.borderFocus}
          onBlur={e => e.currentTarget.style.borderColor = T.border}
        />
        <Button variant="ghost" size="sm"
          onClick={() => setOpenCategories(new Set(Object.keys(SPECIFIC_INSTRUMENTS)))}>
          Expand all
        </Button>
        <Button variant="ghost" size="sm"
          onClick={() => setOpenCategories(new Set())}>
          Collapse
        </Button>
      </div>

      {/* ── ESSENTIALS + COMBOS — quick-pick section ─────────────────────
          Appears at the top when the user is NOT searching. Two parts:
          1. "Starter combos" — genre-based presets that add 3-5 instruments at once
          2. "Essentials" — universal instruments that work across most genres
          Both are collapsible via the ⌵ button so power users can hide them. */}
      {!isSearching && selected.length === 0 && (
        <div style={{ marginBottom: T.s4 }}>
          {/* ── QUICK COMBOS ────────────────────────────────────────── */}
          <div style={{
            padding: isMobile ? T.s3 : T.s4,
            background: `linear-gradient(180deg, ${T.accent}0d 0%, transparent 100%)`,
            border: `1px solid ${T.accentBorder}`,
            borderRadius: T.r_md,
            marginBottom: T.s3,
          }}>
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginBottom: T.s3, gap: T.s2, flexWrap: "wrap",
            }}>
              <Label color={T.accentHi}>
                ✨ Starter combos
              </Label>
              <span style={{
                fontSize: 11, color: T.textTer, fontFamily: T.font_mono, letterSpacing: "0.08em",
              }}>
                Tap to add 3–5 instruments at once
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(180px, 1fr))",
              gap: T.s2,
            }}>
              {INSTRUMENT_COMBOS.map(combo => (
                <button key={combo.id} type="button"
                  onClick={() => {
                    // Add any combo instruments that exist in SPECIFIC_INSTRUMENT_FLAT and aren't already selected
                    const available = combo.instruments.filter(i =>
                      SPECIFIC_INSTRUMENT_FLAT.some(x => x.name === i)
                    );
                    const toAdd = available.filter(i => !selected.includes(i));
                    if (toAdd.length === 0) return;
                    setState(prev => ({
                      ...prev,
                      specificInstruments: [...(prev.specificInstruments || []), ...toAdd],
                    }));
                  }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    padding: isMobile ? "10px 12px" : "11px 14px",
                    minHeight: 60,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.r_md,
                    cursor: "pointer",
                    transition: `all ${T.dur_fast} ${T.ease}`,
                    textAlign: "left",
                    gap: 2,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = T.elevated;
                    e.currentTarget.style.borderColor = T.accent;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = T.surface;
                    e.currentTarget.style.borderColor = T.border;
                  }}>
                  <span style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: T.fs_md, fontWeight: 600, color: T.text,
                    fontFamily: T.font_sans,
                  }}>
                    <span style={{ color: T.accent, fontSize: 13 }}>{combo.icon}</span>
                    {combo.label}
                  </span>
                  <span style={{
                    fontSize: 11, color: T.textTer, fontFamily: T.font_sans,
                    lineHeight: 1.3,
                  }}>
                    {combo.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── ESSENTIALS — 12 universal no-brainer picks ──────────── */}
          <div style={{
            padding: isMobile ? T.s3 : T.s4,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.r_md,
          }}>
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginBottom: T.s3, gap: T.s2, flexWrap: "wrap",
            }}>
              <Label color={T.text}>
                ⚡ Essentials
              </Label>
              <span style={{
                fontSize: 11, color: T.textTer, fontFamily: T.font_mono, letterSpacing: "0.08em",
              }}>
                Works across most genres
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s2 }}>
              {INSTRUMENT_ESSENTIALS.map(inst => {
                const isSel = selected.includes(inst);
                return (
                  <button key={inst} type="button"
                    onClick={() => toggleInst(inst)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: isMobile ? "9px 14px" : "7px 12px",
                      minHeight: isMobile ? 38 : "auto",
                      background: isSel ? T.accentBg : "transparent",
                      border: `1px solid ${isSel ? T.accentBorder : T.border}`,
                      borderRadius: T.r_md,
                      color: isSel ? T.accentHi : T.textSec,
                      fontSize: isMobile ? 13 : T.fs_sm,
                      fontFamily: T.font_sans, fontWeight: 450,
                      cursor: "pointer",
                      transition: `all ${T.dur_fast} ${T.ease}`,
                    }}
                    onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background = T.hover; e.currentTarget.style.color = T.text; } }}
                    onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textSec; } }}>
                    <span style={{ fontSize: 10, color: isSel ? T.accentHi : T.textMuted, opacity: 0.7 }}>{isSel ? "✓" : "+"}</span>
                    {inst}
                  </button>
                );
              })}
            </div>
            <div style={{
              marginTop: T.s3, paddingTop: T.s3,
              borderTop: `1px dashed ${T.border}`,
              fontSize: 11, color: T.textTer, fontFamily: T.font_sans,
              lineHeight: 1.5,
            }}>
              Need something specific? Scroll down to browse all{" "}
              <strong style={{ color: T.textSec }}>{SPECIFIC_INSTRUMENT_FLAT.length}</strong>{" "}
              instruments by category.
            </div>
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div style={{
          marginBottom: T.s3, padding: T.s3,
          background: T.accentBg, border: `1px solid ${T.accentBorder}`,
          borderRadius: T.r_md,
        }}>
          <Label color={T.accentHi} style={{ display: "block", marginBottom: T.s2 }}>
            Selected · {selected.length}
          </Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
            {selected.map(inst => {
              const artSel = arts[inst];
              return (
                <span key={inst} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", background: T.elevated,
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: T.r_md,
                  fontSize: T.fs_sm, color: T.text,
                  fontFamily: T.font_sans,
                }}>
                  {inst}
                  {artSel && <span style={{ color: T.textTer, fontSize: T.fs_xs, fontFamily: T.font_mono }}>· {artSel}</span>}
                  <button type="button" onClick={() => toggleInst(inst)}
                    style={{ background: "transparent", border: "none", color: T.textTer, padding: 0, marginLeft: 2, cursor: "pointer", fontSize: T.fs_base, lineHeight: 1 }}>×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: T.s1 }}>
        {Object.entries(SPECIFIC_INSTRUMENTS).map(([category, instruments]) => {
          const instEntries = Object.entries(instruments);
          const matching = isSearching
            ? instEntries.filter(([name]) => name.toLowerCase().includes(searchLower))
            : instEntries;
          if (isSearching && matching.length === 0) return null;
          const isOpen = isSearching || openCategories.has(category);
          const selectedInCat = matching.filter(([n]) => selected.includes(n)).length;

          return (
            <div key={category} style={{
              border: `1px solid ${T.border}`,
              borderRadius: T.r_md,
              background: T.surface,
              overflow: "hidden",
            }}>
              <div onClick={() => !isSearching && toggleCategory(category)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: `${T.s2}px ${T.s3}px`, cursor: isSearching ? "default" : "pointer",
                  transition: `background ${T.dur_fast} ${T.ease}`,
                  userSelect: "none",
                }}
                onMouseEnter={e => { if (!isSearching) e.currentTarget.style.background = T.hover; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: T.s2 }}>
                  <span style={{ color: T.textTer, fontSize: T.fs_sm, fontFamily: T.font_mono, width: 10 }}>
                    {isSearching ? "·" : (isOpen ? "−" : "+")}
                  </span>
                  <span style={{ fontSize: T.fs_md, color: T.text, fontWeight: 500, fontFamily: T.font_sans }}>{category}</span>
                </div>
                <span style={{ fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_mono }}>
                  {selectedInCat > 0 ? `${selectedInCat} / ${matching.length}` : matching.length}
                </span>
              </div>

              {isOpen && (
                <div style={{
                  padding: T.s3, paddingTop: 0,
                  display: "flex", flexDirection: "column", gap: T.s2,
                }}>
                  {/* Group 1: unselected chips in a dense row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
                    {matching.filter(([inst]) => !selected.includes(inst)).map(([inst], idx) => {
                      const isFav = favorites ? favorites.has(inst) : false;
                      const co = casinoOutlines ? casinoOutlines.get(`si:${inst}`) : null;
                      const tierLocked = idx >= maxPerCategory;
                      return (
                        <span key={inst}
                          onClick={tierLocked ? undefined : () => toggleInst(inst)}
                          onDoubleClick={tierLocked ? undefined : () => onFavorite && onFavorite(inst)}
                          aria-label={tierLocked ? "Locked instrument — upgrade tier to unlock" : undefined}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: isMobile ? "9px 12px" : "5px 10px",
                            minHeight: isMobile ? 38 : "auto",
                            cursor: tierLocked ? "not-allowed" : "pointer",
                            background: "transparent",
                            border: `1px solid ${co || T.border}`,
                            boxShadow: co ? `0 0 0 1px ${co}, 0 0 12px ${co}66` : "none",
                            color: T.textSec,
                            fontSize: isMobile ? 13 : T.fs_sm,
                            fontFamily: T.font_sans, fontWeight: 450,
                            borderRadius: T.r_md,
                            transition: `all ${T.dur_fast} ${T.ease}`,
                            userSelect: "none",
                            opacity: tierLocked ? 0.55 : 1,
                            pointerEvents: tierLocked ? "none" : "auto",
                          }}>
                          {tierLocked && (
                            <span aria-hidden="true" style={{
                              color: T.textMuted, fontSize: T.fs_xs, lineHeight: 1,
                            }}>🔒</span>
                          )}
                          {isFav && !tierLocked && <span style={{ color: T.warning, fontSize: T.fs_xs }}>●</span>}
                          <span style={{
                            filter: tierLocked ? "blur(5px)" : "none",
                            transition: "filter 180ms ease-out",
                            userSelect: tierLocked ? "none" : "auto",
                          }}>{inst}</span>
                        </span>
                      );
                    })}
                  </div>

                  {/* Group 2: SELECTED chips each with inline articulation row below */}
                  {matching.filter(([inst]) => selected.includes(inst)).map(([inst, articulations]) => {
                    const artSel = arts[inst];
                    const isFav = favorites ? favorites.has(inst) : false;
                    const co = casinoOutlines ? casinoOutlines.get(`si:${inst}`) : null;
                    return (
                      <div key={inst} style={{
                        background: T.accentBg,
                        border: `1px solid ${co || T.accentBorder}`,
                        boxShadow: co ? `0 0 0 1px ${co}, 0 0 12px ${co}66` : "none",
                        borderRadius: T.r_md,
                        padding: T.s2,
                        display: "flex", flexDirection: "column", gap: T.s2,
                      }}>
                        {/* Row 1: instrument name + remove */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: T.s2 }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            color: T.accentHi, fontSize: T.fs_md,
                            fontFamily: T.font_sans, fontWeight: 500,
                          }}>
                            {isFav && <span style={{ color: T.warning, fontSize: T.fs_xs }}>●</span>}
                            {inst}
                            {artSel && (
                              <span style={{
                                color: T.text, fontSize: T.fs_xs, fontFamily: T.font_mono,
                                padding: "1px 6px", background: T.hover,
                                border: `1px solid ${T.borderHi}`, borderRadius: T.r_sm,
                              }}>{artSel}</span>
                            )}
                          </span>
                          <button type="button"
                            onClick={() => toggleInst(inst)}
                            title="Remove this instrument"
                            style={{
                              background: "transparent", border: "none",
                              color: T.textTer, cursor: "pointer",
                              fontSize: T.fs_base, padding: "2px 6px",
                              fontFamily: T.font_mono, lineHeight: 1,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = T.danger; }}
                            onMouseLeave={e => { e.currentTarget.style.color = T.textTer; }}
                          >remove</button>
                        </div>

                        {/* Row 2: inline articulation chips — always visible when instrument is selected */}
                        {articulations.length > 0 && (
                          <div>
                            <Label color={T.textTer} style={{ display: "block", marginBottom: 6 }}>
                              Articulation {artSel ? "" : "(optional)"}
                            </Label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
                              <Chip label="None" selected={!artSel}
                                onClick={() => setArticulation(inst, null)} size="sm" />
                              {articulations.map(a => (
                                <Chip key={a} label={a} selected={artSel === a}
                                  onClick={() => setArticulation(inst, artSel === a ? null : a)} size="sm" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// POP-HIT METER — probability of current selection becoming a modern pop hit
// ════════════════════════════════════════════════════════════════════════════

function PopHitMeter({ score, verdict, notes, showDebug, state, lyricsOn }) {
  const color = score >= 70 ? T.success : score >= 40 ? T.warning : T.danger;
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.r_lg, padding: T.s5,
      boxShadow: "0 1px 0 rgba(255,255,255,0.03)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: T.s3, gap: T.s3 }}>
        <div>
          <div style={{ fontSize: T.fs_base, color: T.text, fontWeight: 600, fontFamily: T.font_sans, marginBottom: 2 }}>
            Pop profile match
          </div>
          <span style={{ fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_sans }}>
            how closely this config matches mainstream pop conventions
          </span>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em",
            fontFamily: T.font_sans, color, lineHeight: 1,
          }}>
            {score}
            <span style={{ fontSize: 14, color: T.textTer, marginLeft: 2, fontWeight: 500 }}>%</span>
          </div>
        </div>
      </div>
      <div style={{
        height: 6, background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: 3, overflow: "hidden", marginBottom: T.s3,
        position: "relative",
      }}>
        {/* 100% baseline — faint striped background showing the full possible range */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `repeating-linear-gradient(90deg, ${T.border} 0 4px, transparent 4px 8px)`,
          opacity: 0.5,
        }} />
        {/* Actual score fill */}
        <div style={{
          position: "relative", zIndex: 1,
          height: "100%", width: `${score}%`,
          background: color,
          boxShadow: `0 0 8px ${color}66`,
          transition: `width ${T.dur_slow} ${T.ease}, background ${T.dur_slow} ${T.ease}`,
        }} />
      </div>
      <div style={{
        fontSize: T.fs_sm, color,
        fontFamily: T.font_sans, fontWeight: 500, marginBottom: notes?.length ? T.s3 : 0,
      }}>
        {verdict}
      </div>
      {notes && notes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {notes.map((n, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "baseline", gap: 8,
              fontSize: T.fs_sm, color: T.textSec, fontFamily: T.font_sans,
            }}>
              <span style={{
                color: T.textTer, fontFamily: T.font_mono, fontSize: T.fs_xs,
                minWidth: 12, textAlign: "center",
              }}>·</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}

      {/* Honesty microcopy — this isn't a real chart prediction */}
      <div style={{
        marginTop: T.s3, paddingTop: T.s3,
        borderTop: `1px solid ${T.border}`,
        fontSize: 10, color: T.textMuted,
        fontFamily: T.font_mono, letterSpacing: "0.05em",
        lineHeight: 1.5,
      }}>
        Heuristic score based on genre / BPM / vocal / mood rules. Not a prediction of actual chart performance.
      </div>

      {/* ADMIN DEBUG — raw scoring math exposed */}
      {showDebug && state && (
        <div style={{
          marginTop: T.s4, padding: T.s3,
          background: "#100205", border: `1px dashed ${T.danger}55`,
          borderRadius: T.r_md,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            marginBottom: 8,
          }}>
            <span style={{
              color: T.danger, fontFamily: T.font_mono, fontSize: 9,
              fontWeight: 700, letterSpacing: "0.25em",
              textShadow: `0 0 4px ${T.danger}88`,
            }}>⚡ ADMIN DEBUG</span>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px",
            fontSize: 11, fontFamily: T.font_mono, color: T.textSec,
          }}>
            <span style={{ color: T.textTer }}>GENRES:</span>
            <span>{(state.slots || []).filter(Boolean).map(s => s.genre).join(" + ") || "—"}</span>
            <span style={{ color: T.textTer }}>BPM:</span>
            <span>{inferBPM(state)}</span>
            <span style={{ color: T.textTer }}>MOOD:</span>
            <span>{state.mood || "—"}</span>
            <span style={{ color: T.textTer }}>LYRICS:</span>
            <span>{lyricsOn ? `on · ${state.language || "en"}` : "off"}</span>
            <span style={{ color: T.textTer }}>VIBE:</span>
            <span>{state.lyricalVibe || "—"}</span>
            <span style={{ color: T.textTer }}>GROOVE:</span>
            <span>{state.groove || "—"}</span>
            <span style={{ color: T.textTer }}>MIX:</span>
            <span>{state.mix || "—"}</span>
            <span style={{ color: T.textTer }}>FINAL:</span>
            <span style={{ color, fontWeight: 700 }}>{score} / 100 → {verdict}</span>
          </div>
          <div style={{
            marginTop: 10, padding: "8px 10px",
            background: "rgba(239,68,68,0.06)", border: `1px solid ${T.danger}22`,
            borderRadius: 4,
            fontSize: 10, fontFamily: T.font_mono, color: T.textTer,
            lineHeight: 1.5,
          }}>
            weights: genre 22% · bpm 10% · vocals+lang+vibe 18% · mood 8% · groove 4% · mix 3% · baseline 35%
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// OUTPUT BLOCK
// ════════════════════════════════════════════════════════════════════════════

function OutputBlock({ title, subtitle, text, onCopy, copyState, multiline, length, limit, compressed, compressionLevel }) {
  const pct = limit ? Math.min((length / limit) * 100, 100) : 0;
  const inTarget = length >= limit - 10 && length <= limit;

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.r_lg, padding: T.s5,
      boxShadow: "0 1px 0 rgba(255,255,255,0.03)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: T.s4, gap: T.s3 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: T.s2, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: T.fs_base, color: T.text, fontWeight: 600, fontFamily: T.font_sans }}>{title}</span>
            {compressed && compressionLevel > 0 && (
              <span style={{
                padding: "2px 6px", fontSize: T.fs_xs, fontFamily: T.font_mono,
                background: T.hover, border: `1px solid ${T.border}`,
                color: T.textSec, borderRadius: T.r_sm,
              }}>L{compressionLevel}</span>
            )}
            {inTarget && (
              <span style={{
                padding: "2px 6px", fontSize: T.fs_xs, fontFamily: T.font_mono,
                background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)",
                color: T.success, borderRadius: T.r_sm,
              }}>Optimal</span>
            )}
          </div>
          <span style={{ fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_sans }}>{subtitle}</span>
        </div>
        <Button variant={copyState === "copied" ? "primary" : "secondary"} size="sm" onClick={onCopy}>
          {copyState === "copied" ? "Copied" : copyState === "error" ? "Failed" : "Copy"}
        </Button>
      </div>

      <div style={{
        background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: T.r_md, padding: T.s4,
      }}>
        <p style={{
          fontSize: T.fs_md, color: T.text, lineHeight: multiline ? 1.7 : 1.6,
          fontFamily: T.font_mono, margin: 0,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>{text}</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// WORKFLOW GUIDE
// ════════════════════════════════════════════════════════════════════════════

function WorkflowGuide() {
  const steps = [
    { n: "01", t: "Pick a genre.", b: "One slot, one genre — that's the minimum. Add subgenres or a second genre for fusion. Stop there if you want." },
    { n: "02", t: "Set song vs. instrumental.", b: "Instrumental hides vocal sections. Song shows them. Override per-section with Off / Auto / On if you need to." },
    { n: "03", t: "Anchor the mood and the energy.", b: "These two do the heaviest lifting. If you change nothing else, change these." },
    { n: "04", t: "Pick a mode, then hit randomize.", b: "Mode sets depth — Simple is tight, Vast is long, Chaos is wild. Randomize fills everything else; locked slots survive." },
    { n: "05", t: "Copy the output that matches your field.", b: "Short prompt for style fields. Detailed prompt for description fields. Both are hard-validated against the character limit." },
  ];
  return (
    <div>
      <Label color={T.textSec} style={{ display: "block", marginBottom: T.s3 }}>How to use the engine</Label>
      <p style={{ color: T.textSec, fontSize: T.fs_base, lineHeight: 1.6, marginBottom: T.s5, maxWidth: 520, fontFamily: T.font_sans }}>
        Five steps from empty state to a finished prompt. Go in order the first time. Skip around after.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: T.s2 }}>
        {steps.map(s => (
          <div key={s.n} style={{
            display: "flex", gap: T.s4,
            padding: T.s4,
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.r_md,
          }}>
            <span style={{
              flexShrink: 0, minWidth: 28,
              color: T.textTer, fontSize: T.fs_sm, fontFamily: T.font_mono, fontWeight: 500,
            }}>{s.n}</span>
            <div>
              <div style={{ color: T.text, fontSize: T.fs_base, fontFamily: T.font_sans, fontWeight: 500, marginBottom: 4 }}>{s.t}</div>
              <div style={{ fontSize: T.fs_md, color: T.textSec, lineHeight: 1.55, fontFamily: T.font_sans }}>{s.b}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: T.s5, padding: T.s4,
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r_md,
      }}>
        <Label color={T.textSec} style={{ display: "block", marginBottom: 6 }}>Fully local. Fully deterministic.</Label>
        <div style={{ fontSize: T.fs_md, color: T.textSec, lineHeight: 1.6, fontFamily: T.font_sans }}>
          No network calls. No external models. Every prompt is built by local rules. The same inputs always produce the same output.
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT STATE
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_TOGGLES = {
  mood: "auto", energy: "auto", groove: "auto",
  vocalist: "auto", language: "auto", lyricalVibe: "auto",
  specificInstruments: "auto",
  harmonic: "auto", texture: "auto", mix: "auto",
};

const ENGINE_DEF = {
  slots: [null, null, null],
  slotLocks: [false, false, false], // per-slot lock: locked slot survives randomize
  toggles: { ...DEFAULT_TOGGLES },
  mood: "", energy: "",
  groove: "default", vocalist: "", language: "en",
  lyricalVibe: "",
  languageLocked: false,
  specificInstruments: [], specificArticulations: {}, specificCount: 3,
  mix: "", harmonic: "", texture: "",
  favorites: [],
  // sectionLocks: if a section key is locked, its current value is preserved by randomize
  sectionLocks: {
    mood: false, energy: false, groove: false,
    vocalist: false, language: false, lyricalVibe: false,
    specificInstruments: false, harmonic: false, texture: false, mix: false,
  },
  // optionLocks: "sectionKey:value" — marks specific option as locked. When the
  // section is randomized, any locked option in that section is preferred.
  optionLocks: [],
};

const RANDOMIZER_SECTIONS = [
  { key: "genre",               toggleKey: null,                 isGenre: true },
  { key: "mood",                toggleKey: "mood" },
  { key: "energy",              toggleKey: "energy" },
  { key: "groove",              toggleKey: "groove" },
  { key: "vocalist",            toggleKey: "vocalist",           lyricsOnly: true },
  { key: "language",            toggleKey: "language",           lyricsOnly: true },
  { key: "lyricalVibe",         toggleKey: "lyricalVibe",        lyricsOnly: true },
  { key: "specificInstruments", toggleKey: "specificInstruments" },
  { key: "harmonic",            toggleKey: "harmonic" },
  { key: "texture",             toggleKey: "texture" },
  { key: "mix",                 toggleKey: "mix" },
];


// ════════════════════════════════════════════════════════════════════════════
// CASINO PARTICLES — floating glitter/sparks that intensify during rolling
// ════════════════════════════════════════════════════════════════════════════

function CasinoParticles({ isRolling }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const COLORS = [V.hotPink, V.neonGold, V.cyan, V.lime, V.orange, V.magenta];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.max(1, r.width * dpr);
      canvas.height = Math.max(1, r.height * dpr);
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) try { ro.observe(canvas.parentElement); } catch {}

    // Seed particles — MUCH sparser when idle
    const spawn = (n) => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      for (let i = 0; i < n; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.15 - Math.random() * 0.5,
          r: 0.4 + Math.random() * 1.2, // smaller
          c: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 0.5 + Math.random() * 0.5,
          rollLife: false,
        });
      }
    };
    spawn(18); // was 60

    const render = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // During rolling, spawn extra bursts
      if (isRolling && Math.random() < 0.5) spawn(5);

      const P = particlesRef.current;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.004;
        if (p.y < -10 || p.life <= 0) {
          // respawn at bottom (only if idle pool should stay small)
          if (!isRolling && P.length > 20) {
            P.splice(i, 1);
            continue;
          }
          p.x = Math.random() * w;
          p.y = h + 10;
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = -0.15 - Math.random() * 0.5;
          p.life = 0.5 + Math.random() * 0.5;
          p.c = COLORS[Math.floor(Math.random() * COLORS.length)];
          p.r = 0.4 + Math.random() * 1.2;
        }
        // glow draw — much subtler when idle
        const alpha = Math.max(0, Math.min(1, p.life));
        ctx.beginPath();
        ctx.fillStyle = p.c;
        ctx.globalAlpha = alpha * (isRolling ? 0.9 : 0.18);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        // halo (skip entirely when idle — this was the main culprit)
        if (isRolling) {
          ctx.globalAlpha = alpha * 0.35;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (ro) try { ro.disconnect(); } catch {}
    };
  }, [isRolling]);

  return (
    <canvas ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        pointerEvents: "none", zIndex: 0,
      }} />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ENGINE PAGE
// ════════════════════════════════════════════════════════════════════════════

function EnginePage() {
  const { tier, features } = useTier();
  const { layout } = useLayout();
  const { fuels, activeFuel, consumeFuel } = useFuel();
  const isMobile = layout === "mobile";
  const [state, setState] = useState(ENGINE_DEF);
  const [lyricsOn, setLyricsOn] = useState(true);
  const [mode, setMode] = useState("moderated");
  const [copyState, setCopyState] = useState({ short: "idle", detailed: "idle" });
  const [isRolling, setIsRolling] = useState(false);
  const [casinoOutlines, setCasinoOutlines] = useState(new Map());
  const [toast, setToast] = useState(null); // { kind: "warn" | "info", text }
  const rollTimersRef = useRef([]);

  // showToast — transient notification near HIT button. Auto-dismiss 3.4s.
  const showToast = (text, kind = "warn") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3400);
  };

  // ── EFFECTIVE LIMITS — combines tier features + active fuel constraints ──
  // Fuel behaves as a "session upgrade" — using Pro/VIP fuel gives expanded
  // depth for that roll even if base tier is Free. Fuel TIGHTENS only when
  // more restrictive than tier (Pro user on Free fuel gets Free-fuel output).
  const effectiveLimits = useMemo(() => {
    const isFreeFuel = activeFuel === "free";

    // Mode access:
    //   Free fuel → Simple, Moderated, Chaos (intersected with tier)
    //   Pro/VIP fuel → all 5 modes unlocked regardless of tier
    let allowedModes;
    if (isFreeFuel) {
      const tierModes = new Set(features.modes);
      allowedModes = ["simple", "moderated", "chaos"].filter(m => tierModes.has(m));
    } else {
      allowedModes = ["simple", "moderated", "expanded", "vast", "chaos"];
    }

    return {
      maxSlots: isFreeFuel ? 1 : features.maxSlots,
      modes: allowedModes,
      maxInstruments: isFreeFuel ? Math.min(5, features.maxInstruments) : features.maxInstruments,
      maxOptionsPerSection: isFreeFuel
        ? Math.min(5, features.maxOptionsPerSection)
        : Math.max(features.maxOptionsPerSection, 999),
      restrictSubgenres: isFreeFuel,
      // LOCKS — available to Pro+ tiers always, OR when user bought Pro/VIP fuel
      // (even for Free tier users). Matches the "fuel as session upgrade" model.
      locksAvailable: features.locks || !isFreeFuel,
      favoritesAvailable: features.favorites || !isFreeFuel,
    };
  }, [activeFuel, features]);

  // isOptionLocked: returns true when option at index is beyond the tier's
  // allowed count for this section. Used to blur + fully disable locked chips.
  // Also guarantees minimum 5 options per section even if the caller passes
  // a smaller list. Callers pass the TOTAL option count — the cap is computed
  // here so we never lock below the floor of 5.
  const isOptionLocked = (idx) => {
    const cap = Math.max(5, effectiveLimits.maxOptionsPerSection);
    return idx >= cap;
  };

  // ── TIER + FUEL ENFORCEMENT ─────────────────────────────────────────
  // Mode fallback if outside allowed list
  useEffect(() => {
    if (!effectiveLimits.modes.includes(mode)) {
      const fallback = effectiveLimits.modes[effectiveLimits.modes.length - 1];
      if (fallback) setMode(fallback);
    }
  }, [effectiveLimits.modes, mode]);

  // Cap instrument count
  useEffect(() => {
    if ((state.specificCount || 3) > effectiveLimits.maxInstruments) {
      setState(s => ({ ...s, specificCount: effectiveLimits.maxInstruments }));
    }
    if ((state.specificInstruments || []).length > effectiveLimits.maxInstruments) {
      setState(s => ({
        ...s,
        specificInstruments: s.specificInstruments.slice(0, effectiveLimits.maxInstruments),
      }));
    }
  }, [effectiveLimits.maxInstruments]);

  // Null out slots beyond max
  useEffect(() => {
    if (effectiveLimits.maxSlots < 3) {
      setState(s => {
        const newSlots = [...s.slots];
        for (let i = effectiveLimits.maxSlots; i < 3; i++) newSlots[i] = null;
        return { ...s, slots: newSlots };
      });
    }
  }, [effectiveLimits.maxSlots]);

  const maxLen = getModeById(mode).limit;
  const set = (k, v) => setState(s => ({ ...s, [k]: v }));
  const setToggle = (k, v) => setState(s => ({ ...s, toggles: { ...s.toggles, [k]: v } }));
  const toggleLanguageLock = () => setState(s => ({ ...s, languageLocked: !s.languageLocked }));

  const toggleFavorite = (sectionKey, value) => {
    if (!effectiveLimits.favoritesAvailable) {
      showToast("Favorites are a Pro feature — upgrade to boost specific options in rolls.", "warn");
      return;
    }
    if (!value) return;
    const key = `${sectionKey}:${value}`;
    setState(s => {
      const favs = s.favorites || [];
      const next = favs.includes(key) ? favs.filter(x => x !== key) : [...favs, key];
      return { ...s, favorites: next };
    });
  };
  const favSetFor = (sectionKey) => new Set(
    (state.favorites || [])
      .filter(k => k.startsWith(sectionKey + ":"))
      .map(k => k.slice(sectionKey.length + 1))
  );

  // Per-slot lock toggle (genre slots 0-2)
  // Free tier: locks disabled entirely. Click is a no-op + triggers upgrade toast.
  const toggleSlotLock = (i) => {
    if (!effectiveLimits.locksAvailable) {
      showToast("Locks are a Pro feature — upgrade to preserve values during randomize.", "warn");
      return;
    }
    setState(s => {
      const next = [...(s.slotLocks || [false, false, false])];
      next[i] = !next[i];
      return { ...s, slotLocks: next };
    });
  };

  // Per-section lock toggle — when true, section's current value is preserved
  const toggleSectionLock = (sectionKey) => {
    if (!effectiveLimits.locksAvailable) {
      showToast("Locks are a Pro feature — upgrade to preserve values during randomize.", "warn");
      return;
    }
    setState(s => ({
      ...s,
      sectionLocks: { ...s.sectionLocks, [sectionKey]: !s.sectionLocks?.[sectionKey] },
    }));
  };

  // Per-option lock toggle — stored as "sectionKey:value" in optionLocks array
  const toggleOptionLock = (sectionKey, value) => {
    if (!effectiveLimits.locksAvailable) {
      showToast("Locks are a Pro feature — upgrade to force specific options in rolls.", "warn");
      return;
    }
    if (!value) return;
    const key = `${sectionKey}:${value}`;
    setState(s => {
      const locks = s.optionLocks || [];
      const next = locks.includes(key) ? locks.filter(x => x !== key) : [...locks, key];
      return { ...s, optionLocks: next };
    });
  };
  const optionLockSetFor = (sectionKey) => new Set(
    (state.optionLocks || [])
      .filter(k => k.startsWith(sectionKey + ":"))
      .map(k => k.slice(sectionKey.length + 1))
  );

  // Renders a 🔒/🔓 button as a section's `extra` slot. Pass sectionKey.
  // Free tier: button shows a padlock with "PRO" badge, clicks open shop nudge.
  const renderLockBtn = (sectionKey) => {
    if (!effectiveLimits.locksAvailable) {
      return (
        <button type="button"
          onClick={() => showToast("Locks are a Pro feature — upgrade to preserve values during randomize.", "warn")}
          title="Pro feature — click to learn more"
          style={{
            background: "transparent",
            border: `1px dashed ${T.border}`,
            color: T.textMuted,
            padding: "4px 10px", cursor: "pointer",
            fontSize: T.fs_xs, fontFamily: T.font_mono, fontWeight: 700,
            letterSpacing: "0.15em",
            borderRadius: T.r_sm,
            transition: `all ${T.dur_fast} ${T.ease}`,
            display: "inline-flex", alignItems: "center", gap: 4,
            opacity: 0.55,
          }}>
          🔒 PRO
        </button>
      );
    }
    const isLocked = state.sectionLocks?.[sectionKey];
    return (
      <button type="button"
        onClick={() => toggleSectionLock(sectionKey)}
        title={isLocked ? "Section locked — randomize will preserve this value" : "Lock this section against randomize"}
        style={{
          background: isLocked ? `${V.neonGold}22` : "transparent",
          border: `1px solid ${isLocked ? V.neonGold : T.border}`,
          color: isLocked ? V.neonGold : T.textTer,
          padding: "4px 10px", cursor: "pointer",
          fontSize: T.fs_xs, fontFamily: T.font_mono, fontWeight: 700,
          letterSpacing: "0.15em",
          textShadow: isLocked ? `0 0 6px ${V.neonGold}` : "none",
          borderRadius: T.r_sm,
          transition: `all ${T.dur_fast} ${T.ease}`,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
        {isLocked ? "🔒 LOCKED" : "🔓 LOCK"}
      </button>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // MODE SYNC: Instrumental auto-disables lyric sections.
  // Song auto-enables them. User can override manually after.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setState(s => ({
      ...s,
      toggles: {
        ...s.toggles,
        vocalist:    lyricsOn ? "auto" : "off",
        language:    lyricsOn ? "auto" : "off",
        lyricalVibe: lyricsOn ? "auto" : "off",
      },
    }));
  }, [lyricsOn]);

  useEffect(() => () => {
    rollTimersRef.current.forEach(t => clearTimeout(t));
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // SMART RANDOMIZER — respects Off/Auto/On + mode counts + locks:
  //   · slotLocks[i]: preserve slot i unchanged
  //   · sectionLocks[k]: preserve section k's current value
  //   · optionLocks "section:value": heavily prefer locked values
  // ─────────────────────────────────────────────────────────────────────
  const doRandomize = () => {
    const [minSec, maxSec] = MODE_SECTION_LIMITS[mode] || [5, 6];
    const targetSections = minSec + Math.floor(Math.random() * (maxSec - minSec + 1));
    const slotLocks = state.slotLocks || [false, false, false];
    const secLocks  = state.sectionLocks || {};

    // clipPool — respects tier maxOptionsPerSection (floor 5) so tier-locked
    // options are never chosen by randomizer.
    const poolCap = Math.max(5, effectiveLimits.maxOptionsPerSection);
    const clipPool = (pool) => pool.slice(0, poolCap);

    const eligible = RANDOMIZER_SECTIONS.filter(s => {
      if (s.lyricsOnly && !lyricsOn) return false;
      if (!s.toggleKey) return true;
      return state.toggles[s.toggleKey] !== "off";
    });

    const forced = eligible.filter(s => s.toggleKey && state.toggles[s.toggleKey] === "on");
    forced.push(RANDOMIZER_SECTIONS[0]);

    const autoPool = eligible.filter(s =>
      !s.toggleKey || state.toggles[s.toggleKey] === "auto"
    ).filter(s => !forced.some(f => f.key === s.key));

    const needed = Math.max(0, targetSections - forced.length);
    const shuffled = [...autoPool].sort(() => Math.random() - 0.5);
    const extras = shuffled.slice(0, Math.min(needed, shuffled.length));
    const chosen = new Set([...forced, ...extras].map(s => s.key));

    // Picker that prefers locked options, then favorites, then random
    const favPick = (sectionKey, pool) => {
      const locked = (state.optionLocks || [])
        .filter(f => f.startsWith(sectionKey + ":"))
        .map(f => f.slice(sectionKey.length + 1))
        .filter(v => pool.includes(v));
      if (locked.length > 0) return pickOne(locked); // locked option wins
      const favs = (state.favorites || [])
        .filter(f => f.startsWith(sectionKey + ":"))
        .map(f => f.slice(sectionKey.length + 1))
        .filter(v => pool.includes(v));
      if (favs.length > 0 && Math.random() < 0.7) return pickOne(favs);
      return pickOne(pool);
    };

    // Helper: either preserve existing or randomize, depending on sectionLock
    const maybe = (sectionKey, fn, fallback = "") => {
      if (secLocks[sectionKey]) return state[sectionKey]; // preserved
      return chosen.has(sectionKey) ? fn() : fallback;
    };

    // GENRE slots: uniform random count (1/2/3) + random depth per slot.
    // Depth roll per slot: 25% main-only, 50% main+sub, 25% main+sub+micro.
    const totalGenres = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
    const MAIN_KEYS = Object.keys(GENRE_TREE);

    const rollSlot = () => {
      const mainCat = MAIN_KEYS[Math.floor(Math.random() * MAIN_KEYS.length)];
      const depthRoll = Math.random();
      if (depthRoll < 0.25) {
        // Main only
        return { genre: mainCat, sub: null, micro: null };
      }
      const subKeys = Object.keys(GENRE_TREE[mainCat] || {});
      if (subKeys.length === 0) return { genre: mainCat, sub: null, micro: null };
      const sub = subKeys[Math.floor(Math.random() * subKeys.length)];
      if (depthRoll < 0.75) {
        // Main + Sub
        return { genre: sub, sub: null, micro: null };
      }
      // Main + Sub + Micro
      const micros = GENRE_TREE[mainCat][sub] || [];
      if (micros.length === 0) return { genre: sub, sub: null, micro: null };
      const micro = micros[Math.floor(Math.random() * micros.length)];
      return { genre: sub, sub: micro, micro: null };
    };

    const freshSlots = [];
    const usedMains = new Set();
    let attempts = 0;
    while (freshSlots.length < totalGenres && attempts < 30) {
      attempts++;
      const candidate = rollSlot();
      // Avoid exact duplicates
      const isDupe = freshSlots.some(s => s && candidate && s.genre === candidate.genre && s.sub === candidate.sub);
      if (!isDupe) { freshSlots.push(candidate); usedMains.add(candidate.genre); }
    }
    while (freshSlots.length < 3) freshSlots.push(null);
    const nextSlots = [0, 1, 2].map(i => slotLocks[i] ? state.slots[i] : freshSlots[i]);

    // SPECIFIC INSTRUMENTS — respect section lock
    let specInsts, specCount, specArts;
    if (secLocks.specificInstruments) {
      specInsts  = state.specificInstruments;
      specCount  = state.specificCount;
      specArts   = state.specificArticulations;
    } else if (chosen.has("specificInstruments")) {
      if (state.toggles.specificInstruments === "on") {
        specCount = Math.max(1, Math.min(10, state.specificCount || 3));
      } else {
        specCount = 1 + Math.floor(Math.random() * 4);
      }
      // Prefer any locked instruments first
      const lockedInsts = (state.optionLocks || [])
        .filter(f => f.startsWith("specificInstruments:"))
        .map(f => f.slice("specificInstruments:".length));
      const pool = SPECIFIC_INSTRUMENT_FLAT.map(x => x.name);
      const others = pickMany(pool.filter(n => !lockedInsts.includes(n)), Math.max(0, specCount - lockedInsts.length));
      specInsts  = [...lockedInsts.slice(0, specCount), ...others].slice(0, specCount);
      // Roll articulations: ~60% chance per instrument, pick from its own valid list.
      // Preserve any articulation the user had on a locked instrument.
      specArts = {};
      specInsts.forEach(name => {
        const prior = state.specificArticulations?.[name];
        const wasLocked = lockedInsts.includes(name);
        if (wasLocked && prior) { specArts[name] = prior; return; }
        const opts = ARTICULATIONS_BY_INSTRUMENT[name] || [];
        if (opts.length === 0) return;
        if (Math.random() < 0.6) specArts[name] = opts[Math.floor(Math.random() * opts.length)];
      });
    } else {
      specInsts = []; specCount = state.specificCount; specArts = {};
    }

    setState({
      slots: nextSlots,
      slotLocks,
      toggles: { ...state.toggles },
      mood:      maybe("mood",     () => favPick("mood", clipPool(MOODS))),
      energy:    maybe("energy",   () => favPick("energy", clipPool(ENERGIES))),
      groove:    maybe("groove",   () => favPick("groove", clipPool(GROOVES.slice(1).map(g => g.id))), "default"),
      vocalist:  maybe("vocalist", () => favPick("vocalist", clipPool(VOCALISTS))),
      // Language: sectionLock OR legacy languageLocked both preserve
      language:  (secLocks.language || state.languageLocked)
                   ? state.language
                   : (chosen.has("language")
                       ? favPick("language", clipPool(LANGUAGES.map(l => l.code)))
                       : "en"),
      languageLocked: state.languageLocked,
      lyricalVibe: maybe("lyricalVibe", () => favPick("lyricalVibe", clipPool(LYRICAL_VIBES))),
      specificInstruments:   specInsts,
      specificArticulations: specArts,
      specificCount:         specCount,
      mix:       maybe("mix",      () => favPick("mix", clipPool(MIX_CHARS))),
      harmonic:  maybe("harmonic", () => favPick("harmonic", clipPool(HARMONIC_STYLES))),
      texture:   maybe("texture",  () => favPick("texture", clipPool(SOUND_TEXTURES))),
      favorites: state.favorites || [],
      sectionLocks: state.sectionLocks,
      optionLocks:  state.optionLocks,
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  // HIT — casino outline flash, then commit
  // 25% of buttons get a 1px neon outline each cycle, 280ms cadence, 1.5s total
  // ─────────────────────────────────────────────────────────────────────
  const triggerHit = () => {
    if (isRolling) return;
    // Fuel gate: consume one unit of active fuel before rolling
    const ok = consumeFuel();
    if (!ok) {
      const fuelName = FUEL_TYPES[activeFuel]?.label || "fuel";
      showToast(`Out of ${fuelName} today. Come back tomorrow or upgrade your tier.`, "warn");
      return;
    }
    setIsRolling(true);

    // Build the full pool of chip identifiers that could receive outlines
    const allKeys = [];
    MOODS.forEach(v => allKeys.push(`mood:${v}`));
    ENERGIES.forEach(v => allKeys.push(`energy:${v}`));
    GROOVES.forEach(g => allKeys.push(`groove:${g.id}`));
    VOCALISTS.forEach(v => allKeys.push(`vocalist:${v}`));
    LANGUAGES.forEach(l => allKeys.push(`language:${l.code}`));
    LYRICAL_VIBES.forEach(v => allKeys.push(`lyricalVibe:${v}`));
    HARMONIC_STYLES.forEach(v => allKeys.push(`harmonic:${v}`));
    SOUND_TEXTURES.forEach(v => allKeys.push(`texture:${v}`));
    MIX_CHARS.forEach(v => allKeys.push(`mix:${v}`));
    SPECIFIC_INSTRUMENT_FLAT.forEach(i => allKeys.push(`si:${i.name}`));

    const CYCLES = 10;
    const INTERVAL = 140;
    for (let c = 0; c < CYCLES; c++) {
      const t = setTimeout(() => {
        // Pick ~8% of keys, assign random neon colors
        const map = new Map();
        const sample = [...allKeys].sort(() => Math.random() - 0.5)
          .slice(0, Math.max(1, Math.floor(allKeys.length * 0.08)));
        sample.forEach(k => {
          map.set(k, CASINO_OUTLINES[Math.floor(Math.random() * CASINO_OUTLINES.length)]);
        });
        setCasinoOutlines(map);
      }, c * INTERVAL);
      rollTimersRef.current.push(t);
    }
    // Final: clear outlines, commit random
    const done = setTimeout(() => {
      setCasinoOutlines(new Map());
      doRandomize();
      setIsRolling(false);
    }, CYCLES * INTERVAL);
    rollTimersRef.current.push(done);
  };

  const clearAll = () => {
    setState(ENGINE_DEF);
  };

  // Apply a preset config to the engine state — updates mode, lyricsOn, and
  // merges the preset's state snapshot over the defaults.
  const applyPreset = (preset) => {
    if (!preset) return;
    setMode(preset.mode || "moderated");
    setLyricsOn(preset.lyricsOn !== false);
    setState({
      ...ENGINE_DEF,
      ...preset.state,
      // Reset all locks/favorites so the preset feels fresh
      slotLocks: [false, false, false],
      sectionLocks: { ...ENGINE_DEF.sectionLocks },
      optionLocks: [],
      favorites: [],
      toggles: { ...ENGINE_DEF.toggles },
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  const shortResult = useMemo(() => compressShortPrompt(state, lyricsOn, maxLen), [state, lyricsOn, maxLen]);
  const detailedResult = useMemo(() => compressDetailedPrompt(state, lyricsOn, maxLen, mode), [state, lyricsOn, maxLen, mode]);
  const popHitScore = useMemo(() => calcPopHitScore(state, lyricsOn), [state, lyricsOn]);
  const hasMinimum = state.slots.some(Boolean);

  const doCopy = async (key, text) => {
    const ok = await copyToClipboard(text);
    setCopyState(s => ({ ...s, [key]: ok ? "copied" : "error" }));
    setTimeout(() => setCopyState(s => ({ ...s, [key]: "idle" })), 2000);
  };

  return (
    <div className={isRolling ? "engine-shake" : ""} style={{
      position: "relative",
      display: "flex", flexDirection: "column",
      height: isMobile ? "auto" : "calc(100vh - 57px)",
      minHeight: isMobile ? "calc(100vh - 53px)" : "auto",
      overflow: isMobile ? "visible" : "hidden",
    }}>
      {/* Casino particle canvas — always-on floating glitter */}
      <CasinoParticles isRolling={isRolling} />

      {/* Strobe flash overlay during roll */}
      {isRolling && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50,
          animation: "casinoStrobeFlash 0.12s linear infinite",
          mixBlendMode: "screen",
        }} />
      )}

      <style>{`
        @keyframes engineShake {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          10%  { transform: translate(-6px,-3px) rotate(-0.5deg); }
          20%  { transform: translate( 5px,-2px) rotate( 0.5deg); }
          30%  { transform: translate(-4px, 3px) rotate(-0.4deg); }
          40%  { transform: translate( 4px, 2px) rotate( 0.4deg); }
          50%  { transform: translate(-3px,-3px) rotate(-0.3deg); }
          60%  { transform: translate( 3px, 3px) rotate( 0.3deg); }
          70%  { transform: translate(-2px,-2px) rotate(-0.2deg); }
          80%  { transform: translate( 2px, 2px) rotate( 0.2deg); }
          90%  { transform: translate(-1px,-1px) rotate(-0.1deg); }
        }
        .engine-shake { animation: engineShake 0.42s cubic-bezier(.36,.07,.19,.97) infinite; }
        @keyframes casinoStrobeFlash {
          0%,100% { background: transparent; }
          25%     { background: ${V.neonGold}18; }
          50%     { background: ${V.hotPink}22; }
          75%     { background: ${V.cyan}18; }
        }
      `}</style>
      <div style={{
        flex: 1, minHeight: 0,
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1fr",
        overflow: isMobile ? "visible" : "hidden",
        position: "relative", zIndex: 1,
      }}>
        {/* LEFT PANE */}
        <div className={isMobile ? "" : "pane-scroll"} style={{
          overflowY: isMobile ? "visible" : "auto",
          overflowX: "hidden",
          borderRight: isMobile ? "none" : `1px solid ${T.border}`,
          borderBottom: isMobile ? `1px solid ${T.border}` : "none",
          padding: isMobile
            ? `${T.s5}px ${T.s4}px ${T.s6}px`
            : `${T.s8}px ${T.s7}px ${T.s10}px ${T.s8}px`,
        }}>
          {/* HERO — chrome HIT-ENGINE type */}
          <div style={{ marginBottom: isMobile ? T.s5 : T.s8 }}>
            <h1 style={{
              display: "flex", alignItems: "baseline", gap: "0.2em",
              flexWrap: "wrap",
              lineHeight: 1,
              margin: 0, marginBottom: isMobile ? T.s3 : T.s5,
              fontFamily: T.font_display,
              letterSpacing: "-0.02em",
            }}>
              <HitLogo size={isMobile ? 56 : 112} />
              <span style={{
                color: "#5A6275", fontStyle: "italic",
                fontSize: isMobile ? 36 : 80, fontWeight: 300,
              }}>·</span>
              <EngineLogo size={isMobile ? 56 : 112} />
            </h1>
            <p style={{
              color: T.text, fontSize: T.fs_lg, lineHeight: 1.5,
              maxWidth: 600, margin: 0, marginBottom: T.s3,
              fontFamily: T.font_sans, fontWeight: 500,
            }}>
              Deterministic prompt engine for modern AI music generators.
            </p>
            <p style={{
              color: T.textSec, fontSize: T.fs_md, lineHeight: 1.55,
              maxWidth: 600, margin: 0, marginBottom: T.s3,
              fontFamily: T.font_sans,
            }}>
              Pick a genre. Hit the red button. Get a prompt engineered for how the models actually read language.
            </p>
            <p style={{
              color: T.textTer, fontSize: T.fs_sm, lineHeight: 1.55,
              maxWidth: 600, margin: 0, fontFamily: T.font_sans,
            }}>
              <span style={{ color: T.text, fontWeight: 500 }}>Click</span> to select
              {" · "}
              <span style={{ color: T.text, fontWeight: 500 }}>Double-click</span> to favorite
              {" · "}
              <span style={{ color: V.neonGold, fontWeight: 500 }}>Right-click</span> to lock from randomize
            </p>
          </div>

          {/* ── PRESETS ─ quick-start configurations ──────────────────────── */}
          {features.presets ? (
            <div style={{ marginBottom: T.s6 }}>
              <Label color={T.textSec} style={{ display: "block", marginBottom: T.s3 }}>
                Presets
              </Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: T.s2 }}>
                {PRESETS.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: T.s2,
                      padding: isMobile ? `10px 14px` : `${T.s2}px ${T.s3}px`,
                      minHeight: isMobile ? 44 : "auto",
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: T.r_md,
                      color: T.textSec,
                      fontFamily: T.font_sans, fontSize: T.fs_sm, fontWeight: 500,
                      cursor: "pointer",
                      transition: `all ${T.dur_fast} ${T.ease}`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = T.borderFocus;
                      e.currentTarget.style.color = T.text;
                      e.currentTarget.style.background = T.elevated;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = T.border;
                      e.currentTarget.style.color = T.textSec;
                      e.currentTarget.style.background = T.surface;
                    }}>
                    <span style={{ fontSize: T.fs_base }}>{p.emoji}</span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <TierLock feature="Quick-start presets" requiredTier="pro" />
          )}

          <Section>
            <LyricalSwitch value={lyricsOn} onChange={setLyricsOn} />
          </Section>

          <Section title="Genre slots" hint="Up to 3. Main genre alone is fine.">
            <GenreSlotPicker slots={state.slots} onChange={v => set("slots", v)}
              slotLocks={state.slotLocks} onToggleSlotLock={toggleSlotLock}
              maxSlots={effectiveLimits.maxSlots}
              restrictSubgenres={effectiveLimits.restrictSubgenres}
              locksDisabled={!effectiveLimits.locksAvailable} />
          </Section>

          <Section title="Mood"
            toggle={state.toggles.mood} onToggleChange={v => setToggle("mood", v)}
            extra={renderLockBtn("mood")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {MOODS.map((o, i) => (
                <Chip key={o} label={o} selected={state.mood === o}
                  favorite={favSetFor("mood").has(o)}
                  locked={optionLockSetFor("mood").has(o)}
                  tierLocked={isOptionLocked(i)}
                  casinoOutline={casinoOutlines.get(`mood:${o}`)}
                  onClick={() => set("mood", state.mood === o ? "" : o)}
                  onDoubleClick={() => toggleFavorite("mood", o)}
                  onLockToggle={() => toggleOptionLock("mood", o)} />
              ))}
            </div>
          </Section>

          <Section title="Energy arc"
            toggle={state.toggles.energy} onToggleChange={v => setToggle("energy", v)}
            extra={renderLockBtn("energy")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {ENERGIES.map((o, i) => (
                <Chip key={o} label={o} selected={state.energy === o}
                  favorite={favSetFor("energy").has(o)}
                  locked={optionLockSetFor("energy").has(o)}
                  tierLocked={isOptionLocked(i)}
                  casinoOutline={casinoOutlines.get(`energy:${o}`)}
                  onClick={() => set("energy", state.energy === o ? "" : o)}
                  onDoubleClick={() => toggleFavorite("energy", o)}
                  onLockToggle={() => toggleOptionLock("energy", o)} />
              ))}
            </div>
          </Section>

          <Section title="Groove" hint="Sets the rhythmic feel."
            toggle={state.toggles.groove} onToggleChange={v => setToggle("groove", v)}
            extra={renderLockBtn("groove")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {GROOVES.map((g, i) => (
                <Chip key={g.id} label={g.label} selected={state.groove === g.id}
                  favorite={favSetFor("groove").has(g.id)}
                  locked={optionLockSetFor("groove").has(g.id)}
                  tierLocked={isOptionLocked(i)}
                  casinoOutline={casinoOutlines.get(`groove:${g.id}`)}
                  onClick={() => set("groove", g.id)}
                  onDoubleClick={() => toggleFavorite("groove", g.id)}
                  onLockToggle={() => toggleOptionLock("groove", g.id)} />
              ))}
            </div>
          </Section>

          {lyricsOn && (
            <>
              <Section title="Vocalist"
                toggle={state.toggles.vocalist} onToggleChange={v => setToggle("vocalist", v)}
                extra={renderLockBtn("vocalist")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
                  {VOCALISTS.map((o, i) => (
                    <Chip key={o} label={o} selected={state.vocalist === o}
                      favorite={favSetFor("vocalist").has(o)}
                      locked={optionLockSetFor("vocalist").has(o)}
                      tierLocked={isOptionLocked(i)}
                      casinoOutline={casinoOutlines.get(`vocalist:${o}`)}
                      onClick={() => set("vocalist", state.vocalist === o ? "" : o)}
                      onDoubleClick={() => toggleFavorite("vocalist", o)}
                      onLockToggle={() => toggleOptionLock("vocalist", o)} />
                  ))}
                </div>
              </Section>

              <Section title="Language" hint="Shifts vocal phrasing and cadence."
                toggle={state.toggles.language} onToggleChange={v => setToggle("language", v)}
                extra={renderLockBtn("language")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
                  {LANGUAGES.map(lang => (
                    <Chip key={lang.code} label={lang.label} selected={state.language === lang.code}
                      favorite={favSetFor("language").has(lang.code)}
                      locked={optionLockSetFor("language").has(lang.code)}
                      casinoOutline={casinoOutlines.get(`language:${lang.code}`)}
                      onClick={() => set("language", lang.code)}
                      onDoubleClick={() => toggleFavorite("language", lang.code)}
                      onLockToggle={() => toggleOptionLock("language", lang.code)} />
                  ))}
                </div>
              </Section>

              <Section title="Lyrical vibe" hint="How the words frame the song."
                toggle={state.toggles.lyricalVibe} onToggleChange={v => setToggle("lyricalVibe", v)}
                extra={renderLockBtn("lyricalVibe")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
                  {LYRICAL_VIBES.map((o, i) => (
                    <Chip key={o} label={o} selected={state.lyricalVibe === o}
                      favorite={favSetFor("lyricalVibe").has(o)}
                      locked={optionLockSetFor("lyricalVibe").has(o)}
                      tierLocked={isOptionLocked(i)}
                      casinoOutline={casinoOutlines.get(`lyricalVibe:${o}`)}
                      onClick={() => set("lyricalVibe", state.lyricalVibe === o ? "" : o)}
                      onDoubleClick={() => toggleFavorite("lyricalVibe", o)}
                      onLockToggle={() => toggleOptionLock("lyricalVibe", o)} />
                  ))}
                </div>
              </Section>
            </>
          )}

          <Section title="Specific instruments"
            hint={
              state.toggles.specificInstruments === "off" ? "Excluded."
              : state.toggles.specificInstruments === "on"
                ? `${state.specificInstruments.length} selected. Forced count: ${state.specificCount}.`
                : `${state.specificInstruments.length} selected. Auto.`
            }
            toggle={state.toggles.specificInstruments}
            onToggleChange={v => setToggle("specificInstruments", v)}
            extra={
              <div style={{ display: "flex", alignItems: "center", gap: T.s2 }}>
                {state.toggles.specificInstruments === "on" && (
                  <>
                    <Label color={T.textTer}>Count</Label>
                    <CountStepper value={state.specificCount} onChange={v => set("specificCount", v)} />
                  </>
                )}
                {renderLockBtn("specificInstruments")}
              </div>
            }>
            <SpecificInstrumentsPicker state={state} setState={setState}
              favorites={favSetFor("specificInstruments")}
              onFavorite={v => toggleFavorite("specificInstruments", v)}
              optionLocks={optionLockSetFor("specificInstruments")}
              onLockToggle={v => toggleOptionLock("specificInstruments", v)}
              casinoOutlines={casinoOutlines}
              maxPerCategory={Math.max(5, effectiveLimits.maxOptionsPerSection)} />
          </Section>

          <Section title="Harmonic style"
            toggle={state.toggles.harmonic} onToggleChange={v => setToggle("harmonic", v)}
            extra={renderLockBtn("harmonic")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {HARMONIC_STYLES.map((o, i) => (
                <Chip key={o} label={o} selected={state.harmonic === o}
                  favorite={favSetFor("harmonic").has(o)}
                  locked={optionLockSetFor("harmonic").has(o)}
                  tierLocked={isOptionLocked(i)}
                  casinoOutline={casinoOutlines.get(`harmonic:${o}`)}
                  onClick={() => set("harmonic", state.harmonic === o ? "" : o)}
                  onDoubleClick={() => toggleFavorite("harmonic", o)}
                  onLockToggle={() => toggleOptionLock("harmonic", o)} />
              ))}
            </div>
          </Section>

          <Section title="Sound texture"
            toggle={state.toggles.texture} onToggleChange={v => setToggle("texture", v)}
            extra={renderLockBtn("texture")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {SOUND_TEXTURES.map((o, i) => (
                <Chip key={o} label={o} selected={state.texture === o}
                  favorite={favSetFor("texture").has(o)}
                  locked={optionLockSetFor("texture").has(o)}
                  tierLocked={isOptionLocked(i)}
                  casinoOutline={casinoOutlines.get(`texture:${o}`)}
                  onClick={() => set("texture", state.texture === o ? "" : o)}
                  onDoubleClick={() => toggleFavorite("texture", o)}
                  onLockToggle={() => toggleOptionLock("texture", o)} />
              ))}
            </div>
          </Section>

          <Section title="Mix character"
            toggle={state.toggles.mix} onToggleChange={v => setToggle("mix", v)}
            extra={renderLockBtn("mix")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {MIX_CHARS.map((o, i) => (
                <Chip key={o} label={o} selected={state.mix === o}
                  favorite={favSetFor("mix").has(o)}
                  locked={optionLockSetFor("mix").has(o)}
                  tierLocked={isOptionLocked(i)}
                  casinoOutline={casinoOutlines.get(`mix:${o}`)}
                  onClick={() => set("mix", state.mix === o ? "" : o)}
                  onDoubleClick={() => toggleFavorite("mix", o)}
                  onLockToggle={() => toggleOptionLock("mix", o)} />
              ))}
            </div>
          </Section>
        </div>

        {/* RIGHT PANE */}
        <div className={isMobile ? "" : "pane-scroll"} style={{
          overflowY: isMobile ? "visible" : "auto",
          overflowX: "hidden",
          padding: isMobile
            ? `${T.s6}px ${T.s4}px ${T.s8}px`
            : `${T.s8}px ${T.s8}px ${T.s10}px ${T.s7}px`,
        }}>
          <div style={{ marginBottom: T.s5, display: "flex", flexDirection: "column", gap: T.s3 }}>
            <FuelGearshift compact={isMobile} />
            <HitButton onRandomize={triggerHit} isRolling={isRolling}
              disabled={Number.isFinite(fuels[activeFuel]) && fuels[activeFuel] <= 0}
              compact={isMobile} fuelType={activeFuel} />
            {/* Transient toast — shows when user clicks HIT with 0 fuel */}
            {toast && (
              <div style={{
                padding: "10px 14px",
                background: toast.kind === "warn" ? `${T.danger}15` : `${T.accent}15`,
                border: `1px solid ${toast.kind === "warn" ? T.danger : T.accent}44`,
                borderRadius: 6,
                fontSize: 12, fontFamily: T.font_sans,
                color: toast.kind === "warn" ? T.danger : T.accent,
                fontWeight: 500, lineHeight: 1.4,
                animation: "pageFadeIn 220ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                {toast.text}
              </div>
            )}
            {Number.isFinite(fuels[activeFuel]) && fuels[activeFuel] <= 0 && (
              <div style={{
                padding: "8px 12px",
                background: `${FUEL_TYPES[activeFuel].color}11`,
                border: `1px dashed ${FUEL_TYPES[activeFuel].color}55`,
                borderRadius: 6,
                fontSize: 11, fontFamily: T.font_mono, fontWeight: 700,
                color: FUEL_TYPES[activeFuel].color,
                textAlign: "center", letterSpacing: "0.15em",
              }}>
                {FUEL_TYPES[activeFuel].label.toUpperCase()} EMPTY · REFILLS TOMORROW
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll} style={{ alignSelf: "flex-start" }}>
              Clear all
            </Button>
          </div>

          <div style={{ marginBottom: T.s5 }}>
            <ModeSelector value={mode} onChange={setMode} allowedModes={effectiveLimits.modes} />
          </div>

          {hasMinimum ? (
            <div style={{ display: "flex", flexDirection: "column", gap: T.s4 }}>
              {features.popHitMeter ? (
                <PopHitMeter score={popHitScore.score} verdict={popHitScore.verdict} notes={popHitScore.notes}
                  showDebug={features.adminDebug} state={state} lyricsOn={lyricsOn} />
              ) : (
                <TierLock feature="Pop-hit match meter" requiredTier="pro" />
              )}

              <OutputBlock title="Short prompt" subtitle="Comma-separated tags. For style fields."
                text={shortResult.text} length={shortResult.text.length} limit={maxLen}
                compressed={shortResult.compressed} compressionLevel={shortResult.level}
                onCopy={() => doCopy("short", shortResult.text)} copyState={copyState.short} />

              <OutputBlock title="Detailed producer prompt" subtitle="Natural language. For description fields."
                text={detailedResult.text} length={detailedResult.text.length} limit={maxLen}
                compressed={detailedResult.compressed} compressionLevel={detailedResult.level}
                onCopy={() => doCopy("detailed", detailedResult.text)} copyState={copyState.detailed} multiline />
            </div>
          ) : (
            <WorkflowGuide />
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FUTURE OF SOUND — editorial page, clean type hierarchy
// ════════════════════════════════════════════════════════════════════════════

function FuturePage() {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const sections = [
    {
      num: "I",
      title: "The decoupling of taste from craft",
      body: "For most of recorded history, taste and craft were inseparable — you could not have strong opinions about music unless you had done the work of making it, or at least the work of listening deeply enough to know what making it required. The skills overlapped. To love music was, inevitably, to develop some kind of sensibility about how it was constructed, how performances differed, how mixing decisions shaped feeling. That era is ending. Generative tools have decoupled the ability to produce music from the knowledge of how music works. This is not a moral failure; it is a mechanical one. The tools no longer require their users to know anything. What follows is a cultural split between a class of people who have opinions refined by decades of listening and making, and a class of people who can produce finished-sounding music without any of that apparatus. The second class will outnumber the first by orders of magnitude within five years.",
    },
    {
      num: "II",
      title: "Genres fragment faster than they consolidate",
      body: "The old pattern was: a new sound emerges somewhere specific, spreads slowly through regional scenes, gets named by critics, gets codified by imitators, enters the mainstream as a recognizable category. That pattern required time — usually a decade. We do not have that kind of time anymore. A new subgenre can appear on a Saturday and have forty thousand tracks using its conventions by the next Saturday. By the third Saturday, the original is unrecognizable as a category. What were once slow geological layers of musical history are now rapid sedimentation: thin, indistinct, barely visible as separate strata.",
    },
    {
      num: "III",
      title: "The global South becomes the center",
      body: "The premise that popular music would continue to emerge primarily from New York, London, and Los Angeles is finished. Lagos, São Paulo, Mumbai, Seoul, Jakarta, Mexico City, Medellín, Johannesburg — these are the cities where the listening numbers and the creative output now concentrate. The tools are everywhere. The audiences are everywhere. The only thing that used to be geographically concentrated was distribution, and distribution is now trivial. What this means for the Anglo-American music tradition is a quieter half-century: not death, but decentering.",
    },
    {
      num: "IV",
      title: "The loudness war is over — so is the quietness reaction",
      body: "For two decades the argument was: everything is too loud, the dynamic range has collapsed, the mix has no air. Then for a decade the counter-argument was: pull it back, let it breathe, make it quiet. Both positions are now historical. The mix decisions that matter in the next decade are not about loudness at all — they are about what the listening environment demands. Car speakers, bluetooth earbuds, laptop speakers in coffee shops, phone speakers held flat on a table. These contexts have their own physics. The mix that wins is the one tuned for the context, not the one tuned for a reference monitor in a studio nobody listens on.",
    },
    {
      num: "V",
      title: "Lo-fi is a refusal, not an aesthetic",
      body: "When a producer in 2026 leaves tape hiss in a mix, or doesn't correct the pitch of a vocal take, or keeps a guitar amp buzzing through a quiet section — that is not nostalgia. It is a refusal. It is a refusal of the sterile perfection the tools now offer by default. Every generation's definition of authentic sound has been, in part, a refusal of what the tools wanted to do on their own. The current refusal is unusually sharp because the tools have become unusually seamless. Expect lo-fi as a statement, not as a genre, to be one of the dominant formal gestures of the next decade.",
    },
    {
      num: "VI",
      title: "The song is shrinking",
      body: "Streaming math has been quietly reshaping song form for a decade. The intro is gone. The bridge is gone. The second verse is shorter than the first. The chorus comes in before the thirty-second mark or the track gets skipped. None of this is controversial anymore — it is simply the format. What is less remarked on is that the song itself, as an object, is shrinking. Two minutes is becoming the median. Ninety seconds is not rare. At some point the song as we understood it for the last seventy years — a three-to-four-minute object with a beginning, middle, and end — will no longer be the default unit of music. Something smaller and more modular will be.",
    },
    {
      num: "VII",
      title: "Live performance is the last real thing",
      body: "Everything else can be faked, simulated, generated, interpolated. Live performance — a human in a room playing an instrument in front of other humans — is the one thing that cannot be substituted. Expect a reorganization of the music economy around this fact. Recorded music becomes promotion for the show. The show is where the money is, where the meaning is, and where the audience forms actual allegiances. This is not nostalgia; it is a structural consequence of what happens when everything downstream of the room becomes infinitely reproducible.",
    },
    {
      num: "VIII",
      title: "The tool will not save you",
      body: "Every generation of producers has believed, briefly, that the new tool would democratize music-making and that the flood of new work would include a much larger share of genuine talent than the old gatekeeper system permitted. Every generation has been wrong. The flood is real; the flood of talent is not. Talent turns out to be rare in a way that tools do not change. What tools change is how visible the mediocre becomes, and how much harder the real thing has to work to be heard. If you want to make something good, the tool will not save you. It has never saved anyone. The work is still the work.",
    },
  ];
  return (
    <div style={{
      maxWidth: 820, margin: "0 auto",
      padding: isMobile
        ? `${T.s6}px ${T.s4}px ${T.s8}px`
        : `${T.s10}px ${T.s7}px ${T.s10}px`,
    }}>
      <Label color={T.textTer} style={{ display: "block", marginBottom: T.s4 }}>
        Future of Sound · Volume 01
      </Label>
      <h1 style={{
        fontSize: "clamp(40px, 5.5vw, 72px)",
        lineHeight: 1.0, letterSpacing: "-0.03em",
        margin: 0, marginBottom: T.s5,
        fontFamily: T.font_sans, fontWeight: 600,
        color: T.text,
      }}>
        Eight theses on where music is going
      </h1>
      <p style={{
        color: T.textSec, fontSize: T.fs_xl, lineHeight: 1.5,
        marginBottom: T.s10, maxWidth: 640, fontFamily: T.font_sans,
      }}>
        A set of observations about the near future of music-making and music-consumption. Written to be disagreed with.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: T.s9 }}>
        {sections.map(s => (
          <article key={s.num} style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: T.s6,
          }}>
            <div style={{ display: "flex", gap: T.s6, alignItems: "baseline", marginBottom: T.s4 }}>
              <span style={{
                fontFamily: T.font_mono, fontSize: T.fs_md,
                color: T.textTer, letterSpacing: "0.08em",
                minWidth: 40,
              }}>{s.num}</span>
              <h2 style={{
                fontSize: T.fs_2xl, fontWeight: 600,
                letterSpacing: "-0.015em", lineHeight: 1.2,
                margin: 0, fontFamily: T.font_sans,
                color: T.text,
              }}>{s.title}</h2>
            </div>
            <p style={{
              color: T.textSec, fontSize: T.fs_lg, lineHeight: 1.65,
              margin: 0, paddingLeft: 62,
              fontFamily: T.font_sans,
            }}>{s.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GENRE HISTORY — data visualization page
// ════════════════════════════════════════════════════════════════════════════

// Relative cultural weight (0-100) of genres by year. Editorial estimates,
// not billboard chart data. Used as a visual narrative tool only.
// ════════════════════════════════════════════════════════════════════════════
// GENRE HISTORY — curated popularity curves + trend-index scoring
// ════════════════════════════════════════════════════════════════════════════
// Every entry: [[year, popularity 0-100], ...]. Curves hand-authored to
// reflect cultural weight, not raw streams. Covers main genres + notable
// subgenres across the full GENRE_TREE.
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// GENRE LINEAGE — parent/child evolutionary relationships with context.
// Each node has: era (year range), description, traits, key artists, parent(s).
// Multiple parents allowed for hybrid genres (e.g., Tech House = House + Techno).
// A genre's roots are what fed INTO it; children are what grew OUT of it.
// ────────────────────────────────────────────────────────────────────────────
const GENRE_LINEAGE = {
  // ── ROOTS (no parents — foundational genres) ────────────────────────────
  "Blues":               { parents: [], era: "1900s–", description: "The emotional foundation of American popular music. Call-and-response vocals, 12-bar structure, bent notes.", traits: ["12-bar form","blue notes","call-and-response"], artists: ["Robert Johnson","Muddy Waters","B.B. King"] },
  "Jazz":                { parents: ["Blues"], era: "1910s–", description: "Improvisation as art form. Swing, syncopation, and harmonic sophistication born in New Orleans.", traits: ["improvisation","swing rhythm","complex harmony"], artists: ["Louis Armstrong","Miles Davis","John Coltrane"] },
  "Gospel":              { parents: [], era: "1920s–", description: "Sacred music with emotional intensity. Vocal power, call-and-response, organ-driven.", traits: ["vocal power","call-and-response","church organ"], artists: ["Mahalia Jackson","Kirk Franklin"] },
  "Folk":                { parents: [], era: "Pre-1900s–", description: "Acoustic storytelling traditions passed orally. Protest, narrative, and community song.", traits: ["acoustic","narrative lyrics","tradition"], artists: ["Woody Guthrie","Bob Dylan","Joan Baez"] },
  "Country":             { parents: ["Folk","Blues"], era: "1920s–", description: "American rural storytelling — twang, steel guitar, fiddle, narrative.", traits: ["twang vocals","pedal steel","storytelling"], artists: ["Hank Williams","Dolly Parton","Johnny Cash"] },

  // ── R&B / SOUL family ──────────────────────────────────────────────────
  "R&B / Soul":          { parents: ["Blues","Gospel","Jazz"], era: "1940s–", description: "Rhythm-and-blues married gospel feel to blues structure. Later became 'soul'.", traits: ["groove-based","emotional vocals","horn sections"], artists: ["Ray Charles","Aretha Franklin","Stevie Wonder"] },
  "Funk":                { parents: ["R&B / Soul","Jazz"], era: "1967–", description: "The one. Emphasis on groove over melody, syncopated bass, tight horns.", traits: ["syncopated bass","the one","horn stabs"], artists: ["James Brown","Parliament","Sly Stone"] },
  "Disco":               { parents: ["Funk","R&B / Soul"], era: "1974–1980", description: "Four-on-the-floor dance music from clubs. Strings, hi-hats, lush production.", traits: ["four-on-the-floor","lush strings","open hi-hats"], artists: ["Donna Summer","Chic","Bee Gees"] },
  "Neo-Soul":            { parents: ["R&B / Soul","Funk","Hip-Hop"], era: "1994–", description: "Soul music filtered through hip-hop's lens. Live instruments, organic grooves.", traits: ["organic production","jazz harmony","head-nod tempo"], artists: ["D'Angelo","Erykah Badu","Jill Scott"] },
  "Contemporary R&B":    { parents: ["R&B / Soul","Hip-Hop","Pop"], era: "1990s–", description: "Mainstream R&B with hip-hop production and pop songcraft.", traits: ["polished vocals","programmed drums","melismatic runs"], artists: ["Usher","Beyoncé","Mariah Carey"] },
  "Alt R&B":             { parents: ["Contemporary R&B","Electronic"], era: "2010–", description: "Moody, atmospheric R&B with electronic textures and space.", traits: ["dark mood","pitched vocals","sparse arrangement"], artists: ["The Weeknd","Frank Ocean","Jhené Aiko"] },
  "Trap Soul":           { parents: ["Alt R&B","Trap"], era: "2014–", description: "R&B vocals over trap drum programming. Bryson Tiller's invention.", traits: ["trap drums","soulful vocals","auto-tune"], artists: ["Bryson Tiller","6LACK","PartyNextDoor"] },
  "New Jack Swing":      { parents: ["R&B / Soul","Hip-Hop"], era: "1987–1996", description: "Teddy Riley's fusion of hip-hop beats with R&B singing.", traits: ["swing 16ths","synth stabs","R&B hooks"], artists: ["Bobby Brown","Guy","Teddy Riley"] },

  // ── HIP-HOP family ──────────────────────────────────────────────────────
  "Hip-Hop":             { parents: ["Funk","Disco"], era: "1973–", description: "DJ Kool Herc's party loops became rhythmic spoken word. Born in the Bronx.", traits: ["sampled drums","rhyming cadence","turntablism"], artists: ["Run-DMC","Nas","Kendrick Lamar"] },
  "Boom Bap":            { parents: ["Hip-Hop"], era: "1988–1996", description: "Golden-era east-coast sound. Punchy drums, jazz samples, lyricism-first.", traits: ["SP-1200 drums","jazz loops","complex lyricism"], artists: ["A Tribe Called Quest","Wu-Tang","DJ Premier"] },
  "Gangsta Rap":         { parents: ["Hip-Hop"], era: "1988–", description: "West coast street narratives. Hard drums, funk samples, confrontational.", traits: ["street narratives","funk samples","explicit lyrics"], artists: ["N.W.A","Dr. Dre","Ice Cube"] },
  "Conscious Hip-Hop":   { parents: ["Hip-Hop"], era: "1988–", description: "Politically engaged hip-hop. Social commentary over beats.", traits: ["political lyrics","jazz samples","spoken word feel"], artists: ["Public Enemy","Common","Mos Def"] },
  "Trap":                { parents: ["Gangsta Rap","Crunk"], era: "2003–", description: "Atlanta's street sound. Rolling 808s, hi-hat triplets, dark synths.", traits: ["808 bass","hi-hat rolls","dark synths"], artists: ["T.I.","Gucci Mane","Young Thug"] },
  "Melodic Rap":         { parents: ["Trap","Auto-Tune R&B"], era: "2013–", description: "Rap where the hook is sung, not rapped. Trap drums + melody.", traits: ["sung hooks","auto-tune","melodic flow"], artists: ["Future","Juice WRLD","Lil Uzi Vert"] },
  "Drill":               { parents: ["Trap"], era: "2012–", description: "Chicago's minimalist menace. Sparse beats, sliding 808s, monotone flows.", traits: ["sliding 808s","half-time","monotone flow"], artists: ["Chief Keef","Pop Smoke","Fivio Foreign"] },
  "Jersey Drill":        { parents: ["Drill","Jersey Club"], era: "2020–", description: "Drill mixed with Jersey club bounce. Breakbeats under drill bars.", traits: ["breakbeat drums","drill bars","high BPM"], artists: ["Sha Ek","Bandmanrill"] },
  "Phonk":               { parents: ["Trap","Memphis Rap"], era: "2014–", description: "Viral TikTok genre. Cowbells, Memphis vocal chops, distorted 808s.", traits: ["cowbell","vocal chops","distortion"], artists: ["DVRST","Kordhell"] },
  "Rage Rap":            { parents: ["Trap","Hyperpop"], era: "2019–", description: "Distorted synths + aggressive energy. Playboi Carti's influence.", traits: ["distorted synths","aggressive vocals","fast tempo"], artists: ["Playboi Carti","Yeat","Ken Carson"] },
  "Cloud Rap":           { parents: ["Trap"], era: "2010–2019", description: "Hazy, dreamlike rap. Ethereal samples, reverb-drenched vocals.", traits: ["ethereal samples","reverb","dreamy mood"], artists: ["Clams Casino","A$AP Rocky","Lil B"] },
  "Lo-Fi Hip-Hop":       { parents: ["Boom Bap","Jazz"], era: "2010–", description: "Study-session hip-hop. Jazzy chops, vinyl crackle, head-nod tempo.", traits: ["vinyl crackle","jazz chops","low tempo"], artists: ["Nujabes","J Dilla","ChilledCow"] },
  "Grime":               { parents: ["Hip-Hop","UK Garage"], era: "2002–", description: "UK's aggressive electronic rap. 140 BPM, dystopian synths.", traits: ["140 BPM","square-wave bass","UK slang"], artists: ["Dizzee Rascal","Skepta","Stormzy"] },
  "French Rap":          { parents: ["Hip-Hop"], era: "1990–", description: "France's thriving rap scene. Diverse styles, multilingual.", traits: ["diverse production","French lyricism","afro-influences"], artists: ["IAM","Booba","Ninho"] },
  "Latin Rap":           { parents: ["Hip-Hop"], era: "1989–", description: "Spanish-language hip-hop. Roots in bilingual NYC, now global.", traits: ["Spanish lyrics","Latin percussion","reggaeton crossover"], artists: ["Cypress Hill","Daddy Yankee","Bad Bunny"] },
  "Memphis Rap":         { parents: ["Hip-Hop","Gangsta Rap"], era: "1989–", description: "Dark, horror-influenced southern rap. Seminal for phonk.", traits: ["horror samples","808 kicks","slowed vocals"], artists: ["Three 6 Mafia","DJ Screw"] },
  "Crunk":               { parents: ["Gangsta Rap","Miami Bass"], era: "1993–", description: "Party-ready southern rap. Shouted hooks, 808 stomp.", traits: ["shouted hooks","808 stomp","call-and-response"], artists: ["Lil Jon","Three 6 Mafia"] },
  "Plugg":               { parents: ["Trap"], era: "2015–", description: "Dreamy trap subgenre. Plucky synths, lo-fi drums.", traits: ["plucky synths","dreamy pads","lo-fi drums"], artists: ["MexikoDro","StoopidXool"] },

  // ── ELECTRONIC family ──────────────────────────────────────────────────
  "Electronic":          { parents: ["Disco","Funk"], era: "1970s–", description: "Umbrella for synthesizer-driven dance music.", traits: ["synthesizers","programmed drums","dance-floor focus"], artists: ["Kraftwerk","Giorgio Moroder"] },
  "House":               { parents: ["Disco"], era: "1984–", description: "Chicago's 4/4 dance music. Drum machine + disco soul.", traits: ["4/4 kick","soulful vocals","128 BPM"], artists: ["Frankie Knuckles","Larry Heard"] },
  "Deep House":          { parents: ["House","Jazz"], era: "1986–", description: "House with jazz chords and warmer moods.", traits: ["jazz chords","pads","warm bass"], artists: ["Larry Heard","KDJ","Moodymann"] },
  "Tech-House":          { parents: ["House","Techno"], era: "1993–", description: "House grooves with techno's mechanical precision.", traits: ["driving groove","mechanical","125 BPM"], artists: ["Jamie Jones","Hot Since 82"] },
  "Afro House":          { parents: ["House","Afrobeats"], era: "1998–", description: "House music with African percussion and vocals.", traits: ["African percussion","tribal vocals","120-125 BPM"], artists: ["Black Coffee","Themba"] },
  "Amapiano":            { parents: ["House","Kwaito"], era: "2012–", description: "South African piano-house. Log drums, jazzy piano, deep bass.", traits: ["log drum","jazz piano","110 BPM"], artists: ["Kabza De Small","DJ Maphorisa"] },
  "Techno":              { parents: ["Electro","House"], era: "1985–", description: "Detroit's industrial dance music. Machine funk.", traits: ["mechanical","minimal","130+ BPM"], artists: ["Jeff Mills","Richie Hawtin","Robert Hood"] },
  "Minimal Techno":      { parents: ["Techno"], era: "1992–", description: "Stripped-down techno. Repetition and subtle variation.", traits: ["minimalism","hypnotic","subtle changes"], artists: ["Plastikman","Villalobos"] },
  "Trance":              { parents: ["Techno","Ambient"], era: "1990–", description: "Euphoric electronic music. Rising arpeggios, big breakdowns.", traits: ["arpeggios","big breakdowns","140 BPM"], artists: ["Paul van Dyk","Tiësto","Armin van Buuren"] },
  "Drum & Bass":         { parents: ["Jungle","Breakbeat"], era: "1993–", description: "High-tempo breakbeat music. Amen break derivatives.", traits: ["Amen break","170 BPM","sub bass"], artists: ["Goldie","LTJ Bukem","Sub Focus"] },
  "Jungle":              { parents: ["Breakbeat","Reggae"], era: "1991–", description: "UK breakbeat with reggae bass. Precursor to D&B.", traits: ["chopped breaks","reggae bass","ragga vocals"], artists: ["A Guy Called Gerald","Shy FX"] },
  "Dubstep":             { parents: ["UK Garage","Jungle","Dub"], era: "2002–", description: "UK bass music. Half-time drums, wobbling bass.", traits: ["wobble bass","half-time","140 BPM"], artists: ["Skream","Benga","Skrillex"] },
  "UK Garage":           { parents: ["House","Jungle"], era: "1995–", description: "UK's syncopated dance music. Swing, 2-step drum patterns.", traits: ["2-step drums","swing","pitched vocals"], artists: ["MJ Cole","Artful Dodger"] },
  "Jersey Club":         { parents: ["Baltimore Club"], era: "2001–", description: "NJ dance music. Bed-squeak samples, triplet drums.", traits: ["triplet drums","bed squeak","call-and-response"], artists: ["DJ Sliink","UNIIQU3"] },
  "Baltimore Club":      { parents: ["House","Breakbeat"], era: "1991–", description: "Baltimore's party music. Breakbeat + 8-bar vocal loops.", traits: ["breakbeat","8-bar loops","party chants"], artists: ["DJ Technics","Rod Lee"] },
  "Electro":             { parents: ["Funk","Disco"], era: "1982–", description: "Robotic funk. Drum machines, vocoders, Kraftwerk-influenced.", traits: ["drum machines","vocoder","robotic feel"], artists: ["Afrika Bambaataa","Egyptian Lover"] },
  "Ambient":             { parents: ["Electronic"], era: "1978–", description: "Music as atmosphere. Eno's founding concept — meant for background.", traits: ["atmospheric","slow evolution","minimal rhythm"], artists: ["Brian Eno","Aphex Twin","Tim Hecker"] },
  "Breakbeat":           { parents: ["Hip-Hop","Funk"], era: "1986–", description: "Dance music built on funk drum breaks.", traits: ["funk breaks","140 BPM","sample-heavy"], artists: ["The Prodigy","Fatboy Slim"] },

  // ── POP family ─────────────────────────────────────────────────────────
  "Pop":                 { parents: ["R&B / Soul","Rock"], era: "1950s–", description: "Mainstream commercial music. Hook-driven, broad appeal.", traits: ["strong hooks","polished production","3-4 min songs"], artists: ["The Beatles","Michael Jackson","Taylor Swift"] },
  "Dark Pop":            { parents: ["Pop","Alt R&B"], era: "2010–", description: "Moody, cinematic pop. Minor keys, atmospheric production.", traits: ["minor keys","atmospheric","brooding"], artists: ["Billie Eilish","Lana Del Rey","Lorde"] },
  "Bedroom Pop":         { parents: ["Pop","Indie"], era: "2015–", description: "Home-recorded intimate pop. DIY aesthetics.", traits: ["lo-fi production","intimate vocals","DIY feel"], artists: ["Clairo","Gus Dapperton","Beabadoobee"] },
  "Hyperpop":            { parents: ["Pop","Electronic"], era: "2017–", description: "Maximalist pop. Abrasive, pitched vocals, PC Music aesthetic.", traits: ["abrasive synths","pitched vocals","high BPM"], artists: ["100 gecs","Charli XCX","SOPHIE"] },
  "K-Pop":               { parents: ["Pop","Hip-Hop","R&B / Soul"], era: "1992–", description: "Korean pop with global production ambition. Genre-fluid.", traits: ["genre-fluid","choreographed","idol system"], artists: ["BTS","BLACKPINK","NewJeans"] },
  "J-Pop":               { parents: ["Pop","Rock"], era: "1990–", description: "Japanese pop with idiosyncratic songwriting traditions.", traits: ["complex chords","idol culture","genre-blending"], artists: ["Utada Hikaru","Arashi"] },
  "City Pop":            { parents: ["Funk","Disco","J-Pop"], era: "1978–1989", description: "Japanese 80s sophisticated pop. Revived globally via YouTube.", traits: ["slap bass","jazz chords","80s polish"], artists: ["Tatsuro Yamashita","Mariya Takeuchi"] },
  "Auto-Tune R&B":       { parents: ["Contemporary R&B","Electronic"], era: "2008–", description: "R&B where auto-tune is the lead texture, not correction.", traits: ["pitched vocals","auto-tune melodies","atmospheric"], artists: ["T-Pain","Kanye (808s)","Travis Scott"] },

  // ── ROCK family ────────────────────────────────────────────────────────
  "Rock":                { parents: ["Blues","Country","R&B / Soul"], era: "1954–", description: "Amplified guitar-based music. The dominant pop form of 20th century.", traits: ["electric guitar","backbeat","verse-chorus"], artists: ["The Rolling Stones","Led Zeppelin","Nirvana"] },
  "Punk":                { parents: ["Rock"], era: "1976–", description: "Stripped-down, fast, angry. Anti-virtuosity as politics.", traits: ["power chords","fast tempo","short songs"], artists: ["Ramones","Sex Pistols","The Clash"] },
  "Grunge":              { parents: ["Punk","Metal"], era: "1989–1994", description: "Seattle's heavy-punk sound. Distortion + melody + angst.", traits: ["distorted guitar","loud-quiet dynamics","angsty lyrics"], artists: ["Nirvana","Pearl Jam","Soundgarden"] },
  "Indie Rock":          { parents: ["Punk","Rock"], era: "1986–", description: "Independent-label rock with DIY ethos. Later a radio genre.", traits: ["jangly guitars","introspective lyrics","DIY ethos"], artists: ["R.E.M.","Arcade Fire","Arctic Monkeys"] },
  "Indie":               { parents: ["Indie Rock"], era: "1990s–", description: "Broader indie aesthetic — not just rock. Alternative attitude.", traits: ["alternative","DIY","eclectic"], artists: ["Bon Iver","Sufjan Stevens","Mitski"] },

  // ── METAL family ───────────────────────────────────────────────────────
  "Metal":               { parents: ["Rock","Blues"], era: "1970–", description: "Heavier, louder rock. Distortion, power, aggression.", traits: ["distortion","virtuosity","dark themes"], artists: ["Black Sabbath","Metallica","Iron Maiden"] },
  "Thrash Metal":        { parents: ["Metal","Punk"], era: "1983–", description: "Fast, aggressive metal. Metallica's invention.", traits: ["fast tempo","palm muting","shredding"], artists: ["Metallica","Slayer","Megadeth"] },
  "Death Metal":         { parents: ["Thrash Metal"], era: "1985–", description: "Extreme metal. Growled vocals, blast beats.", traits: ["growled vocals","blast beats","tritones"], artists: ["Death","Cannibal Corpse"] },

  // ── LATIN family ───────────────────────────────────────────────────────
  "Latin":               { parents: [], era: "Pre-1900s–", description: "Umbrella for Latin American musical traditions. Vast and diverse.", traits: ["Latin percussion","Spanish/Portuguese","dance-centric"], artists: ["Celia Cruz","Tito Puente"] },
  "Reggaeton":           { parents: ["Dancehall","Hip-Hop","Latin"], era: "1994–", description: "Puerto Rico's dembow-driven Latin rap. Now global dominant.", traits: ["dembow rhythm","Spanish rap","pop hooks"], artists: ["Daddy Yankee","Bad Bunny","J Balvin"] },
  "Latin Trap":          { parents: ["Trap","Reggaeton"], era: "2016–", description: "Spanish-language trap. Bad Bunny's breakout genre.", traits: ["trap drums","Spanish vocals","reggaeton crossover"], artists: ["Bad Bunny","Anuel AA","Ozuna"] },
  "Bachata":             { parents: ["Latin"], era: "1960s–", description: "Dominican guitar-based romance music. Modern versions hit global.", traits: ["lead guitar","bolero feel","romantic lyrics"], artists: ["Romeo Santos","Aventura"] },
  "Salsa":               { parents: ["Latin","Jazz"], era: "1960s–", description: "NYC-born Cuban/Puerto Rican dance music. Complex polyrhythms.", traits: ["polyrhythm","montuno piano","brass"], artists: ["Héctor Lavoe","Marc Anthony"] },
  "Cumbia":              { parents: ["Latin"], era: "Pre-1900s–", description: "Colombian folk dance. Now a pan-Latin genre.", traits: ["accordion","gaita","rolling rhythm"], artists: ["Grupo Niche","Los Ángeles Azules"] },

  // ── AFRICAN family ─────────────────────────────────────────────────────
  "Afrobeats":           { parents: ["Afrobeat","Hip-Hop","Dancehall"], era: "2010–", description: "Nigerian/Ghanaian pop with global reach. Melodic, rhythmic.", traits: ["talking drum","melodic hooks","afro-percussion"], artists: ["Wizkid","Burna Boy","Tems"] },
  "Afrobeat":            { parents: ["Funk","Jazz","Yoruba Music"], era: "1968–", description: "Fela Kuti's political fusion. Long-form jams, horn sections.", traits: ["long grooves","horn section","political lyrics"], artists: ["Fela Kuti","Tony Allen"] },
  "Yoruba Music":        { parents: [], era: "Traditional", description: "Nigerian traditional music — talking drums, praise song.", traits: ["talking drums","praise vocals","call-and-response"], artists: ["King Sunny Adé"] },
  "Kwaito":              { parents: ["House","Hip-Hop"], era: "1990–", description: "South African house derivative. Slower tempo, local vocals.", traits: ["slow house tempo","Zulu vocals","township feel"], artists: ["Mandoza","Arthur Mafokate"] },

  // ── JAMAICAN family ────────────────────────────────────────────────────
  "Reggae":              { parents: ["Ska","R&B / Soul"], era: "1968–", description: "Jamaican music with off-beat skank. Rastafarian culture.", traits: ["skank rhythm","bass-led","conscious lyrics"], artists: ["Bob Marley","Peter Tosh"] },
  "Dancehall":           { parents: ["Reggae"], era: "1980–", description: "Digital-era reggae. Faster, harder, riddim-based.", traits: ["digital riddims","DJ toasting","dance-ready"], artists: ["Shabba Ranks","Sean Paul","Vybz Kartel"] },
  "Dub":                 { parents: ["Reggae"], era: "1968–", description: "Studio-as-instrument reggae. Massive reverb, echo, bass focus.", traits: ["heavy reverb","dub echoes","bass-forward"], artists: ["King Tubby","Lee 'Scratch' Perry"] },
  "Ska":                 { parents: ["R&B / Soul","Mento"], era: "1959–", description: "Jamaica's pre-reggae. Upstroke guitar, horn-heavy.", traits: ["upstroke guitar","horns","fast tempo"], artists: ["The Skatalites","Toots and the Maytals"] },
  "Mento":               { parents: [], era: "1940s–", description: "Jamaican folk music — precursor to ska and reggae.", traits: ["acoustic","calypso-like","storytelling"], artists: ["Lord Flea"] },

  // ── MISC ────────────────────────────────────────────────────────────────
  "Miami Bass":          { parents: ["Electro","Hip-Hop"], era: "1984–", description: "Florida's sub-bass party music. Proto-crunk.", traits: ["sub bass","electro drums","party chants"], artists: ["2 Live Crew","DJ Magic Mike"] },
};

// Helper: compute children for each node by reversing the parents map.
// Runs once at module load and stays stable.
const GENRE_CHILDREN = (() => {
  const map = {};
  Object.keys(GENRE_LINEAGE).forEach(name => { map[name] = []; });
  Object.entries(GENRE_LINEAGE).forEach(([name, node]) => {
    (node.parents || []).forEach(p => {
      if (map[p]) map[p].push(name);
    });
  });
  return map;
})();

// Root genres (no parents) — entry points into the tree.
const GENRE_ROOTS = Object.keys(GENRE_LINEAGE).filter(k => GENRE_LINEAGE[k].parents.length === 0);

// ── GENRE_DEEP_INFO ────────────────────────────────────────────────────
// Enriched data for the most popular genres: traits with explanations,
// artists with their signature work. Falls back to GENRE_LINEAGE.traits
// and GENRE_LINEAGE.artists for genres not covered here.
// Researched April 2026.

// ── GENRE_DEEP_INFO ────────────────────────────────────────────────────
// Enriched data for the most popular genres: traits with explanations,
// artists with their signature work. Falls back to GENRE_LINEAGE.traits
// and GENRE_LINEAGE.artists for genres not covered here.
// Tier A — 10 main genre families, 10+ artists each, researched April 2026.
const GENRE_DEEP_INFO = {
  "Hip-Hop": {
    tagline: "Born in the Bronx when DJ Kool Herc looped breakbeats at block parties in 1973. Now the global lingua franca of youth culture.",
    traitDetails: [
      { trait: "Sampled drum breaks", detail: "Classic breaks from James Brown ('Funky Drummer'), the Winstons ('Amen Brother'), and the Honey Drippers form the DNA. SP-1200 and MPC chopping define the aesthetic." },
      { trait: "Rhymed cadence as instrument", detail: "Rhythmic spoken-word over beats. Internal rhymes, multisyllabic flows, triplet patterns — the voice is played like a drum." },
      { trait: "Turntablism", detail: "Scratching, cutting, juggling — DJ Grand Wizzard Theodore invented the scratch by accident in 1975. The turntable became the first hip-hop instrument." },
      { trait: "808 kick and bass", detail: "Sub-bass from the Roland TR-808 drum machine — felt more than heard. South African, Atlanta, and drill producers all built their sounds around it." },
      { trait: "Sample-based harmony", detail: "Before trap, hip-hop's chords came from soul and jazz samples — not written, but excavated. DJ Premier, Pete Rock, Madlib turned sampling into composition." },
    ],
    artistDetails: [
      { name: "Run-DMC", signature: "Raising Hell (1986)", why: "Brought hip-hop to rock audiences with 'Walk This Way'; first rap group on MTV" },
      { name: "Public Enemy", signature: "It Takes a Nation of Millions (1988)", why: "Politicized the genre; the Bomb Squad's dense productions reinvented what a sample could do" },
      { name: "N.W.A", signature: "Straight Outta Compton (1988)", why: "Defined West Coast gangsta rap; kicked off decades of coastal rivalry" },
      { name: "Nas", signature: "Illmatic (1994)", why: "Gold standard of lyricism and NY boom-bap — the album every rapper studies" },
      { name: "The Notorious B.I.G.", signature: "Ready to Die (1994)", why: "Storytelling perfection; flow and cadence every rapper since has copied" },
      { name: "2Pac", signature: "All Eyez on Me (1996)", why: "Hip-hop's Shakespeare — emotional range no rapper has matched" },
      { name: "OutKast", signature: "Aquemini (1998)", why: "Expanded what Southern hip-hop could sound like; bridged rap and funk" },
      { name: "Jay-Z", signature: "The Blueprint (2001)", why: "Mogul-era hip-hop; Kanye's production on this record changed rap" },
      { name: "Eminem", signature: "The Marshall Mathers LP (2000)", why: "Technical peak of rap; biggest-selling rapper of all time" },
      { name: "Kanye West", signature: "My Beautiful Dark Twisted Fantasy (2010)", why: "Sonic maximalism; made hip-hop an art-music genre" },
      { name: "Kendrick Lamar", signature: "To Pimp a Butterfly (2015)", why: "Jazz-fusion hip-hop that won a Pulitzer Prize" },
      { name: "Drake", signature: "Take Care (2011)", why: "Defined 2010s melodic hip-hop and streaming-era dominance" },
      { name: "J Dilla", signature: "Donuts (2006)", why: "Producer's producer; his drunken-drum feel shaped a generation of beat-making" },
    ],
  },

  "Pop": {
    tagline: "Mainstream popular music — whatever that means in any given year. Pop eats every other genre and spits it back out four years later as 'pop.'",
    traitDetails: [
      { trait: "Hook-first songwriting", detail: "Every section (intro, verse, pre-chorus, chorus, bridge) competes to be memorable. Pop fears boredom above all." },
      { trait: "Production polish", detail: "Every element compressed, tuned, placed with precision. Pop sounds 'finished' in a way other genres don't — no loose ends." },
      { trait: "Universal lyrical themes", detail: "Love, heartbreak, partying, empowerment, self-worth — themes that translate across languages and cultures." },
      { trait: "Tempo sweet spot (~90-120 BPM)", detail: "Fast enough to dance to, slow enough to sing along with — the commercial center of tempo." },
      { trait: "Genre absorption", detail: "Pop borrows from whatever is bubbling up — disco in '79, hip-hop in '90, EDM in '10, country-pop and Afrobeats in '25. Pop is a formula applied to sounds, not a sound itself." },
    ],
    artistDetails: [
      { name: "The Beatles", signature: "Revolver (1966) / Abbey Road (1969)", why: "Invented modern pop album-making; every pop structure comes from them" },
      { name: "Michael Jackson", signature: "Thriller (1982)", why: "Best-selling album of all time; defined pop as visual/theatrical spectacle" },
      { name: "Madonna", signature: "Like a Prayer (1989)", why: "Reinvention-as-career; template for every female pop star since" },
      { name: "Whitney Houston", signature: "The Bodyguard Soundtrack (1992)", why: "Peak vocal pop; 'I Will Always Love You' defined the diva ballad" },
      { name: "Britney Spears", signature: "Baby One More Time (1999)", why: "Defined Y2K teen pop; Max Martin's first global blueprint" },
      { name: "Beyoncé", signature: "Lemonade (2016)", why: "Pop as visual/conceptual event; genre-spanning mainstream auteur" },
      { name: "Taylor Swift", signature: "1989 (2014) / Midnights (2022)", why: "Genre-shifting from country to pure pop; current most commercially dominant artist" },
      { name: "Rihanna", signature: "Anti (2016)", why: "Hit machine across a dozen genres; defined 2010s pop mood" },
      { name: "Lady Gaga", signature: "The Fame Monster (2009)", why: "Theatrical electro-pop; brought disco back into the mainstream" },
      { name: "Ariana Grande", signature: "Thank U, Next (2019)", why: "Current-era pop vocalist; R&B-pop hybrid that defined 2020s sound" },
      { name: "The Weeknd", signature: "After Hours (2020)", why: "'Blinding Lights' is Billboard's #1 all-time song; alt-R&B into pure pop" },
      { name: "Dua Lipa", signature: "Future Nostalgia (2020)", why: "Defined disco revival; made dance-pop the pandemic soundtrack" },
      { name: "Olivia Rodrigo", signature: "SOUR (2021)", why: "Gen Z pop-punk revival with millennial pop sensibilities" },
      { name: "Billie Eilish", signature: "When We All Fall Asleep (2019)", why: "Whispered bedroom-pop; redefined pop loudness conventions" },
    ],
  },

  "R&B / Soul": {
    tagline: "Rhythm-and-blues married gospel emotion to blues structure; 'soul' added introspection. The emotional core of Black American music.",
    traitDetails: [
      { trait: "Groove-driven arrangement", detail: "Bass and drums lock into a deep pocket. Everything else (guitar, horns, keys) comments on the groove — call-and-response at the arrangement level." },
      { trait: "Gospel-trained vocals", detail: "Melisma, runs, call-and-response, testifying — church vocal technique carried into secular music by Ray Charles, Sam Cooke, Aretha Franklin." },
      { trait: "Horn section punctuation", detail: "Tight stabs (Stax/Memphis sound) or lush pads (Philly International) — horns punctuate climactic moments without overwhelming the vocal." },
      { trait: "Hammond B3 organ", detail: "The signature keyboard — soulful, churchy, can growl (Leslie speaker) or sing sustained chords. Booker T. Jones made it iconic." },
      { trait: "Emotional nakedness", detail: "Lyrics about love, loss, longing, sexuality, and spirituality delivered with unfiltered vulnerability — the genre's emotional contract with listeners." },
    ],
    artistDetails: [
      { name: "Ray Charles", signature: "The Genius of Ray Charles (1959)", why: "Fused gospel and blues into what became soul music — 'I Got a Woman' is the original template" },
      { name: "Sam Cooke", signature: "Live at the Harlem Square Club (1963)", why: "Template for every male soul voice that followed; 'A Change Is Gonna Come' is a civil-rights anthem" },
      { name: "Aretha Franklin", signature: "I Never Loved a Man (1967)", why: "The Queen of Soul; defined feminine vocal power in popular music forever" },
      { name: "Otis Redding", signature: "Dictionary of Soul (1966)", why: "Stax Memphis sound; raw emotional delivery; died at 26 with his biggest hit pending release" },
      { name: "Marvin Gaye", signature: "What's Going On (1971)", why: "Concept-album soul that tackled race, war, and ecology; changed the genre's ambition" },
      { name: "Stevie Wonder", signature: "Songs in the Key of Life (1976)", why: "Composed, produced, played everything — soul's renaissance genius" },
      { name: "James Brown", signature: "Live at the Apollo (1963)", why: "The Godfather of Soul; invented funk out of soul; one-chord grooves predate modern beat-making" },
      { name: "Al Green", signature: "Let's Stay Together (1972)", why: "Hi Records' Memphis sound; silkiest falsetto in soul" },
      { name: "Curtis Mayfield", signature: "Super Fly (1972)", why: "Political soul with cinematic orchestration; proto-funk guitar playing" },
      { name: "Prince", signature: "Sign o' the Times (1987)", why: "Played every instrument; fused funk, rock, pop, R&B; most innovative Black artist of his era" },
      { name: "Sade", signature: "Love Deluxe (1992)", why: "Cool, smoky British soul; defined quiet-storm R&B" },
      { name: "D'Angelo", signature: "Voodoo (2000)", why: "Kicked off neo-soul; slow-dragged drum feel copied ever since" },
      { name: "Beyoncé", signature: "B'Day (2006)", why: "R&B's biggest contemporary star; 'Love on Top' is modern soul-pop" },
    ],
  },

  "Rock": {
    tagline: "Born from blues via rock-and-roll in the 1950s. Splintered into a thousand subgenres but the power-chord-and-backbeat DNA persists.",
    traitDetails: [
      { trait: "Guitar-bass-drums-vocal core", detail: "The classic four-piece — defines rock even when keys or synths are added. The lineup itself is the genre." },
      { trait: "Backbeat emphasis", detail: "Snare hits on beats 2 and 4 — the foundational rock groove inherited from blues shuffle. Charlie Watts made it gospel." },
      { trait: "Power chords", detail: "Root + 5th (no 3rd) played with distortion — harmonically ambiguous, works in major or minor, sits well in the loud mix." },
      { trait: "Verse-chorus form", detail: "3-4 minute structure built around a hook chorus — rock inherited this from blues and country, weaponized it with loud dynamics." },
      { trait: "Amplifier as instrument", detail: "The Fender/Marshall tube-amp sound is itself part of the composition. Distortion, feedback, saturation — not accidents but colors." },
    ],
    artistDetails: [
      { name: "Chuck Berry", signature: "The Great Twenty-Eight (1982)", why: "Invented rock guitar vocabulary; 'Johnny B. Goode' is the ur-text" },
      { name: "The Beatles", signature: "Sgt. Pepper's Lonely Hearts Club Band (1967)", why: "Reinvented the album as art form; expanded rock's possibilities infinitely" },
      { name: "The Rolling Stones", signature: "Exile on Main St. (1972)", why: "Blues-rock authenticity across 60 years; kept rock's roots visible" },
      { name: "Led Zeppelin", signature: "IV (1971)", why: "Defined hard rock and proto-metal; 'Stairway to Heaven' is rock's 'Bohemian Rhapsody'" },
      { name: "Jimi Hendrix", signature: "Electric Ladyland (1968)", why: "Reinvented what electric guitar could do; template for every lead guitarist after" },
      { name: "Pink Floyd", signature: "The Dark Side of the Moon (1973)", why: "Progressive rock peak; 45 million copies sold, 900+ weeks on Billboard" },
      { name: "David Bowie", signature: "The Rise and Fall of Ziggy Stardust (1972)", why: "Persona-as-album; bridged glam, art-rock, electronic, soul" },
      { name: "Queen", signature: "A Night at the Opera (1975)", why: "Theatrical rock; Freddie Mercury's vocal range remains unmatched" },
      { name: "The Who", signature: "Who's Next (1971)", why: "Invented arena rock; Pete Townshend's windmill and synthesizer innovations" },
      { name: "Black Sabbath", signature: "Paranoid (1970)", why: "Invented heavy metal; first band to play downtuned and doomy" },
      { name: "Bruce Springsteen", signature: "Born to Run (1975)", why: "Defined American heartland rock; storytelling anthems" },
      { name: "Nirvana", signature: "Nevermind (1991)", why: "Grunge breakthrough that killed hair metal and rebirthed alt-rock" },
      { name: "Radiohead", signature: "OK Computer (1997) / Kid A (2000)", why: "Late-90s rock innovator; bridged rock and electronic music" },
      { name: "Foo Fighters", signature: "The Colour and the Shape (1997)", why: "Kept arena rock alive into the 21st century" },
    ],
  },

  "Electronic": {
    tagline: "Music made with machines as the primary instrument. From 1970s Kraftwerk to 2020s hyperpop, a half-century of sonic futures.",
    traitDetails: [
      { trait: "Machine as voice", detail: "Synthesizers, drum machines, samplers aren't hidden — they're the sound. Electronic music celebrates artifice instead of simulating instruments." },
      { trait: "Sequenced precision", detail: "Drum machines and sequencers lock to grid perfectly. The inhuman tightness is the feature, not a bug." },
      { trait: "Repetition as composition", detail: "Tracks build over 6-10 minutes through subtle variation — filter sweeps, element swaps, long arcs. Patience is the genre's ethic." },
      { trait: "Sub-bass dominance", detail: "Below 100Hz matters. Electronic music is designed for club sound systems where sub-bass is felt, not just heard." },
      { trait: "Genre-splitting instinct", detail: "Electronic's tree branches faster than any other genre: house → deep house → tech house → minimal → ambient house → tropical house, all within one decade." },
    ],
    artistDetails: [
      { name: "Kraftwerk", signature: "Trans-Europe Express (1977) / The Man-Machine (1978)", why: "Pioneered electronic pop; DNA of hip-hop, techno, synth-pop, EDM — all of it starts here" },
      { name: "Giorgio Moroder", signature: "Donna Summer's 'I Feel Love' (1977)", why: "First fully electronic disco track; invented the synth-bass groove" },
      { name: "Brian Eno", signature: "Ambient 1: Music for Airports (1978)", why: "Invented ambient music; pioneered generative and atmospheric electronic approaches" },
      { name: "Juan Atkins / Cybotron", signature: "Clear (1983)", why: "Detroit techno founder; coined the term 'techno' itself" },
      { name: "Frankie Knuckles", signature: "Tears (1989)", why: "The Godfather of House; his Warehouse residency named the genre" },
      { name: "Aphex Twin", signature: "Selected Ambient Works 85-92 (1992)", why: "Redefined experimental electronic music; bridged techno and ambient" },
      { name: "The Prodigy", signature: "The Fat of the Land (1997)", why: "Brought big beat to rock audiences; made electronic music dangerous" },
      { name: "Daft Punk", signature: "Discovery (2001)", why: "Defined French house; sample-based filter-house became a global template" },
      { name: "The Chemical Brothers", signature: "Surrender (1999)", why: "Big beat's commercial peak; brought electronic to festival stages" },
      { name: "Björk", signature: "Vespertine (2001)", why: "Art-pop electronic auteur; pushed glitch and micro-sound into pop" },
      { name: "Burial", signature: "Untrue (2007)", why: "Defined post-dubstep; ghostly UK night-bus electronica" },
      { name: "Deadmau5", signature: "For Lack of a Better Name (2009)", why: "Pioneered 2010s progressive-house mainstream EDM era" },
      { name: "Skrillex", signature: "Scary Monsters and Nice Sprites (2010)", why: "Brought dubstep/brostep to US mainstream; defined 'drop' culture" },
      { name: "Flume", signature: "Skin (2016)", why: "Future-bass peak; defined streaming-era melodic electronic" },
      { name: "Fred again..", signature: "Actual Life trilogy (2021-2023)", why: "Current-era house; voice-note sampling and emotional UK sound" },
    ],
  },

  "Jazz": {
    tagline: "Early-20th-century fusion of blues, ragtime, and European harmony born in New Orleans. America's classical music.",
    traitDetails: [
      { trait: "Improvisation as composition", detail: "Solos are the heart of jazz — performers compose in real-time over chord changes. The tune (the 'head') is just a launchpad." },
      { trait: "Swing rhythm", detail: "Triplet subdivision (dotted-eighth-sixteenth feel) gives jazz its forward motion. Straight eighths sound square, swung eighths sound jazz." },
      { trait: "Complex harmony", detail: "7ths, 9ths, 11ths, 13ths, altered chords, tritone substitutions — jazz harmony lives on tension-and-release." },
      { trait: "Rhythm section interplay", detail: "Bass + drums + piano/guitar have a three-way conversation under the soloist. It's not accompaniment — it's dialogue." },
      { trait: "Cultural memory", detail: "Standards (Gershwin, Porter, Ellington tunes) are shared vocabulary. A jazz musician can sit in with strangers anywhere because they all know 'Autumn Leaves.'" },
    ],
    artistDetails: [
      { name: "Louis Armstrong", signature: "Hot Fives and Sevens (1925-28)", why: "Invented the jazz solo; defined what a trumpet could do in popular music" },
      { name: "Duke Ellington", signature: "Ellington at Newport (1956)", why: "Greatest composer in jazz history; 1,000+ compositions across 50 years" },
      { name: "Billie Holiday", signature: "Lady in Satin (1958)", why: "Defined jazz vocal phrasing; turned lived suffering into musical art" },
      { name: "Count Basie", signature: "The Atomic Mr. Basie (1958)", why: "Big-band swing peak; defined the Kansas City sound" },
      { name: "Ella Fitzgerald", signature: "Ella Fitzgerald Sings the Cole Porter Song Book (1956)", why: "Perfect pitch, perfect time; the Songbook series codified the American Songbook canon" },
      { name: "Charlie Parker", signature: "Savoy and Dial Sessions (1944-48)", why: "Bebop architect; redefined jazz melodic and harmonic vocabulary" },
      { name: "Dizzy Gillespie", signature: "Groovin' High (1945)", why: "Bebop co-founder; invented Afro-Cuban jazz" },
      { name: "Thelonious Monk", signature: "Brilliant Corners (1957)", why: "Angular, dissonant, rhythmically unpredictable; the architect" },
      { name: "Miles Davis", signature: "Kind of Blue (1959) / Bitches Brew (1970)", why: "Led 5 major jazz revolutions across 40 years; endless reinvention" },
      { name: "John Coltrane", signature: "A Love Supreme (1965) / Giant Steps (1960)", why: "Spiritual jazz; 'sheets of sound' approach to improvisation" },
      { name: "Ornette Coleman", signature: "The Shape of Jazz to Come (1959)", why: "Free jazz pioneer; abandoned chord changes entirely" },
      { name: "Herbie Hancock", signature: "Head Hunters (1973)", why: "Jazz-funk fusion; 'Chameleon' became every bassist's training exercise" },
      { name: "Weather Report", signature: "Heavy Weather (1977)", why: "Jazz fusion peak; Jaco Pastorius redefined electric bass" },
      { name: "Kamasi Washington", signature: "The Epic (2015)", why: "Current-era spiritual jazz; jazz's contemporary mainstream moment" },
    ],
  },

  "Country": {
    tagline: "American rural storytelling — twang, steel guitar, fiddle, narrative. From Appalachian porch music to modern Nashville pop.",
    traitDetails: [
      { trait: "Narrative songwriting", detail: "Story-centered lyrics — characters, places, concrete detail are central. Country doesn't do abstract emotion; it does specific people in specific situations." },
      { trait: "Pedal steel guitar", detail: "The signature sound — legato slides and volume-pedal swells evoke country's crying quality. Buddy Emmons made it iconic." },
      { trait: "Twang vocals", detail: "Regional American dialect, nasal placement — country vocalists cultivate the 'country accent' as genre marker." },
      { trait: "Acoustic roots foundation", detail: "Even modern country keeps fiddle, banjo, mandolin, or acoustic guitar as signifiers — the rural instrumentation code." },
      { trait: "Chord simplicity, melodic focus", detail: "I-IV-V progressions dominate; country invests its complexity in melody and lyric, not harmony." },
    ],
    artistDetails: [
      { name: "Jimmie Rodgers", signature: "The Singing Brakeman recordings (1927-33)", why: "First country star; the template for the singer-songwriter format" },
      { name: "Hank Williams", signature: "40 Greatest Hits collections", why: "Country music's Mozart; 40 hits in 6 years before dying at 29" },
      { name: "Patsy Cline", signature: "Showcase (1961)", why: "Defined countrypolitan; vocal phrasing every female country singer studies" },
      { name: "Johnny Cash", signature: "At Folsom Prison (1968)", why: "Outlaw country; crossed over to rock audiences without losing country credibility" },
      { name: "Loretta Lynn", signature: "Coal Miner's Daughter (1970)", why: "Working-class country feminism; autobiographical songwriting" },
      { name: "Willie Nelson", signature: "Red Headed Stranger (1975)", why: "Outlaw country's heart; songwriter's songwriter" },
      { name: "Dolly Parton", signature: "Jolene (1974) / Coat of Many Colors (1971)", why: "Greatest country songwriter of all time; cultural icon beyond genre" },
      { name: "Merle Haggard", signature: "Branded Man (1967)", why: "Bakersfield sound; working-class anthems that defined the genre" },
      { name: "Garth Brooks", signature: "No Fences (1990)", why: "Stadium country; best-selling solo artist in US history" },
      { name: "Shania Twain", signature: "Come On Over (1997)", why: "Pop-country crossover; best-selling female country album ever" },
      { name: "Alan Jackson", signature: "Don't Rock the Jukebox (1991)", why: "Neo-traditionalist country; kept honky-tonk alive" },
      { name: "Kacey Musgraves", signature: "Golden Hour (2018)", why: "Modern country-folk auteur; Grammy Album of the Year win" },
      { name: "Morgan Wallen", signature: "Dangerous: The Double Album (2021)", why: "Current-era country's biggest commercial force; streaming-era dominance" },
      { name: "Zach Bryan", signature: "American Heartbreak (2022)", why: "Alternative country-folk revival; TikTok-to-arenas pipeline" },
    ],
  },

  "Latin": {
    tagline: "An umbrella for dozens of distinct musics from Latin America — salsa, merengue, bachata, bossa nova, reggaeton, Latin trap, tango, mariachi. United by Spanish/Portuguese language and Afro-Caribbean/Indigenous/European fusion.",
    traitDetails: [
      { trait: "Clave rhythm foundation", detail: "The 'clave' (a 3-2 or 2-3 syncopated pattern) underpins son, salsa, rumba — it's the rhythmic DNA of Afro-Cuban music." },
      { trait: "Afro-Caribbean percussion", detail: "Congas, bongos, timbales, güiro, maracas, cowbell — percussion does not sit behind but drives the music." },
      { trait: "Call-and-response vocals", detail: "Lead singer (sonero) + coro (chorus) trade lines; often improvised in the 'montuno' section after the main song." },
      { trait: "Spanish/Portuguese lyrical dominance", detail: "Language is part of the genre identity. Reggaeton stars who sing in Spanish outsell most English-language pop globally now." },
      { trait: "Dance-music integration", detail: "Latin genres are inseparable from specific dances — salsa, bachata, merengue, tango, reggaeton perreo. The music is designed to move bodies." },
    ],
    artistDetails: [
      { name: "Tito Puente", signature: "Dance Mania (1958)", why: "'El Rey de los Timbales'; brought mambo and Latin jazz to international stages" },
      { name: "Celia Cruz", signature: "Celia & Johnny (1974)", why: "The Queen of Salsa; larger-than-life vocal presence across 5 decades" },
      { name: "Antônio Carlos Jobim", signature: "Getz/Gilberto (1964)", why: "Bossa nova architect; 'The Girl from Ipanema' is the global Latin jazz standard" },
      { name: "João Gilberto", signature: "Chega de Saudade (1959)", why: "Bossa nova's vocal/guitar template; invented the style single-handedly" },
      { name: "Héctor Lavoe", signature: "La Voz (1975)", why: "Fania-era salsa voice; Willie Colón's partner in Nuyorican salsa's peak" },
      { name: "Rubén Blades", signature: "Siembra (1978, w/ Willie Colón)", why: "Salsa's poet-sociologist; 'Pedro Navaja' is the genre's most literary song" },
      { name: "Juan Gabriel", signature: "Recuerdos, Vol. II (1984)", why: "Mexican ballad king; his catalog is the Latin American Songbook" },
      { name: "Gloria Estefan", signature: "Mi Tierra (1993)", why: "Cuban-American pop; bridged Latin and English-language mainstream" },
      { name: "Selena", signature: "Amor Prohibido (1994)", why: "Tejano icon; brought regional Mexican to global audiences before her murder at 23" },
      { name: "Shakira", signature: "Laundry Service (2001)", why: "Colombian pop-rock; biggest Latin female artist's crossover" },
      { name: "Daddy Yankee", signature: "Barrio Fino (2004)", why: "'Gasolina' broke reggaeton globally; the King of Reggaeton" },
      { name: "Marc Anthony", signature: "Todo a Su Tiempo (1995)", why: "Best-selling salsa artist of all time; defined salsa romántica" },
      { name: "Romeo Santos", signature: "Formula, Vol. 1 (2011)", why: "Modern bachata king; fronted Aventura, went solo to greater heights" },
      { name: "J Balvin", signature: "Energía (2016)", why: "Led the 2015+ reggaeton globalization wave; 'Mi Gente' defined the era" },
      { name: "Bad Bunny", signature: "Un Verano Sin Ti (2022)", why: "Most-streamed artist globally 2020-23; Spanish-language dominance" },
      { name: "Karol G", signature: "Mañana Será Bonito (2023)", why: "Biggest female Latin artist; reggaeton + bachata + trap fusion" },
      { name: "Peso Pluma", signature: "Génesis (2023)", why: "Mexican corridos tumbados globalization; Billboard Hot 100 breakthrough for regional Mexican" },
    ],
  },

  "Afrobeats": {
    tagline: "Nigerian and Ghanaian urban pop that became a global force in the 2010s-20s. Distinct from Fela Kuti's 'Afrobeat' (1970s funk) — this is the pop evolution.",
    traitDetails: [
      { trait: "Log drum bass (Afropiano crossover)", detail: "Deep, sliding bass programmed on log drum synths — emotional sub-bass that feels organic, not electronic. 2020s fusion with Amapiano intensified this." },
      { trait: "Pidgin + local language mix", detail: "Lyrics code-switch between English, Pidgin, Yoruba, Igbo — global reach without losing local identity. Part of the genre's charm." },
      { trait: "Polyrhythmic percussion", detail: "Shekere (gourd rattle), talking drum, sometimes programmed percussion create the syncopated dance groove. Dense but never cluttered." },
      { trait: "Melodic chant choruses", detail: "Hooks are designed for crowd-singing — simple melodic phrases repeated, often with call-and-response. Club and wedding music." },
      { trait: "~105-115 BPM sweet spot", detail: "Mid-tempo sits between dance and hip-hop feel — works in clubs, works on radio, works in TikTok dances." },
    ],
    artistDetails: [
      { name: "Fela Kuti", signature: "Zombie (1976) / Expensive Shit (1975)", why: "Invented the original Afrobeat (singular) — 1970s political funk that Afrobeats descends from" },
      { name: "King Sunny Adé", signature: "Juju Music (1982)", why: "Brought Nigerian juju music to international audiences; a Fela-era giant" },
      { name: "D'banj", signature: "The Entertainer (2008)", why: "Early-2010s Afrobeats pioneer; 'Oliver Twist' was the genre's first global hit" },
      { name: "Wizkid", signature: "Made in Lagos (2020)", why: "Took Afrobeats global; 'Essence' with Tems was the breakout moment" },
      { name: "Davido", signature: "A Better Time (2020)", why: "Afrobeats' most consistent hitmaker; 'FALL' was genre's first viral global hit" },
      { name: "Burna Boy", signature: "African Giant (2019) / Twice As Tall (2020)", why: "Grammy-winning pan-African sound fusing dancehall, reggae, and Afrobeats" },
      { name: "Mr Eazi", signature: "Life is Eazi, Vol. 1 (2017)", why: "Banku music fusion; Ghana-Nigeria cross-pollination pioneer" },
      { name: "Tiwa Savage", signature: "Celia (2020)", why: "Queen of Afrobeats; brought R&B sensibilities into the genre" },
      { name: "Tems", signature: "For Broken Ears EP (2020)", why: "Afro-fusion vocalist; Grammy-winning introspective side of Afrobeats" },
      { name: "CKay", signature: "Love Nwantiti (2019)", why: "TikTok era's biggest African hit; emo Afrobeats subgenre leader" },
      { name: "Fireboy DML", signature: "Playboy (2022)", why: "Melodic Afrobeats crossover; 'Peru' with Ed Sheeran" },
      { name: "Rema", signature: "Rave & Roses (2022)", why: "'Calm Down' became the biggest Afrobeats single ever — #1 in 15+ countries" },
      { name: "Asake", signature: "Mr. Money With The Vibe (2022)", why: "Current-era leader; fuses Afrobeats with fuji and amapiano" },
      { name: "Ayra Starr", signature: "19 & Dangerous (2021)", why: "Mavin star; Afropop's Gen Z face" },
      { name: "Omah Lay", signature: "Boy Alone (2022)", why: "Afro-depression subgenre; introspective new-wave Afrobeats" },
    ],
  },

  "Classical": {
    tagline: "Western art music tradition spanning ~1000 years — medieval chant to modern composition. The ancestor of Western harmony.",
    traitDetails: [
      { trait: "Written notation", detail: "Compositions are authoritative texts transmitted via notation. The score, not the performance, is primary — different from most other traditions." },
      { trait: "Large-scale form", detail: "Sonata form, symphony, concerto, string quartet, opera, mass — classical built multi-movement architectures that other genres borrow from" },
      { trait: "Functional harmony", detail: "Tonic-dominant relationships, key modulation, cadential patterns — the chord-progression vocabulary all Western music uses traces here" },
      { trait: "Orchestral coloration", detail: "Strings + woodwinds + brass + percussion form a unified palette; orchestration (which instrument plays what) is its own craft" },
      { trait: "Historical periods", detail: "Medieval → Renaissance → Baroque → Classical (Haydn/Mozart) → Romantic (Beethoven/Brahms) → Modern (Stravinsky) → Contemporary each have distinct sounds" },
    ],
    artistDetails: [
      { name: "J.S. Bach", signature: "The Well-Tempered Clavier (1722)", why: "Baroque peak; all Western counterpoint and harmony studies lead back to him" },
      { name: "W.A. Mozart", signature: "Symphony No. 40 (1788) / Don Giovanni (1787)", why: "Classical era embodiment; operas, symphonies, concertos all at peak form" },
      { name: "Ludwig van Beethoven", signature: "Symphony No. 9 (1824)", why: "Bridged Classical and Romantic; expanded what music could express" },
      { name: "Johannes Brahms", signature: "Symphony No. 4 (1885)", why: "Romantic German master; dense contrapuntal composition" },
      { name: "Frédéric Chopin", signature: "Nocturnes / Preludes (1830s)", why: "Defined Romantic piano literature; poetic miniatures" },
      { name: "Richard Wagner", signature: "Ring Cycle (1876)", why: "Reinvented opera; leitmotif technique shaped film scoring" },
      { name: "Pyotr Tchaikovsky", signature: "Swan Lake (1877) / Symphony No. 6 (1893)", why: "Russian Romantic peak; ballet and symphonic standards" },
      { name: "Claude Debussy", signature: "Prélude à l'après-midi d'un faune (1894)", why: "Impressionist master; expanded harmonic palette toward modernism" },
      { name: "Igor Stravinsky", signature: "The Rite of Spring (1913)", why: "Modernist rupture; caused literal riots at premiere" },
      { name: "Maurice Ravel", signature: "Boléro (1928)", why: "French orchestral colorist; 'Pavane' and 'Boléro' in cultural bloodstream" },
      { name: "Dmitri Shostakovich", signature: "Symphony No. 5 (1937)", why: "Soviet-era composer; political ambiguity coded into symphonic language" },
      { name: "John Williams", signature: "Star Wars (1977) / Schindler's List (1993)", why: "Modern film composer who kept classical tradition in popular culture" },
      { name: "Philip Glass", signature: "Einstein on the Beach (1976)", why: "Minimalist founder; influential on rock, electronic, and film scoring" },
      { name: "Steve Reich", signature: "Music for 18 Musicians (1978)", why: "Minimalism's most influential composer; phasing technique copied everywhere" },
    ],
  },

  // ═══════════════════ TIER B — 30 KEY SUBGENRES ═══════════════════════
  // 5-7 artists each, detailed traits. These are the subgenres most users
  // will actually pick when building prompts.

  // ── HIP-HOP family ─────────────────────────────────────────────
  "Trap": {
    tagline: "Atlanta street sound built on rolling 808s and hi-hat triplets. Went from regional subgenre to the default sound of mainstream rap.",
    traitDetails: [
      { trait: "Rolling 808 bass", detail: "The 808 sub-bass is both kick and bass, sliding between notes; long sustained 808s define 'southern feel'." },
      { trait: "Hi-hat triplets", detail: "Machine-gun triplet patterns (usually 1/16 or 1/32 notes) — Roland TR-808 or modern sample packs." },
      { trait: "Dark pad atmospheres", detail: "Cinematic minor-key pads provide the emotional weight — often one chord progression looped." },
      { trait: "Half-time feel", detail: "Drums feel slow (~70 BPM) despite the 140 BPM hi-hats, creating hypnotic space for vocals." },
    ],
    artistDetails: [
      { name: "T.I.", signature: "Trap Muzik (2003)", why: "Coined the term 'trap' and defined the Atlanta street narrative" },
      { name: "Gucci Mane", signature: "Trap House (2005)", why: "Archetypal trap rapper; Zaytoven's work built the Atlanta sound" },
      { name: "Future", signature: "DS2 (2015)", why: "Pioneered auto-tune melodic trap" },
      { name: "Young Thug", signature: "Slime Season 3 (2016)", why: "Voice-as-instrument approach broke rap vocal conventions" },
      { name: "Migos", signature: "Culture (2017)", why: "Popularized triplet flow globally with 'Bad and Boujee'" },
      { name: "Lil Baby", signature: "My Turn (2020)", why: "Current-era Atlanta trap at its most commercially dominant" },
      { name: "21 Savage", signature: "Savage Mode II (2020, w/ Metro Boomin)", why: "Minimalist menacing trap; defined the late-2010s sound" },
    ],
  },

  "Drill": {
    tagline: "Chicago's minimalist menace, reborn through UK grime sensibilities and NY breakbeat variants. The sound of 2020s street realism.",
    traitDetails: [
      { trait: "Sliding 808 bass", detail: "Gliding 808 lines that bend between notes — almost melodic. Especially prominent in UK and NY drill." },
      { trait: "Sparse drum programming", detail: "Minimalist patterns with heavy use of rim shots, half-time snares, and syncopated hi-hats. Space is part of the aesthetic." },
      { trait: "Monotone flow", detail: "Emotionally flat, reporting-style delivery that emphasizes threat over melody." },
      { trait: "Dark minor-key piano", detail: "Repeating piano or bell melodies, often detuned or lo-fi — provides the emotional core." },
    ],
    artistDetails: [
      { name: "Chief Keef", signature: "Finally Rich (2012)", why: "Originated Chicago drill with 'I Don't Like' and 'Love Sosa'" },
      { name: "Pop Smoke", signature: "Meet the Woo 2 (2020)", why: "Fused NY drill with pop hooks; killed before full breakthrough" },
      { name: "Fivio Foreign", signature: "B.I.B.L.E. (2022)", why: "Carried the NY drill torch with Kanye collaborations" },
      { name: "Central Cee", signature: "23 (2022) / Can't Rush Greatness (2025)", why: "UK drill's melodic face; made drill palatable to global pop audiences" },
      { name: "Headie One", signature: "EDNA (2020)", why: "UK drill's lyricist-in-chief; bridged drill and melodic rap" },
      { name: "Lil Durk", signature: "The Voice (2020)", why: "Chicago drill's emotional evolution; melodic storytelling" },
      { name: "King Von", signature: "Welcome to O'Block (2020)", why: "Drill's great storyteller; murdered at 26" },
    ],
  },

  "Melodic Rap": {
    tagline: "Rap where the hook is sung, not rapped. The subgenre that became the genre for Gen Z.",
    traitDetails: [
      { trait: "Auto-Tune as instrument", detail: "Pitch correction used expressively — not to fix, but to create the signature plasticky melodic quality." },
      { trait: "Sing-rapping hybrid", detail: "Verses rap, hooks sing; vocals float between the two modes freely." },
      { trait: "Trap drum foundation", detail: "Hi-hat rolls and 808s remain from trap, but pitched melodic elements dominate the mix." },
      { trait: "Emotional vulnerability", detail: "Lyrical themes lean depressive, romantic, introspective — a shift from street-narrative trap." },
    ],
    artistDetails: [
      { name: "Future", signature: "Pluto 3D (2012) / DS2 (2015)", why: "Pioneered the auto-tune melodic flow template" },
      { name: "Juice WRLD", signature: "Goodbye & Good Riddance (2018)", why: "Emo-rap emotional tone; freestyle melody over pop-punk samples" },
      { name: "Lil Uzi Vert", signature: "Luv Is Rage 2 (2017)", why: "Vocal energy and melodic variety that expanded the template" },
      { name: "Post Malone", signature: "Hollywood's Bleeding (2019)", why: "Crossover success that normalized melodic rap to pop audiences" },
      { name: "Lil Baby", signature: "My Turn (2020)", why: "Atlanta melodic trap at its most commercially dominant" },
      { name: "The Kid LAROI", signature: "F*CK LOVE (2020)", why: "Current-wave melodic rap with full pop crossover" },
    ],
  },

  "Boom Bap": {
    tagline: "Golden-era East Coast hip-hop defined by punchy drums, jazz samples, and lyricism-first ethos. The 'real hip-hop' sound.",
    traitDetails: [
      { trait: "SP-1200 / MPC drums", detail: "Punchy, crunchy sampled drums — the Akai MPC60 and E-mu SP-1200 gave boom-bap its signature 'boom' (kick) and 'bap' (snare)." },
      { trait: "Jazz / soul loops", detail: "Four-bar loops pulled from Blue Note jazz, Stax soul, and funk records. Pete Rock and DJ Premier were masters." },
      { trait: "Head-nod tempo (85-95 BPM)", detail: "The sweet spot for the rap-over-groove feel. Not too fast for storytelling, not too slow to lose energy." },
      { trait: "Lyricism-first", detail: "Complex wordplay, multi-syllable rhymes, and storytelling are valued over hooks or melody." },
    ],
    artistDetails: [
      { name: "A Tribe Called Quest", signature: "The Low End Theory (1991)", why: "Jazz-rap perfection; Q-Tip's production template" },
      { name: "Wu-Tang Clan", signature: "Enter the Wu-Tang (36 Chambers) (1993)", why: "RZA's gritty lo-fi sampling; 9 MCs, one iconic aesthetic" },
      { name: "Nas", signature: "Illmatic (1994)", why: "Boom-bap's greatest lyrical statement" },
      { name: "DJ Premier (Gang Starr)", signature: "Moment of Truth (1998)", why: "Defining boom-bap producer; chop-and-scratch chorus style" },
      { name: "Pete Rock & CL Smooth", signature: "Mecca and the Soul Brother (1992)", why: "Warmest boom-bap production ever made" },
      { name: "Mobb Deep", signature: "The Infamous (1995)", why: "Dark NY boom-bap; Havoc's menacing production" },
      { name: "Madlib / Madvillain", signature: "Madvillainy (2004, w/ MF DOOM)", why: "Underground boom-bap's holy grail" },
    ],
  },

  "Gangsta Rap": {
    tagline: "West Coast street narratives over funk samples. Harder drums, harder language, and a fundamentally cinematic sensibility.",
    traitDetails: [
      { trait: "P-Funk samples", detail: "Chopped Parliament-Funkadelic, Zapp, and Roger Troutman funk loops — often featuring synth bass and talkbox." },
      { trait: "G-Funk whistle synth", detail: "Dr. Dre / DJ Quik's high-pitched lead synth — defined West Coast's melodic signature." },
      { trait: "Street cinematic narratives", detail: "First-person storytelling about gang life, police, poverty — a journalistic register." },
      { trait: "Heavy 808 drums", detail: "Kick-and-snare patterns sit forward in the mix; different from NY boom-bap's SP-1200 sound." },
    ],
    artistDetails: [
      { name: "N.W.A", signature: "Straight Outta Compton (1988)", why: "Originated the genre; defined Compton sound" },
      { name: "Dr. Dre", signature: "The Chronic (1992)", why: "G-funk production blueprint; birthed Snoop's career" },
      { name: "Snoop Dogg", signature: "Doggystyle (1993)", why: "Defined West Coast MC laid-back flow" },
      { name: "Tupac", signature: "Me Against the World (1995) / All Eyez on Me (1996)", why: "Emotional range and political awareness that transcended the genre" },
      { name: "Ice Cube", signature: "AmeriKKKa's Most Wanted (1990)", why: "Post-NWA Cube; brought Bomb Squad production to West Coast" },
      { name: "The Game", signature: "The Documentary (2005)", why: "Revived G-funk in the 2000s with 50 Cent/Dre co-signs" },
    ],
  },

  "Phonk": {
    tagline: "Memphis rap cassettes from the 1990s resurrected via TikTok and drift culture. The soundtrack of 2020s car videos.",
    traitDetails: [
      { trait: "Memphis rap samples", detail: "Chopped DJ Screw / Three 6 Mafia / Lord Infamous vocal fragments form the core." },
      { trait: "Distorted 808 cowbell", detail: "The signature percussion — cowbell processed through saturation/bitcrushing — ticks the beat." },
      { trait: "Lo-fi tape saturation", detail: "Cassette-warped aesthetic; tape hiss, pitch wobble, analog compression." },
      { trait: "Drift/racing association", detail: "Via Russian TikTok and car culture, phonk became the de facto drifting/racing soundtrack." },
    ],
    artistDetails: [
      { name: "DJ Smokey", signature: "Memphis Chapel (2017)", why: "Originated modern phonk scene 2013-2017" },
      { name: "Kordhell", signature: "Murder in My Mind (2021)", why: "Viral phonk breakthrough; defined the TikTok era" },
      { name: "DVRST", signature: "Close Eyes (2021)", why: "Drift phonk that dominated racing content globally" },
      { name: "PlayaPhonk", signature: "2022-2024 compilations", why: "Russian-Ukrainian scene driver" },
      { name: "Ghostface Playa", signature: "Why Not? (2023)", why: "Modern phonk's cleanest commercial success" },
      { name: "Freddie Dredd", signature: "Pray to the Grave (2020)", why: "Bridged phonk with dark trap and horrorcore" },
    ],
  },

  "Cloud Rap": {
    tagline: "Ambient, druggy hip-hop with ethereal production and distant vocals. Peak: 2011-2016 internet era.",
    traitDetails: [
      { trait: "Reverb-drenched atmosphere", detail: "Vocals float in vast reverbs; production feels distant, like overheard from another room." },
      { trait: "Slow tempos (60-80 BPM)", detail: "Half-time trap feel; drugged, floating pace." },
      { trait: "Chopped-and-screwed influence", detail: "Tempos and pitches dragged down; DJ Screw's Houston legacy transposed to internet rap." },
      { trait: "Dreamy synth pads", detail: "Pitched-down or chopped samples — often sampling ambient or new-age sources." },
    ],
    artistDetails: [
      { name: "Lil B", signature: "Rain in England (2010)", why: "Cloud rap godfather; coined the aesthetic" },
      { name: "Clams Casino", signature: "Instrumentals (2011)", why: "The defining producer; Lil B, ASAP Rocky all used his beats" },
      { name: "ASAP Rocky", signature: "LiveLoveA$AP (2011)", why: "Most successful cloud rap artist; mainstream breakthrough" },
      { name: "Main Attrakionz", signature: "808s & Dark Grapes II (2011)", why: "Bay Area cloud rap duo; archetypal sound" },
      { name: "Spaceghostpurrp", signature: "Mystikal Maze (2012)", why: "Florida cloud rap; Raider Klan founder" },
    ],
  },

  // ── R&B / SOUL family ──────────────────────────────────────────
  "Neo-Soul": {
    tagline: "Soul music filtered through hip-hop's lens. Live instruments, organic grooves, head-nod tempos. The thinking listener's R&B.",
    traitDetails: [
      { trait: "Organic live production", detail: "Real drums (often with J Dilla drunken-drum feel), real bass, Rhodes piano — rejection of polished 90s R&B programming." },
      { trait: "Jazz harmony", detail: "Extended chords (9ths, 11ths, 13ths), modal voicings — unlike pop R&B's simpler I-vi-IV-V progressions." },
      { trait: "Hip-hop tempo range", detail: "85-95 BPM head-nod feel; shares tempo DNA with boom-bap hip-hop." },
      { trait: "Conscious / introspective lyrics", detail: "Themes of Black spirituality, love as devotion, social awareness — not hook-factory love songs." },
    ],
    artistDetails: [
      { name: "D'Angelo", signature: "Brown Sugar (1995) / Voodoo (2000)", why: "Kicked off neo-soul; 'Untitled (How Does It Feel)' is the genre's ur-track" },
      { name: "Erykah Badu", signature: "Baduizm (1997)", why: "Neo-soul's poet; defined the female voice of the genre" },
      { name: "Lauryn Hill", signature: "The Miseducation of Lauryn Hill (1998)", why: "Hip-hop-informed soul; one of the best-selling neo-soul albums ever" },
      { name: "Jill Scott", signature: "Who Is Jill Scott? (2000)", why: "Philly neo-soul; poet-singer bridge" },
      { name: "Maxwell", signature: "Urban Hang Suite (1996)", why: "Falsetto-driven neo-soul romance; Marvin Gaye-school" },
      { name: "Musiq Soulchild", signature: "Aijuswanaseing (2000)", why: "Philly International lineage; accessible neo-soul" },
      { name: "Anderson .Paak", signature: "Malibu (2016)", why: "Current-era neo-soul; drummer-singer who pushed the genre forward" },
    ],
  },

  "Alt R&B": {
    tagline: "Moody, atmospheric R&B with electronic textures and negative space. Emerged ~2010 from Toronto and LA.",
    traitDetails: [
      { trait: "Dark atmospheric production", detail: "Noir cinema aesthetic — detuned synths, reverb-drenched drums, cold electronic textures." },
      { trait: "Pitched vocals", detail: "Voice as atmosphere — layered harmonies, pitched-down ad-libs, sometimes auto-tuned." },
      { trait: "Sparse arrangement", detail: "Space between sounds — R&B that treats silence as an instrument." },
      { trait: "Lyrical introspection", detail: "Themes of anxiety, substance use, failed relationships, fame's dark side." },
    ],
    artistDetails: [
      { name: "The Weeknd", signature: "House of Balloons (2011)", why: "Trilogy mixtapes defined the aesthetic" },
      { name: "Frank Ocean", signature: "Blonde (2016) / Channel Orange (2012)", why: "Critical apex of alt R&B; genre-defying auteur" },
      { name: "Jhené Aiko", signature: "Souled Out (2014)", why: "Floating vocal style over ambient R&B production" },
      { name: "SZA", signature: "Ctrl (2017) / SOS (2022)", why: "Conversational vocal approach; defined current-era alt R&B" },
      { name: "Miguel", signature: "Kaleidoscope Dream (2012)", why: "Prince-inspired funk-soul with alt R&B production" },
      { name: "Daniel Caesar", signature: "Freudian (2017)", why: "Gospel-trained voice in minimalist alt R&B production" },
      { name: "H.E.R.", signature: "H.E.R. (2017)", why: "Guitar-driven alt R&B; Grammy breakthrough" },
    ],
  },

  "Contemporary R&B": {
    tagline: "Mainstream R&B with polished pop production and hip-hop DNA. The sound of radio R&B from 1990 onwards.",
    traitDetails: [
      { trait: "Programmed drum production", detail: "808s, drum machines, meticulous quantization — unlike neo-soul's live feel." },
      { trait: "Melismatic vocals", detail: "Runs, trills, vocal gymnastics — the Mariah/Whitney/Christina vocal vocabulary." },
      { trait: "Pop songcraft", detail: "Hook-first writing; verse/pre-chorus/chorus structure inherited from pop." },
      { trait: "Hip-hop-influenced", detail: "Many artists collaborate with rappers; production often shares beats/producers with rap." },
    ],
    artistDetails: [
      { name: "Mariah Carey", signature: "Daydream (1995) / Butterfly (1997)", why: "Defined the 90s R&B vocal standard; 19 #1 hits" },
      { name: "Whitney Houston", signature: "Whitney (1987) / The Bodyguard (1992)", why: "Greatest pure voice of the contemporary R&B era" },
      { name: "Usher", signature: "Confessions (2004)", why: "Peak 2000s R&B; 10 million+ copies sold US" },
      { name: "Beyoncé", signature: "B'Day (2006) / Dangerously in Love (2003)", why: "Contemporary R&B's biggest star" },
      { name: "Chris Brown", signature: "F.A.M.E. (2011)", why: "2010s R&B hit machine; dance-driven crossover" },
      { name: "Alicia Keys", signature: "The Diary of Alicia Keys (2003)", why: "Piano-driven contemporary R&B; neo-classical bent" },
    ],
  },

  "Trap Soul": {
    tagline: "R&B vocals over trap drum programming. Bryson Tiller's 2015 invention that dominated the back half of the decade.",
    traitDetails: [
      { trait: "Trap drum patterns", detail: "Hi-hat rolls, 808s, half-time feel — but with R&B sung on top instead of rap." },
      { trait: "Pitched-down vocal samples", detail: "Chopped R&B vocals from 90s/2000s records, often slowed and reverbed." },
      { trait: "Melodic Auto-Tune", detail: "Vocals use Auto-Tune expressively, often with exaggerated pitch slides." },
      { trait: "Intimate lyrical tone", detail: "Late-night relationship songs; texts, hookups, emotional uncertainty." },
    ],
    artistDetails: [
      { name: "Bryson Tiller", signature: "T R A P S O U L (2015)", why: "Invented the genre — album title gave it its name" },
      { name: "6LACK", signature: "FREE 6LACK (2016)", why: "Atlanta trap-soul; quiet, introspective" },
      { name: "PartyNextDoor", signature: "PND2 (2014)", why: "OVO label architect; pre-Tiller template" },
      { name: "Tory Lanez", signature: "I Told You (2016)", why: "Toronto trap-soul; commercial breakthrough year-one" },
      { name: "Roy Woods", signature: "Say Less (2017)", why: "OVO label; minimalist trap-soul" },
    ],
  },

  // ── ELECTRONIC family ─────────────────────────────────────────
  "House": {
    tagline: "Chicago club music from the early 1980s. Gave electronic dance music its four-on-the-floor template.",
    traitDetails: [
      { trait: "Four-on-the-floor kick", detail: "Kick drum on every quarter note at 120-128 BPM — the hypnotic foundation." },
      { trait: "Open hi-hat on offbeats", detail: "The 'sizzle' on beats 2 and 4 — creates motion between kicks." },
      { trait: "Disco sample chops", detail: "Chopped disco loops, vocal hooks, piano stabs — house was born from DJs extending disco's best moments." },
      { trait: "Roland TR-909", detail: "The definitive house drum sound — even when samples are used, producers reference the 909's tuning." },
    ],
    artistDetails: [
      { name: "Frankie Knuckles", signature: "Tears (1989)", why: "The Godfather of House; his Warehouse residency named the genre" },
      { name: "Larry Heard", signature: "Amnesia EP (1986)", why: "Deep house architect; 'Can You Feel It' is the Rosetta Stone" },
      { name: "Marshall Jefferson", signature: "Move Your Body (1986)", why: "'The house music anthem'; defined piano house" },
      { name: "Kerri Chandler", signature: "Bar a Thym (2008)", why: "NY garage-house; soulful deep house evangelist" },
      { name: "Disclosure", signature: "Settle (2013)", why: "Brought UK garage-house to pop charts; 'Latch' crossover" },
      { name: "Fred again..", signature: "Actual Life trilogy (2021-2023)", why: "Current-era house; voice-note sampling and emotional UK sound" },
      { name: "Peggy Gou", signature: "I Hear You (2023)", why: "Current-era house global star; Korean-German crossover" },
    ],
  },

  "Deep House": {
    tagline: "Slower, moodier, jazzier cousin of house. More chord-driven, less club-functional, more listenable.",
    traitDetails: [
      { trait: "Slower tempo (115-125 BPM)", detail: "Slightly slower than house proper; gives tracks more room to breathe." },
      { trait: "Jazzy chord progressions", detail: "Rhodes and pad chords with 7ths and 9ths; richer harmonic palette than standard house." },
      { trait: "Deep, soulful bass", detail: "Filtered, warm basslines often derived from real bass guitar or rich analog sub." },
      { trait: "Extended arrangements", detail: "7-10 minute tracks that evolve through filter sweeps, percussion changes, chord swaps." },
    ],
    artistDetails: [
      { name: "Larry Heard (Mr. Fingers)", signature: "Amnesia (1986)", why: "Invented deep house; 'Can You Feel It' is the origin point" },
      { name: "Kerri Chandler", signature: "Hemisphere Red (1998)", why: "NJ deep house; soulful, emotional" },
      { name: "Moodymann", signature: "Black Mahogani (2004)", why: "Detroit deep house; Kenny Dixon Jr.'s underground legend" },
      { name: "Jimpster", signature: "Freerange catalog (2000-)", why: "UK deep house; defined the 2000s scene" },
      { name: "Dixon", signature: "Innervisions label", why: "Berlin deep house; Âme collaborator" },
      { name: "Black Coffee", signature: "Subconsciously (2021)", why: "South African deep house to global scale; 2022 Grammy winner" },
    ],
  },

  "Techno": {
    tagline: "Detroit-born electronic music built on relentless rhythm and machine futurism. Harder and more hypnotic than house.",
    traitDetails: [
      { trait: "Machine-first aesthetic", detail: "Drum machines, 303s, 808s, 909s — techno embraces the sound of the machine, never hides it." },
      { trait: "Minimalist repetition", detail: "Tracks evolve across 7-10 minutes through subtle filter/FX changes — patience is the genre's ethic." },
      { trait: "Higher BPM (128-140)", detail: "Slightly faster than house; hard techno pushes 140-160 BPM for peak-time intensity." },
      { trait: "Industrial / dark atmospheres", detail: "Metallic percussion, distorted synths, factory/machine aesthetic (especially Berlin techno)." },
    ],
    artistDetails: [
      { name: "Juan Atkins / Cybotron", signature: "Clear (1983)", why: "Detroit techno founder; coined the term 'techno'" },
      { name: "Derrick May", signature: "Strings of Life (1987)", why: "Belleville Three; defined techno's musicality" },
      { name: "Jeff Mills", signature: "Exhibitionist (2004)", why: "Three-deck mixing pioneer; defined industrial techno" },
      { name: "Richie Hawtin", signature: "Consumed (1998)", why: "Minimal techno architect; Plastikman alias" },
      { name: "Carl Cox", signature: "Space Ibiza residencies", why: "Most globally recognized techno DJ" },
      { name: "Charlotte de Witte", signature: "Formula EP (2021)", why: "#1 Techno DJ 2024-2025 (DJ Mag); Belgian scene dominance" },
      { name: "Sara Landry", signature: "2023-2024 festival sets", why: "#1 Hard DJ 2025; current-era hard techno leader" },
    ],
  },

  "Dubstep": {
    tagline: "London 2000s garage-meets-dub creation that birthed both atmospheric 'UK dubstep' and the American aggressive 'brostep' drop.",
    traitDetails: [
      { trait: "140 BPM half-time feel", detail: "Fast tempo played against half-time drum groove — creates the signature lurching feel." },
      { trait: "Sub-bass weight", detail: "Sub frequencies (below 60Hz) are the centerpiece; designed for massive sound systems." },
      { trait: "The 'drop'", detail: "Extended intro leads to a drop where the bass wobble / growl takes over. Skrillex codified this for US audiences." },
      { trait: "Wobble bass (LFO-modulated)", detail: "Low-frequency oscillator applied to filter cutoff creates the wobble-wub-wub sound." },
    ],
    artistDetails: [
      { name: "Skream", signature: "Skream! (2006)", why: "South London dubstep originator; 'Midnight Request Line'" },
      { name: "Benga", signature: "Diary of an Afro Warrior (2008)", why: "Croydon scene founder alongside Skream and Artwork" },
      { name: "Burial", signature: "Untrue (2007)", why: "Post-dubstep; ghostly, garage-influenced atmospheric side" },
      { name: "Skrillex", signature: "Scary Monsters and Nice Sprites (2010)", why: "Brought US brostep to mainstream; defined 'drop' culture" },
      { name: "Rusko", signature: "O.M.G.! (2010)", why: "Early brostep; 'Woo Boost' template for all modern dubstep" },
      { name: "Excision", signature: "Apex (2018)", why: "Modern US dubstep giant; festival-driven heavy bass" },
    ],
  },

  "Drum & Bass": {
    tagline: "UK 1990s jungle evolution — breakneck breakbeats at 160-180 BPM with heavy sub-bass. The fastest major electronic genre.",
    traitDetails: [
      { trait: "Amen break foundation", detail: "The Winstons' 1969 drum break chopped and re-sequenced. Every DnB producer has used it." },
      { trait: "160-180 BPM", detail: "Extremely fast tempo; the half-time bassline creates a 80-90 BPM feel while drums remain breakneck." },
      { trait: "Sub-bass weight", detail: "Deep, rolling sub-basslines; often in 8-bar patterns, sometimes with Reese distortion." },
      { trait: "Multiple subgenres", detail: "Liquid DnB (melodic), Neurofunk (heavy), Jump-up (melodic hook-based), Jungle (breakbeat-heavy original)." },
    ],
    artistDetails: [
      { name: "Goldie", signature: "Timeless (1995)", why: "Pioneered DnB as 'serious music'; defined genre's ambition" },
      { name: "Roni Size / Reprazent", signature: "New Forms (1997)", why: "Mercury Prize-winning jazz-DnB; live-band approach" },
      { name: "Pendulum", signature: "Hold Your Colour (2005)", why: "Australian DnB; rock crossover that brought DnB to mainstream" },
      { name: "Noisia", signature: "Outer Edges (2016)", why: "Dutch trio; apex of neurofunk technical production" },
      { name: "Chase & Status", signature: "No More Idols (2011)", why: "UK DnB pop crossover" },
      { name: "Sub Focus", signature: "Torus (2013)", why: "Melodic DnB; defined 2010s radio-friendly sound" },
      { name: "Dimension", signature: "Organ EP (2018)", why: "Current-era DnB's most commercially dominant producer" },
    ],
  },

  "Trance": {
    tagline: "Euphoric, emotionally-cathartic dance music from 1990s Germany/Netherlands. Epic breakdowns, soaring leads.",
    traitDetails: [
      { trait: "128-140 BPM", detail: "Sweet spot between house and harder dance; euphoric but still danceable." },
      { trait: "Supersaw leads", detail: "Detuned saw-wave leads with long attack envelopes — the iconic 'trance lead' sound." },
      { trait: "Epic breakdowns", detail: "2-minute stripped sections before the drop; pads, piano, or vocals build tension before release." },
      { trait: "Arpeggiated sequences", detail: "Running 16th-note synth arpeggios drive the energy — often in minor keys for emotional pull." },
    ],
    artistDetails: [
      { name: "Armin van Buuren", signature: "A State of Trance radio show (2001-)", why: "The face of modern trance; Dutch trance king" },
      { name: "Tiësto", signature: "In Search of Sunrise series", why: "Dutch trance pioneer who crossed to EDM mainstream" },
      { name: "Paul van Dyk", signature: "Seven Ways (1996)", why: "German trance architect; 'For an Angel' defined the sound" },
      { name: "Above & Beyond", signature: "Group Therapy (2011)", why: "British trance trio; emotional vocal trance leaders" },
      { name: "ATB", signature: "Movin' Melodies (1999)", why: "German producer; '9PM (Till I Come)' is genre-defining" },
      { name: "Anyma", signature: "Genesys / Welcome to The Opera (2022-2024)", why: "Current-era melodic techno-trance hybrid; #10 DJ Mag 2025" },
    ],
  },

  // ── ROCK family ───────────────────────────────────────────────
  "Grunge": {
    tagline: "Seattle 1990-1994 fusion of punk energy, metal heaviness, and indie rock introspection. Killed hair metal in 18 months.",
    traitDetails: [
      { trait: "Quiet-loud dynamics", detail: "Whispered verses explode into distorted choruses — Pixies' dynamic template weaponized." },
      { trait: "Drop-tuned guitars", detail: "Guitars tuned down for heaviness, often to D or lower — gives grunge its sludgy weight." },
      { trait: "Anti-hair-metal aesthetic", detail: "Flannel shirts, unwashed hair, Doc Martens — deliberate rejection of 80s excess." },
      { trait: "Introspective/angry lyrics", detail: "Depression, alienation, generational apathy — Gen X's emotional vocabulary." },
    ],
    artistDetails: [
      { name: "Nirvana", signature: "Nevermind (1991)", why: "'Smells Like Teen Spirit' was grunge's big bang moment" },
      { name: "Pearl Jam", signature: "Ten (1991)", why: "More traditional rock than Nirvana; sold more but got less credit" },
      { name: "Soundgarden", signature: "Superunknown (1994)", why: "Metal-heavy grunge; Chris Cornell's vocal range unmatched" },
      { name: "Alice in Chains", signature: "Dirt (1992)", why: "Dark harmony vocals; heaviest of the Seattle Four" },
      { name: "Stone Temple Pilots", signature: "Core (1992)", why: "Accessible grunge-adjacent; 'Plush' was ubiquitous" },
      { name: "Hole", signature: "Live Through This (1994)", why: "Courtney Love's post-Cobain masterpiece; female grunge voice" },
    ],
  },

  "Indie Rock": {
    tagline: "Umbrella term for rock made outside major labels. Became aesthetically specific in the 2000s: jangly, literate, DIY-adjacent.",
    traitDetails: [
      { trait: "Jangly clean guitars", detail: "Chiming, chorused, or clean-tone guitars (Telecasters, Rickenbackers) — the opposite of arena-rock distortion." },
      { trait: "Literate lyrics", detail: "Writerly, often oblique lyrics with cultural/literary references — indie rock valorizes lyrical intelligence." },
      { trait: "Low-fi production values", detail: "Often recorded in home studios or independent labels; production is secondary to song and feel." },
      { trait: "Non-blockbuster songcraft", detail: "5-minute songs are fine; don't have to hit at 0:00; mood and atmosphere over hooks." },
    ],
    artistDetails: [
      { name: "Pavement", signature: "Slanted and Enchanted (1992)", why: "Defined 90s indie rock's slacker aesthetic" },
      { name: "The Strokes", signature: "Is This It (2001)", why: "Kicked off the 2000s indie rock revival; NYC template" },
      { name: "Arcade Fire", signature: "Funeral (2004)", why: "Indie rock's emotional grandeur; Canadian baroque pop" },
      { name: "Modest Mouse", signature: "Good News for People Who Love Bad News (2004)", why: "Idiosyncratic vocal style; 'Float On' mainstream crossover" },
      { name: "Vampire Weekend", signature: "Vampire Weekend (2008)", why: "Ivy League indie; Afro-pop influenced" },
      { name: "Phoebe Bridgers", signature: "Punisher (2020)", why: "Current-era indie rock; whisper-sing vocal style" },
      { name: "Boygenius", signature: "the record (2023)", why: "Phoebe + Julien + Lucy; current-era supergroup" },
    ],
  },

  "Punk": {
    tagline: "Three chords and attitude. 1970s NYC/London response to arena rock bloat — short, fast, loud, confrontational.",
    traitDetails: [
      { trait: "Short fast songs", detail: "Usually 2-3 minutes; punk rejects prog rock's 20-minute suites." },
      { trait: "Power chords + downstrokes", detail: "All-downstroke strumming creates punk's aggressive rhythmic drive." },
      { trait: "DIY ethic", detail: "'Anyone can do this' — zines, indie labels, self-recording; rejection of music-industry professionalism." },
      { trait: "Confrontational/political lyrics", detail: "Anti-establishment, anti-authority, often nihilistic — punk's stance is always against." },
    ],
    artistDetails: [
      { name: "The Ramones", signature: "Ramones (1976)", why: "Defined punk's sound; 14 songs in 29 minutes" },
      { name: "Sex Pistols", signature: "Never Mind the Bollocks (1977)", why: "UK punk breakthrough; cultural detonation" },
      { name: "The Clash", signature: "London Calling (1979)", why: "Expanded punk's musical vocabulary to reggae and rockabilly" },
      { name: "Black Flag", signature: "Damaged (1981)", why: "Hardcore punk template; defined 80s underground" },
      { name: "Dead Kennedys", signature: "Fresh Fruit for Rotting Vegetables (1980)", why: "SF political hardcore; Jello Biafra's biting satire" },
      { name: "Green Day", signature: "Dookie (1994)", why: "Brought punk back to mainstream 90s" },
    ],
  },

  "Metal": {
    tagline: "Amplified, distorted, aggressive rock dating to Black Sabbath in 1970. Has spawned dozens of subgenres across 5 decades.",
    traitDetails: [
      { trait: "Heavy distortion", detail: "High-gain amps, saturated tones — distortion is baseline, not ornament." },
      { trait: "Power-chord foundation", detail: "Root-5th chords, often chromatic; creates aggression without tonal ambiguity." },
      { trait: "Virtuosic musicianship", detail: "Metal values technical proficiency — fast picking, shred solos, complex drumming." },
      { trait: "Epic/dark thematic content", detail: "Lyrics often about death, war, fantasy, rebellion — operatic scope." },
    ],
    artistDetails: [
      { name: "Black Sabbath", signature: "Paranoid (1970)", why: "Invented heavy metal; downtuned, doomy, slow" },
      { name: "Judas Priest", signature: "British Steel (1980)", why: "Defined twin-guitar heavy metal template" },
      { name: "Iron Maiden", signature: "The Number of the Beast (1982)", why: "Epic/narrative metal; Bruce Dickinson's operatic vocals" },
      { name: "Metallica", signature: "Master of Puppets (1986)", why: "Thrash metal peak; transitioned to mainstream with 'Black Album' 1991" },
      { name: "Tool", signature: "Ænima (1996)", why: "Progressive metal; intellectual and art-album sensibility" },
      { name: "System of a Down", signature: "Toxicity (2001)", why: "Nu-metal crossover; Armenian-American political metal" },
      { name: "Ghost", signature: "Meliora (2015)", why: "Current-era theatrical doom metal; pop crossover" },
    ],
  },

  "Thrash Metal": {
    tagline: "Early 1980s acceleration of metal — faster, more aggressive, more technical. Bay Area + Germany epicenters.",
    traitDetails: [
      { trait: "Breakneck tempos", detail: "150-220 BPM; thrash distinguishes itself from traditional metal via sheer speed." },
      { trait: "Palm-muted chugging", detail: "Right-hand palm mute on low strings + picking precision — defines the thrash rhythm guitar sound." },
      { trait: "Complex song structures", detail: "Multi-part songs with tempo changes, instrumental sections, often 7+ minutes." },
      { trait: "Aggressive shouted vocals", detail: "Barked, shouted, or harsh-sung — not yet death-metal growled, but not traditional metal either." },
    ],
    artistDetails: [
      { name: "Metallica", signature: "Ride the Lightning (1984) / Master of Puppets (1986)", why: "Defined thrash template" },
      { name: "Slayer", signature: "Reign in Blood (1986)", why: "Most extreme thrash; 29 minutes of pure aggression" },
      { name: "Megadeth", signature: "Rust in Peace (1990)", why: "Most technical thrash; Dave Mustaine's ex-Metallica virtuosity" },
      { name: "Anthrax", signature: "Among the Living (1987)", why: "Thrash-hip-hop crossover; 'I'm the Man' and Public Enemy collab" },
      { name: "Exodus", signature: "Bonded by Blood (1985)", why: "Bay Area thrash scene originators" },
      { name: "Kreator", signature: "Extreme Aggression (1989)", why: "German thrash leaders; Teutonic thrash scene" },
    ],
  },

  // ── POP / K-POP ────────────────────────────────────────────────
  "K-Pop": {
    tagline: "Korean pop with military-precision choreography, genre-mashing production, and globally coordinated fandoms.",
    traitDetails: [
      { trait: "Genre-mashing within songs", detail: "A K-pop track might shift from trap to EDM to ballad in 3 minutes — rejects genre coherence as boring." },
      { trait: "Line distribution as structure", detail: "Groups (4-9 members) divide each song — each member gets a moment, creating multiple peaks per track." },
      { trait: "Choreo-driven production", detail: "Songs are built with dance in mind — hits land on choreo beats, vocal arrangements match body positions." },
      { trait: "Trainee system perfectionism", detail: "Artists train 3-10 years before debut; vocals/dance are technically pristine." },
    ],
    artistDetails: [
      { name: "BTS", signature: "Love Yourself: Tear (2018)", why: "First Korean act #1 on Billboard 200; global K-pop breakthrough" },
      { name: "BLACKPINK", signature: "The Album (2020)", why: "Biggest female group globally; defined feminine K-pop aesthetic" },
      { name: "NewJeans", signature: "Get Up (2023)", why: "Y2K-inspired Alt R&B/DnB K-pop; 4th-gen leader" },
      { name: "LE SSERAFIM", signature: "UNFORGIVEN (2023)", why: "Y2K pop-rock K-pop; Latin-inspired production" },
      { name: "Stray Kids", signature: "NOEASY (2021)", why: "Hip-hop-dominant K-pop; self-producing group" },
      { name: "IVE", signature: "I've IVE (2023)", why: "Current-era pop-leaning K-pop" },
      { name: "aespa", signature: "My World (2023)", why: "SM's metaverse concept; hyperpop-influenced K-pop" },
    ],
  },

  // ── LATIN family ──────────────────────────────────────────────
  "Reggaeton": {
    tagline: "Puerto Rican dancehall-influenced urban music built on the 'dembow' rhythm. Dominates global Latin pop.",
    traitDetails: [
      { trait: "Dembow rhythm", detail: "Derived from Shabba Ranks' 'Dem Bow' (1990). Boom-chick-boom-chick-boom-chick-chick-chick pattern." },
      { trait: "~90-95 BPM", detail: "Slow enough for perreo (grinding dance), fast enough to maintain energy." },
      { trait: "Call-and-response vocals", detail: "Hype-style vocals, ad-libs, gang vocals punctuate between rap verses." },
      { trait: "Synth bass + 808 hybrid", detail: "Low-end combines dancehall sub-bass and hip-hop 808 kick energy." },
    ],
    artistDetails: [
      { name: "Daddy Yankee", signature: "Barrio Fino (2004)", why: "'Gasolina' broke reggaeton globally; the King" },
      { name: "Don Omar", signature: "King of Kings (2006)", why: "Co-defined early-2000s commercial reggaeton era" },
      { name: "Wisin & Yandel", signature: "Pa'l Mundo (2005)", why: "Duo who crossed reggaeton into international mainstream" },
      { name: "J Balvin", signature: "Energía (2016)", why: "Led 2015+ reggaeton globalization wave" },
      { name: "Bad Bunny", signature: "Un Verano Sin Ti (2022)", why: "Most-streamed artist globally 2020-23; Spanish-language dominance" },
      { name: "Karol G", signature: "Mañana Será Bonito (2023)", why: "Biggest female Latin artist; reggaeton + bachata + trap" },
      { name: "Rauw Alejandro", signature: "Vice Versa (2021)", why: "Futuristic R&B-reggaeton with electronic experimentation" },
    ],
  },

  "Amapiano": {
    tagline: "South African house music with jazzy keys and signature log-drum bass. Went from township parties to global clubs in 3 years.",
    traitDetails: [
      { trait: "Log drum bass", detail: "The definitive sound — sliding deep sub-bass bouncing between the root and the fifth, often on the '&' beats." },
      { trait: "Jazzy chord stabs", detail: "Rhodes and piano stabs on the offbeat, with extended jazz harmony (7ths, 9ths, 11ths)." },
      { trait: "Shakers + percussion layers", detail: "Dense percussion grid — shakers, congas, bongos, clap patterns create the rhythmic hypnotism." },
      { trait: "Slow BPM (~110-115)", detail: "Slower than house, faster than hip-hop — sits in the sweet spot for dancing and groove." },
    ],
    artistDetails: [
      { name: "Kabza De Small", signature: "I Am The King of Amapiano (2020)", why: "Godfather; defined sound's production template" },
      { name: "DJ Maphorisa", signature: "Scorpion Kings (2019, w/ Kabza)", why: "Commercial driver behind many breakthrough hits" },
      { name: "Tyla", signature: "Water (2023)", why: "Brought amapiano-pop crossover to Billboard Hot 100 globally" },
      { name: "Focalistic", signature: "Ase Trap (2020)", why: "Amapiano's hip-hop connection" },
      { name: "Uncle Waffles", signature: "Tanzania EP (2022)", why: "Viral DJ; TikTok and international clubs" },
      { name: "Major League DJz", signature: "Piano City mix series", why: "Amapiano globalization; international festival circuit" },
    ],
  },

  // ── BLUES / GOSPEL / FOLK / JAZZ-ADJACENT ────────────────────
  "Blues": {
    tagline: "The emotional foundation of American popular music. Born from African-American work songs, spirituals, and field hollers in the Mississippi Delta.",
    traitDetails: [
      { trait: "12-bar form", detail: "The standard blues structure: 4 bars of I chord, 2 of IV, 2 of I, 2 of V, 2 of I. Template for rock and R&B." },
      { trait: "Blue notes", detail: "Flatted 3rd, 5th, and 7th — notes that sit 'between' major and minor, creating the blues' emotional ambiguity." },
      { trait: "Call-and-response vocals", detail: "Singer calls a phrase, guitar or band responds — conversation structure inherited from African music." },
      { trait: "Bent notes and slides", detail: "Guitar strings are bent for expressive pitch variations; slide guitar uses bottleneck for continuous glissando." },
    ],
    artistDetails: [
      { name: "Robert Johnson", signature: "King of the Delta Blues Singers (1961 compilation)", why: "Delta blues archetype; Legend of the Crossroads" },
      { name: "Muddy Waters", signature: "The Best of Muddy Waters (1958)", why: "Chicago electric blues founder; Rolling Stones named after his song" },
      { name: "B.B. King", signature: "Live at the Regal (1965)", why: "Most influential blues guitarist; defined the 12-bar lead style" },
      { name: "Howlin' Wolf", signature: "Moanin' in the Moonlight (1959)", why: "Chicago blues; rawest voice in the genre" },
      { name: "John Lee Hooker", signature: "Boom Boom (1962)", why: "Boogie blues; one-chord vamp style" },
      { name: "Stevie Ray Vaughan", signature: "Texas Flood (1983)", why: "Brought blues back to rock audiences in the 80s" },
      { name: "Gary Clark Jr.", signature: "Blak and Blu (2012)", why: "Current-era blues torchbearer" },
    ],
  },

  "Gospel": {
    tagline: "Sacred music with Black American emotional intensity. Vocal power, call-and-response, organ-driven — the training ground for most soul/R&B vocalists.",
    traitDetails: [
      { trait: "Vocal melisma", detail: "Elaborate runs and ornamented phrasing — the gospel vocal technique all soul singers inherit." },
      { trait: "Call-and-response", detail: "Preacher/soloist calls, congregation/choir responds. Foundational structure in African-American music." },
      { trait: "Hammond B3 organ", detail: "The signature keyboard of Black Protestant worship; sustained chords and bass pedals." },
      { trait: "Tambourine + handclaps", detail: "Simple percussion driving the rhythm; congregation becomes the rhythm section." },
    ],
    artistDetails: [
      { name: "Mahalia Jackson", signature: "Come On Children, Let's Sing (1960)", why: "The Queen of Gospel; civil-rights movement's musical voice" },
      { name: "Aretha Franklin", signature: "Amazing Grace (1972)", why: "Live gospel album that crossed to secular audiences; still the best-selling gospel album ever" },
      { name: "The Staple Singers", signature: "Freedom Highway (1965)", why: "Gospel-soul bridge; civil-rights anthem creators" },
      { name: "Kirk Franklin", signature: "The Nu Nation Project (1998)", why: "Contemporary gospel; brought hip-hop sensibilities to the genre" },
      { name: "Fred Hammond", signature: "Spirit of David (1996)", why: "Urban contemporary gospel architect" },
      { name: "Tasha Cobbs Leonard", signature: "Heart. Passion. Pursuit. (2017)", why: "Current-era gospel star; worship-focused contemporary" },
    ],
  },

  "Folk": {
    tagline: "Acoustic storytelling traditions passed orally. Protest, narrative, and community song. The roots of country, indie, and singer-songwriter music.",
    traitDetails: [
      { trait: "Acoustic instrumentation", detail: "Guitar, banjo, fiddle, mandolin, harmonica — the 'folk' of folk music is what ordinary people could play on ordinary instruments." },
      { trait: "Narrative lyrics", detail: "Songs tell stories — of labor, love, protest, travel, loss. Lyric is primary; production is secondary." },
      { trait: "Solo or small ensemble", detail: "Often solo singer with acoustic guitar, or duo/trio. Not arena-scale music." },
      { trait: "Tradition-bearing", detail: "Folk artists reinterpret older songs as much as write new ones; 'the folk process' means songs evolve through generations." },
    ],
    artistDetails: [
      { name: "Woody Guthrie", signature: "Dust Bowl Ballads (1940)", why: "Defined American folk protest tradition; 'This Land Is Your Land'" },
      { name: "Pete Seeger", signature: "We Shall Overcome (1963)", why: "Folk's civil-rights conscience; banjo pedagogy too" },
      { name: "Bob Dylan", signature: "The Freewheelin' Bob Dylan (1963)", why: "Transformed folk into literary songwriting; Nobel Prize in Literature" },
      { name: "Joan Baez", signature: "Joan Baez (1960)", why: "Folk's pure voice; civil-rights movement performer" },
      { name: "Simon & Garfunkel", signature: "Bridge Over Troubled Water (1970)", why: "Folk-pop bridge; brought folk to mass audiences" },
      { name: "Joni Mitchell", signature: "Blue (1971)", why: "Folk's greatest songwriter; confessional template for singer-songwriters" },
      { name: "Sufjan Stevens", signature: "Illinois (2005) / Carrie & Lowell (2015)", why: "Current-era indie folk; orchestral and intimate" },
    ],
  },

  "Disco": {
    tagline: "Four-on-the-floor dance music from 1970s clubs. Strings, hi-hats, lush production — invented DJ culture and remixing.",
    traitDetails: [
      { trait: "Four-on-the-floor kick", detail: "Kick on every quarter note at 110-130 BPM — the ancestor of house music's groove." },
      { trait: "Open hi-hats on offbeats", detail: "The 'tss tss tss' that defines disco's swing; every eighth-note gets a hat." },
      { trait: "Lush orchestral strings", detail: "Philadelphia International Records and Giorgio Moroder used strings and horn sections to add glamour." },
      { trait: "Extended DJ mixes", detail: "Clubs needed longer tracks; disco pioneered the 12-inch single, the extended mix, and the DJ as artist." },
    ],
    artistDetails: [
      { name: "Donna Summer", signature: "Bad Girls (1979)", why: "Queen of Disco; Moroder's 'I Feel Love' invented electronic disco" },
      { name: "Bee Gees", signature: "Saturday Night Fever (1977)", why: "Best-selling soundtrack of the 70s; 40 million copies" },
      { name: "Chic", signature: "C'est Chic (1978)", why: "Nile Rodgers' guitar; 'Good Times' bassline birthed 'Rapper's Delight'" },
      { name: "Earth, Wind & Fire", signature: "All 'n All (1977)", why: "Funk-disco fusion at peak" },
      { name: "Diana Ross", signature: "Diana (1980)", why: "Chic production; motown-disco pivot" },
      { name: "Giorgio Moroder", signature: "From Here to Eternity (1977)", why: "Electronic disco architect; producer behind Donna Summer's biggest hits" },
    ],
  },

  "Funk": {
    tagline: "Groove over melody. Syncopated bass, tight horns, 'the one' downbeat. Born from James Brown, refined by Parliament-Funkadelic.",
    traitDetails: [
      { trait: "'The one' emphasis", detail: "James Brown's innovation — the downbeat of each bar is the anchor; rhythm players lock to it aggressively." },
      { trait: "Syncopated bass", detail: "Bass guitar as lead instrument — plucked, popped, syncopated, often the most melodic element." },
      { trait: "Horn stabs", detail: "Tight 3-5 note horn hits punctuate the groove; often a James Brown-style trombone + sax combo." },
      { trait: "Clavinet + wah guitar", detail: "Signature keyboard (Hohner Clavinet via wah pedal) and chicken-scratch wah-pedal guitar." },
    ],
    artistDetails: [
      { name: "James Brown", signature: "Live at the Apollo (1963) / Sex Machine (1970)", why: "Invented funk; the Godfather of Soul moved music from changes to groove" },
      { name: "Parliament-Funkadelic", signature: "Mothership Connection (1975)", why: "George Clinton's P-Funk cosmology; template for hip-hop sampling" },
      { name: "Sly and the Family Stone", signature: "There's a Riot Goin' On (1971)", why: "Psych-funk crossover; integrated band" },
      { name: "Stevie Wonder", signature: "Innervisions (1973)", why: "Funk in service of social commentary and songcraft" },
      { name: "Tower of Power", signature: "Tower of Power (1973)", why: "East Bay grease; tightest horn section in funk" },
      { name: "Prince", signature: "1999 (1982) / Sign o' the Times (1987)", why: "One-man-band funk auteur across 40 years" },
      { name: "Bruno Mars", signature: "24K Magic (2016)", why: "Current-era funk revival; Uptown Funk ubiquity" },
    ],
  },

  "Reggae": {
    tagline: "Jamaican music evolved from ska and rocksteady. Slow tempo, off-beat guitar accents, heavy bass, spiritual lyrical content.",
    traitDetails: [
      { trait: "The 'skank' guitar pattern", detail: "Offbeat guitar chops on beats 2 and 4 — reggae's defining rhythmic signature." },
      { trait: "Heavy, melodic bass", detail: "Bass is often the lead instrument; deep sub frequencies carry tracks." },
      { trait: "One drop drumming", detail: "Drum emphasis on beat 3 with kick; creates reggae's distinctive laid-back feel." },
      { trait: "Rastafarian themes", detail: "Lyrics often center on Rasta spirituality, Babylon (oppression), Zion, and Jah." },
    ],
    artistDetails: [
      { name: "Bob Marley", signature: "Exodus (1977) / Legend (1984 compilation)", why: "The defining face of reggae; globalized the genre" },
      { name: "Peter Tosh", signature: "Legalize It (1976)", why: "Militant reggae; Wailers co-founder" },
      { name: "Jimmy Cliff", signature: "The Harder They Come (1972)", why: "Reggae's first crossover; soundtrack that introduced the genre to the world" },
      { name: "Burning Spear", signature: "Marcus Garvey (1975)", why: "Roots reggae archetype; Black nationalist themes" },
      { name: "Toots and the Maytals", signature: "Funky Kingston (1973)", why: "Originated the term 'reggae'; church-influenced soulful vocals" },
      { name: "Lee 'Scratch' Perry", signature: "Super Ape (1976)", why: "Producer-auteur; pioneered dub music" },
    ],
  },

  "Dancehall": {
    tagline: "Jamaica's 1980s-and-after evolution of reggae — digital, faster, MC-driven. The Caribbean's answer to hip-hop.",
    traitDetails: [
      { trait: "Digital riddims", detail: "Pre-recorded instrumental tracks that multiple vocalists record over — 'riddim' culture is dancehall's organizing principle." },
      { trait: "MC/deejay-led vocals", detail: "Fast-spoken Jamaican patois rather than reggae's sung vocals; dancehall MC is the precursor to the rapper." },
      { trait: "Bigger basslines", detail: "Sub-bass drops that shook soundsystems; cross-pollinated directly into reggaeton's dembow." },
      { trait: "Higher BPM (~95-105)", detail: "Faster than reggae's 70-80 BPM; designed for dancefloor energy." },
    ],
    artistDetails: [
      { name: "Shabba Ranks", signature: "As Raw As Ever (1991)", why: "First international dancehall superstar; 'Dem Bow' source rhythm" },
      { name: "Sean Paul", signature: "Dutty Rock (2002)", why: "Dancehall's biggest global crossover" },
      { name: "Beenie Man", signature: "Art and Life (2000)", why: "King of Dancehall; 90s-2000s dominance" },
      { name: "Vybz Kartel", signature: "Kingston Story (2011)", why: "Most influential modern dancehall artist despite imprisonment" },
      { name: "Popcaan", signature: "Forever (2018)", why: "Current-era dancehall leader; Drake collaborator" },
      { name: "Koffee", signature: "Rapture EP (2019)", why: "Youngest Grammy winner for Best Reggae Album" },
    ],
  },

  // ═══════════════════ TIER C — 37 NICHE SUBGENRES ═════════════════════
  // 3-4 artists each, focused trait details. These fill out the long tail
  // for users exploring deeper subgenre territory.

  // ── HIP-HOP NICHES ──────────────────────────────────────────────
  "Jersey Drill": {
    tagline: "NY drill mutation using the Jersey Club kick pattern. Faster, bouncier, more danceable than Brooklyn drill.",
    traitDetails: [
      { trait: "Jersey Club kick pattern", detail: "The signature 'bed squeak' / five-kick syncopated pattern from Jersey Club layered under drill content." },
      { trait: "Faster tempo (~140-150 BPM)", detail: "Quicker than standard drill (~140), dance-floor-ready rather than street-reportage-paced." },
      { trait: "Melodic hook emphasis", detail: "Jersey drill pairs drill content with more singable hooks; less monotone than NY drill." },
    ],
    artistDetails: [
      { name: "Bandmanrill", signature: "Bandemic (2022)", why: "Defined Jersey drill's sound" },
      { name: "Sha EK", signature: "Face of the Pain (2022)", why: "Bridged Jersey drill with Bronx drill" },
      { name: "DThang", signature: "Jersey scene mixtapes", why: "Jersey drill's early architect" },
      { name: "MCVertt", signature: "2022-2023 viral tracks", why: "Producer behind many key Jersey drill hits" },
    ],
  },

  "Lo-Fi Hip-Hop": {
    tagline: "Chilled, beat-loop hip-hop designed for studying and ambient listening. Born from J Dilla, weaponized by YouTube 24/7 streams.",
    traitDetails: [
      { trait: "Dusty, warm production", detail: "Vinyl crackle, tape hiss, low-pass filtered samples — deliberately lo-fi aesthetic." },
      { trait: "Jazz sample foundation", detail: "Chopped jazz piano, saxophone, or Rhodes samples, usually in minor keys." },
      { trait: "Instrumental / no vocals", detail: "Almost always instrumental; meant for background listening, not attention." },
      { trait: "J Dilla drunken-drum feel", detail: "Slightly off-grid quantization gives drums a human, swaying feel." },
    ],
    artistDetails: [
      { name: "J Dilla", signature: "Donuts (2006)", why: "The spiritual father of the entire aesthetic" },
      { name: "Nujabes", signature: "Modal Soul (2005)", why: "Japanese producer; 'Samurai Champloo' soundtrack defined chill jazz-hop" },
      { name: "Joji (early)", signature: "BALLADS 1 (2018)", why: "Pre-pop lo-fi era; 'Slow Dancing in the Dark' crossover" },
      { name: "idealism", signature: "Lonely Hearts (2018)", why: "Defined the chillhop-YouTube-stream aesthetic" },
    ],
  },

  "Memphis Rap": {
    tagline: "Early-90s Memphis scene known for grimy cassette production, horrorcore themes, and slowed-down dark aesthetics. Spawned phonk decades later.",
    traitDetails: [
      { trait: "Cassette-tape saturation", detail: "Recorded direct to cassette with heavy tape hiss and wobble — the lo-fi aesthetic was necessity, then became identity." },
      { trait: "Horrorcore themes", detail: "Occult imagery, violent storytelling, Satanic themes — unusual darkness for early-90s rap." },
      { trait: "Slow BPM + syrupy flow", detail: "Tempos 70-80 BPM, often slowed further via chopped-and-screwed technique borrowed from Houston." },
      { trait: "808 cowbell", detail: "The distorted 808 cowbell hit is the signature percussion — later became phonk's core element." },
    ],
    artistDetails: [
      { name: "Three 6 Mafia", signature: "Mystic Stylez (1995)", why: "Memphis rap's most influential group; Oscar winners" },
      { name: "DJ Screw", signature: "Chapter 12: Headed to the Paper (1995)", why: "Houston-Memphis bridge; invented chopped-and-screwed" },
      { name: "Lord Infamous", signature: "Three 6 Mafia albums", why: "Pioneer of chopper flow; solo work is phonk's primary sample source" },
      { name: "Project Pat", signature: "Mista Don't Play (2001)", why: "Most commercial Memphis rap success" },
    ],
  },

  "Crunk": {
    tagline: "Atlanta and Memphis 2000s party rap — shouted hype vocals, heavy 808s, chant hooks. Precursor to modern trap.",
    traitDetails: [
      { trait: "Shouted hype vocals", detail: "Group chants, call-and-response, 'yeah!' ad-libs — designed for club energy, not lyricism." },
      { trait: "Heavy 808 kicks", detail: "Booming 808-driven drums; crunk was among the first to center the 808 over sampled drums." },
      { trait: "Repetitive chant hooks", detail: "Hooks are short, chant-based phrases meant for crowd participation." },
      { trait: "~100 BPM Southern feel", detail: "Mid-tempo with heavy half-time feel; designed for the 'crunk' (hyped up) club environment." },
    ],
    artistDetails: [
      { name: "Lil Jon & the East Side Boyz", signature: "Kings of Crunk (2002)", why: "Defined the genre; Lil Jon produced most of its biggest hits" },
      { name: "Three 6 Mafia", signature: "Most Known Unknown (2005)", why: "Crossed Memphis rap into crunk-adjacent mainstream" },
      { name: "Ying Yang Twins", signature: "United State of Atlanta (2005)", why: "'Get Low' and 'Salt Shaker' commercial apex" },
      { name: "Crime Mob", signature: "Crime Mob (2004)", why: "Young crunk female voices; 'Knuck If You Buck'" },
    ],
  },

  "Conscious Hip-Hop": {
    tagline: "Hip-hop prioritizing social, political, and philosophical content over party/street narratives. A value system as much as a sound.",
    traitDetails: [
      { trait: "Political/social themes", detail: "Lyrics about racism, economic inequality, history, activism — hip-hop as journalism and education." },
      { trait: "Dense lyrical references", detail: "Allusions to Black intellectual history, literature, civil rights — requires unpacking." },
      { trait: "Jazz/soul production", detail: "Often pairs thoughtful lyrics with warm organic production; rejects the commercial-beat aesthetic." },
      { trait: "Album-oriented approach", detail: "Full-length concept albums over single-chasing — form matches the serious content." },
    ],
    artistDetails: [
      { name: "Public Enemy", signature: "It Takes a Nation of Millions (1988)", why: "Originated conscious rap's confrontational political edge" },
      { name: "A Tribe Called Quest", signature: "The Low End Theory (1991)", why: "Afrocentric jazz-rap; defined conscious rap's cooler side" },
      { name: "Common", signature: "Be (2005)", why: "Kanye-produced; conscious rap's most commercially accessible era" },
      { name: "Kendrick Lamar", signature: "To Pimp a Butterfly (2015)", why: "Conscious rap's 21st-century apex; Pulitzer winner" },
    ],
  },

  "Rage Rap": {
    tagline: "Trap mutation with aggressive stereo-widened synths, distorted 808s, and screamed Auto-Tune. Playboi Carti's 'Whole Lotta Red' is the urtext.",
    traitDetails: [
      { trait: "Stereo-widened synth hooks", detail: "EDM/future-bass-influenced lead synths, wide and loud, looped in short phrases — often derived from Pi'erre Bourne / F1lthy type-beats." },
      { trait: "Distorted, heavy 808s", detail: "808 bass pushed into saturation/clipping for weight; often elastic and bouncy like rubber." },
      { trait: "Screamed Auto-Tune vocals", detail: "Heavily processed, often clipped or distorted vocals; influenced by Playboi Carti's vocal experimentation." },
      { trait: "Video-game aesthetics", detail: "Synth patches reminiscent of 1990s game soundtracks and trance — futuristic/electronic energy." },
    ],
    artistDetails: [
      { name: "Playboi Carti", signature: "Whole Lotta Red (2020) / MUSIC (2025)", why: "Defined rage rap; WLR is the genre's founding document" },
      { name: "Ken Carson", signature: "A Great Chaos (2023) / More Chaos (2025)", why: "Current-era leader; More Chaos #1 Billboard 200" },
      { name: "Destroy Lonely", signature: "No Stylist (2022) / If Looks Could Kill (2023)", why: "Opium label; atmospheric, fashion-forward rage" },
      { name: "Yeat", signature: "2 Alive (2022) / LYFESTYLE (2024)", why: "Dark, bell-heavy rage variant; 2024 Billboard #1" },
      { name: "Trippie Redd", signature: "Miss the Rage (2021, w/ Carti)", why: "Co-named and popularized the genre" },
    ],
  },

  "Plugg": {
    tagline: "Atlanta 2016-2018 beat subgenre — bright plugg synths, melodic loops, pluggnb offshoot. Precursor to rage rap.",
    traitDetails: [
      { trait: "Bright plugg synths", detail: "Major-key pluck synths and sparkly arpeggios — happier than trap, more melodic than drill." },
      { trait: "Light trap drums", detail: "Trap hi-hat patterns and 808s, but mixed lower — the synths dominate the arrangement." },
      { trait: "Short looped melodic phrases", detail: "4-8 bar melodic loops that repeat throughout; producer-centric beats." },
      { trait: "PluggnB variant", detail: "Softer melodic vocals over plugg production — became its own TikTok-era subgenre." },
    ],
    artistDetails: [
      { name: "MexikoDro", signature: "Plugg beat tapes (2016-)", why: "Originated the 'plugg' beat sound in Atlanta" },
      { name: "Summrs", signature: "Summrs mixtapes (2020-)", why: "PluggnB pioneer; TikTok-era melodic plugg" },
      { name: "Autumn!", signature: "Golden Plugg (2021)", why: "Pushed plugg/pluggnb into streaming mainstream" },
      { name: "Kankan", signature: "RR (2021)", why: "Bridged plugg with rage; Dallas scene leader" },
    ],
  },

  "French Rap": {
    tagline: "France's hip-hop tradition — from 1990s East Coast-style crews to 2020s melodic cloud rap. One of the largest non-English rap scenes globally.",
    traitDetails: [
      { trait: "French-language wordplay", detail: "Verlan slang, rich internal rhymes — French rap takes lyrical craft seriously." },
      { trait: "Cinematic production", detail: "French producers favor lush strings, piano, cinematic textures — heavy Ennio Morricone influence historically." },
      { trait: "Afro-French fusion", detail: "Many artists draw on West/North African heritage; fuses with Afrobeats, raï, gnawa." },
      { trait: "Storytelling/street narrative", detail: "Banlieue (suburb) realism; French rap carries strong social-commentary tradition." },
    ],
    artistDetails: [
      { name: "IAM", signature: "L'École du Micro d'Argent (1997)", why: "Marseille rap pioneers; defined 90s French hip-hop" },
      { name: "Booba", signature: "Ouest Side (2006)", why: "French rap's biggest commercial figure; Kaaris rivalry era" },
      { name: "Damso", signature: "Ipséité (2017)", why: "Belgian-Congolese; brought French rap to wider European mainstream" },
      { name: "Ninho", signature: "Destin (2019)", why: "Most-streamed French rapper of his era" },
      { name: "PNL", signature: "Deux frères (2019)", why: "Cloud-rap French duo; visual aesthetic iconic" },
    ],
  },

  "Grime": {
    tagline: "London 2000s 140-BPM electronic-rap hybrid — descended from UK garage, parallel to dubstep. Fast, urgent, bar-focused.",
    traitDetails: [
      { trait: "140 BPM 2-step foundation", detail: "Faster than hip-hop; descended from UK garage's 2-step rhythm and broken-beat patterns." },
      { trait: "Skippy, fragmented drums", detail: "Not four-on-the-floor; syncopated kicks and snares with lots of space and swing." },
      { trait: "Square-wave synth basslines", detail: "Raw, distorted sub-basslines — often from FruityLoops / Reason synth presets." },
      { trait: "Fast bar-heavy MCing", detail: "MCs trade 8-bar verses rapidly over pirate-radio-style sets; lyrical skill is the currency." },
    ],
    artistDetails: [
      { name: "Dizzee Rascal", signature: "Boy in da Corner (2003)", why: "Grime's first Mercury Prize winner; genre-defining debut" },
      { name: "Wiley", signature: "Treddin' on Thin Ice (2004)", why: "The Godfather of Grime; invented 'Eskibeat' production style" },
      { name: "Skepta", signature: "Konnichiwa (2016)", why: "Grime's 2010s revival leader; Drake endorsement era" },
      { name: "Stormzy", signature: "Gang Signs & Prayer (2017)", why: "Took grime to #1 on UK Albums Chart; Glastonbury headliner" },
      { name: "Kano", signature: "Made in the Manor (2016)", why: "East London grime veteran; kept the genre literary" },
    ],
  },

  "Latin Rap": {
    tagline: "Spanish-language hip-hop from Latin America and the US Latino diaspora. Distinct from Latin Trap — this is pure rap in Spanish.",
    traitDetails: [
      { trait: "Spanish-language lyricism", detail: "Bilingual wordplay, regional slang — rap craft in Spanish linguistic tradition." },
      { trait: "Boom-bap sensibility", detail: "Many Latin rap scenes honor 90s NY hip-hop structurally — sample-based, beat-driven." },
      { trait: "Social/political content", detail: "Often socially conscious; Latin American political history informs many artists' themes." },
      { trait: "Regional distinctiveness", detail: "Mexican, Chilean, Argentine, Puerto Rican, and US Chicano scenes each have distinct sounds." },
    ],
    artistDetails: [
      { name: "Vico C", signature: "Hispanic Soul (1991)", why: "The Philosopher of Rap; Puerto Rican pioneer" },
      { name: "Control Machete", signature: "Mucho Barato (1996)", why: "Mexican rap icons; Monterrey scene architects" },
      { name: "Calle 13", signature: "Entren Los Que Quieran (2010)", why: "Puerto Rican duo; Latin rap's most Grammy-awarded act" },
      { name: "Nach", signature: "Un día en Suburbia (2008)", why: "Spain's lyrical rap standard-bearer" },
    ],
  },

  "Latin Trap": {
    tagline: "Spanish-language trap from Puerto Rico and Latin diaspora. Fuses Atlanta trap production with Spanish vocals. Emerged ~2016.",
    traitDetails: [
      { trait: "Trap production in Spanish", detail: "808 bass, hi-hat triplets, dark minor-key pads — with Spanish-language vocals over the top." },
      { trait: "Reggaeton adjacency", detail: "Many Latin trap artists also do reggaeton; the two genres cross-pollinate heavily." },
      { trait: "Melodic sing-rap hybrid", detail: "Vocals often Auto-Tuned and melodic, similar to US melodic rap." },
      { trait: "Caribbean rhythmic sensibility", detail: "Even when using trap drums, phrasing and groove often reference dembow and Afro-Caribbean patterns." },
    ],
    artistDetails: [
      { name: "Bad Bunny", signature: "X 100pre (2018)", why: "Latin trap's biggest crossover; eventually went pure reggaeton" },
      { name: "Anuel AA", signature: "Real Hasta la Muerte (2018)", why: "Defined modern Latin trap's street edge" },
      { name: "Farruko", signature: "Gangalee (2019)", why: "Puerto Rican Latin trap veteran" },
      { name: "Ozuna", signature: "Odisea (2017)", why: "Melodic Latin trap; bridged trap and reggaeton" },
    ],
  },

  // ── R&B NICHES ──────────────────────────────────────────────────
  "New Jack Swing": {
    tagline: "Late 1980s-early 90s R&B + hip-hop + funk fusion. Teddy Riley's invention — swing-feel drums, synth bass, rapped bridges.",
    traitDetails: [
      { trait: "Swing-feel drum programming", detail: "Quantized but swung drum machines (typically Roland R-8 or Akai MPC) — rap's precision with R&B groove." },
      { trait: "Synth bass + keyboard stabs", detail: "Synthy 80s production — Minimoog bass, DX7 stabs, often replacing traditional R&B band instrumentation." },
      { trait: "Rapped bridges", detail: "Middle-8s often feature a rapped verse — the first consistent R&B-rap hybrid format." },
      { trait: "Shuffle hi-hats", detail: "16th-note hi-hat patterns with triplet swing — defines the 'new jack' groove." },
    ],
    artistDetails: [
      { name: "Teddy Riley", signature: "Guy (1988, as Guy) / MJ's Dangerous (1991, co-produced)", why: "Invented the genre; his production defined the sound" },
      { name: "Bobby Brown", signature: "Don't Be Cruel (1988)", why: "First New Jack Swing pop breakthrough" },
      { name: "Bell Biv DeVoe", signature: "Poison (1990)", why: "Defined the boy-group-plus-rap template" },
      { name: "Keith Sweat", signature: "Make It Last Forever (1987)", why: "Earliest new jack swing; Sweat's solo debut pre-dates the genre's naming" },
    ],
  },

  "Auto-Tune R&B": {
    tagline: "R&B that uses Auto-Tune as creative tool rather than pitch corrector. T-Pain invented the style; Future perfected it for rap.",
    traitDetails: [
      { trait: "Auto-Tune as expressive instrument", detail: "Hard-corrected pitch settings create robotic quality; turned 'imperfection' into signature aesthetic." },
      { trait: "Exaggerated pitch slides", detail: "Vocals slide dramatically between notes; Auto-Tune intensifies the slide, creating the 'wobble' effect." },
      { trait: "Processed layering", detail: "Often multiple Auto-Tuned vocal takes stacked; creates choir-of-robots texture." },
      { trait: "Emotional vulnerability", detail: "Despite the robotic processing, content is often raw and emotionally direct — machine voice, human heart." },
    ],
    artistDetails: [
      { name: "T-Pain", signature: "Rappa Ternt Sanga (2005)", why: "Popularized Auto-Tune as creative tool" },
      { name: "Future", signature: "Pluto 3D (2012)", why: "Defined the Atlanta trap-soul Auto-Tune aesthetic" },
      { name: "Lil Durk", signature: "Almost Healed (2023)", why: "Current-era melodic rap Auto-Tune; drill-adjacent" },
      { name: "Kanye West", signature: "808s & Heartbreak (2008)", why: "Brought Auto-Tune to artistic high-art rap context" },
    ],
  },

  // ── POP NICHES ──────────────────────────────────────────────────
  "Hyperpop": {
    tagline: "Maximalist, glitchy, digitally-exaggerated pop from the PC Music label and 100 gecs era. A. G. Cook & SOPHIE = architects. Charli XCX = queen.",
    traitDetails: [
      { trait: "Maximalist production", detail: "Wall-of-sound, distorted, pushed past the limit — deliberately 'too much' in every dimension." },
      { trait: "Pitch-shifted vocals", detail: "Vocals sped up, slowed down, Auto-Tuned to mechanical perfection or beyond." },
      { trait: "Bubblegum-bass + industrial fusion", detail: "Saccharine melodies over heavy industrial/electronic production — beauty and abrasion at once." },
      { trait: "Queer/Gen Z internet aesthetic", detail: "Emerged from Alt TikTok, queer Discord servers, SoundCloud; internet-native in ways other genres aren't." },
    ],
    artistDetails: [
      { name: "SOPHIE", signature: "Oil of Every Pearl's Un-Insides (2018)", why: "Genre-defining producer; made industrial hyperpop before it had a name" },
      { name: "A. G. Cook", signature: "7G (2020) / Apple (2020) / Britpop (2024)", why: "PC Music founder; hyperpop architect" },
      { name: "Charli XCX", signature: "Pop 2 (2017) / how i'm feeling now (2020) / Brat (2024)", why: "Hyperpop's biggest crossover; Brat defined 2024" },
      { name: "100 gecs", signature: "1000 gecs (2019)", why: "'Money Machine' viral breakthrough; Gen Z hyperpop template" },
      { name: "Charli XCX protégés (Dorian Electra, Hannah Diamond)", signature: "Various PC Music releases", why: "Defined the visual + sonic PC Music aesthetic" },
    ],
  },

  "Bedroom Pop": {
    tagline: "Intimate, lo-fi pop recorded in bedrooms — DIY-Gen-Z aesthetic born on SoundCloud and Bandcamp in the 2010s.",
    traitDetails: [
      { trait: "Home-recorded aesthetic", detail: "Deliberately amateur production values — tape hiss, room tone, single mic vocals — honest and intimate." },
      { trait: "Soft, whispered vocals", detail: "Close-mic'd, unprocessed vocals — conversational rather than performative." },
      { trait: "Acoustic + lo-fi electronic hybrid", detail: "Guitar + GarageBand drum machines; lo-fi production shared between indie folk and indie electronic." },
      { trait: "Diaristic lyrics", detail: "Personal, introspective songwriting — often about mental health, young love, boredom." },
    ],
    artistDetails: [
      { name: "Clairo", signature: "Immunity (2019)", why: "Viral 'Pretty Girl' defined bedroom pop aesthetic" },
      { name: "Rex Orange County", signature: "Pony (2019)", why: "UK bedroom pop; lush acoustic-electronic hybrid" },
      { name: "Mac DeMarco", signature: "Salad Days (2014)", why: "Jangly-slacker bedroom pop; older-gen antecedent" },
      { name: "Cuco", signature: "Para Mí (2019)", why: "Latinx bedroom pop; bilingual indie" },
    ],
  },

  "City Pop": {
    tagline: "1970s-80s Japanese urban pop — funk, disco, jazz-fusion played by session musicians. Went global via YouTube algorithm in the late 2010s.",
    traitDetails: [
      { trait: "Session-musician precision", detail: "Tight, studio-clean playing — often from Japan's top session players (funk/jazz musicians)." },
      { trait: "Funk and disco DNA", detail: "Groove-driven rhythm sections; funk bass and hi-hat disco patterns dominate." },
      { trait: "Jazz chord vocabulary", detail: "9th, 11th, 13th chord extensions — more harmonically sophisticated than 80s US pop." },
      { trait: "Urban/consumerist themes", detail: "Lyrics about Tokyo nightlife, driving, loneliness, consumer culture — pre-digital melancholy." },
    ],
    artistDetails: [
      { name: "Mariya Takeuchi", signature: "Variety (1984)", why: "'Plastic Love' became city pop's viral breakout single (30+ years late)" },
      { name: "Tatsuro Yamashita", signature: "For You (1982)", why: "City pop's most influential male artist" },
      { name: "Anri", signature: "Timely!! (1983)", why: "Summer city pop standard-bearer" },
      { name: "Toshiki Kadomatsu", signature: "Weekend Fly to the Sun (1982)", why: "Jazz-funk city pop; session-musician peak" },
    ],
  },

  "Dark Pop": {
    tagline: "Minor-key, atmospheric, brooding pop — Lana Del Rey's invention becomes Billie Eilish's template. Melancholy as pop vocabulary.",
    traitDetails: [
      { trait: "Minor-key melodic tendency", detail: "Minor scales and modal interchange dominant; major-key choruses are rare." },
      { trait: "Whispered/breathy vocals", detail: "Close-mic'd, unprocessed vocal intimacy — whispered more often than belted." },
      { trait: "Sparse production with bass emphasis", detail: "Bass is often the loudest element; space between sounds creates unease." },
      { trait: "Melancholic lyrical register", detail: "Themes of depression, toxic relationships, death, self-destructive romance." },
    ],
    artistDetails: [
      { name: "Lana Del Rey", signature: "Born to Die (2012)", why: "Originated the dark pop template; Hollywood sadness as aesthetic" },
      { name: "Billie Eilish", signature: "When We All Fall Asleep, Where Do We Go? (2019)", why: "Dark pop's Gen Z face; whispered-pop world domination" },
      { name: "Halsey", signature: "Badlands (2015)", why: "Alt-pop dark sensibility bridging indie and pop" },
      { name: "Melanie Martinez", signature: "Cry Baby (2015)", why: "Dark theatrical pop; concept-album aesthetic" },
    ],
  },

  "J-Pop": {
    tagline: "Japanese pop umbrella — idol groups, city pop descendants, anime themes, visual kei adjacents. Huge domestic industry, selective export.",
    traitDetails: [
      { trait: "Genre-mashing within songs", detail: "Like K-pop, J-pop tracks shift styles mid-song; rejects genre coherence." },
      { trait: "Idol/group systems", detail: "Large groups (AKB48, Morning Musume) with member rotations; song-and-dance as product." },
      { trait: "Anime tie-in tradition", detail: "Many J-pop hits are anime opening themes; anime culture drives domestic hit-making." },
      { trait: "Hyper-polished production", detail: "Japanese studios prize technical perfection; J-pop rarely sounds rough." },
    ],
    artistDetails: [
      { name: "Utada Hikaru", signature: "First Love (1999)", why: "Best-selling J-pop album ever; bilingual international crossover" },
      { name: "Ado", signature: "One Piece Film Red soundtrack (2022)", why: "Vocaloid-influenced J-pop vocalist; anonymous superstar" },
      { name: "Kenshi Yonezu", signature: "STRAY SHEEP (2020)", why: "Current-era J-pop auteur; biggest male solo artist" },
      { name: "Yoasobi", signature: "The Book (2021)", why: "Light-novel-adapted J-pop duo; 'Yoru ni Kakeru' viral globally" },
    ],
  },

  // ── ELECTRONIC NICHES ───────────────────────────────────────────
  "Afro House": {
    tagline: "African-flavored house — percussion-heavy, Afrobeats/African-language vocals, tribal drum loops. Black Coffee is the face.",
    traitDetails: [
      { trait: "African percussion layering", detail: "Djembe, conga, shakere, talking drum patterns layered over house drums." },
      { trait: "Vocal samples from African languages", detail: "Zulu, Yoruba, and other language vocal snippets used as both instrument and hook." },
      { trait: "Deeper BPM (118-125)", detail: "Sits between deep house and regular house tempo; meditative, slow-build." },
      { trait: "Spiritual/tribal atmosphere", detail: "Pads, bells, nature sounds create ceremonial feel rather than peak-time intensity." },
    ],
    artistDetails: [
      { name: "Black Coffee", signature: "Subconsciously (2021)", why: "2022 Grammy; defined Afro house globally" },
      { name: "Culoe De Song", signature: "The Journey (2011)", why: "South African Afro house originator" },
      { name: "Caiiro", signature: "The Akan (2020)", why: "Tribal Afro house emotional epicenter" },
      { name: "Da Capo", signature: "Return of Dacapo (2019)", why: "South African Afro house prolific producer" },
    ],
  },

  "Tech-House": {
    tagline: "House + techno hybrid — 4-on-the-floor like house, darker/grittier like techno. Became the dominant festival-club sound in the 2020s.",
    traitDetails: [
      { trait: "124-128 BPM", detail: "Slightly faster than classic house; slightly slower than peak techno." },
      { trait: "Tight minimalist arrangement", detail: "Fewer elements than full house; closer to minimal techno's restraint." },
      { trait: "Vocal chop hooks", detail: "Short pitched vocal chops used as instrumental hooks — 'Fisher style' defined the sub-genre's 2020s era." },
      { trait: "Groove-first rhythmic complexity", detail: "Syncopated bass/percussion interplay; dance-floor-driven rather than trance-euphoric." },
    ],
    artistDetails: [
      { name: "Fisher", signature: "Losing It (2018)", why: "Australian producer; defined 2020s tech-house sound" },
      { name: "Chris Lake", signature: "Free Treatment (2018)", why: "UK tech-house; 'Turn Off The Lights' era" },
      { name: "Hot Since 82", signature: "Eight (2017)", why: "UK tech-house veteran; Knee Deep in Sound label" },
      { name: "Patrick Topping", signature: "Trick label releases", why: "UK tech-house staple; groove-focused sets" },
    ],
  },

  "Minimal Techno": {
    tagline: "Techno stripped to essentials — repetitive, patient, often 8-12 minute tracks. Richie Hawtin's invention, Berlin's scene.",
    traitDetails: [
      { trait: "Extreme minimalism", detail: "Often just kick + hi-hat + one synth element + occasional FX. Everything else is stripped." },
      { trait: "8-12 minute track length", detail: "Tracks evolve glacially; one small change every 2-4 bars over long duration." },
      { trait: "Subtle percussion variation", detail: "Hi-hat patterns and shaker elements carry rhythmic interest; micro-changes are features." },
      { trait: "Clinical production values", detail: "Dry, clean, uncolored production — minimalism rejects the 'warm analog' aesthetic." },
    ],
    artistDetails: [
      { name: "Richie Hawtin / Plastikman", signature: "Consumed (1998)", why: "Minimal techno's founding document" },
      { name: "Robert Hood", signature: "Minimal Nation (1994)", why: "Detroit minimal techno; defined the original sound" },
      { name: "Ricardo Villalobos", signature: "Alcachofa (2003)", why: "Chilean-German; pushed minimal into 10+ minute territory" },
      { name: "Dubfire", signature: "A Quiet Place (2006)", why: "Deep Dish member who went minimal solo" },
    ],
  },

  "UK Garage": {
    tagline: "Late 1990s UK dance music — 2-step drums, pitched-up soulful vocals, swung basslines. The direct ancestor of grime and dubstep.",
    traitDetails: [
      { trait: "2-step rhythm", detail: "Skippy, broken drum pattern with no kick on beat 3 — the signature UK garage groove." },
      { trait: "Pitched-up vocals", detail: "Female soul vocals sped up; creates the genre's distinctive chipmunk-like timbre." },
      { trait: "Swung basslines", detail: "Syncopated, swung bass figures — often filtered or with portamento slides." },
      { trait: "~130 BPM", detail: "Sweet spot between house and drum & bass; dancefloor-ready but breakbeat-adjacent." },
    ],
    artistDetails: [
      { name: "MJ Cole", signature: "Sincere (2000)", why: "UK garage's most musical producer; Mercury Prize nomination" },
      { name: "Artful Dodger", signature: "It's All About the Stragglers (2000)", why: "'Re-Rewind' was the chart-conquering garage moment" },
      { name: "Todd Edwards", signature: "UK garage remix catalog", why: "NJ producer who defined UK garage's vocal-chop aesthetic" },
      { name: "So Solid Crew", signature: "They Don't Know (2001)", why: "Bridged UK garage into grime; 21-person collective" },
    ],
  },

  "Jungle": {
    tagline: "Early 1990s UK breakbeat dance music — sped-up Amen breaks + sub-bass + reggae sample culture. Proto-drum-and-bass.",
    traitDetails: [
      { trait: "Amen/Apache break chopping", detail: "Classic drum breaks chopped, reversed, time-stretched — jungle pioneered the chopped-breakbeat aesthetic." },
      { trait: "160-180 BPM breakbeats", detail: "Doubled from hip-hop tempos; drum hits feel urgent and propulsive." },
      { trait: "Ragga/reggae samples", detail: "Heavy use of dancehall and reggae vocal samples; jungle's cultural roots are Afro-Caribbean UK." },
      { trait: "Deep sub-bass", detail: "Half-time basslines (~80 BPM feel) below the breakneck drums — creates jungle's bi-tempo effect." },
    ],
    artistDetails: [
      { name: "Goldie", signature: "Timeless (1995)", why: "Made jungle a 'serious' art form; defined the 'intelligent' strain" },
      { name: "Shy FX", signature: "Original Nuttah (1994, w/ UK Apachi)", why: "Defining ragga-jungle track of all time" },
      { name: "A Guy Called Gerald", signature: "Black Secret Technology (1995)", why: "Darker, more experimental jungle direction" },
      { name: "LTJ Bukem", signature: "Logical Progression series (1996+)", why: "Ambient/atmospheric jungle direction" },
    ],
  },

  "Breakbeat": {
    tagline: "Umbrella term for dance music built on sampled drum breaks rather than 4-on-the-floor. Spawned jungle, big beat, nu-skool breaks.",
    traitDetails: [
      { trait: "Sampled break foundation", detail: "Drum breaks from funk/soul records (Amen, Apache, Funky Drummer) chopped and looped." },
      { trait: "Syncopated drum patterns", detail: "Irregular kick placement — unlike 4-on-the-floor's regularity, breakbeat emphasizes groove complexity." },
      { trait: "Variable BPM range", detail: "Can be 120 (big beat) or 140 (nu-skool breaks) or 160+ (jungle) — tempo is less defining than rhythm shape." },
      { trait: "Bass-driven low end", detail: "Sub-bass and synth bass carry tracks; often more prominent than the drums themselves." },
    ],
    artistDetails: [
      { name: "The Chemical Brothers", signature: "Dig Your Own Hole (1997)", why: "Big-beat breakbeat architects" },
      { name: "The Prodigy", signature: "Music for the Jilted Generation (1994)", why: "Breakbeat-rave-rock hybrid defined the sound" },
      { name: "Fatboy Slim", signature: "You've Come a Long Way, Baby (1998)", why: "Most commercially successful big-beat breakbeat artist" },
      { name: "The Crystal Method", signature: "Vegas (1997)", why: "American breakbeat peak; 'Bad Stone' era" },
    ],
  },

  "Electro": {
    tagline: "Early 1980s fusion of Kraftwerk electronic pop and hip-hop — TR-808 drum patterns, robotic vocals, sci-fi themes.",
    traitDetails: [
      { trait: "TR-808 drum patterns", detail: "Electro popularized the 808's cold, robotic drums — hip-hop inherited this via 'Planet Rock'." },
      { trait: "Robotic/Vocoder vocals", detail: "Kraftwerk-style vocoded robot voices; dehumanized vocal aesthetic." },
      { trait: "Sci-fi/futurist themes", detail: "Lyrics about robots, space, technology; Afrofuturism meets German machine-funk." },
      { trait: "Synth bass dominance", detail: "Moog and synth basslines drive the groove; real bass was rarely used." },
    ],
    artistDetails: [
      { name: "Afrika Bambaataa", signature: "Planet Rock (1982)", why: "The foundational electro track; sampled Kraftwerk's 'Trans-Europe Express'" },
      { name: "Mantronix", signature: "The Album (1985)", why: "NY electro duo; bridged electro and hip-hop production" },
      { name: "Egyptian Lover", signature: "On the Nile (1984)", why: "LA electro pioneer; 'Egypt, Egypt'" },
      { name: "Cybotron", signature: "Clear (1983)", why: "Juan Atkins' electro group; precursor to Detroit techno" },
    ],
  },

  "Miami Bass": {
    tagline: "Late 1980s-early 90s Florida bass music — extreme sub-bass, fast tempos, dance-floor-first content. Spawned Southern hip-hop.",
    traitDetails: [
      { trait: "Sub-bass emphasis", detail: "Extreme low-frequency focus; designed for car trunks and Miami club systems with massive subs." },
      { trait: "Fast tempos (115-140 BPM)", detail: "Faster than most hip-hop; closer to house tempo." },
      { trait: "Call-and-response chants", detail: "Hooks are chant-based and participatory — crunk and Southern rap inherited this directly." },
      { trait: "Party/explicit content", detail: "Dance-floor content and sometimes raunchy lyrics; 2 Live Crew's obscenity cases defined era." },
    ],
    artistDetails: [
      { name: "2 Live Crew", signature: "As Nasty As They Wanna Be (1989)", why: "Most famous Miami Bass group; obscenity trial changed First Amendment precedent" },
      { name: "Magic Mike", signature: "Bass Is the Name of the Game (1990)", why: "Orlando bass producer; defined the instrumental bass aesthetic" },
      { name: "Uncle Luke", signature: "I Got Shit on My Mind (1992)", why: "Solo work of 2 Live Crew frontman; regional bass figurehead" },
      { name: "DJ Laz", signature: "Miami bass compilations", why: "Miami scene's DJ-producer architect" },
    ],
  },

  "Jersey Club": {
    tagline: "Newark club music evolving from Baltimore Club. Fast, playful, bed-squeak kick pattern. Exploded via TikTok in the 2020s.",
    traitDetails: [
      { trait: "Five-kick pattern", detail: "The signature rhythm — five kicks per 4/4 bar in a bouncy pattern. Distinguishes Jersey Club from everything else." },
      { trait: "Bed-squeak sample", detail: "The ubiquitous 'bed squeak' or 'sneaker squeak' sample — often just a pitched-up squeak on beats 2 and 4." },
      { trait: "140 BPM", detail: "Faster than hip-hop; matches the bounce energy of the kick pattern." },
      { trait: "Vocal-chop hooks", detail: "R&B and hip-hop vocal samples chopped and arranged into hooks — often from recognizable pop sources." },
    ],
    artistDetails: [
      { name: "DJ Sliink", signature: "Jersey Club compilations", why: "Jersey Club scene architect; codified the sound" },
      { name: "Cookie Kawaii", signature: "Vibe (If I Back It Up) (2019)", why: "Jersey Club's biggest TikTok-era hit" },
      { name: "Tati.56", signature: "2022-2024 TikTok viral tracks", why: "Current-era Jersey Club producer" },
      { name: "UNIIQU3", signature: "Heartbeats (2018)", why: "Jersey Club's 'Queen'; DJ-producer emissary" },
    ],
  },

  "Baltimore Club": {
    tagline: "Baltimore's late-80s club scene — looped breakbeats, triangle samples, call-and-response chants. Parent of Jersey Club.",
    traitDetails: [
      { trait: "Triangle sample", detail: "The iconic tinkling triangle hit used on almost every Baltimore Club track — from 'Sing Sing' loop." },
      { trait: "Looped breakbeat foundation", detail: "Lyn Collins 'Think (About It)' break is the backbone; looped at 130 BPM." },
      { trait: "Chanted hooks", detail: "Short chanted hook-phrases — 'Dance My Pain Away' structure typical." },
      { trait: "Dance-battle context", detail: "Music designed for aggressive dance battles; shaped the genre's confrontational energy." },
    ],
    artistDetails: [
      { name: "DJ Technics", signature: "Baltimore Club classics", why: "Scene pioneer; defined the sound in the 90s" },
      { name: "Rod Lee", signature: "Vol. 5 (2004)", why: "Baltimore Club's most prolific producer" },
      { name: "TT the Artist", signature: "2010s club tracks", why: "Current-era Baltimore Club's breakout artist" },
    ],
  },

  "Ambient": {
    tagline: "Music designed to create atmosphere rather than demand attention. Brian Eno's invention. Environmental, meditative, sometimes beatless.",
    traitDetails: [
      { trait: "Beatless or sparse rhythm", detail: "Many ambient tracks have no drums at all; rhythm emerges from pulsing tones and drones." },
      { trait: "Sustained pads and drones", detail: "Long-sustained synth textures form the foundation; harmony changes glacially if at all." },
      { trait: "Environmental sensibility", detail: "Eno's definition — 'as ignorable as it is interesting.' Designed to color environments." },
      { trait: "Low dynamic range", detail: "Quiet and uniform; no dramatic peaks or drops — the anti-pop dynamic." },
    ],
    artistDetails: [
      { name: "Brian Eno", signature: "Ambient 1: Music for Airports (1978)", why: "Invented the genre; coined the term" },
      { name: "Aphex Twin", signature: "Selected Ambient Works Volume II (1994)", why: "Beatless ambient masterpiece" },
      { name: "Stars of the Lid", signature: "The Tired Sounds Of (2001)", why: "Texas drone-ambient duo; 2000s benchmark" },
      { name: "Tim Hecker", signature: "Ravedeath, 1972 (2011)", why: "Current-era ambient-noise auteur" },
    ],
  },

  "Dub": {
    tagline: "1970s Jamaican studio-reconstruction of reggae — heavy reverb, delay, drop-outs, instrumental remixes. The first 'remix culture.'",
    traitDetails: [
      { trait: "Extreme reverb + delay", detail: "Engineers used tape delay, spring reverb, and real echo chambers — effects became the instrument." },
      { trait: "Instrumental remix approach", detail: "Vocal tracks are dropped out and brought back; dub strips tracks into drums+bass+effects." },
      { trait: "Bass-and-drums foundation", detail: "Drum and bass are left alone while everything else is manipulated around them — template for all electronic dance music." },
      { trait: "Engineer as auteur", detail: "Producers (King Tubby, Lee Perry) became artists; the mixing desk became an instrument." },
    ],
    artistDetails: [
      { name: "King Tubby", signature: "Dub from the Roots (1975)", why: "Invented dub as a practice; engineer-god" },
      { name: "Lee 'Scratch' Perry", signature: "Super Ape (1976)", why: "Dub's most experimental producer; Black Ark studio legend" },
      { name: "Scientist", signature: "Scientist Rids the World of the Evil Curse of the Vampires (1981)", why: "King Tubby's protégé; dub's second generation" },
      { name: "Augustus Pablo", signature: "King Tubbys Meets Rockers Uptown (1976)", why: "Melodica-driven instrumental dub" },
    ],
  },

  // ── METAL NICHES ────────────────────────────────────────────────
  "Death Metal": {
    tagline: "Late 1980s Florida/Scandinavia extreme metal — growled vocals, blast-beat drums, downtuned guitars. Extreme-metal's foundational subgenre.",
    traitDetails: [
      { trait: "Guttural growled vocals", detail: "Deep, unintelligible growls and roars — the defining vocal aesthetic." },
      { trait: "Blast-beat drumming", detail: "Extremely fast alternating kick+snare patterns (200+ BPM) — drums as sheer velocity." },
      { trait: "Downtuned guitars", detail: "Guitars tuned to D, C, or lower with heavy palm-muting and dissonant riffs." },
      { trait: "Technical precision", detail: "Death metal values technical skill; virtuosic playing is central to the genre's identity." },
    ],
    artistDetails: [
      { name: "Death", signature: "Symbolic (1995)", why: "Chuck Schuldiner named the genre; technical peak" },
      { name: "Cannibal Corpse", signature: "Tomb of the Mutilated (1992)", why: "Best-selling death metal band; genre's face" },
      { name: "Morbid Angel", signature: "Altars of Madness (1989)", why: "Florida death metal's foundational album" },
      { name: "Opeth", signature: "Blackwater Park (2001)", why: "Progressive death metal; brought the genre to indie audiences" },
    ],
  },

  // ── PUNK-ADJACENT ───────────────────────────────────────────────
  "Ska": {
    tagline: "1950s Jamaican music ancestor to reggae — upbeat, off-beat guitar stabs, horns. Went through 3 commercial waves globally.",
    traitDetails: [
      { trait: "Upbeat tempo (120-160 BPM)", detail: "Faster than reggae; energetic dance music." },
      { trait: "Off-beat guitar stabs", detail: "The defining technique — chords hit on beats 2 and 4; reggae inherited this but slowed it down." },
      { trait: "Horn sections", detail: "Trumpet, trombone, saxophone lines drive the melody; more jazz-influenced than reggae." },
      { trait: "Three commercial waves", detail: "Jamaican original (1950s-60s), UK 2 Tone revival (late 70s), Third wave/ska-punk (1990s US)." },
    ],
    artistDetails: [
      { name: "The Skatalites", signature: "Ska Authentic (1964)", why: "Original Jamaican ska architects; Don Drummond era" },
      { name: "The Specials", signature: "The Specials (1979)", why: "UK 2 Tone revival leaders; multiracial ska" },
      { name: "Madness", signature: "One Step Beyond (1979)", why: "Most commercial 2 Tone band" },
      { name: "No Doubt", signature: "Tragic Kingdom (1995)", why: "Third-wave ska-pop crossover; Gwen Stefani breakthrough" },
    ],
  },

  "Indie": {
    tagline: "Umbrella for music released outside major labels, now shorthand for a specific jangly/literate aesthetic regardless of label status.",
    traitDetails: [
      { trait: "DIY/anti-mainstream ethic", detail: "Originally literal (independent labels) — now ethos more than structural reality." },
      { trait: "Aesthetic signifiers", detail: "Jangly guitars, lo-fi production values, literate lyrics, unconventional song structures." },
      { trait: "Genre permeability", detail: "'Indie rock', 'indie pop', 'indie folk', 'indie electronic' all exist — label more than sound." },
      { trait: "College radio lineage", detail: "1980s college radio culture shaped the taste formation; R.E.M., Pixies, Sonic Youth defined the template." },
    ],
    artistDetails: [
      { name: "R.E.M.", signature: "Murmur (1983)", why: "Defined 80s college-rock indie; sold 90 million records indie-spirit-intact" },
      { name: "Arcade Fire", signature: "Funeral (2004)", why: "2000s indie's biggest breakthrough" },
      { name: "Bon Iver", signature: "For Emma, Forever Ago (2007)", why: "Defined late-2000s indie folk; cabin-aesthetic" },
      { name: "Mitski", signature: "Puberty 2 (2016) / The Land Is Inhospitable (2023)", why: "Current-era indie's Gen Z icon" },
    ],
  },

  // ── LATIN NICHES ────────────────────────────────────────────────
  "Salsa": {
    tagline: "New York 1960s-70s Afro-Caribbean dance music built on Cuban son rhythm and big-band structure. Fania All Stars defined the era.",
    traitDetails: [
      { trait: "Clave-driven rhythm", detail: "The 3-2 or 2-3 clave pattern is the rhythmic DNA; everything else locks to it." },
      { trait: "Montuno section", detail: "Extended instrumental/vocal-improv section after the main song; sonero trades with chorus." },
      { trait: "Horn section + piano", detail: "Trombones, trumpets, saxophones plus montuno piano pattern — the brass-and-keys foundation." },
      { trait: "Percussion interplay", detail: "Congas, bongos, timbales, güiro — each plays a distinct pattern creating complex polyrhythm." },
    ],
    artistDetails: [
      { name: "Celia Cruz", signature: "Celia & Johnny (1974)", why: "The Queen of Salsa; Fania-era vocal icon" },
      { name: "Hector Lavoe", signature: "La Voz (1975)", why: "Fania All Stars voice; Willie Colón's partner" },
      { name: "Willie Colón", signature: "Siembra (1978, w/ Rubén Blades)", why: "Nuyorican salsa architect; trombone-led" },
      { name: "Rubén Blades", signature: "Siembra (1978)", why: "Salsa's poet; 'Pedro Navaja' is the genre's literary peak" },
      { name: "Marc Anthony", signature: "Todo a Su Tiempo (1995)", why: "Best-selling salsa artist ever; defined salsa romántica" },
    ],
  },

  "Bachata": {
    tagline: "Dominican rural guitar music that became global pop in the 2010s. Romantic themes, sliding guitar runs, slow-to-mid tempo dance music.",
    traitDetails: [
      { trait: "Requinto lead guitar", detail: "The high-pitched lead guitar with distinctive slides and pull-offs — bachata's signature sound." },
      { trait: "Bongo + güira percussion", detail: "Bongos drive the rhythm; güira (metal scraper) provides the swing feel." },
      { trait: "Romantic/heartbreak themes", detail: "Lyrics almost always about love, loss, longing, betrayal — bachata is Latin America's country music emotionally." },
      { trait: "Slow-to-mid tempo (90-120 BPM)", detail: "Dance-driven — the bachata partner dance is central to the music's function." },
    ],
    artistDetails: [
      { name: "Juan Luis Guerra", signature: "Bachata Rosa (1990)", why: "Elevated bachata from rural to mainstream; Grammy-winning" },
      { name: "Aventura", signature: "God's Project (2005)", why: "Modern bachata's biggest-ever group; Romeo Santos' launch" },
      { name: "Romeo Santos", signature: "Formula, Vol. 1 (2011)", why: "Current King of Bachata; former Aventura frontman" },
      { name: "Prince Royce", signature: "Prince Royce (2010)", why: "Contemporary bachata-pop bridge" },
    ],
  },

  "Cumbia": {
    tagline: "Colombian coastal dance music of African, Indigenous, and Spanish origin. Spread across Latin America into Mexican cumbia, Argentine cumbia villera, etc.",
    traitDetails: [
      { trait: "Syncopated gaita + drums", detail: "Gaita (Indigenous flute) and tambor (drum) form the original acoustic instrumentation." },
      { trait: "Dance-driven rhythm", detail: "2/4 or 4/4 syncopated pattern; the cumbia dance (walking with specific foot movement) is central to the music." },
      { trait: "Regional variations", detail: "Colombian traditional, Mexican cumbia (accordion-based), Argentine cumbia villera, Peruvian chicha — vastly different sounds under one name." },
      { trait: "Accordion prominence", detail: "Mexican and norteño cumbia center the accordion; Colombian traditional uses flutes and drums only." },
    ],
    artistDetails: [
      { name: "Los Ángeles Azules", signature: "De Buenos Aires Para el Mundo (2013)", why: "Mexican cumbia sonidera; biggest contemporary cumbia act" },
      { name: "La Sonora Dinamita", signature: "Colombian cumbia classics", why: "Most famous Colombian cumbia ensemble" },
      { name: "Selena", signature: "Entre a Mi Mundo (1992)", why: "Tejano-cumbia fusion; brought cumbia to US mainstream" },
      { name: "Carlos Vives", signature: "Clásicos de la Provincia (1993)", why: "Modernized traditional Colombian cumbia/vallenato fusion" },
    ],
  },

  "Afrobeat": {
    tagline: "Fela Kuti's 1970s Nigerian political funk — NOT the 2010s 'Afrobeats' (singular vs. plural matters). Long-form, polyrhythmic, politically fierce.",
    traitDetails: [
      { trait: "Extended jam structure", detail: "Tracks often 15-25 minutes; evolve slowly with polyrhythmic grooves rather than verse/chorus." },
      { trait: "Polyrhythmic percussion", detail: "Multiple interlocking rhythms from drums, congas, shekere, bells — West African drumming tradition." },
      { trait: "Horn section intensity", detail: "Tight horn lines layered over the groove; Fela's band was essentially a jazz ensemble." },
      { trait: "Political lyrics in Pidgin English", detail: "Fela's lyrics were savage critiques of corruption, colonialism, military rule — jailed multiple times for songs." },
    ],
    artistDetails: [
      { name: "Fela Kuti", signature: "Zombie (1976) / Expensive Shit (1975)", why: "Created Afrobeat; musical and political founding figure" },
      { name: "Tony Allen", signature: "Fela drums / Black Voices (1999)", why: "Fela's drummer; invented the Afrobeat drum pattern" },
      { name: "Femi Kuti", signature: "Shoki Shoki (1998)", why: "Fela's son; carrying the political Afrobeat torch" },
      { name: "Seun Kuti", signature: "From Africa With Fury: Rise (2011)", why: "Fela's other son; continues the Egypt 80 band" },
    ],
  },

  "Yoruba Music": {
    tagline: "Nigerian traditional and popular music from the Yoruba ethnic group — juju, fuji, apala, sakara. Influences modern Afrobeats deeply.",
    traitDetails: [
      { trait: "Talking drum (dùndún) centrality", detail: "The pressure-tuned dùndún drum mimics Yoruba tonal language — drum literally 'talks' to dancers." },
      { trait: "Praise-singing tradition", detail: "Vocalists praise kings, patrons, ancestors — a direct line to the griot tradition." },
      { trait: "Polyrhythmic layering", detail: "Multiple drum patterns (sekere, bata, dùndún) interlock; informs all later Afro-pop." },
      { trait: "Call-and-response vocals", detail: "Lead singer + chorus structure across juju, fuji, and traditional genres." },
    ],
    artistDetails: [
      { name: "King Sunny Adé", signature: "Juju Music (1982)", why: "Brought juju (Yoruba popular music) to global stages" },
      { name: "Ebenezer Obey", signature: "The Horse, The Man (1973)", why: "Juju music pioneer alongside King Sunny Adé" },
      { name: "Fela Anikulapo Kuti", signature: "Fela's catalog", why: "Yoruba cultural figure whose Afrobeat drew on Yoruba traditions" },
      { name: "Ayinde Barrister", signature: "Fuji Exponent (1980s-90s)", why: "Fuji music founder; Yoruba Islamic popular music" },
    ],
  },

  "Kwaito": {
    tagline: "Post-apartheid South African 1990s house-mutation — slowed house beats, Zulu/Tswana vocals, township dance music. Amapiano's grandparent.",
    traitDetails: [
      { trait: "Slowed house tempo (~100 BPM)", detail: "Roughly 100 BPM — slower than US house; closer to hip-hop groove territory." },
      { trait: "African-language vocals", detail: "Zulu, Tswana, Xhosa, Sotho lyrics — rejected English as the language of music; explicitly post-apartheid assertion." },
      { trait: "Deep bass and simple grooves", detail: "Heavy sub-bass, hypnotic simple loops; party/township-dance functional." },
      { trait: "Bridges to amapiano", detail: "Kwaito → Gqom → Amapiano lineage is direct; same South African township scene over 30 years." },
    ],
    artistDetails: [
      { name: "Arthur Mafokate", signature: "Kaffir (1995)", why: "Kwaito originator; first kwaito hit" },
      { name: "Boom Shaka", signature: "It's About Time (1994)", why: "Kwaito's first superstar group" },
      { name: "Mandoza", signature: "Nkalakatha (2000)", why: "Post-apartheid kwaito icon; bridging Black-white audiences" },
      { name: "TKZee", signature: "Halloween (1998)", why: "Most commercially successful kwaito group" },
    ],
  },

  "Mento": {
    tagline: "Jamaican folk music predating ska — guitar, banjo, and rumba box. The grandfather of ska, reggae, dancehall. Sometimes called 'Jamaican calypso.'",
    traitDetails: [
      { trait: "Acoustic folk instrumentation", detail: "Guitar, banjo, hand drums, rumba box (a large bass thumb-piano) — all acoustic, no electric instruments." },
      { trait: "Calypso rhythmic kinship", detail: "Shares Caribbean 'skiffle' feel with Trinidadian calypso; Jamaicans called it 'mento,' Trinidadians 'calypso.'" },
      { trait: "Risqué/humorous lyrics", detail: "Often bawdy, topical, humorous — social commentary in the West Indian oral tradition." },
      { trait: "Rural origins", detail: "Born in Jamaican country areas; mento predates ska by decades but was eclipsed once ska arrived." },
    ],
    artistDetails: [
      { name: "The Jolly Boys", signature: "Mento Madness compilations", why: "Longest-running mento band; revived internationally in the 2010s" },
      { name: "Count Lasher", signature: "Perseverance and other mento recordings", why: "Golden-age mento; 1950s Jamaican star" },
      { name: "Lord Flea", signature: "Calypso! Swinging in Jamaica (1957)", why: "Mento's US pop-chart moment; pre-ska Caribbean" },
    ],
  },
};


const GENRE_HISTORY = {
  // ── HIP-HOP family ─────────────────────────────────────────────────────
  "Hip-Hop":          [[1975,5],[1980,15],[1985,35],[1990,55],[1995,70],[2000,82],[2005,90],[2010,92],[2015,96],[2020,98],[2023,97],[2025,95],[2026,94]],
  "Trap":             [[2003,5],[2008,25],[2012,55],[2015,80],[2018,92],[2020,95],[2022,96],[2024,94],[2026,92]],
  "Melodic Rap":      [[2013,10],[2016,40],[2018,68],[2020,85],[2022,92],[2024,93],[2026,90]],
  "Drill":            [[2012,10],[2016,35],[2019,62],[2021,82],[2023,88],[2025,85],[2026,82]],
  "Boom Bap":         [[1988,40],[1993,90],[1996,95],[2000,75],[2010,40],[2018,32],[2022,38],[2026,42]],
  "Conscious Hip-Hop":[[1988,30],[1994,65],[2000,55],[2010,48],[2015,58],[2020,52],[2026,48]],
  "Lo-Fi Hip-Hop":    [[2010,8],[2015,35],[2018,65],[2020,75],[2022,68],[2024,60],[2026,55]],
  "Phonk":            [[2014,5],[2018,18],[2020,38],[2022,72],[2023,85],[2024,78],[2026,65]],
  "Rage Rap":         [[2019,5],[2021,28],[2022,55],[2023,72],[2024,78],[2025,70],[2026,62]],
  "Plugg":            [[2015,5],[2018,18],[2020,35],[2022,50],[2024,58],[2026,52]],
  "Cloud Rap":        [[2010,15],[2013,55],[2016,62],[2019,48],[2022,35],[2026,28]],
  "Gangsta Rap":      [[1988,35],[1993,80],[1996,88],[2000,75],[2005,55],[2012,40],[2020,32],[2026,28]],
  "Grime":            [[2002,5],[2006,45],[2010,38],[2015,62],[2018,55],[2022,42],[2026,38]],
  "French Rap":       [[1990,25],[2000,52],[2010,68],[2015,80],[2020,85],[2024,88],[2026,85]],
  "Latin Rap":        [[2000,15],[2010,30],[2015,55],[2020,78],[2024,82],[2026,80]],
  "Jersey Drill":     [[2020,3],[2021,22],[2022,48],[2023,65],[2024,62],[2025,55],[2026,48]],

  // ── R&B / SOUL family ──────────────────────────────────────────────────
  "R&B / Soul":       [[1960,60],[1970,78],[1980,85],[1990,82],[2000,88],[2010,75],[2020,72],[2024,70],[2026,68]],
  "Alt R&B":          [[2010,10],[2014,48],[2017,72],[2020,82],[2023,85],[2025,82],[2026,80]],
  "Trap Soul":        [[2014,8],[2016,35],[2018,62],[2020,75],[2022,72],[2024,65],[2026,58]],
  "Neo-Soul":         [[1996,35],[2000,72],[2005,70],[2012,55],[2018,60],[2022,62],[2026,58]],
  "Contemporary R&B": [[1995,85],[2000,92],[2005,88],[2010,78],[2015,72],[2020,68],[2026,65]],
  "Funk":             [[1972,85],[1976,95],[1982,72],[1990,45],[2000,30],[2015,45],[2020,50],[2026,48]],
  "Disco":            [[1974,55],[1977,95],[1979,90],[1982,30],[2000,20],[2020,38],[2022,52],[2026,45]],
  "New Jack Swing":   [[1987,25],[1990,72],[1993,80],[1996,48],[2000,22],[2015,18],[2026,15]],
  "Motown Revival":   [[2005,35],[2010,48],[2015,40],[2020,32],[2026,28]],

  // ── POP family ─────────────────────────────────────────────────────────
  "Pop":              [[1960,70],[1970,75],[1980,88],[1985,95],[1995,90],[2005,88],[2015,95],[2020,92],[2024,93],[2026,92]],
  "Dark Pop":         [[2010,8],[2014,25],[2017,55],[2020,72],[2023,82],[2025,78],[2026,75]],
  "Bedroom Pop":      [[2015,12],[2018,48],[2020,72],[2022,82],[2024,70],[2026,62]],
  "Hyperpop":         [[2017,5],[2019,22],[2021,58],[2022,75],[2023,68],[2025,52],[2026,45]],
  "Synth-Pop":        [[1980,55],[1984,85],[1990,55],[2005,35],[2012,58],[2018,62],[2022,58],[2026,55]],
  "Dance-Pop":        [[1985,55],[1990,78],[2000,82],[2010,95],[2015,88],[2020,82],[2026,80]],
  "Art Pop":          [[2005,25],[2011,55],[2015,68],[2020,62],[2026,58]],
  "Indie Pop":        [[2005,35],[2010,58],[2015,72],[2020,68],[2024,65],[2026,62]],
  "Chamber Pop":      [[1998,35],[2005,55],[2012,48],[2020,38],[2026,35]],
  "Power Pop":        [[1978,45],[1982,62],[1990,40],[2000,32],[2015,28],[2026,26]],
  "Baroque Pop":      [[1965,50],[1968,62],[1975,35],[2008,35],[2015,32],[2026,28]],

  // ── K-POP family ───────────────────────────────────────────────────────
  "K-Pop":            [[2005,5],[2010,22],[2013,38],[2016,55],[2018,72],[2020,82],[2023,90],[2025,88],[2026,85]],
  "K-Pop ballad":     [[2005,15],[2012,35],[2018,55],[2022,68],[2026,65]],

  // ── LATIN family ───────────────────────────────────────────────────────
  "Latin":            [[1970,25],[1985,35],[2000,48],[2010,62],[2015,75],[2020,88],[2024,92],[2026,90]],
  "Reggaeton":        [[2002,15],[2005,45],[2010,52],[2017,82],[2020,92],[2023,94],[2026,92]],
  "Latin Trap":       [[2016,8],[2018,45],[2020,72],[2022,82],[2024,80],[2026,76]],
  "Bossa Nova":       [[1962,75],[1965,88],[1972,62],[1985,42],[2000,35],[2020,30],[2026,28]],
  "Bachata":          [[1995,35],[2005,55],[2012,68],[2020,72],[2026,70]],
  "Salsa":            [[1973,75],[1978,88],[1985,75],[1995,62],[2010,52],[2020,48],[2026,46]],
  "Cumbia":           [[1970,45],[1985,55],[2005,62],[2018,72],[2024,75],[2026,74]],
  "Regional Mexican": [[2000,42],[2010,48],[2018,58],[2022,82],[2024,92],[2026,90]],
  "Música Urbana":    [[2015,25],[2018,55],[2020,78],[2022,88],[2024,92],[2026,91]],

  // ── ELECTRONIC family ──────────────────────────────────────────────────
  "Electronic":       [[1975,8],[1985,35],[1995,58],[2005,68],[2012,82],[2015,82],[2020,80],[2026,78]],
  "House":            [[1984,20],[1990,58],[1997,72],[2005,68],[2012,88],[2016,85],[2020,82],[2024,85],[2026,88]],
  "Deep House":       [[1988,18],[1995,48],[2005,42],[2012,72],[2016,82],[2020,75],[2026,70]],
  "Tech-House":       [[2008,15],[2014,48],[2018,72],[2021,88],[2023,92],[2025,88],[2026,85]],
  "Techno":           [[1988,25],[1995,65],[2005,48],[2012,55],[2018,72],[2022,82],[2024,85],[2026,82]],
  "Melodic Techno":   [[2015,15],[2018,52],[2021,78],[2023,85],[2025,82],[2026,80]],
  "Trance":           [[1995,45],[2000,85],[2005,72],[2012,52],[2020,42],[2026,45]],
  "Dubstep":          [[2008,15],[2011,82],[2013,78],[2016,52],[2020,35],[2026,30]],
  "Drum & Bass":      [[1995,48],[2000,62],[2008,48],[2018,55],[2022,68],[2024,72],[2026,75]],
  "Garage":           [[1998,45],[2002,68],[2008,32],[2015,42],[2020,48],[2026,45]],
  "UK Garage":        [[1998,52],[2002,78],[2008,28],[2020,48],[2024,62],[2026,60]],
  "Ambient":          [[1978,18],[1995,35],[2010,42],[2018,52],[2022,55],[2026,55]],
  "IDM":              [[1995,35],[2002,55],[2010,48],[2020,38],[2026,35]],
  "Breakbeat":        [[1995,58],[2000,72],[2010,42],[2020,45],[2026,42]],
  "Hardstyle":        [[2004,28],[2010,52],[2018,62],[2022,70],[2026,68]],

  // ── ROCK family ────────────────────────────────────────────────────────
  "Rock":             [[1960,85],[1970,98],[1980,82],[1995,88],[2005,65],[2015,38],[2020,30],[2026,26]],
  "Alt-Rock":         [[1991,92],[1995,88],[2005,65],[2015,42],[2020,38],[2026,35]],
  "Indie Rock":       [[2005,62],[2010,72],[2015,58],[2020,48],[2026,45]],
  "Classic Rock":     [[1970,98],[1975,95],[1985,70],[2000,52],[2026,38]],
  "Post-Rock":        [[1998,28],[2005,48],[2012,52],[2020,45],[2026,42]],
  "Shoegaze":         [[1991,55],[1995,42],[2005,28],[2015,48],[2022,62],[2025,68],[2026,70]],
  "Punk":             [[1977,62],[1982,55],[1995,72],[2003,78],[2012,52],[2020,38],[2026,35]],
  "Emo":              [[2002,48],[2005,78],[2008,72],[2015,38],[2020,52],[2023,62],[2026,58]],
  "Grunge":           [[1991,82],[1994,92],[1998,68],[2005,38],[2020,28],[2026,25]],
  "Post-Punk":        [[1979,62],[1982,72],[1995,35],[2005,45],[2018,55],[2024,62],[2026,60]],
  "Metal":            [[1980,35],[1988,55],[1995,62],[2008,52],[2018,45],[2026,38]],
  "Black Metal":      [[1993,18],[2000,32],[2010,38],[2020,35],[2026,32]],
  "Doom":             [[1980,15],[2000,28],[2012,42],[2020,45],[2026,42]],

  // ── JAZZ family ────────────────────────────────────────────────────────
  "Jazz":             [[1950,85],[1960,75],[1975,42],[1995,28],[2015,20],[2026,18]],
  "Bebop":            [[1947,85],[1955,78],[1970,45],[1990,28],[2026,22]],
  "Smooth Jazz":      [[1985,65],[1992,78],[2000,68],[2010,48],[2026,35]],
  "Jazz Fusion":      [[1972,68],[1978,75],[1988,48],[2005,35],[2020,32],[2026,30]],
  "Nu-Jazz":          [[2000,28],[2008,45],[2015,52],[2022,58],[2026,58]],

  // ── FOLK / COUNTRY ─────────────────────────────────────────────────────
  "Country":          [[1970,55],[1990,65],[2005,72],[2015,62],[2022,72],[2024,85],[2026,88]],
  "Modern Country":   [[1998,62],[2010,78],[2015,75],[2022,78],[2026,85]],
  "Americana":        [[2000,38],[2012,52],[2020,55],[2026,55]],
  "Bluegrass":        [[1950,65],[1985,48],[2005,45],[2022,55],[2026,58]],
  "Folk":             [[1963,78],[1970,68],[1995,42],[2012,55],[2020,48],[2026,45]],
  "Indie Folk":       [[2008,42],[2012,68],[2018,62],[2024,55],[2026,52]],

  // ── GLOBAL ─────────────────────────────────────────────────────────────
  "Afrobeats":        [[2005,8],[2012,25],[2018,58],[2020,72],[2022,82],[2024,88],[2026,88]],
  "Amapiano":         [[2018,5],[2020,28],[2022,55],[2024,75],[2025,82],[2026,85]],
  "Dancehall":        [[1992,62],[2000,72],[2010,75],[2018,68],[2024,72],[2026,70]],
  "Afrobeat (original)":[[1972,62],[1978,72],[1990,42],[2010,38],[2026,35]],
  "J-Pop":            [[1990,55],[2005,62],[2015,58],[2020,68],[2024,75],[2026,75]],
  "City Pop":         [[1982,72],[1986,85],[1990,55],[2018,52],[2023,72],[2026,78]],
  "Bollywood":        [[1990,78],[2005,82],[2015,85],[2020,82],[2026,82]],
  "Arabic Pop":       [[2000,55],[2012,62],[2020,68],[2026,70]],

  // ── BLUES / GOSPEL ─────────────────────────────────────────────────────
  "Blues":            [[1960,62],[1975,55],[1995,38],[2015,28],[2026,24]],
  "Gospel":           [[1975,52],[1995,48],[2015,42],[2026,38]],
  "Gospel Soul":      [[1970,65],[1985,55],[2010,42],[2026,38]],
};

// ── TREND-INDEX SCORING ────────────────────────────────────────────────
// Time-decay based. A genre exploding RIGHT NOW scores highest. A genre
// that peaked a month ago scores slightly lower. A year ago → much lower.
// A decade ago → minimal. The scoring rewards both current value AND
// recency of peak.
const TREND_NOW_YEAR = 2026;

function calcTrendIndex(curve) {
  if (!curve || curve.length === 0) return 0;
  const sorted = [...curve].sort((a, b) => a[0] - b[0]);

  // Current value: linear-interpolated at TREND_NOW_YEAR
  const currentVal = interpolateAt(sorted, TREND_NOW_YEAR);

  // Peak value + year
  const peak = sorted.reduce((a, pt) => pt[1] > a[1] ? pt : a, sorted[0]);
  const peakYear = peak[0];
  const peakVal = peak[1];
  const yearsSincePeak = Math.max(0, TREND_NOW_YEAR - peakYear);

  // Rate of change: recent momentum (last 2 points vs current)
  const recent = sorted.filter(([y]) => y >= TREND_NOW_YEAR - 4);
  let momentum = 0;
  if (recent.length >= 2) {
    momentum = recent[recent.length - 1][1] - recent[0][1];
  }

  // Time decay factor on peak: 1.0 at peak, 0.8 at 1yr, 0.5 at 5yr, 0.2 at 20yr
  const peakDecay = Math.exp(-yearsSincePeak / 8);

  // Final score: current value is primary, peak-decay weights it, momentum adds/subtracts
  //   currentVal         weight 0.55
  //   peakVal × decay    weight 0.30
  //   momentum clamped   weight 0.15
  const momScaled = Math.max(-20, Math.min(20, momentum));
  const raw = currentVal * 0.55 + (peakVal * peakDecay) * 0.30 + (50 + momScaled * 1.5) * 0.15;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function interpolateAt(sorted, year) {
  if (year <= sorted[0][0]) return sorted[0][1];
  if (year >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1];
  for (let i = 0; i < sorted.length - 1; i++) {
    const [y1, v1] = sorted[i];
    const [y2, v2] = sorted[i + 1];
    if (year >= y1 && year <= y2) {
      const t = (year - y1) / (y2 - y1);
      return v1 + (v2 - v1) * t;
    }
  }
  return sorted[sorted.length - 1][1];
}

// Short context notes for major categories only
const GENRE_CONTEXT = {
  "Rock": "Peaks in the 1960s–1980s as the defining youth music. Gradual decentering follows as hip-hop and pop take over the mainstream.",
  "Hip-Hop": "Born in the Bronx in the mid-1970s, global dominance by the 2010s. First genre to overtake rock in both cultural weight and streaming volume.",
  "Pop": "The constant. Reshapes itself every decade to absorb the dominant adjacent genre — rock, R&B, hip-hop, EDM — never the originator, always the distributor.",
  "Electronic": "Emerges from disco and synth-pop in the late 1970s. Consolidates as a distinct category in the 1990s–2010s. Now a substrate inside nearly every other genre.",
  "R&B / Soul": "Long arc. Reshaped completely every generation: Motown, Quiet Storm, New Jack Swing, neo-soul, alternative R&B. The connective tissue of popular music.",
  "Country": "The most culturally stable genre on this chart. Its audience barely shifts; its category barely expands. A late-2020s commercial surge is reshaping that.",
  "Jazz": "Was the popular music of the 1920s–1950s. Now preserved as an art form, not a popular form. A case study in how a genre survives decline by becoming prestigious.",
  "Metal": "Peaks in the late 1980s–early 1990s, contracts but never disappears. A genre whose audience is unusually loyal and whose boundary with other styles is unusually firm.",
  "Latin": "Explosive rise after 2010, driven by reggaeton's mainstream breakthrough and then Mexican regional music's late-2020s explosion. Among the top three streamed genres globally.",
  "Afrobeats": "From regional Nigerian pop to global category in under fifteen years. One of the fastest consolidations of a new genre in recorded music history.",
  "K-Pop": "Industrial scale cultural export. Combines boy-band and girl-group formats of earlier decades with modern production and transnational distribution.",
  "Amapiano": "Johannesburg, late 2010s. Log drum and piano over house tempos. Township sound to global club fixture in under five years.",
  "Trap": "Southern rap variant that became the dominant production template of 2010s pop. Its rhythmic DNA is now default in pop, R&B, and Latin production.",
  "Reggaeton": "Puerto Rico, Panama roots. The 2017 global breakout made it the defining Latin sound of the late 2010s and the engine of Música Urbana.",
  "Phonk": "Memphis-rap sample culture reinterpreted as TikTok workout/drift music in the early 2020s. Peaked fast, contracting now but still resident.",
  "Regional Mexican": "Corridos tumbados, banda, norteño modernized by Peso Pluma, Fuerza Regida, and a wave of late-2020s artists. Currently the fastest-growing category in US Spanish-language streaming.",
  "Tech-House": "Dance-floor-native blend of house and techno. The dominant club sound of the early-to-mid 2020s.",
  "City Pop": "Early-1980s Japanese urban sophisti-pop. Rediscovered by YouTube algorithms and TikTok in the 2020s, now a steady revival.",
  "Modern Country": "Country absorbed Americana, hip-hop cadence, and pop production. 2024–2026 was its biggest commercial moment since the late 1990s.",
  "Drill": "UK-origin rap subgenre that spread globally via New York and spawned regional variants. A defining rap template of the early 2020s.",
};

// ════════════════════════════════════════════════════════════════════════════
// GENRE LINEAGE TREE — interactive parent/child evolution explorer
// Each node is clickable; expanding reveals descendants with smooth animation.
// Selecting a node opens a contextual detail card on the right.
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// TIMELINE SCRUBBER — scrub through music history month by month.
// At any point in time, genres are shown as floating labels sized by how
// popular they were that month. Hover/click to lock, see details.
// ════════════════════════════════════════════════════════════════════════════

// Research metadata — which genres have been deeply researched vs estimated
const GENRE_RESEARCHED = new Set([
  // Major genres with strong public data (Billboard, Spotify, Google Trends)
  "Hip-Hop", "Trap", "Drill", "Melodic Rap", "Boom Bap", "Gangsta Rap",
  "Phonk", "Rage Rap", "Plugg", "Jersey Drill",
  "R&B / Soul", "Alt R&B", "Neo-Soul", "Contemporary R&B", "Trap Soul",
  "Afrobeats", "Amapiano", "Reggaeton", "Latin Trap", "Afro House",
  "Pop", "Pop (modern)", "Electropop", "K-Pop", "Hyperpop",
  "House", "Deep House", "Tech House", "Techno", "Dubstep",
  "Rock", "Classic Rock", "Alternative Rock", "Indie Rock",
  "Country", "Country Pop", "Bro-Country",
  "EDM", "Electronic", "Dance", "Drum & Bass",
]);

// Helper: interpolate popularity at a specific year+month for a genre
function interpolateGenreAt(genre, year, monthIdx = 6) {
  const curve = GENRE_HISTORY[genre];
  if (!curve || curve.length === 0) return 0;
  const t = year + monthIdx / 12;

  // Before first point: fade in from 0 over 3 years
  if (t < curve[0][0]) {
    const delta = curve[0][0] - t;
    if (delta > 3) return 0;
    return curve[0][1] * (1 - delta / 3) * 0.3;
  }
  // After last point: decay
  if (t > curve[curve.length - 1][0]) {
    const delta = t - curve[curve.length - 1][0];
    return Math.max(0, curve[curve.length - 1][1] * (1 - delta / 8));
  }
  // Linear interpolation between bracketing points
  for (let i = 0; i < curve.length - 1; i++) {
    const [ta, va] = curve[i];
    const [tb, vb] = curve[i + 1];
    if (t >= ta && t <= tb) {
      const p = (t - ta) / (tb - ta);
      // Use smoothstep for natural feel instead of linear
      const smooth = p * p * (3 - 2 * p);
      return va + (vb - va) * smooth;
    }
  }
  return 0;
}

function TimelineScrubber({ selectedGenre, onSelectGenre }) {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";

  // Scrubber position — store as continuous float for smooth animation
  // value = year + month/12 (e.g. 2024.5 = July 2024)
  const MIN_YEAR = 1960;
  const currentDate = new Date();
  const MAX_YEAR = currentDate.getFullYear() + (currentDate.getMonth() + 1) / 12;
  const [scrubValue, setScrubValue] = useState(MAX_YEAR - 0.1); // near today
  const [isPlaying, setIsPlaying] = useState(false);
  const playRafRef = useRef(null);

  // All genres with history data
  const allGenres = useMemo(() => Object.keys(GENRE_HISTORY), []);

  // At current scrub time, compute popularity for every genre
  const snapshot = useMemo(() => {
    const year = Math.floor(scrubValue);
    const monthIdx = Math.floor((scrubValue - year) * 12);
    return allGenres
      .map(g => ({
        name: g,
        score: interpolateGenreAt(g, year, monthIdx),
        researched: GENRE_RESEARCHED.has(g),
      }))
      .filter(x => x.score > 8) // hide genres that are dormant/unborn
      .sort((a, b) => b.score - a.score)
      .slice(0, isMobile ? 20 : 40); // limit labels shown
  }, [scrubValue, allGenres, isMobile]);

  // Deterministic position for each genre label — based on genre name hash
  // so labels don't jump around as you scrub (same genre → same position)
  const genrePositions = useMemo(() => {
    const map = {};
    allGenres.forEach(g => {
      // Simple hash → deterministic float 0..1
      let h = 0;
      for (let i = 0; i < g.length; i++) h = (h * 31 + g.charCodeAt(i)) >>> 0;
      const hx = (h % 1000) / 1000;
      const hy = ((h * 17) % 1000) / 1000;
      map[g] = { x: hx, y: hy };
    });
    return map;
  }, [allGenres]);

  // Playback animation — advances scrub by ~2 years/sec
  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setScrubValue(v => {
        const next = v + dt * 1.5; // 1.5 years per real second
        if (next >= MAX_YEAR) {
          setIsPlaying(false);
          return MAX_YEAR - 0.01;
        }
        return next;
      });
      playRafRef.current = requestAnimationFrame(tick);
    };
    playRafRef.current = requestAnimationFrame(tick);
    return () => { if (playRafRef.current) cancelAnimationFrame(playRafRef.current); };
  }, [isPlaying, MAX_YEAR]);

  // Format scrub value → "April 2026"
  const formatDate = (v) => {
    const year = Math.floor(v);
    const monthIdx = Math.min(11, Math.max(0, Math.floor((v - year) * 12)));
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${months[monthIdx]} ${year}`;
  };

  // Decade tick marks for the scrubber
  const decadeTicks = [];
  for (let y = 1960; y <= 2020; y += 10) decadeTicks.push(y);

  const scrubPct = ((scrubValue - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setScrubValue(MIN_YEAR + pct * (MAX_YEAR - MIN_YEAR));
    setIsPlaying(false);
  };

  return (
    <div style={{
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: T.r_lg,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* ── SCRUBBER BAR AT TOP ───────────────────────────────────── */}
      <div style={{
        padding: isMobile ? "16px 14px 12px" : "20px 24px 14px",
        borderBottom: `1px solid ${T.border}`,
        background: "linear-gradient(180deg, rgba(15,17,22,0.6) 0%, transparent 100%)",
      }}>
        {/* Current time display */}
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 12, gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              letterSpacing: "0.22em", color: T.textMuted, marginBottom: 4,
            }}>NOW VIEWING</div>
            <div style={{
              fontSize: isMobile ? 26 : 36,
              fontFamily: T.font_display, fontStyle: "italic", fontWeight: 400,
              color: T.text, lineHeight: 1,
              letterSpacing: "-0.02em",
            }}>
              {formatDate(scrubValue)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button"
              onClick={() => setIsPlaying(p => !p)}
              title={isPlaying ? "Pause" : "Play through time"}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", minHeight: 36,
                background: isPlaying
                  ? `linear-gradient(180deg, ${T.accent}33 0%, ${T.accent}11 100%)`
                  : T.surface,
                border: `1px solid ${isPlaying ? T.accent : T.border}`,
                color: isPlaying ? T.accentHi : T.text,
                borderRadius: 6,
                fontSize: 11, fontFamily: T.font_mono, fontWeight: 700,
                letterSpacing: "0.15em", cursor: "pointer",
                transition: "all 160ms ease-out",
              }}>
              <span>{isPlaying ? "❚❚" : "▶"}</span>
              {isPlaying ? "PAUSE" : "PLAY"}
            </button>
            <button type="button"
              onClick={() => { setScrubValue(MIN_YEAR); setIsPlaying(false); }}
              title="Jump to 1960"
              style={{
                padding: "8px 12px", minHeight: 36,
                background: T.surface, border: `1px solid ${T.border}`,
                color: T.textSec, borderRadius: 6,
                fontSize: 11, fontFamily: T.font_mono, fontWeight: 700,
                letterSpacing: "0.1em", cursor: "pointer",
              }}>↺ 1960</button>
            <button type="button"
              onClick={() => { setScrubValue(MAX_YEAR - 0.1); setIsPlaying(false); }}
              title="Jump to today"
              style={{
                padding: "8px 12px", minHeight: 36,
                background: T.surface, border: `1px solid ${T.border}`,
                color: T.textSec, borderRadius: 6,
                fontSize: 11, fontFamily: T.font_mono, fontWeight: 700,
                letterSpacing: "0.1em", cursor: "pointer",
              }}>TODAY</button>
          </div>
        </div>

        {/* Scrubber track */}
        <div
          onMouseDown={handleScrub}
          onMouseMove={(e) => { if (e.buttons === 1) handleScrub(e); }}
          onTouchStart={handleScrub}
          onTouchMove={handleScrub}
          style={{
            position: "relative",
            height: 40,
            cursor: "pointer",
            userSelect: "none",
            touchAction: "none",
          }}>
          {/* Track groove */}
          <div style={{
            position: "absolute", top: 18, left: 0, right: 0, height: 4,
            background: `linear-gradient(90deg, ${T.surface} 0%, ${T.elevated} 100%)`,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)",
          }} />
          {/* Filled portion */}
          <div style={{
            position: "absolute", top: 18, left: 0, width: `${scrubPct}%`,
            height: 4,
            background: `linear-gradient(90deg, ${T.accent}55 0%, ${T.accent} 100%)`,
            borderRadius: 2,
            boxShadow: `0 0 8px ${T.accent}88`,
            transition: "none",
          }} />
          {/* Decade ticks */}
          {decadeTicks.map(year => {
            const p = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
            return (
              <div key={year} style={{
                position: "absolute", top: 14, left: `${p}%`,
                width: 1, height: 12,
                background: T.textMuted,
                opacity: 0.5,
                pointerEvents: "none",
              }}>
                <div style={{
                  position: "absolute", top: 14, left: -14,
                  fontSize: 9, fontFamily: T.font_mono,
                  color: T.textMuted, letterSpacing: "0.08em",
                  whiteSpace: "nowrap",
                }}>{year}</div>
              </div>
            );
          })}
          {/* Scrubber handle */}
          <div style={{
            position: "absolute", top: 6, left: `${scrubPct}%`,
            width: 4, height: 28, marginLeft: -2,
            background: T.accentHi,
            borderRadius: 2,
            boxShadow: `0 0 12px ${T.accent}, 0 0 24px ${T.accent}88`,
            pointerEvents: "none",
            transition: isPlaying ? "none" : "left 60ms ease-out",
          }} />
          {/* Handle pill on top */}
          <div style={{
            position: "absolute", top: 0, left: `${scrubPct}%`,
            transform: "translateX(-50%)",
            width: 14, height: 14,
            background: "radial-gradient(circle at 30% 30%, #fff 0%, " + T.accent + " 60%, " + T.accent + "88 100%)",
            border: `1px solid ${T.accent}`,
            borderRadius: "50%",
            boxShadow: `0 0 12px ${T.accent}aa, 0 2px 4px rgba(0,0,0,0.6)`,
            pointerEvents: "none",
          }} />
        </div>

        {/* Instruction hint */}
        <div style={{
          marginTop: 8,
          fontSize: 10, fontFamily: T.font_mono,
          color: T.textMuted, letterSpacing: "0.1em", textAlign: "center",
        }}>
          DRAG TO SCRUB · CLICK A GENRE TO PIN DETAILS
        </div>
      </div>

      {/* ── FLOATING GENRE LABELS CANVAS ──────────────────────────── */}
      <div style={{
        position: "relative",
        height: isMobile ? 500 : 620,
        background: `radial-gradient(ellipse at center, ${T.surface} 0%, ${T.bg} 70%)`,
        overflow: "hidden",
      }}>
        {/* Starfield backdrop — subtle ambient atmosphere */}
        <svg
          width="100%" height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.4 }}>
          {[...Array(40)].map((_, i) => {
            const x = (i * 137) % 100;
            const y = (i * 71) % 100;
            const r = (i % 3) * 0.4 + 0.3;
            return <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill={T.textMuted} />;
          })}
        </svg>

        {snapshot.map((g) => {
          const pos = genrePositions[g.name] || { x: 0.5, y: 0.5 };
          // Font size scales with popularity — weight(8..100) → font(11..38)
          const size = 11 + (g.score / 100) * (isMobile ? 18 : 27);
          const opacity = 0.35 + (g.score / 100) * 0.65;
          const isSelected = selectedGenre === g.name;
          // Use the same family color system from the earlier tree attempt
          const color = g.researched ? T.text : T.textSec;
          return (
            <div key={g.name}
              onClick={() => onSelectGenre(g.name)}
              style={{
                position: "absolute",
                left: `${8 + pos.x * 84}%`,
                top: `${8 + pos.y * 84}%`,
                transform: "translate(-50%, -50%)",
                padding: "4px 10px",
                background: isSelected
                  ? `linear-gradient(180deg, ${T.accent}33 0%, ${T.accent}11 100%)`
                  : "rgba(18,20,25,0.6)",
                border: `1px solid ${isSelected ? T.accent : "rgba(255,255,255,0.08)"}`,
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 380ms cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: isSelected ? `0 0 20px ${T.accent}88` : "none",
                opacity,
                whiteSpace: "nowrap",
                backdropFilter: "blur(4px)",
                zIndex: Math.floor(g.score),
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.zIndex = 999; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = opacity; e.currentTarget.style.zIndex = Math.floor(g.score); }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: size, fontFamily: T.font_sans, fontWeight: 500,
                color: isSelected ? T.accentHi : color,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}>
                {g.name}
                {!g.researched && (
                  <span style={{
                    fontSize: 8, fontFamily: T.font_mono, fontWeight: 700,
                    color: V.neonGold, letterSpacing: "0.12em",
                    padding: "1px 4px",
                    background: `${V.neonGold}14`,
                    border: `1px solid ${V.neonGold}44`,
                    borderRadius: 3,
                  }}>EST</span>
                )}
                {g.researched && (
                  <span style={{
                    fontSize: 8, fontFamily: T.font_mono, fontWeight: 700,
                    color: T.success, letterSpacing: "0.12em",
                    padding: "1px 4px",
                    background: `${T.success}14`,
                    border: `1px solid ${T.success}44`,
                    borderRadius: 3,
                  }}>RES</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {snapshot.length === 0 && (
          <div style={{
            position: "absolute", inset: 0,
            display: "grid", placeItems: "center",
            color: T.textMuted, fontSize: 13, fontFamily: T.font_sans,
            textAlign: "center", padding: 20,
          }}>
            No genres active at this point in time.<br/>
            <span style={{ fontSize: 11, color: T.textTer }}>
              Scrub forward to see music culture evolve.
            </span>
          </div>
        )}

        {/* Legend — RES vs EST explanation */}
        <div style={{
          position: "absolute",
          bottom: 12, left: 12,
          display: "flex", gap: 14, alignItems: "center",
          fontSize: 10, fontFamily: T.font_mono, color: T.textMuted,
          padding: "6px 10px",
          background: "rgba(10,11,14,0.85)",
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          backdropFilter: "blur(8px)",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontSize: 8, fontFamily: T.font_mono, fontWeight: 700,
              color: T.success, letterSpacing: "0.12em",
              padding: "1px 4px",
              background: `${T.success}14`,
              border: `1px solid ${T.success}44`,
              borderRadius: 3,
            }}>RES</span>
            researched
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontSize: 8, fontFamily: T.font_mono, fontWeight: 700,
              color: V.neonGold, letterSpacing: "0.12em",
              padding: "1px 4px",
              background: `${V.neonGold}14`,
              border: `1px solid ${V.neonGold}44`,
              borderRadius: 3,
            }}>EST</span>
            estimated
          </span>
        </div>

        {/* Active count */}
        <div style={{
          position: "absolute",
          top: 12, right: 12,
          fontSize: 10, fontFamily: T.font_mono, color: T.textMuted,
          letterSpacing: "0.15em",
          padding: "6px 10px",
          background: "rgba(10,11,14,0.85)",
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          backdropFilter: "blur(8px)",
        }}>
          {snapshot.length} ACTIVE · {formatDate(scrubValue).split(" ")[1]}
        </div>
      </div>
    </div>
  );
}

// Keep the earlier VisualFamilyTree available but unused for now — it may come back
function VisualFamilyTree({ selectedGenre, onSelectGenre }) {
  return <TimelineScrubber selectedGenre={selectedGenre} onSelectGenre={onSelectGenre} />;
}

function GenreLineageTree({ selectedGenre, onSelectGenre }) {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  // Which nodes are expanded. Default: roots only.
  const [expanded, setExpanded] = useState(() => new Set(GENRE_ROOTS));
  const [searchText, setSearchText] = useState("");

  const toggleNode = (name) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // When a user searches, auto-expand the path to any matching nodes
  const searchLower = searchText.trim().toLowerCase();
  const matchingSet = useMemo(() => {
    if (!searchLower) return null;
    return new Set(Object.keys(GENRE_LINEAGE).filter(g => g.toLowerCase().includes(searchLower)));
  }, [searchLower]);

  // Build ancestors set for auto-expand on search
  const autoExpand = useMemo(() => {
    if (!matchingSet) return new Set();
    const result = new Set();
    const walk = (name) => {
      const parents = GENRE_LINEAGE[name]?.parents || [];
      parents.forEach(p => { result.add(p); walk(p); });
    };
    matchingSet.forEach(walk);
    return result;
  }, [matchingSet]);

  const isExpanded = (name) => expanded.has(name) || autoExpand.has(name);

  // Recursive tree renderer. Pass `depth` for indentation.
  // Tracks a `visited` set to prevent infinite loops on hybrid genres
  // that could theoretically create cycles (though data is acyclic).
  const renderNode = (name, depth = 0, visited = new Set()) => {
    if (visited.has(name)) return null;
    const node = GENRE_LINEAGE[name];
    if (!node) return null;
    const children = GENRE_CHILDREN[name] || [];
    const hasChildren = children.length > 0;
    const open = isExpanded(name);
    const isSelected = selectedGenre === name;
    const isMatched = matchingSet && matchingSet.has(name);
    const newVisited = new Set(visited); newVisited.add(name);

    return (
      <div key={`${name}-${depth}`}>
        <div
          onClick={() => { onSelectGenre(name); if (hasChildren) toggleNode(name); }}
          style={{
            position: "relative",
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 10px",
            paddingLeft: 10 + depth * (isMobile ? 14 : 20),
            margin: "2px 0",
            background: isSelected
              ? `linear-gradient(90deg, ${T.accent}22 0%, transparent 100%)`
              : isMatched
                ? `linear-gradient(90deg, ${V.neonGold}15 0%, transparent 60%)`
                : "transparent",
            borderLeft: isSelected ? `2px solid ${T.accent}` : "2px solid transparent",
            cursor: "pointer",
            borderRadius: 4,
            transition: "background 160ms ease-out, border-color 160ms ease-out",
            userSelect: "none",
          }}
          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.hover; }}
          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isMatched ? `linear-gradient(90deg, ${V.neonGold}15 0%, transparent 60%)` : "transparent"; }}
        >
          {/* Tree line indicator */}
          {depth > 0 && (
            <span aria-hidden="true" style={{
              position: "absolute",
              left: 10 + (depth - 1) * (isMobile ? 14 : 20) + 4,
              top: 0, bottom: 0, width: 1,
              background: `linear-gradient(180deg, ${T.border}aa 0%, ${T.border}44 100%)`,
            }} />
          )}

          {/* Expand indicator */}
          <span style={{
            display: "inline-block",
            width: 14, textAlign: "center",
            fontSize: 10, fontFamily: T.font_mono,
            color: hasChildren ? T.textTer : T.textMuted,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            flexShrink: 0,
          }}>
            {hasChildren ? "▸" : "·"}
          </span>

          {/* Node label */}
          <span style={{
            fontSize: isMobile ? 13 : 14,
            fontFamily: T.font_sans,
            fontWeight: depth === 0 ? 600 : 450,
            color: isSelected ? T.text : isMatched ? V.neonGold : T.textSec,
            letterSpacing: depth === 0 ? "-0.01em" : "0em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {name}
          </span>

          {/* Era hint — only shown on non-mobile or for roots */}
          {(!isMobile || depth === 0) && (
            <span style={{
              fontSize: 10, fontFamily: T.font_mono,
              color: T.textMuted, letterSpacing: "0.08em",
              marginLeft: "auto", flexShrink: 0,
            }}>
              {node.era}
            </span>
          )}

          {/* Hybrid badge — multiple parents */}
          {node.parents.length > 1 && (
            <span title={`Hybrid of: ${node.parents.join(", ")}`} style={{
              fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
              color: V.cyan, letterSpacing: "0.12em",
              padding: "1px 5px",
              background: `${V.cyan}14`,
              border: `1px solid ${V.cyan}44`,
              borderRadius: 3,
              flexShrink: 0,
            }}>HYBRID</span>
          )}
        </div>

        {/* Children — animated reveal */}
        {hasChildren && open && (
          <div style={{
            animation: "treeBranchIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
            overflow: "hidden",
          }}>
            {children.map(c => renderNode(c, depth + 1, newVisited))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r_lg,
      padding: isMobile ? 12 : 16,
    }}>
      <style>{`
        @keyframes treeBranchIn {
          from { opacity: 0; max-height: 0; transform: translateX(-4px); }
          to   { opacity: 1; max-height: 3000px; transform: translateX(0); }
        }
      `}</style>

      {/* Header + search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 12,
      }}>
        <Label color={T.text} size={T.fs_sm}>Genre lineage</Label>
        <span style={{
          fontSize: 10, color: T.textTer, fontFamily: T.font_mono, letterSpacing: "0.1em",
          flex: 1,
        }}>
          {Object.keys(GENRE_LINEAGE).length} genres · click to explore
        </span>
      </div>
      <input
        type="text" value={searchText}
        onChange={e => setSearchText(e.target.value)}
        placeholder="Search genres (e.g. 'trap', 'house')"
        style={{
          width: "100%", boxSizing: "border-box",
          padding: isMobile ? "10px 12px" : "8px 12px",
          background: T.bg, border: `1px solid ${T.border}`,
          color: T.text,
          fontSize: isMobile ? 16 : 13,
          fontFamily: T.font_sans,
          borderRadius: 6, outline: "none",
          marginBottom: 8,
          WebkitAppearance: "none",
          transition: "border-color 140ms ease-out",
        }}
        onFocus={e => e.currentTarget.style.borderColor = T.borderFocus}
        onBlur={e => e.currentTarget.style.borderColor = T.border}
      />

      {/* Expand/collapse all */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button type="button"
          onClick={() => setExpanded(new Set(Object.keys(GENRE_LINEAGE)))}
          style={{
            padding: "4px 10px", background: "transparent",
            border: `1px solid ${T.border}`, color: T.textTer,
            fontSize: 10, fontFamily: T.font_mono, letterSpacing: "0.12em",
            borderRadius: 4, cursor: "pointer",
          }}>EXPAND ALL</button>
        <button type="button"
          onClick={() => setExpanded(new Set(GENRE_ROOTS))}
          style={{
            padding: "4px 10px", background: "transparent",
            border: `1px solid ${T.border}`, color: T.textTer,
            fontSize: 10, fontFamily: T.font_mono, letterSpacing: "0.12em",
            borderRadius: 4, cursor: "pointer",
          }}>COLLAPSE</button>
      </div>

      {/* The tree */}
      <div style={{
        maxHeight: isMobile ? 420 : 640,
        overflowY: "auto", overflowX: "hidden",
        paddingRight: 4,
      }}>
        {GENRE_ROOTS.map(root => renderNode(root))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// GenreDetailCard — context card for the currently-selected genre node.
// Shows era, description, traits, representative artists, and ancestry paths.
// ────────────────────────────────────────────────────────────────────────────
function GenreDetailCard({ genre, onSelectGenre }) {
  const [artistsExpanded, setArtistsExpanded] = useState(false);
  const [traitsExpanded, setTraitsExpanded] = useState(true); // traits open by default
  // Reset expansion state when switching genres
  useEffect(() => {
    setArtistsExpanded(false);
    setTraitsExpanded(true);
  }, [genre]);

  if (!genre) {
    return (
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: T.r_lg, padding: 24,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: 240, textAlign: "center",
      }}>
        <div style={{
          fontSize: 36, marginBottom: 12, opacity: 0.4, lineHeight: 1,
        }}>🎼</div>
        <div style={{
          fontSize: 14, color: T.textSec, fontFamily: T.font_sans, maxWidth: 320,
          lineHeight: 1.5,
        }}>
          Select a genre in the tree to explore its origins, characteristics, and descendants.
        </div>
      </div>
    );
  }

  const node = GENRE_LINEAGE[genre];
  if (!node) return null;
  const children = GENRE_CHILDREN[genre] || [];
  const deep = GENRE_DEEP_INFO[genre]; // may be undefined for genres without research

  // Build merged data: prefer rich from GENRE_DEEP_INFO, fall back to GENRE_LINEAGE
  const traitsList = deep?.traitDetails || node.traits.map(t => ({ trait: t, detail: null }));
  const artistsList = deep?.artistDetails || node.artists.map(a => ({ name: a, signature: null, why: null }));
  const hasRichTraits = !!deep?.traitDetails;
  const hasRichArtists = !!deep?.artistDetails;

  // By default show first 3 artists; expand to show all
  const visibleArtists = artistsExpanded ? artistsList : artistsList.slice(0, 3);

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.r_lg, padding: 20,
      animation: "detailCardIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      <style>{`
        @keyframes detailCardIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sectionExpand {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 2000px; }
        }
      `}</style>

      {/* ── Header: era + genre name ──────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 10, fontFamily: T.font_mono, color: T.textMuted,
          letterSpacing: "0.2em", marginBottom: 6,
        }}>{node.era.toUpperCase()}</div>
        <div style={{
          fontSize: 26, fontFamily: T.font_sans, fontWeight: 600,
          color: T.text, lineHeight: 1.1, letterSpacing: "-0.015em",
        }}>{genre}</div>
      </div>

      {/* ── Tagline (from deep info) or fallback description ──── */}
      <p style={{
        fontSize: 14, lineHeight: 1.55,
        color: T.textSec, fontFamily: T.font_sans,
        margin: 0, marginBottom: 16,
        fontStyle: deep?.tagline ? "italic" : "normal",
      }}>
        {deep?.tagline || node.description}
      </p>

      {/* ── Popularity curve chart ─────────────────────────────── */}
      {GENRE_HISTORY[genre] && (
        <div style={{ marginBottom: 16 }}>
          <GenrePopularityChart genre={genre} />
        </div>
      )}

      {/* ── Lineage (parents + children) — compact single block ─ */}
      {(node.parents.length > 0 || children.length > 0) && (
        <div style={{
          padding: 12,
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          {/* Parents */}
          {node.parents.length > 0 && (
            <div style={{ marginBottom: children.length > 0 ? 10 : 0 }}>
              <div style={{
                fontSize: 9, fontFamily: T.font_mono, color: T.textMuted,
                letterSpacing: "0.2em", marginBottom: 6,
              }}>◂ EVOLVED FROM</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {node.parents.map(p => (
                  <button key={p} type="button"
                    onClick={() => onSelectGenre(p)}
                    style={{
                      padding: "4px 9px",
                      background: "transparent",
                      border: `1px solid ${T.border}`,
                      color: T.textSec,
                      fontSize: 11, fontFamily: T.font_sans, fontWeight: 500,
                      borderRadius: 4, cursor: "pointer",
                      transition: "all 140ms ease-out",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSec; }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Children */}
          {children.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, fontFamily: T.font_mono, color: T.textMuted,
                letterSpacing: "0.2em", marginBottom: 6,
              }}>▸ SPAWNED</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {children.map(c => (
                  <button key={c} type="button"
                    onClick={() => onSelectGenre(c)}
                    style={{
                      padding: "4px 9px",
                      background: `${T.accent}11`,
                      border: `1px solid ${T.accentBorder}`,
                      color: T.accentHi,
                      fontSize: 11, fontFamily: T.font_sans, fontWeight: 500,
                      borderRadius: 4, cursor: "pointer",
                      transition: "all 140ms ease-out",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${T.accent}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${T.accent}11`; }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Key Traits — expandable with detailed explanations ──── */}
      {traitsList.length > 0 && (
        <div style={{
          marginBottom: 16,
          padding: 14,
          background: `${V.neonGold}07`,
          border: `1px solid ${V.neonGold}26`,
          borderRadius: 8,
        }}>
          <button type="button"
            onClick={() => setTraitsExpanded(!traitsExpanded)}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "transparent", border: "none",
              padding: 0, cursor: "pointer",
              marginBottom: traitsExpanded ? 10 : 0,
            }}>
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              color: V.neonGold, letterSpacing: "0.18em",
              textShadow: `0 0 4px ${V.neonGold}33`,
            }}>
              KEY TRAITS · {traitsList.length}
            </div>
            <span style={{
              color: V.neonGold, fontSize: 11, fontFamily: T.font_mono,
              transition: "transform 200ms ease-out",
              transform: traitsExpanded ? "rotate(90deg)" : "rotate(0deg)",
            }}>▸</span>
          </button>
          {traitsExpanded && (
            <div style={{
              display: "flex", flexDirection: "column", gap: 10,
              animation: "sectionExpand 220ms ease-out",
            }}>
              {traitsList.map((t, i) => (
                <div key={i} style={{
                  paddingBottom: i < traitsList.length - 1 ? 10 : 0,
                  borderBottom: i < traitsList.length - 1 ? `1px dashed ${V.neonGold}22` : "none",
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: T.text,
                    fontFamily: T.font_sans, marginBottom: t.detail ? 4 : 0,
                    lineHeight: 1.3,
                  }}>
                    <span style={{ color: V.neonGold, marginRight: 6 }}>◆</span>
                    {t.trait}
                  </div>
                  {t.detail && (
                    <div style={{
                      fontSize: 12, color: T.textSec,
                      fontFamily: T.font_sans, lineHeight: 1.5,
                      paddingLeft: 14,
                    }}>
                      {t.detail}
                    </div>
                  )}
                </div>
              ))}
              {!hasRichTraits && (
                <div style={{
                  fontSize: 10, color: T.textMuted, fontFamily: T.font_mono,
                  marginTop: 4, fontStyle: "italic",
                  letterSpacing: "0.05em",
                }}>
                  Basic traits only — detailed explanations being researched
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Representative Artists — expandable with signatures ─── */}
      {artistsList.length > 0 && (
        <div style={{
          padding: 14,
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              color: T.text, letterSpacing: "0.18em",
            }}>
              ARTISTS · {artistsList.length}
            </div>
            {artistsList.length > 3 && (
              <button type="button"
                onClick={() => setArtistsExpanded(!artistsExpanded)}
                style={{
                  background: "transparent", border: "none",
                  color: T.accent, fontSize: 11,
                  fontFamily: T.font_mono, fontWeight: 600,
                  letterSpacing: "0.12em", cursor: "pointer",
                  padding: "2px 8px",
                  borderRadius: 4,
                  transition: "all 140ms ease-out",
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${T.accent}15`}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {artistsExpanded ? "SHOW LESS ▲" : `SHOW ALL ${artistsList.length} ▾`}
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleArtists.map((a, i) => (
              <div key={i} style={{
                paddingBottom: i < visibleArtists.length - 1 ? 10 : 0,
                borderBottom: i < visibleArtists.length - 1 ? `1px dashed ${T.border}` : "none",
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: T.text,
                  fontFamily: T.font_sans,
                  marginBottom: a.signature ? 3 : 0,
                  lineHeight: 1.2,
                }}>
                  {a.name}
                </div>
                {a.signature && (
                  <div style={{
                    fontSize: 11, color: T.accent,
                    fontFamily: T.font_mono, letterSpacing: "0.05em",
                    marginBottom: a.why ? 3 : 0,
                  }}>
                    ▸ {a.signature}
                  </div>
                )}
                {a.why && (
                  <div style={{
                    fontSize: 12, color: T.textSec,
                    fontFamily: T.font_sans, lineHeight: 1.5,
                  }}>
                    {a.why}
                  </div>
                )}
              </div>
            ))}
          </div>
          {!hasRichArtists && (
            <div style={{
              marginTop: 8, fontSize: 10, color: T.textMuted, fontFamily: T.font_mono,
              fontStyle: "italic", letterSpacing: "0.05em",
            }}>
              Artist details being researched
            </div>
          )}
        </div>
      )}
    </div>
  );
}



// ════════════════════════════════════════════════════════════════════════════
// GENRE BROWSER — era-grouped sidebar + detail pane.
// Replaces the messy multi-view experience with a single clean encyclopedia.
// Genres are bucketed into 5 eras; each era section is collapsible.
// ════════════════════════════════════════════════════════════════════════════

// Era buckets with readable labels. Order matters — oldest → newest.
const GENRE_ERAS = [
  {
    id: "pre-1960",
    label: "Pre-1960s",
    sublabel: "The foundations",
    description: "Blues, jazz, gospel, folk, country — the roots of everything that follows.",
  },
  {
    id: "60s-70s",
    label: "1960s – 70s",
    sublabel: "Birth of modern genres",
    description: "Rock explodes, funk arrives, hip-hop is invented, disco peaks, metal emerges.",
  },
  {
    id: "80s-90s",
    label: "1980s – 90s",
    sublabel: "Genre explosion",
    description: "New Wave, house, techno, grunge, boom-bap, R&B, alt-rock, gangsta rap, Britpop.",
  },
  {
    id: "2000s-10s",
    label: "2000s – 2010s",
    sublabel: "The streaming era",
    description: "Trap, EDM, indie, alt R&B, K-pop globalization, emo rap, dubstep, afrobeats rise.",
  },
  {
    id: "2020s",
    label: "2020s+",
    sublabel: "Today",
    description: "Amapiano, phonk, hyperpop, drill, plugg, rage rap, current afrobeats, country-pop.",
  },
];

// Map a genre's era string → era bucket id. Uses regex patterns.
function getEraForGenre(genre) {
  const node = GENRE_LINEAGE[genre];
  if (!node || !node.era) return "pre-1960"; // safe fallback

  const era = node.era;
  // Check for specific decade mentions, oldest first
  if (/pre-1900|1800|190[0-9]|191[0-9]|192[0-9]|193[0-9]|194[0-9]|195[0-9]/i.test(era)) return "pre-1960";
  if (/196[0-9]|197[0-9]/i.test(era)) return "60s-70s";
  if (/198[0-9]|199[0-9]/i.test(era)) return "80s-90s";
  if (/200[0-9]|201[0-9]/i.test(era)) return "2000s-10s";
  if (/202[0-9]/i.test(era)) return "2020s";
  return "pre-1960";
}

// Precompute: { eraId: [genre1, genre2, ...] } with genres sorted alphabetically within each era.
const GENRES_BY_ERA = (() => {
  const map = {};
  GENRE_ERAS.forEach(e => { map[e.id] = []; });
  Object.keys(GENRE_LINEAGE).forEach(g => {
    const eraId = getEraForGenre(g);
    if (map[eraId]) map[eraId].push(g);
  });
  // Alphabetize within each era for predictable browsing
  Object.keys(map).forEach(id => { map[id].sort((a, b) => a.localeCompare(b)); });
  return map;
})();

// ── SPARKLINE & CHART COMPONENTS — popularity visualization ───────────
// Both compute from GENRE_HISTORY yearly data points. Sparkline = tiny
// inline version (for sidebar rows). Chart = full-size version (for the
// detail card). Pure line charts: x-axis is years, y-axis is popularity 0-100.

// Get current-year popularity for a genre (used for sorting)
function getCurrentPopularity(genre) {
  const curve = GENRE_HISTORY[genre];
  if (!curve || curve.length === 0) return 0;
  const now = 2026;
  // Use interpolation but without the pre-birth fade-in so sorting is clean
  if (now < curve[0][0]) return 0;
  if (now > curve[curve.length - 1][0]) {
    const delta = now - curve[curve.length - 1][0];
    return Math.max(0, curve[curve.length - 1][1] * (1 - delta / 8));
  }
  for (let i = 0; i < curve.length - 1; i++) {
    const [ta, va] = curve[i];
    const [tb, vb] = curve[i + 1];
    if (now >= ta && now <= tb) {
      const p = (now - ta) / (tb - ta);
      return va + (vb - va) * p;
    }
  }
  return 0;
}

// Build an SVG path (d attribute) from a curve at given dimensions
function buildCurvePath(curve, width, height, minYear, maxYear) {
  if (!curve || curve.length === 0) return "";
  const padY = 4; // leave a little breathing room top/bottom
  const usableH = height - padY * 2;
  const years = maxYear - minYear;
  // Sample every quarter-year for smooth appearance
  const points = [];
  for (let y = minYear; y <= maxYear; y += 0.25) {
    // Linear interp for speed (simpler than smoothstep for chart rendering)
    let val = 0;
    if (y < curve[0][0]) val = 0;
    else if (y > curve[curve.length - 1][0]) {
      const delta = y - curve[curve.length - 1][0];
      val = Math.max(0, curve[curve.length - 1][1] * (1 - delta / 8));
    } else {
      for (let i = 0; i < curve.length - 1; i++) {
        const [ta, va] = curve[i];
        const [tb, vb] = curve[i + 1];
        if (y >= ta && y <= tb) {
          const p = (y - ta) / (tb - ta);
          val = va + (vb - va) * p;
          break;
        }
      }
    }
    const px = ((y - minYear) / years) * width;
    const py = padY + (1 - val / 100) * usableH;
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  if (points.length === 0) return "";
  return `M ${points[0]} L ${points.slice(1).join(" L ")}`;
}

// ── Tiny sidebar sparkline — ~80px wide, 20px tall ─────────────────
function GenreSparkline({ genre, width = 80, height = 20, color }) {
  const curve = GENRE_HISTORY[genre];
  if (!curve || curve.length === 0) return null;
  const minYear = 1960;
  const maxYear = 2026;
  const path = buildCurvePath(curve, width, height, minYear, maxYear);
  const current = getCurrentPopularity(genre);
  // Current-position dot on the right edge
  const dotX = width - 1.5;
  const dotY = 4 + (1 - current / 100) * (height - 8);

  const strokeColor = color || T.textSec;

  return (
    <svg width={width} height={height} style={{ display: "block", flexShrink: 0 }}>
      <path d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.75}
      />
      {/* Current-position dot */}
      <circle cx={dotX} cy={dotY} r={1.8}
        fill={strokeColor}
        opacity={1}
      />
    </svg>
  );
}

// ── Full popularity chart — big line chart for the detail card ─────
function GenrePopularityChart({ genre }) {
  const curve = GENRE_HISTORY[genre];
  if (!curve || curve.length === 0) {
    return (
      <div style={{
        padding: 16, textAlign: "center",
        fontSize: 12, color: T.textMuted, fontFamily: T.font_sans,
        fontStyle: "italic",
      }}>
        No historical data available yet — being researched.
      </div>
    );
  }

  const MIN_YEAR = 1960;
  const MAX_YEAR = 2026;
  const WIDTH = 540;
  const HEIGHT = 160;
  const PAD_L = 32;   // y-axis label room
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 26;   // x-axis label room
  const CHART_W = WIDTH - PAD_L - PAD_R;
  const CHART_H = HEIGHT - PAD_T - PAD_B;

  const path = buildCurvePath(curve, CHART_W, CHART_H, MIN_YEAR, MAX_YEAR);
  const current = getCurrentPopularity(genre);

  // Decade ticks for the x-axis
  const decadeTicks = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
  // Popularity grid lines
  const yGridLines = [0, 25, 50, 75, 100];

  // Find peak year for annotation
  let peakYear = curve[0][0];
  let peakValue = curve[0][1];
  curve.forEach(([y, v]) => {
    if (v > peakValue) { peakValue = v; peakYear = y; }
  });

  return (
    <div style={{
      padding: "12px 14px",
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
    }}>
      {/* Header: current popularity + peak */}
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 6, gap: 10, flexWrap: "wrap",
      }}>
        <div style={{
          fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
          color: T.textMuted, letterSpacing: "0.18em",
        }}>POPULARITY CURVE</div>
        <div style={{
          fontSize: 11, color: T.textTer, fontFamily: T.font_mono,
          letterSpacing: "0.05em",
          display: "flex", gap: 10,
        }}>
          <span>NOW: <strong style={{ color: T.text }}>{Math.round(current)}</strong></span>
          <span>PEAK: <strong style={{ color: V.neonGold }}>{Math.round(peakValue)}</strong> ({peakYear})</span>
        </div>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}>
        {/* Y-axis grid lines */}
        {yGridLines.map(v => {
          const y = PAD_T + (1 - v / 100) * CHART_H;
          return (
            <g key={v}>
              <line
                x1={PAD_L} x2={WIDTH - PAD_R}
                y1={y} y2={y}
                stroke={T.border}
                strokeWidth={0.5}
                strokeDasharray={v === 0 || v === 100 ? "0" : "2 3"}
                opacity={0.6}
              />
              <text
                x={PAD_L - 6} y={y + 3}
                textAnchor="end"
                fontSize={8}
                fontFamily={T.font_mono}
                fill={T.textMuted}
                letterSpacing="0.05em">
                {v}
              </text>
            </g>
          );
        })}

        {/* X-axis decade tick marks + labels */}
        {decadeTicks.map(y => {
          const x = PAD_L + ((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * CHART_W;
          return (
            <g key={y}>
              <line
                x1={x} x2={x}
                y1={PAD_T} y2={PAD_T + CHART_H}
                stroke={T.border}
                strokeWidth={0.5}
                opacity={0.3}
              />
              <text
                x={x} y={HEIGHT - 8}
                textAnchor="middle"
                fontSize={9}
                fontFamily={T.font_mono}
                fill={T.textMuted}
                letterSpacing="0.05em">
                {y}
              </text>
            </g>
          );
        })}

        {/* The actual popularity curve */}
        <g transform={`translate(${PAD_L}, ${PAD_T})`}>
          <path d={path}
            fill="none"
            stroke={T.accent}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 2px ${T.accent}88)` }}
          />
          {/* Current-position marker */}
          <circle
            cx={CHART_W}
            cy={(1 - current / 100) * CHART_H}
            r={3}
            fill={T.accentHi}
            stroke={T.bg}
            strokeWidth={1.5}
            style={{ filter: `drop-shadow(0 0 4px ${T.accent})` }}
          />
        </g>

        {/* X-axis label */}
        <text
          x={WIDTH / 2} y={HEIGHT - 1}
          textAnchor="middle"
          fontSize={8}
          fontFamily={T.font_mono}
          fill={T.textMuted}
          letterSpacing="0.15em">
          YEAR · 1960 → 2026
        </text>
      </svg>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// GENRE BROWSER — popularity-sorted sidebar + detail pane.
// Genres are sorted by their 2026 popularity (most relevant now at top).
// Each row shows a tiny sparkline so you can see a genre's life-curve at a glance.
// ════════════════════════════════════════════════════════════════════════════
function GenreBrowser({ selectedGenre, onSelectGenre }) {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const [search, setSearch] = useState("");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Precompute: all genres sorted by current (2026) popularity, descending.
  // This turns the sidebar into a "what's hot right now" ranked list.
  const sortedGenres = useMemo(() => {
    return Object.keys(GENRE_LINEAGE)
      .map(g => ({ name: g, current: getCurrentPopularity(g) }))
      .sort((a, b) => b.current - a.current);
  }, []);

  // Search filters across the full list
  const searchLower = search.trim().toLowerCase();
  const isSearching = searchLower.length > 0;
  const visibleGenres = useMemo(() => {
    if (!isSearching) return sortedGenres;
    return sortedGenres.filter(g => g.name.toLowerCase().includes(searchLower));
  }, [sortedGenres, isSearching, searchLower]);

  // On mobile, show detail view when a genre is selected
  useEffect(() => {
    if (isMobile && selectedGenre) setMobileShowDetail(true);
  }, [selectedGenre, isMobile]);

  const handleSelect = (genre) => {
    onSelectGenre(genre);
    if (isMobile) setMobileShowDetail(true);
  };

  // ── Mobile: show either sidebar OR detail, not both ─────────────
  if (isMobile && mobileShowDetail && selectedGenre) {
    return (
      <div style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: T.r_lg,
        overflow: "hidden",
      }}>
        <button type="button"
          onClick={() => setMobileShowDetail(false)}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: T.surface,
            border: "none",
            borderBottom: `1px solid ${T.border}`,
            color: T.text,
            fontSize: 13, fontFamily: T.font_sans, fontWeight: 500,
            cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 8,
          }}>
          <span style={{ color: T.accent, fontSize: 16 }}>◂</span>
          Back to all genres
        </button>
        <div style={{ padding: T.s3 }}>
          <GenreDetailCard
            genre={selectedGenre}
            onSelectGenre={handleSelect}
          />
        </div>
      </div>
    );
  }

  // ── Sidebar + detail layout ─────────────────────────────────────
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "minmax(320px, 380px) 1fr",
      gap: T.s4,
      alignItems: "start",
    }}>
      {/* ════ SIDEBAR ═══════════════════════════════════════════ */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.r_lg,
        overflow: "hidden",
      }}>
        {/* Header with explanatory label */}
        <div style={{
          padding: "12px 14px 10px",
          borderBottom: `1px solid ${T.border}`,
          background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
        }}>
          <div style={{
            fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
            color: T.textMuted, letterSpacing: "0.18em", marginBottom: 4,
          }}>SORTED BY CURRENT POPULARITY</div>
          <div style={{
            fontSize: 10, color: T.textTer, fontFamily: T.font_sans,
            lineHeight: 1.4,
          }}>
            {visibleGenres.length} genres · most relevant today first
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: 10, borderBottom: `1px solid ${T.border}` }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search genres…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: isMobile ? "10px 12px" : "8px 12px",
              background: T.bg,
              border: `1px solid ${T.border}`,
              color: T.text,
              fontSize: isMobile ? 16 : 13,
              fontFamily: T.font_sans,
              borderRadius: 6, outline: "none",
              WebkitAppearance: "none",
              transition: "border-color 140ms ease-out",
            }}
            onFocus={e => e.currentTarget.style.borderColor = T.borderFocus}
            onBlur={e => e.currentTarget.style.borderColor = T.border}
          />
        </div>

        {/* Scrollable ranked list */}
        <div style={{
          maxHeight: isMobile ? "none" : "calc(100vh - 260px)",
          overflowY: "auto",
          padding: "4px 0",
        }}>
          {visibleGenres.length === 0 ? (
            <div style={{
              padding: "20px 16px", textAlign: "center",
              fontSize: 13, color: T.textMuted, fontFamily: T.font_sans,
            }}>
              No genres match "{search}"
            </div>
          ) : (
            visibleGenres.map((g, idx) => (
              <GenreRow key={g.name}
                genre={g.name}
                rank={isSearching ? null : idx + 1}
                current={g.current}
                isSelected={selectedGenre === g.name}
                onClick={() => handleSelect(g.name)}
              />
            ))
          )}
        </div>
      </div>

      {/* ════ DETAIL PANE ═══════════════════════════════════════ */}
      {!isMobile && (
        <div style={{ position: "sticky", top: 72 }}>
          <GenreDetailCard
            genre={selectedGenre}
            onSelectGenre={handleSelect}
          />
        </div>
      )}
    </div>
  );
}



// Row component — a single clickable genre in the sidebar list.
// Shows: rank number · genre name · hybrid marker · RES badge · sparkline
function GenreRow({ genre, rank, current, isSelected, onClick }) {
  const node = GENRE_LINEAGE[genre];
  if (!node) return null;
  const deep = GENRE_DEEP_INFO[genre];
  const hasRich = !!deep;
  const isHybrid = (node.parents || []).length > 1;

  // Color the sparkline based on current popularity: hot genres get accent,
  // cooler ones fade toward muted gray
  const sparkColor = current >= 60 ? T.accentHi
    : current >= 35 ? T.textSec
    : T.textMuted;

  return (
    <button type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "7px 10px 7px 8px",
        background: isSelected ? `linear-gradient(90deg, ${T.accent}22 0%, transparent 80%)` : "transparent",
        border: "none",
        borderLeft: `2px solid ${isSelected ? T.accent : "transparent"}`,
        borderRadius: isSelected ? "0 6px 6px 0" : 6,
        color: isSelected ? T.text : T.textSec,
        fontSize: 13, fontFamily: T.font_sans, fontWeight: isSelected ? 500 : 400,
        cursor: "pointer",
        transition: "all 120ms ease-out",
        textAlign: "left",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.hover; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
      {/* Rank number */}
      {rank !== null && rank !== undefined && (
        <span style={{
          flexShrink: 0,
          width: 22, textAlign: "right",
          fontSize: 10, fontFamily: T.font_mono,
          color: rank <= 10 ? T.accentHi : T.textMuted,
          fontWeight: rank <= 10 ? 700 : 400,
          letterSpacing: "0.05em",
        }}>{rank}</span>
      )}
      {/* Genre name */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        flex: 1, minWidth: 0,
      }}>
        <span style={{
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{genre}</span>
        {isHybrid && (
          <span title={`Hybrid of: ${node.parents.join(", ")}`}
            style={{ fontSize: 9, color: V.cyan, flexShrink: 0 }}>◆</span>
        )}
      </div>
      {/* RES badge + sparkline */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
      }}>
        {hasRich && (
          <span style={{
            fontSize: 8, fontFamily: T.font_mono, fontWeight: 700,
            color: T.success, letterSpacing: "0.12em",
            padding: "1px 4px",
            background: `${T.success}14`,
            border: `1px solid ${T.success}44`,
            borderRadius: 3,
          }}>RES</span>
        )}
        <GenreSparkline genre={genre} width={70} height={18} color={sparkColor} />
      </div>
    </button>
  );
}


function HistoryPage() {
  const { layout } = useLayout();
  const { features } = useTier();
  const isMobile = layout === "mobile";
  const historyMainOnly = features.historyAccess === "main-yearly";
  const allowMonthly    = features.historyAccess === "full-monthly";

  // Main genre families — kept minimal for the free tier
  const MAIN_GENRES = ["Hip-Hop","R&B / Soul","Pop","Electronic","Rock","Metal","Latin","K-Pop","Country","Jazz","Afrobeats","Amapiano","Blues","Folk","Gospel"];
  const AVAILABLE = historyMainOnly
    ? Object.keys(GENRE_HISTORY).filter(g => MAIN_GENRES.includes(g))
    : Object.keys(GENRE_HISTORY);

  const ALL_GENRES = AVAILABLE;
  const defaultSelected = historyMainOnly
    ? AVAILABLE.slice(0, Math.min(3, AVAILABLE.length))
    : ["Hip-Hop","Pop","Electronic","Latin","K-Pop","Afrobeats","Amapiano","Tech-House"].filter(g => AVAILABLE.includes(g));

  const [selected, setSelected] = useState(defaultSelected);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [resolution, setResolution] = useState("yearly"); // yearly|monthly|weekly
  const [pageMode, setPageMode] = useState("browse"); // browse | charts
  const [selectedLineage, setSelectedLineage] = useState("Hip-Hop"); // currently selected tree node
  const MAX_SELECTED = features.historyMaxSelect || 3;

  // Enforce cap if tier changes and user had too many selected
  useEffect(() => {
    setSelected(prev => prev.filter(g => AVAILABLE.includes(g)).slice(0, MAX_SELECTED));
    if (!allowMonthly && resolution !== "yearly") setResolution("yearly");
  }, [features.historyAccess]);

  // Trend-index pre-computed for all genres
  const trendIndex = useMemo(() => {
    const map = {};
    ALL_GENRES.forEach(g => { map[g] = calcTrendIndex(GENRE_HISTORY[g]); });
    return map;
  }, []);

  const toggleGenre = (g) => {
    setSelected(prev =>
      prev.includes(g)
        ? prev.filter(x => x !== g)
        : prev.length < MAX_SELECTED ? [...prev, g] : prev
    );
  };

  const selectAllVisible = () => {
    setSelected(filteredGenres.slice(0, MAX_SELECTED));
  };
  const clearAll = () => setSelected([]);

  const searchLower = search.trim().toLowerCase();
  const filteredGenres = useMemo(() => {
    let list = ALL_GENRES;
    if (searchLower) list = list.filter(g => g.toLowerCase().includes(searchLower));
    // Single sort: alphabetical
    list = [...list].sort((a, b) => a.localeCompare(b));
    return list;
  }, [searchLower]);

  // Accent-family palette for lines
  const LINE_COLORS = [T.accentHi, T.accent, T.text, T.warning, T.success, "#8B5CF6", "#06B6D4", T.danger, T.textSec, "#FF6B00", "#00E5FF", "#FF2D9C", "#FFD700", "#00FF88", "#E94FEF", "#F5A524", "#4ADE80", "#7C8BFF", "#5E6AD2", "#6B6E76", "#EF4444", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B"];

  return (
    <div style={{
      maxWidth: 1440, margin: "0 auto",
      padding: isMobile
        ? `${T.s5}px ${T.s4}px ${T.s8}px`
        : `${T.s8}px ${T.s7}px ${T.s10}px`,
    }}>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: T.s8 }}>
        <Label color={T.textTer} style={{ display: "block", marginBottom: T.s4 }}>
          Genre History · popularity over time
        </Label>
        <h1 style={{
          fontSize: "clamp(32px, 4vw, 56px)",
          lineHeight: 1.05, letterSpacing: "-0.025em",
          margin: 0, marginBottom: T.s3,
          fontFamily: T.font_sans, fontWeight: 600,
        }}>
          What's hot, what's cooling, what's over
        </h1>
        <p style={{
          color: T.textSec, fontSize: T.fs_lg, lineHeight: 1.55,
          maxWidth: 720, marginBottom: T.s3, fontFamily: T.font_sans,
        }}>
          Every genre and subgenre in the engine, plotted from 1960 to now. Each curve shows how a genre's cultural momentum has risen and fallen over the decades.
        </p>
        {/* Explicit disclaimer — users deserve to know the data provenance */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 14px", marginTop: T.s2,
          background: `${V.neonGold}0a`,
          border: `1px solid ${V.neonGold}33`,
          borderRadius: 6,
          fontSize: 11, fontFamily: T.font_mono, fontWeight: 600,
          letterSpacing: "0.12em",
          color: V.neonGold,
          textShadow: `0 0 4px ${V.neonGold}44`,
        }}>
          <span>⚠</span>
          EDITORIAL ESTIMATES · LAST UPDATED APRIL 2026 · NOT REAL-TIME CHART DATA
        </div>
      </div>

      {/* ── PAGE MODE SWITCHER — simplified to 2 tabs ─────────────────── */}
      <div style={{
        display: "inline-flex",
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: 4, marginBottom: T.s6,
      }}>
        {[
          { id: "browse", label: "Browse", hint: "Explore genres grouped by era" },
          { id: "charts", label: "Popularity charts", hint: "Popularity over time" },
        ].map(m => (
          <button key={m.id} type="button"
            onClick={() => setPageMode(m.id)}
            title={m.hint}
            style={{
              padding: "8px 16px",
              background: pageMode === m.id ? T.elevated : "transparent",
              border: "none",
              color: pageMode === m.id ? T.text : T.textSec,
              fontSize: 13, fontFamily: T.font_sans, fontWeight: 500,
              borderRadius: 6, cursor: "pointer",
              transition: "all 160ms ease-out",
            }}>{m.label}</button>
        ))}
      </div>

      {/* ── BROWSE MODE — new era-grouped encyclopedia ───────────────── */}
      {pageMode === "browse" && (
        <div style={{ marginBottom: T.s7 }}>
          <GenreBrowser
            selectedGenre={selectedLineage}
            onSelectGenre={setSelectedLineage}
          />
        </div>
      )}

      {/* ── TREND CHARTS MODE — existing functionality ───────────────── */}
      {pageMode === "charts" && (<>


      {/* ── CONTROLS — search, sort, view mode, selection counter ───── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: T.s3,
        alignItems: "center", marginBottom: T.s4,
      }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search genres…"
          style={{
            flex: "1 1 240px", minWidth: 200,
            background: T.surface, border: `1px solid ${T.border}`,
            color: T.text,
            padding: isMobile ? "10px 12px" : `${T.s2}px ${T.s3}px`,
            fontSize: isMobile ? 16 : T.fs_md,
            fontFamily: T.font_sans,
            borderRadius: T.r_md, outline: "none",
            boxSizing: "border-box",
            height: isMobile ? 40 : "auto",
            WebkitAppearance: "none",
            transition: `border-color ${T.dur_fast} ${T.ease}`,
          }}
          onFocus={e => e.currentTarget.style.borderColor = T.borderFocus}
          onBlur={e => e.currentTarget.style.borderColor = T.border}
        />

        {/* View mode */}
        <div style={{
          display: "flex", background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: T.r_md, padding: 2,
        }}>
          {[
            { id: "grid",    label: "Grid" },
            { id: "overlay", label: "Overlay" },
          ].map(o => (
            <button key={o.id} type="button" onClick={() => setViewMode(o.id)} style={{
              background: viewMode === o.id ? T.elevated : "transparent",
              border: "none",
              color: viewMode === o.id ? T.text : T.textTer,
              padding: `${T.s2}px ${T.s3}px`, cursor: "pointer",
              fontSize: T.fs_sm, fontFamily: T.font_sans, fontWeight: 500,
              borderRadius: T.r_sm,
              transition: `all ${T.dur_fast} ${T.ease}`,
            }}>{o.label}</button>
          ))}
        </div>

        <span style={{
          fontSize: T.fs_sm, color: T.textSec, fontFamily: T.font_mono,
          marginLeft: "auto",
        }}>
          {selected.length} / {MAX_SELECTED} selected
        </span>

        <Button variant="ghost" size="sm" onClick={selectAllVisible}>
          Select top {Math.min(MAX_SELECTED, filteredGenres.length)}
        </Button>
        <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
      </div>

      {/* ── CHART AREA ─────────────────────────────────────────────── */}
      {selected.length === 0 ? (
        <div style={{
          padding: `${T.s7}px ${T.s5}px`,
          background: T.surface, border: `1px dashed ${T.border}`,
          borderRadius: T.r_lg, textAlign: "center",
          color: T.textTer, fontFamily: T.font_sans,
          marginBottom: T.s6,
        }}>
          Select up to {MAX_SELECTED} genres below to see their popularity curves.
        </div>
      ) : viewMode === "overlay" ? (
        <OverlayChart selected={selected} colors={LINE_COLORS} />
      ) : (
        <MiniChartGrid selected={selected} colors={LINE_COLORS} trendIndex={trendIndex} />
      )}

      {/* ── GENRE PICKER LIST ──────────────────────────────────────── */}
      <Label color={T.textSec} style={{ display: "block", marginBottom: T.s3 }}>
        All genres ({filteredGenres.length})
      </Label>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: T.s2, marginBottom: T.s7,
      }}>
        {filteredGenres.map(g => {
          const isOn = selected.includes(g);
          const score = trendIndex[g];
          const idx = selected.indexOf(g);
          const color = idx >= 0 ? LINE_COLORS[idx % LINE_COLORS.length] : T.textTer;
          const disabled = !isOn && selected.length >= MAX_SELECTED;
          return (
            <button key={g} type="button"
              onClick={() => !disabled && toggleGenre(g)}
              disabled={disabled}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: T.s2, padding: `${T.s2}px ${T.s3}px`,
                background: isOn ? T.elevated : T.surface,
                border: `1px solid ${isOn ? T.borderHi : T.border}`,
                borderRadius: T.r_md,
                color: isOn ? T.text : T.textSec,
                fontFamily: T.font_sans, fontSize: T.fs_sm, fontWeight: 500,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.35 : 1,
                transition: `all ${T.dur_fast} ${T.ease}`,
                textAlign: "left",
              }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: T.s2, flex: 1, minWidth: 0 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isOn ? color : T.border,
                  flexShrink: 0,
                }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g}</span>
              </span>
              <span style={{
                fontSize: T.fs_xs, color: T.textTer,
                fontFamily: T.font_mono, flexShrink: 0,
              }}>{score}</span>
            </button>
          );
        })}
      </div>

      {/* ── CONTEXT CARDS ─────────────────────────────────────────── */}
      {selected.filter(g => GENRE_CONTEXT[g]).length > 0 && (
        <div>
          <Label color={T.textSec} style={{ display: "block", marginBottom: T.s3 }}>
            Context
          </Label>
          <div style={{
            display: "grid", gap: T.s3,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}>
            {selected.filter(g => GENRE_CONTEXT[g]).map(g => (
              <div key={g} style={{
                padding: T.s4,
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: T.r_md,
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  marginBottom: T.s2,
                }}>
                  <span style={{
                    fontSize: T.fs_base, color: T.text, fontWeight: 600,
                    fontFamily: T.font_sans,
                  }}>{g}</span>
                  <span style={{
                    fontSize: T.fs_sm, color: T.accentHi,
                    fontFamily: T.font_mono, fontWeight: 600,
                  }}>{trendIndex[g]}</span>
                </div>
                <div style={{
                  fontSize: T.fs_md, color: T.textSec, lineHeight: 1.55,
                  fontFamily: T.font_sans,
                }}>{GENRE_CONTEXT[g]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}

// ── Overlay chart: single large SVG with all selected genres overlaid ──
function OverlayChart({ selected, colors }) {
  const width = 1000, height = 480;
  const padL = 56, padR = 28, padT = 32, padB = 40;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const years = [1960, 1970, 1980, 1990, 2000, 2010, 2020, 2026];
  const xFor = (yr) => padL + ((yr - 1960) / (2026 - 1960)) * plotW;
  const yFor = (v) => padT + (1 - v / 100) * plotH;

  const pathFor = (data) => {
    const sorted = [...data].sort((a, b) => a[0] - b[0]);
    return sorted.map((pt, i) =>
      `${i === 0 ? "M" : "L"} ${xFor(pt[0]).toFixed(1)} ${yFor(pt[1]).toFixed(1)}`
    ).join(" ");
  };

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.r_lg, padding: T.s5, marginBottom: T.s6,
    }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={padL} x2={width - padR} y1={yFor(v)} y2={yFor(v)}
              stroke={T.border} strokeWidth={1} strokeDasharray="2 4" />
            <text x={padL - 10} y={yFor(v) + 4} textAnchor="end"
              fill={T.textTer} fontSize={T.fs_xs} fontFamily={T.font_mono}>{v}</text>
          </g>
        ))}
        {years.map(yr => (
          <text key={yr} x={xFor(yr)} y={height - padB + 20} textAnchor="middle"
            fill={T.textTer} fontSize={T.fs_xs} fontFamily={T.font_mono}>{yr}</text>
        ))}
        <line x1={padL} x2={width - padR} y1={height - padB} y2={height - padB} stroke={T.borderHi} strokeWidth={1} />
        <line x1={padL} x2={padL} y1={padT} y2={height - padB} stroke={T.borderHi} strokeWidth={1} />

        {selected.map((g, i) => {
          const data = GENRE_HISTORY[g] || [];
          const color = colors[i % colors.length];
          return (
            <g key={g}>
              <path d={pathFor(data)} fill="none" stroke={color} strokeWidth={1.5}
                strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Mini chart grid: small multiples, one chart per genre ──
function MiniChartGrid({ selected, colors, trendIndex }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: T.s3, marginBottom: T.s6,
    }}>
      {selected.map((g, i) => (
        <MiniChart key={g} genre={g} data={GENRE_HISTORY[g] || []}
          color={colors[i % colors.length]} score={trendIndex[g]} />
      ))}
    </div>
  );
}

function MiniChart({ genre, data, color, score }) {
  const width = 220, height = 120;
  const padL = 8, padR = 8, padT = 28, padB = 20;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const xFor = (yr) => padL + ((yr - 1960) / (2026 - 1960)) * plotW;
  const yFor = (v) => padT + (1 - v / 100) * plotH;

  const sorted = [...data].sort((a, b) => a[0] - b[0]);
  const path = sorted.map((pt, i) =>
    `${i === 0 ? "M" : "L"} ${xFor(pt[0]).toFixed(1)} ${yFor(pt[1]).toFixed(1)}`
  ).join(" ");
  // Area fill
  const areaPath = sorted.length > 0
    ? `${path} L ${xFor(sorted[sorted.length - 1][0])} ${yFor(0)} L ${xFor(sorted[0][0])} ${yFor(0)} Z`
    : "";

  const barColor = score >= 85 ? T.success : score >= 70 ? T.warning : T.accent;

  return (
    <div style={{
      padding: T.s3,
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.r_md,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{
          fontSize: T.fs_sm, color: T.text, fontWeight: 600,
          fontFamily: T.font_sans,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          minWidth: 0, flex: 1,
        }}>{genre}</span>
        <span style={{
          fontSize: T.fs_sm, color: barColor, fontFamily: T.font_mono,
          fontWeight: 700, marginLeft: T.s2, flexShrink: 0,
        }}>{score}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <path d={areaPath} fill={color} opacity={0.15} />
        <path d={path} fill="none" stroke={color} strokeWidth={1.3}
          strokeLinejoin="round" strokeLinecap="round" />
        <line x1={padL} x2={width - padR} y1={height - padB} y2={height - padB}
          stroke={T.border} strokeWidth={1} />
        <text x={padL} y={height - 4} fill={T.textTer} fontSize={9} fontFamily={T.font_mono}>1960</text>
        <text x={width - padR} y={height - 4} textAnchor="end"
          fill={T.textTer} fontSize={9} fontFamily={T.font_mono}>2026</text>
      </svg>
    </div>
  );
}





// ════════════════════════════════════════════════════════════════════════════
// VIP SECRETS PAGE — guides to maximize use of Hit Engine
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// THE PLAYBOOK — long-form VIP knowledge base.
// Aesthetic: research paper from 2035. Editorial serif typography for ideas,
// monospace for technical annotations, subtle scanlines and animated grid
// backgrounds, interactive widgets that TEACH concepts by letting you feel them.
// Block types: prose, h2, h3, manifesto, annotated-quote, inspector, diagram,
// example, list, stat-row, divider.
// ════════════════════════════════════════════════════════════════════════════

// ── INTERACTIVE WIDGET: Prompt Anatomy Inspector ──────────────────────
// Live widget where every word of an example prompt is tagged with its
// function category. Hovering a word highlights all words of the same
// category — teaches the user to SEE prompt structure, not just read about it.
const ANATOMY_CATEGORIES = {
  genre:    { label: "GENRE",     color: "#FFD700", desc: "What stylistic lineage the model should pull from" },
  tempo:    { label: "TEMPO",     color: "#00E5FF", desc: "BPM and rhythmic feel (halftime, swing, straight)" },
  instr:    { label: "INSTRUMENT", color: "#7C8BFF", desc: "Specific instruments and their articulations" },
  vocal:    { label: "VOCAL",     color: "#FF2D9C", desc: "Voice gender, quality, language, delivery style" },
  mix:      { label: "MIX",       color: "#00FF88", desc: "Production aesthetic, reverb, compression, space" },
  mood:     { label: "MOOD",      color: "#E94FEF", desc: "Emotional register and harmonic character" },
};

// Tokenized prompt. Each token has category + the actual word(s).
// Rendering joins them with spaces and commas where natural.
const ANATOMY_EXAMPLE = [
  { cat: "genre",  t: "Alt R&B" },
  { t: ",", punct: true },
  { cat: "tempo",  t: "72 BPM halftime" },
  { t: ",", punct: true },
  { cat: "instr",  t: "Rhodes electric piano with vibrato on" },
  { t: ",", punct: true },
  { cat: "vocal",  t: "breathy female vocal in English with layered harmonies on choruses" },
  { t: ",", punct: true },
  { cat: "instr",  t: "sparse 808 sub-bass" },
  { t: ",", punct: true },
  { cat: "mix",    t: "wide reverb tail, minimal arrangement" },
  { t: ",", punct: true },
  { cat: "mood",   t: "melancholy minor-key" },
];

function PromptAnatomyInspector({ isMobile }) {
  const [hovered, setHovered] = useState(null);
  const [legendPinned, setLegendPinned] = useState(null); // click-to-pin

  const activeCategory = legendPinned || hovered;

  return (
    <div style={{
      margin: `${T.s6}px 0`,
      padding: isMobile ? T.s4 : T.s5,
      background: `linear-gradient(135deg, ${T.surface} 0%, ${T.bg} 100%)`,
      border: `1px solid ${T.borderHi}`,
      borderRadius: T.r_lg,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle grid background for futuristic paper feel */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        opacity: 0.4,
        backgroundImage: `
          linear-gradient(${T.border} 1px, transparent 1px),
          linear-gradient(90deg, ${T.border} 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 90%)",
      }} />

      <div style={{ position: "relative" }}>
        {/* Header with run-metadata */}
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          gap: T.s3, marginBottom: T.s4, flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              color: V.neonGold, letterSpacing: "0.28em",
              marginBottom: 4,
            }}>
              ▸ INTERACTIVE
            </div>
            <div style={{
              fontSize: isMobile ? T.fs_md : T.fs_lg,
              fontFamily: T.font_display, fontStyle: "italic",
              color: T.text, lineHeight: 1.3,
            }}>
              The Prompt Anatomy Inspector
            </div>
          </div>
          <div style={{
            fontSize: 9, fontFamily: T.font_mono,
            color: T.textMuted, letterSpacing: "0.15em",
            textAlign: isMobile ? "left" : "right",
          }}>
            {isMobile ? "TAP" : "HOVER"} A WORD<br/>
            TO SEE ITS FUNCTION
          </div>
        </div>

        {/* The prompt itself — each token tinted by category */}
        <div style={{
          padding: isMobile ? T.s4 : T.s5,
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: T.r_md,
          fontFamily: T.font_mono,
          fontSize: isMobile ? 13 : 15,
          lineHeight: 2,
          letterSpacing: "0.01em",
          marginBottom: T.s4,
        }}>
          {ANATOMY_EXAMPLE.map((tok, i) => {
            if (tok.punct) {
              return <span key={i} style={{ color: T.textMuted }}>{tok.t} </span>;
            }
            const cat = ANATOMY_CATEGORIES[tok.cat];
            const isActive = activeCategory === tok.cat;
            const isDimmed = activeCategory && activeCategory !== tok.cat;
            return (
              <span key={i}
                onMouseEnter={() => setHovered(tok.cat)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setLegendPinned(legendPinned === tok.cat ? null : tok.cat)}
                style={{
                  color: isActive ? cat.color : (isDimmed ? T.textMuted : T.text),
                  textShadow: isActive ? `0 0 10px ${cat.color}88` : "none",
                  cursor: "pointer",
                  transition: "all 180ms ease-out",
                  borderBottom: isActive ? `2px solid ${cat.color}` : `2px solid transparent`,
                  paddingBottom: 1,
                  opacity: isDimmed ? 0.35 : 1,
                }}>
                {tok.t}
              </span>
            );
          })}
        </div>

        {/* Legend — all 6 categories as chips, showing description when hovered/active */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          gap: T.s2,
          marginBottom: activeCategory ? T.s3 : 0,
        }}>
          {Object.entries(ANATOMY_CATEGORIES).map(([key, cat]) => {
            const isActive = activeCategory === key;
            return (
              <button key={key}
                type="button"
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setLegendPinned(legendPinned === key ? null : key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px",
                  background: isActive ? `${cat.color}14` : "transparent",
                  border: `1px solid ${isActive ? cat.color : T.border}`,
                  borderRadius: T.r_sm,
                  fontSize: 10, fontFamily: T.font_mono,
                  color: isActive ? cat.color : T.textSec,
                  letterSpacing: "0.12em", fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 160ms ease-out",
                  textAlign: "left",
                }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: cat.color,
                  boxShadow: isActive ? `0 0 8px ${cat.color}` : "none",
                  flexShrink: 0,
                }} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Active category description — appears on hover/pin */}
        {activeCategory && (
          <div style={{
            padding: `${T.s3}px ${T.s4}px`,
            background: `${ANATOMY_CATEGORIES[activeCategory].color}08`,
            border: `1px solid ${ANATOMY_CATEGORIES[activeCategory].color}33`,
            borderRadius: T.r_sm,
            fontSize: T.fs_sm,
            fontFamily: T.font_sans,
            color: T.textSec,
            lineHeight: 1.6,
            animation: "fadeIn 180ms ease-out",
          }}>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <strong style={{ color: ANATOMY_CATEGORIES[activeCategory].color, fontFamily: T.font_mono, letterSpacing: "0.12em", fontSize: 10 }}>
              {ANATOMY_CATEGORIES[activeCategory].label}
            </strong>{" "}
            — {ANATOMY_CATEGORIES[activeCategory].desc}
          </div>
        )}
      </div>
    </div>
  );
}

// ── INTERACTIVE WIDGET: Genre Fusion Gravity ──────────────────────────
// Force-graph style visualization showing genre clusters. Genres closer
// to each other have shared DNA; distant pairs are risky fusions.
// Click a genre to see which genres "attract" it.
const FUSION_GENRES = [
  // Afro-Caribbean cluster (center-left)
  { id: "afrobeats",  label: "Afrobeats",  x: 25, y: 35, cluster: "afro" },
  { id: "amapiano",   label: "Amapiano",   x: 18, y: 50, cluster: "afro" },
  { id: "reggaeton",  label: "Reggaeton",  x: 32, y: 58, cluster: "afro" },
  { id: "dancehall",  label: "Dancehall",  x: 12, y: 40, cluster: "afro" },
  // Hip-hop cluster (top-right)
  { id: "trap",       label: "Trap",       x: 70, y: 20, cluster: "hiphop" },
  { id: "drill",      label: "Drill",      x: 80, y: 28, cluster: "hiphop" },
  { id: "boom-bap",   label: "Boom Bap",   x: 75, y: 38, cluster: "hiphop" },
  { id: "phonk",      label: "Phonk",      x: 88, y: 20, cluster: "hiphop" },
  { id: "melodic",    label: "Melodic Rap", x: 62, y: 30, cluster: "hiphop" },
  // Dance-floor cluster (bottom-right)
  { id: "house",      label: "House",      x: 65, y: 75, cluster: "dance" },
  { id: "techno",     label: "Techno",     x: 78, y: 82, cluster: "dance" },
  { id: "dnb",        label: "DnB",        x: 82, y: 68, cluster: "dance" },
  { id: "trance",     label: "Trance",     x: 90, y: 75, cluster: "dance" },
  // Rock/indie cluster (top-left)
  { id: "rock",       label: "Rock",       x: 40, y: 15, cluster: "rock" },
  { id: "indie",      label: "Indie",      x: 55, y: 10, cluster: "rock" },
  // Neo-soul bridge (center)
  { id: "rnb",        label: "R&B",        x: 50, y: 50, cluster: "bridge" },
  { id: "neosoul",    label: "Neo-Soul",   x: 45, y: 62, cluster: "bridge" },
];

// Attraction pairs — which genre pairs have strong musical gravity
const FUSION_BONDS = [
  // Within-cluster strong bonds
  ["afrobeats", "amapiano"], ["afrobeats", "reggaeton"], ["amapiano", "dancehall"],
  ["trap", "drill"], ["trap", "melodic"], ["drill", "boom-bap"], ["phonk", "trap"],
  ["house", "techno"], ["house", "dnb"], ["techno", "trance"], ["dnb", "trance"],
  ["rock", "indie"],
  // Cross-cluster bridges (shown as dashed lines)
  ["rnb", "neosoul"], ["rnb", "melodic"], ["neosoul", "trap"],
  ["reggaeton", "trap"], ["afrobeats", "melodic"], ["amapiano", "house"],
  ["dancehall", "reggaeton"],
];

function GenreFusionDiagram({ isMobile }) {
  const [selected, setSelected] = useState(null);

  // Get bonds related to selected genre
  const relatedBonds = selected
    ? FUSION_BONDS.filter(([a, b]) => a === selected || b === selected)
    : [];
  const relatedIds = selected
    ? new Set(relatedBonds.flat())
    : null;

  const clusterColors = {
    afro:   "#FF6B00",
    hiphop: "#7C8BFF",
    dance:  "#00E5FF",
    rock:   "#FF2D9C",
    bridge: "#FFD700",
  };

  return (
    <div style={{
      margin: `${T.s6}px 0`,
      padding: isMobile ? T.s3 : T.s4,
      background: `linear-gradient(135deg, ${T.surface} 0%, ${T.bg} 100%)`,
      border: `1px solid ${T.borderHi}`,
      borderRadius: T.r_lg,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: T.s3, marginBottom: T.s3, flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
            color: V.neonGold, letterSpacing: "0.28em",
            marginBottom: 4,
          }}>
            ▸ INTERACTIVE
          </div>
          <div style={{
            fontSize: isMobile ? T.fs_md : T.fs_lg,
            fontFamily: T.font_display, fontStyle: "italic",
            color: T.text, lineHeight: 1.3,
          }}>
            Genre Fusion Gravity
          </div>
        </div>
        <div style={{
          fontSize: 9, fontFamily: T.font_mono,
          color: T.textMuted, letterSpacing: "0.15em",
          textAlign: isMobile ? "left" : "right",
        }}>
          {isMobile ? "TAP" : "CLICK"} A NODE<br/>
          TO SEE ITS BONDS
        </div>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%", height: "auto", aspectRatio: "1/1",
          maxHeight: isMobile ? 380 : 520,
          display: "block",
          background: T.bg,
          borderRadius: T.r_md,
          border: `1px solid ${T.border}`,
        }}>
        {/* Subtle grid */}
        <defs>
          <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke={T.border} strokeWidth="0.15" />
          </pattern>
          {/* Radial glow for selected node */}
          <radialGradient id="nodeGlow">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#gridPattern)" />

        {/* Bond lines — drawn first so they sit behind nodes */}
        {FUSION_BONDS.map(([a, b], i) => {
          const nodeA = FUSION_GENRES.find(g => g.id === a);
          const nodeB = FUSION_GENRES.find(g => g.id === b);
          if (!nodeA || !nodeB) return null;
          const isHighlighted = selected && (a === selected || b === selected);
          const isDimmed = selected && !isHighlighted;
          const isCrossCluster = nodeA.cluster !== nodeB.cluster;
          return (
            <line key={i}
              x1={nodeA.x} y1={nodeA.y}
              x2={nodeB.x} y2={nodeB.y}
              stroke={isHighlighted ? V.neonGold : T.border}
              strokeWidth={isHighlighted ? 0.4 : 0.2}
              strokeDasharray={isCrossCluster ? "1 1.5" : "0"}
              opacity={isDimmed ? 0.15 : (isHighlighted ? 1 : 0.5)}
              style={{ transition: "all 220ms ease-out" }} />
          );
        })}

        {/* Nodes */}
        {FUSION_GENRES.map(g => {
          const isSelected = selected === g.id;
          const isRelated = relatedIds && relatedIds.has(g.id);
          const isDimmed = selected && !isSelected && !isRelated;
          const color = clusterColors[g.cluster];
          return (
            <g key={g.id}
              onClick={() => setSelected(selected === g.id ? null : g.id)}
              style={{ cursor: "pointer" }}>
              {isSelected && (
                <circle cx={g.x} cy={g.y} r="8" fill="url(#nodeGlow)" />
              )}
              <circle cx={g.x} cy={g.y}
                r={isSelected ? 2.2 : 1.6}
                fill={color}
                opacity={isDimmed ? 0.25 : 1}
                style={{
                  transition: "all 220ms ease-out",
                  filter: isSelected ? `drop-shadow(0 0 3px ${color})` : "none",
                }} />
              <text
                x={g.x} y={g.y - 3}
                textAnchor="middle"
                fontSize="2.6"
                fontFamily="monospace"
                fontWeight={isSelected ? 700 : 500}
                fill={isSelected ? V.neonGold : (isDimmed ? T.textMuted : T.textSec)}
                opacity={isDimmed ? 0.4 : 1}
                style={{ transition: "all 220ms ease-out", pointerEvents: "none", letterSpacing: "0.05em" }}>
                {g.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend + selected genre info */}
      <div style={{
        marginTop: T.s3, display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: T.s3,
      }}>
        <div>
          <div style={{
            fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
            color: T.textMuted, letterSpacing: "0.18em",
            marginBottom: T.s2,
          }}>
            CLUSTERS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { k: "afro", label: "Afro-Caribbean" },
              { k: "hiphop", label: "Hip-Hop" },
              { k: "dance", label: "Dance-Floor" },
              { k: "rock", label: "Rock" },
              { k: "bridge", label: "Bridge" },
            ].map(c => (
              <span key={c.k} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, fontFamily: T.font_mono, color: T.textSec,
                padding: "2px 6px",
                border: `1px solid ${T.border}`, borderRadius: 3,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: clusterColors[c.k] }} />
                {c.label}
              </span>
            ))}
          </div>
          <div style={{
            fontSize: 10, fontFamily: T.font_mono, color: T.textMuted,
            marginTop: T.s2, letterSpacing: "0.05em", lineHeight: 1.5,
          }}>
            Solid = within-cluster (safe)<br/>
            Dashed = cross-cluster (bridge)
          </div>
        </div>
        <div style={{
          padding: T.s3,
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: T.r_sm,
          minHeight: 80,
        }}>
          {selected ? (
            <>
              <div style={{
                fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
                color: V.neonGold, letterSpacing: "0.18em", marginBottom: 4,
              }}>
                ◉ SELECTED
              </div>
              <div style={{
                fontSize: T.fs_lg, fontFamily: T.font_display, fontStyle: "italic",
                color: T.text, lineHeight: 1.2, marginBottom: 4,
              }}>
                {FUSION_GENRES.find(g => g.id === selected)?.label}
              </div>
              <div style={{
                fontSize: 10, fontFamily: T.font_mono, color: T.textSec,
                lineHeight: 1.5,
              }}>
                {relatedBonds.length} musical bond{relatedBonds.length === 1 ? "" : "s"}
                {" · "}
                {relatedBonds.filter(([a, b]) => {
                  const nA = FUSION_GENRES.find(g => g.id === a);
                  const nB = FUSION_GENRES.find(g => g.id === b);
                  return nA && nB && nA.cluster === nB.cluster;
                }).length} safe, {relatedBonds.filter(([a, b]) => {
                  const nA = FUSION_GENRES.find(g => g.id === a);
                  const nB = FUSION_GENRES.find(g => g.id === b);
                  return nA && nB && nA.cluster !== nB.cluster;
                }).length} bridge
              </div>
            </>
          ) : (
            <div style={{
              fontSize: T.fs_sm, fontFamily: T.font_sans,
              color: T.textMuted, fontStyle: "italic", lineHeight: 1.5,
            }}>
              Select a genre to see its strongest fusion partners.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ANIMATED GRID BACKGROUND — chapter hero backdrop ───────────────────
// Subtle perspective grid fading into the distance. CSS-only, no canvas.
function GridBackdrop() {
  return (
    <div aria-hidden="true" style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      overflow: "hidden", opacity: 0.5,
    }}>
      <style>{`
        @keyframes gridDrift {
          from { transform: translateY(0); }
          to   { transform: translateY(24px); }
        }
      `}</style>
      <div style={{
        position: "absolute", inset: "-24px 0 0 0",
        backgroundImage: `
          linear-gradient(${T.border} 1px, transparent 1px),
          linear-gradient(90deg, ${T.border} 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
        animation: "gridDrift 14s linear infinite",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 85%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 85%)",
      }} />
      {/* Accent glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${T.accent}14 0%, transparent 60%)`,
      }} />
    </div>
  );
}

// ── INTERACTIVE WIDGET: Production Stack Visualizer (Ch III) ───────────
// Shows the frequency spectrum as a stack. Each mix element occupies a
// frequency range. Click any element to see how it fits and what fights
// for space with it. Teaches the reader to hear a mix as layers.
const PRODUCTION_STACK = [
  {
    id: "sub-bass",
    label: "Sub-bass (808)",
    hzLow: 20, hzHigh: 60,
    color: "#7C8BFF",
    role: "Foundation. Felt more than heard. Eats headroom if not sidechained.",
    fights: ["kick-fundamental"],
  },
  {
    id: "kick-fundamental",
    label: "Kick fundamental",
    hzLow: 40, hzHigh: 100,
    color: "#FF6B00",
    role: "Drives the rhythm. Often sidechained under the sub to prevent masking.",
    fights: ["sub-bass"],
  },
  {
    id: "bass",
    label: "Bass guitar / synth bass",
    hzLow: 60, hzHigh: 250,
    color: "#00E5FF",
    role: "Harmonic low end. Carries melodic information the sub can't.",
    fights: ["kick-fundamental", "low-mids"],
  },
  {
    id: "low-mids",
    label: "Kick body / low vocals",
    hzLow: 150, hzHigh: 400,
    color: "#FFD700",
    role: "The 'boom' of the kick and chest resonance of vocals. Crowded real estate.",
    fights: ["bass", "vocals"],
  },
  {
    id: "vocals",
    label: "Lead vocal body",
    hzLow: 200, hzHigh: 3000,
    color: "#FF2D9C",
    role: "The focal point. Where intelligibility lives. Must sit above the mix.",
    fights: ["low-mids", "guitars", "pads"],
  },
  {
    id: "guitars",
    label: "Guitars / keys",
    hzLow: 80, hzHigh: 5000,
    color: "#00FF88",
    role: "Wide-spectrum harmonic fillers. Often carved out to make room for vocals.",
    fights: ["vocals", "pads"],
  },
  {
    id: "pads",
    label: "Synth pads / strings",
    hzLow: 100, hzHigh: 8000,
    color: "#E94FEF",
    role: "Atmospheric glue. Can overwhelm the mix if left full-range.",
    fights: ["vocals", "guitars", "cymbals"],
  },
  {
    id: "cymbals",
    label: "Cymbals / hi-hats",
    hzLow: 3000, hzHigh: 16000,
    color: "#EDEEF0",
    role: "Transient energy. Makes the mix feel 'open' or 'closed'.",
    fights: ["pads"],
  },
  {
    id: "air",
    label: "Air / sparkle",
    hzLow: 10000, hzHigh: 20000,
    color: "#A1A4AB",
    role: "The sheen on a polished mix. Reverb tails live up here.",
    fights: [],
  },
];

function ProductionStackVisualizer({ isMobile }) {
  const [selected, setSelected] = useState(null);
  const selectedItem = selected ? PRODUCTION_STACK.find(s => s.id === selected) : null;
  const fightingIds = selectedItem ? new Set(selectedItem.fights) : new Set();

  // Log scale for the frequency axis — 20Hz→20kHz is 3 decades
  // Map freq to % position using log scale so low frequencies get proportional space
  const logPos = (hz) => {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    return ((Math.log10(hz) - minLog) / (maxLog - minLog)) * 100;
  };

  // Frequency axis ticks
  const freqTicks = [20, 100, 500, 1000, 5000, 10000, 20000];

  return (
    <div style={{
      margin: `${T.s6}px 0`,
      padding: isMobile ? T.s3 : T.s4,
      background: `linear-gradient(135deg, ${T.surface} 0%, ${T.bg} 100%)`,
      border: `1px solid ${T.borderHi}`,
      borderRadius: T.r_lg,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: T.s3, marginBottom: T.s4, flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
            color: V.neonGold, letterSpacing: "0.28em", marginBottom: 4,
          }}>▸ INTERACTIVE</div>
          <div style={{
            fontSize: isMobile ? T.fs_md : T.fs_lg,
            fontFamily: T.font_display, fontStyle: "italic",
            color: T.text, lineHeight: 1.3,
          }}>The Production Stack</div>
        </div>
        <div style={{
          fontSize: 9, fontFamily: T.font_mono,
          color: T.textMuted, letterSpacing: "0.15em",
          textAlign: isMobile ? "left" : "right",
        }}>
          {isMobile ? "TAP" : "CLICK"} AN ELEMENT<br/>TO SEE ITS RANGE
        </div>
      </div>

      {/* Frequency axis */}
      <div style={{ position: "relative", marginBottom: 6, height: 18 }}>
        {freqTicks.map(hz => (
          <div key={hz} style={{
            position: "absolute",
            left: `${logPos(hz)}%`,
            transform: "translateX(-50%)",
            fontSize: 9, fontFamily: T.font_mono,
            color: T.textMuted, letterSpacing: "0.05em",
          }}>
            {hz >= 1000 ? `${hz / 1000}k` : hz}
          </div>
        ))}
      </div>

      {/* Stacked bars */}
      <div style={{
        position: "relative",
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: T.r_md,
        padding: 4,
      }}>
        {PRODUCTION_STACK.map((item, idx) => {
          const isSelected = selected === item.id;
          const isFighting = fightingIds.has(item.id);
          const isDimmed = selected && !isSelected && !isFighting;
          const leftPct = logPos(item.hzLow);
          const widthPct = logPos(item.hzHigh) - logPos(item.hzLow);
          return (
            <div key={item.id}
              onClick={() => setSelected(selected === item.id ? null : item.id)}
              style={{
                position: "relative",
                height: isMobile ? 22 : 26,
                marginBottom: 3,
                cursor: "pointer",
              }}>
              {/* Background track */}
              <div style={{
                position: "absolute", inset: 0,
                background: T.surface,
                borderRadius: 3,
              }} />
              {/* Actual frequency bar */}
              <div style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                top: 0, bottom: 0,
                background: isSelected
                  ? `linear-gradient(90deg, ${item.color}cc 0%, ${item.color}66 100%)`
                  : isFighting
                    ? `linear-gradient(90deg, ${item.color}88 0%, ${item.color}33 100%)`
                    : isDimmed
                      ? `${item.color}22`
                      : `${item.color}55`,
                border: `1px solid ${isSelected ? item.color : `${item.color}66`}`,
                borderRadius: 3,
                boxShadow: isSelected ? `0 0 12px ${item.color}88` : "none",
                opacity: isDimmed ? 0.4 : 1,
                transition: "all 180ms ease-out",
              }} />
              {/* Label overlay */}
              <div style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: isMobile ? 10 : 11,
                fontFamily: T.font_mono,
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? T.text : T.textSec,
                letterSpacing: "0.05em",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                textShadow: `0 0 4px ${T.bg}`,
              }}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info panel */}
      <div style={{
        marginTop: T.s3,
        padding: T.s3,
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: T.r_sm,
        minHeight: 72,
      }}>
        {selectedItem ? (
          <>
            <div style={{
              fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
              color: selectedItem.color, letterSpacing: "0.18em", marginBottom: 4,
            }}>
              ◉ {selectedItem.hzLow}Hz – {selectedItem.hzHigh >= 1000 ? `${selectedItem.hzHigh / 1000}kHz` : `${selectedItem.hzHigh}Hz`}
            </div>
            <div style={{
              fontSize: T.fs_md, fontFamily: T.font_display, fontStyle: "italic",
              color: T.text, lineHeight: 1.3, marginBottom: T.s2,
            }}>
              {selectedItem.label}
            </div>
            <div style={{
              fontSize: T.fs_sm, fontFamily: T.font_sans,
              color: T.textSec, lineHeight: 1.5, marginBottom: selectedItem.fights.length > 0 ? T.s2 : 0,
            }}>
              {selectedItem.role}
            </div>
            {selectedItem.fights.length > 0 && (
              <div style={{
                fontSize: 10, fontFamily: T.font_mono,
                color: T.textMuted, letterSpacing: "0.1em",
                paddingTop: T.s2,
                borderTop: `1px dashed ${T.border}`,
              }}>
                CONTESTS: {selectedItem.fights.map(id => PRODUCTION_STACK.find(x => x.id === id)?.label).filter(Boolean).join(", ")}
              </div>
            )}
          </>
        ) : (
          <div style={{
            fontSize: T.fs_sm, fontFamily: T.font_sans,
            color: T.textMuted, fontStyle: "italic", lineHeight: 1.5,
          }}>
            Select an element to see its frequency range and what it competes with in the mix.
          </div>
        )}
      </div>
    </div>
  );
}

// ── INTERACTIVE WIDGET: Song Structure Deconstructor (Ch IV) ───────────
// Timeline showing how a radio hit maps across 3:30. Hover sections to see
// what each does. Teaches song architecture visually.
const HIT_TIMELINE_SECTIONS = [
  { id: "intro", label: "Intro", start: 0, end: 15, color: "#A1A4AB",
    role: "The first 15 seconds. Decides whether a listener stays. Usually instrumental or a vocal hook teaser." },
  { id: "v1", label: "Verse 1", start: 15, end: 45, color: "#7C8BFF",
    role: "Narrative setup. Lower energy than chorus. Establishes voice, subject, emotional tone." },
  { id: "pre1", label: "Pre", start: 45, end: 60, color: "#FFD700",
    role: "The lift. Chord changes tilt toward the chorus. Drum fill or filter sweep signals arrival." },
  { id: "c1", label: "Chorus 1", start: 60, end: 90, color: "#FF2D9C",
    role: "The hook. The song's identity. Drops here at 1:00 — roughly one-third through." },
  { id: "v2", label: "Verse 2", start: 90, end: 120, color: "#7C8BFF",
    role: "Continues the narrative. Often adds production layers to feel bigger than V1." },
  { id: "pre2", label: "Pre", start: 120, end: 135, color: "#FFD700",
    role: "Second lift. Usually identical to Pre 1 to reinforce pattern recognition." },
  { id: "c2", label: "Chorus 2", start: 135, end: 165, color: "#FF2D9C",
    role: "Same hook, now familiar. Listeners sing along. Added production polish." },
  { id: "bridge", label: "Bridge", start: 165, end: 190, color: "#00E5FF",
    role: "The reset. New harmonic material or a stripped moment. Prepares for the final chorus to hit hardest." },
  { id: "c3", label: "Final Chorus", start: 190, end: 220, color: "#E94FEF",
    role: "Everything amplified. Often modulates up a semitone or adds a countermelody. The climax." },
  { id: "outro", label: "Outro", start: 220, end: 210, color: "#A1A4AB",
    role: "The exit. Short — modern hits fade fast so streaming skip-rates stay low." },
];

function SongStructureDeconstructor({ isMobile }) {
  const [selected, setSelected] = useState(null);
  const totalDuration = 210; // 3:30 in seconds

  const selectedSection = selected ? HIT_TIMELINE_SECTIONS.find(s => s.id === selected) : null;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div style={{
      margin: `${T.s6}px 0`,
      padding: isMobile ? T.s3 : T.s4,
      background: `linear-gradient(135deg, ${T.surface} 0%, ${T.bg} 100%)`,
      border: `1px solid ${T.borderHi}`,
      borderRadius: T.r_lg,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: T.s3, marginBottom: T.s4, flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
            color: V.neonGold, letterSpacing: "0.28em", marginBottom: 4,
          }}>▸ INTERACTIVE</div>
          <div style={{
            fontSize: isMobile ? T.fs_md : T.fs_lg,
            fontFamily: T.font_display, fontStyle: "italic",
            color: T.text, lineHeight: 1.3,
          }}>Anatomy of a 3:30 Radio Hit</div>
        </div>
        <div style={{
          fontSize: 9, fontFamily: T.font_mono,
          color: T.textMuted, letterSpacing: "0.15em",
          textAlign: isMobile ? "left" : "right",
        }}>
          {isMobile ? "TAP" : "CLICK"} A SECTION<br/>TO SEE ITS ROLE
        </div>
      </div>

      {/* Timeline bar */}
      <div style={{
        position: "relative",
        height: isMobile ? 48 : 56,
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: T.r_sm,
        overflow: "hidden",
        marginBottom: T.s3,
      }}>
        {HIT_TIMELINE_SECTIONS.filter(s => s.start < s.end).map(section => {
          const leftPct = (section.start / totalDuration) * 100;
          const widthPct = ((section.end - section.start) / totalDuration) * 100;
          const isSelected = selected === section.id;
          const isDimmed = selected && !isSelected;
          return (
            <div key={section.id}
              onClick={() => setSelected(selected === section.id ? null : section.id)}
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `calc(${widthPct}% - 1px)`,
                top: 0, bottom: 0,
                background: isSelected
                  ? `linear-gradient(180deg, ${section.color}dd 0%, ${section.color}66 100%)`
                  : isDimmed
                    ? `${section.color}22`
                    : `linear-gradient(180deg, ${section.color}88 0%, ${section.color}33 100%)`,
                borderRight: `1px solid ${T.bg}`,
                cursor: "pointer",
                transition: "all 180ms ease-out",
                opacity: isDimmed ? 0.4 : 1,
                boxShadow: isSelected ? `inset 0 0 20px ${section.color}66` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
              <div style={{
                fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
                color: isSelected ? T.text : T.textSec,
                letterSpacing: "0.08em", pointerEvents: "none",
                textShadow: `0 0 4px ${T.bg}`,
                whiteSpace: "nowrap",
              }}>
                {section.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time axis */}
      <div style={{
        position: "relative",
        height: 14,
        marginBottom: T.s3,
      }}>
        {[0, 30, 60, 90, 120, 150, 180, 210].map(t => (
          <div key={t} style={{
            position: "absolute",
            left: `${(t / totalDuration) * 100}%`,
            transform: "translateX(-50%)",
            fontSize: 9, fontFamily: T.font_mono,
            color: T.textMuted, letterSpacing: "0.05em",
          }}>
            {formatTime(t)}
          </div>
        ))}
      </div>

      {/* Info panel */}
      <div style={{
        padding: T.s3,
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: T.r_sm,
        minHeight: 80,
      }}>
        {selectedSection ? (
          <>
            <div style={{
              fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
              color: selectedSection.color, letterSpacing: "0.18em", marginBottom: 4,
            }}>
              ◉ {formatTime(selectedSection.start)} – {formatTime(selectedSection.end)}
              &nbsp;·&nbsp;{selectedSection.end - selectedSection.start}s
            </div>
            <div style={{
              fontSize: T.fs_lg, fontFamily: T.font_display, fontStyle: "italic",
              color: T.text, lineHeight: 1.2, marginBottom: T.s2,
            }}>
              {selectedSection.label}
            </div>
            <div style={{
              fontSize: T.fs_sm, fontFamily: T.font_sans,
              color: T.textSec, lineHeight: 1.55,
            }}>
              {selectedSection.role}
            </div>
          </>
        ) : (
          <div style={{
            fontSize: T.fs_sm, fontFamily: T.font_sans,
            color: T.textMuted, fontStyle: "italic", lineHeight: 1.5,
          }}>
            A radio hit is a time-constrained architecture. Click any section to see what it's designed to do.
          </div>
        )}
      </div>
    </div>
  );
}

// ── INTERACTIVE WIDGET: Anti-Pattern Detector (Ch V) ───────────────────
// A gallery of bad prompts, each tagged with which anti-pattern it exhibits.
// Hover/tap to see the diagnosis and a cleaned-up version.
const ANTI_PATTERNS = [
  {
    id: "over-adjective",
    label: "The Adjective Soup",
    prompt: "Dreamy, ethereal, nostalgic, wistful, melancholy, bittersweet, haunting, atmospheric song",
    diagnosis: "Eight mood adjectives, zero functional decisions. The model has no genre, tempo, instruments, or vocal info — just vibes.",
    fix: "Alt R&B, 80 BPM halftime, Rhodes electric piano, breathy female vocal in English, sparse arrangement, minor-key melancholy.",
    severity: 3,
  },
  {
    id: "contradiction",
    label: "Contradictory Signals",
    prompt: "Aggressive death metal lullaby, soft and screaming, 60 BPM with blast beats",
    diagnosis: "Every specification contradicts another. The model can't reconcile 'lullaby' with 'death metal' or '60 BPM' with 'blast beats'.",
    fix: "Pick one lane. If you want contrast, name an artist who bridged them — e.g. 'in the style of Deftones' (soft-loud done right).",
    severity: 3,
  },
  {
    id: "genre-language-mismatch",
    label: "Genre-Language Mismatch",
    prompt: "K-pop, English vocals, Tennessee country twang, banjo",
    diagnosis: "K-pop and Tennessee country are not adjacent. English + twang + banjo is a country contract that K-pop's production template can't honor.",
    fix: "If you want country: say country. If you want K-pop: use Korean or multilingual vocals and drop the banjo.",
    severity: 2,
  },
  {
    id: "kitchen-sink",
    label: "Everything But the Kitchen Sink",
    prompt: "Trap + Amapiano + Reggaeton + Afrobeats + Drill + Phonk + Dubstep, 808s, log drums, dembow, hi-hat triplets, wobble bass, all together",
    diagnosis: "Seven genres and five bass elements in one prompt. Each genre wants to dominate; the model produces an averaged mush that matches none of them.",
    fix: "Pick 2 genres max, preferably adjacent. Lock one with anchor-and-roll to discover the third via iteration.",
    severity: 3,
  },
  {
    id: "vague-vocal",
    label: "Vague Vocal",
    prompt: "Alt R&B, 80 BPM, Rhodes piano, vocals",
    diagnosis: "The vocal spec is just 'vocals' — the most important single decision is empty. Language, gender, quality, and delivery style are all left to defaults.",
    fix: "Add: 'breathy female vocal in English, layered harmonies on choruses'. Language alone does more lifting than the rest of the prompt combined.",
    severity: 2,
  },
  {
    id: "no-tempo",
    label: "Tempo Vacuum",
    prompt: "Dark moody trap with 808s and synth pads",
    diagnosis: "No BPM, no feel indicator (halftime vs. straight), no tempo reference. The model will pick an average trap tempo — often wrong for your intent.",
    fix: "Add '72 BPM halftime' or '140 BPM'. Even one number transforms the result.",
    severity: 2,
  },
];

function AntiPatternDetector({ isMobile }) {
  const [selected, setSelected] = useState(null);
  const selectedPattern = selected ? ANTI_PATTERNS.find(p => p.id === selected) : null;

  return (
    <div style={{
      margin: `${T.s6}px 0`,
      padding: isMobile ? T.s3 : T.s4,
      background: `linear-gradient(135deg, ${T.surface} 0%, ${T.bg} 100%)`,
      border: `1px solid ${T.borderHi}`,
      borderRadius: T.r_lg,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: T.s3, marginBottom: T.s4, flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
            color: V.neonGold, letterSpacing: "0.28em", marginBottom: 4,
          }}>▸ INTERACTIVE</div>
          <div style={{
            fontSize: isMobile ? T.fs_md : T.fs_lg,
            fontFamily: T.font_display, fontStyle: "italic",
            color: T.text, lineHeight: 1.3,
          }}>The Anti-Pattern Gallery</div>
        </div>
        <div style={{
          fontSize: 9, fontFamily: T.font_mono,
          color: T.textMuted, letterSpacing: "0.15em",
          textAlign: isMobile ? "left" : "right",
        }}>
          {isMobile ? "TAP" : "CLICK"} A TRAP<br/>TO SEE THE FIX
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
        gap: T.s2,
        marginBottom: selectedPattern ? T.s4 : 0,
      }}>
        {ANTI_PATTERNS.map(pattern => {
          const isSelected = selected === pattern.id;
          return (
            <button key={pattern.id} type="button"
              onClick={() => setSelected(selected === pattern.id ? null : pattern.id)}
              style={{
                textAlign: "left",
                padding: T.s3,
                background: isSelected
                  ? `linear-gradient(135deg, ${T.danger}14 0%, transparent 100%)`
                  : T.bg,
                border: `1px solid ${isSelected ? T.danger : T.border}`,
                borderRadius: T.r_sm,
                cursor: "pointer",
                transition: "all 180ms ease-out",
              }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: T.s2,
              }}>
                <span style={{
                  fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
                  color: T.danger, letterSpacing: "0.18em",
                }}>
                  ✗ {"●".repeat(pattern.severity)}{"○".repeat(3 - pattern.severity)}
                </span>
                <span style={{
                  fontSize: T.fs_sm, fontFamily: T.font_sans, fontWeight: 600,
                  color: T.text, flex: 1, letterSpacing: "-0.005em",
                }}>
                  {pattern.label}
                </span>
              </div>
              <div style={{
                fontSize: T.fs_xs, fontFamily: T.font_mono,
                color: T.textMuted, lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {pattern.prompt}
              </div>
            </button>
          );
        })}
      </div>

      {/* Diagnosis + fix panel */}
      {selectedPattern && (
        <div style={{
          padding: T.s4,
          background: T.bg,
          border: `1px solid ${T.danger}44`,
          borderRadius: T.r_md,
          animation: "fadeIn 180ms ease-out",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: T.s3,
          }}>
            <div>
              <div style={{
                fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
                color: T.danger, letterSpacing: "0.18em", marginBottom: T.s2,
              }}>
                ✗ THE TRAP
              </div>
              <div style={{
                padding: T.s3,
                background: `${T.danger}08`,
                border: `1px dashed ${T.danger}44`,
                borderRadius: T.r_sm,
                fontSize: T.fs_sm, fontFamily: T.font_mono,
                color: T.textSec, lineHeight: 1.6,
                marginBottom: T.s3,
              }}>
                {selectedPattern.prompt}
              </div>

              <div style={{
                fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
                color: T.textMuted, letterSpacing: "0.18em", marginBottom: T.s2,
              }}>
                / DIAGNOSIS
              </div>
              <div style={{
                fontSize: T.fs_sm, fontFamily: T.font_sans,
                color: T.textSec, lineHeight: 1.6, marginBottom: T.s4,
                fontStyle: "italic",
              }}>
                {selectedPattern.diagnosis}
              </div>

              <div style={{
                fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
                color: T.success, letterSpacing: "0.18em", marginBottom: T.s2,
              }}>
                ✓ THE FIX
              </div>
              <div style={{
                padding: T.s3,
                background: `${T.success}08`,
                border: `1px solid ${T.success}44`,
                borderRadius: T.r_sm,
                fontSize: T.fs_sm, fontFamily: T.font_mono,
                color: T.text, lineHeight: 1.6,
              }}>
                {selectedPattern.fix}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const PLAYBOOK_CHAPTERS = [
  {
    id: "prompt-craft",
    number: "I",
    title: "The Craft of the Prompt",
    subtitle: "How structure and specificity dictate what comes out of the black box.",
    status: "complete",
    readingMinutes: 8,
    runId: "PB.I.2026",
    blocks: [
      {
        type: "manifesto",
        text: "The model is not your problem. Your prompt is.",
      },
      {
        type: "prose",
        text: "Most people treat AI music prompts like wishes at a fountain. They toss in adjectives — moody, upbeat, nostalgic — and hope for the best. The model obliges, in the most average way it knows how. The result is generic, and the user blames the model.",
      },
      {
        type: "prose",
        text: "What modern AI music generators actually respond to is a well-organized specification, not a poetic description. A song is a set of decisions: tempo, key, instruments, vocal style, structural shape, mix aesthetic. Whatever you leave unspecified, the model chooses for you — and its defaults are the median of its training data, which is to say, nothing memorable.",
      },
      {
        type: "annotated-quote",
        text: "Every adjective you don't provide becomes a vote for the average.",
        source: "Working principle · PB.I §0",
      },
      { type: "h2", text: "A prompt has anatomy. Learn to see it." },
      {
        type: "prose",
        text: "Before we talk about what makes prompts good or bad, you need to be able to look at a prompt and instantly see its structure. Below is a strong prompt with each token color-coded by function. Hover any word to see what category it belongs to. Read it a few times — the goal is to stop seeing prose and start seeing architecture.",
      },
      {
        type: "inspector",
      },
      {
        type: "prose",
        text: "Six categories cover nearly every decision worth making: genre, tempo, instrument, vocal, mix, and mood. A prompt with all six present is almost always stronger than a prompt missing any of them. A prompt with two or three is leaving four decisions to the model's defaults.",
      },
      { type: "h2", text: "Expanded mode is your default. Chaos is a tool." },
      {
        type: "prose",
        text: "Hit Engine offers three prompt modes: Simple, Expanded, and Chaos. Simple mode is a good tutorial — it hides complexity to help you start. Chaos mode is useful for creative disruption, but it adds filler that the model wastes attention on. Expanded is where professional work lives: 499 characters of structured, comma-separated specification. No adjectives that don't carry weight. No vibes without vectors.",
      },
      {
        type: "stat-row",
        items: [
          { value: "499", unit: "CHARS", label: "Expanded mode budget" },
          { value: "6", unit: "CATEGORIES", label: "Functional slots to fill" },
          { value: "12+", unit: "DECISIONS", label: "In a well-crafted prompt" },
        ],
      },
      { type: "h2", text: "The weak vs. strong pairing." },
      {
        type: "prose",
        text: "Here is the same musical intention expressed two ways. The weak version gives the model five vague moods. The strong version gives it twelve concrete decisions. Every word earns its place.",
      },
      {
        type: "example",
        weak: {
          label: "Weak",
          text: "A sad song with piano and vocals, emotional and slow, kind of moody",
        },
        strong: {
          label: "Strong",
          text: "Alt R&B, 72 BPM halftime, Rhodes electric piano with vibrato on, breathy female vocal in English with layered harmonies on choruses, sparse 808 sub-bass, wide reverb tail, minimal arrangement, melancholy minor-key",
        },
        why: "The strong prompt fills all six anatomy categories (genre, tempo, instrument, vocal, mix, mood). The weak prompt fills one and a half. You can measure strength by how many categories a prompt addresses.",
      },
      { type: "h2", text: "Specificity compounds." },
      {
        type: "prose",
        text: "The instinct to say 'Rhodes piano' is correct. The move to say 'Rhodes electric piano with vibrato on' is better. The model's training data is full of instrument recordings with specific articulations and performance techniques — tremolo, pizzicato, fingerpicked, palm-muted, overdriven. Using those terms lets you tap into specific timbral clusters instead of the averaged default.",
      },
      {
        type: "list",
        label: "Articulations that change the game",
        items: [
          "\"Rhodes electric piano — vibrato on\" vs. \"electric piano\"",
          "\"Nylon guitar — rasgueado flamenco\" vs. \"acoustic guitar\"",
          "\"Saxophone tenor — Coltrane sheets of sound\" vs. \"saxophone\"",
          "\"Acoustic kit — brushes on snare\" vs. \"drums\"",
          "\"808 sub-bass — sliding with portamento\" vs. \"bass\"",
        ],
      },
      { type: "h2", text: "Language is a free lever." },
      {
        type: "prose",
        text: "The model interprets a vocal specification very differently depending on the language you attach to it. 'Breathy female vocal, English' produces different phrasing than 'Breathy female vocal, Spanish' — even on an instrumental prompt where no actual lyrics are generated. The model has learned language-specific vocal textures, cadences, and consonant patterns. Specifying the language is a free way to shift the entire vocal performance.",
      },
      {
        type: "annotated-quote",
        text: "Lock language before you roll. It's the cheapest upgrade in your arsenal.",
        source: "Working principle · PB.I §4",
      },
      { type: "h2", text: "Chaos mode, correctly used." },
      {
        type: "prose",
        text: "Don't write off Chaos mode — just use it correctly. Chaos is a creative disruption tool, not a default. When you've been rolling Expanded prompts for twenty minutes and everything is starting to sound the same, one Chaos roll can break you out of the rut with an absurd combination you'd never have picked. Then switch back to Expanded and cherry-pick the one weird thing Chaos suggested that actually worked.",
      },
    ],
  },
  {
    id: "genre-strategy",
    number: "II",
    title: "Genre as Strategy",
    subtitle: "Combining, colliding, and choosing styles with intention.",
    status: "complete",
    readingMinutes: 7,
    runId: "PB.II.2026",
    blocks: [
      {
        type: "manifesto",
        text: "Genre is not a label. It's a set of contracts.",
      },
      {
        type: "prose",
        text: "Genre is the single most consequential decision in any prompt. It determines the tempo range the model will gravitate toward, the instrumentation it will default to, the vocal style it will try first, the mix aesthetic it will deliver. Get the genre right and everything else falls into place. Get it wrong and no amount of polish will save the track.",
      },
      {
        type: "prose",
        text: "The problem is that most people think of genre as a label — 'make me a pop song' — when it's actually a set of contracts. Every genre has conventions about what's allowed, what's required, and what's forbidden. Understanding those contracts is what separates someone making radio music from someone making karaoke tracks.",
      },
      { type: "h2", text: "Adjacent fusions beat distant ones." },
      {
        type: "prose",
        text: "A common mistake is to assume that more distance between genres creates more interesting results. It doesn't. Distant fusions (classical + trap, polka + dubstep) tend to sound like parody. Adjacent fusions — genres that share rhythmic DNA, tempo ranges, or cultural lineage — produce the results that actually work musically.",
      },
      {
        type: "prose",
        text: "This can be modeled visually. Below, each genre is a node. Nodes cluster by shared DNA (tempo, rhythm family, cultural lineage). Solid lines are within-cluster bonds — always safe to fuse. Dashed lines are cross-cluster bridges — riskier but often more interesting when they work. Click a genre to see which bonds it can lean on.",
      },
      {
        type: "diagram",
      },
      {
        type: "prose",
        text: "The four clusters are not arbitrary. Within each, genres share enough musical DNA that the model can fuse them without cognitive dissonance. Across clusters, you need a bridging element — a shared tempo, a shared language, a common production aesthetic.",
      },
      { type: "h2", text: "Anchor one, randomize the rest." },
      {
        type: "prose",
        text: "The most useful workflow Hit Engine offers is the anchor-and-roll technique. Pick your primary genre — the one you know you want. Right-click its chip to lock it. Then hit the roll button repeatedly. Every other slot cycles while your anchor stays fixed. You'll discover fusions you would never have consciously chosen. Most will be awful. One in twenty will be a discovery.",
      },
      {
        type: "annotated-quote",
        text: "Good fusions come from constraint, not chaos. Lock one thing. Roll everything else.",
        source: "Working principle · PB.II §1",
      },
      { type: "h2", text: "Know what's peaking vs. declining." },
      {
        type: "prose",
        text: "The Genre History page is not decoration. Current-day popularity matters because the model has more training data for genres that have been active recently. A prompt for amapiano today will produce tighter results than a prompt for kwaito, because kwaito's peak was twenty years ago and its training data is thinner. This doesn't mean you shouldn't use declining genres — just that you should compensate with extra specificity.",
      },
      {
        type: "stat-row",
        items: [
          { value: "2020s", unit: "PEAK", label: "Genres with freshest training" },
          { value: "~95%", unit: "CONFIDENCE", label: "Amapiano, drill, phonk today" },
          { value: "+30%", unit: "MORE SPEC", label: "Needed for declining genres" },
        ],
      },
      { type: "h2", text: "The three safe fusion families." },
      {
        type: "prose",
        text: "For reliable fusion results, draw from these three clusters. Inside each cluster, almost any combination will work. Across clusters, you need a justifying element — a shared tempo, a shared language, a production aesthetic that bridges both.",
      },
      {
        type: "list",
        label: "Reliable fusion clusters",
        items: [
          "Afro-Caribbean family: Afrobeats, Amapiano, Afro House, Reggaeton, Dancehall, Latin Trap — shared Afro-diasporic rhythm DNA and 95–115 BPM range.",
          "Hip-hop family: Trap, Drill, Boom Bap, Melodic Rap, Alt R&B, Trap Soul, Phonk — shared 808 sub-bass, half-time feel, rap/sung hybrid vocals.",
          "Dance-floor family: House, Deep House, Techno, Tech-House, Trance, Drum & Bass, UK Garage — shared four-on-the-floor (or derivative) kicks and 120–140 BPM.",
        ],
      },
      { type: "h2", text: "When to ignore all of this." },
      {
        type: "prose",
        text: "Rules describe probability distributions, not physics. Sometimes a distant fusion works because one specific artist already made it work. Country-rap exists because Lil Nas X proved it could. Hyperpop exists because SOPHIE proved glitched bubblegum-industrial was listenable. If you have a specific artist reference for a distant fusion, name them explicitly — 'in the style of 100 gecs' does heavy lifting that abstract genre labels can't.",
      },
      {
        type: "annotated-quote",
        text: "Reference specific artists, not abstract sounds. The model remembers names.",
        source: "Working principle · PB.II §5",
      },
    ],
  },
  {
    id: "production-depth",
    number: "III",
    title: "Production Depth",
    subtitle: "How to think about mix, space, and sonic architecture.",
    status: "complete",
    readingMinutes: 7,
    runId: "PB.III.2026",
    blocks: [
      {
        type: "manifesto",
        text: "A mix is not a pile of sounds. It is a stack of frequency-agreements.",
      },
      {
        type: "prose",
        text: "Most people prompt music generators the way a child names colors — 'make it bright' or 'make it warm'. The model does its best with those words, but what it's actually doing behind the scenes is negotiating frequencies. Every instrument occupies a range of the audible spectrum. When two instruments want the same range, one of them has to lose, or the mix gets muddy. Producers who understand this have a private vocabulary; everyone else fights the mix without knowing why it's fighting back.",
      },
      {
        type: "prose",
        text: "You don't need to become a mastering engineer. You just need to see the stack. When you can see the stack, your prompts start to specify it — and the model, handed a frequency-aware instruction, produces mixes that breathe.",
      },
      { type: "h2", text: "The stack, made visible." },
      {
        type: "prose",
        text: "Every element in a mix lives somewhere on this spectrum. Click any bar to see its frequency range and — more usefully — what else it competes with. The elements that overlap are the ones that need the most care. A sub-bass and a kick fundamental are always fighting below 80Hz. Pads and vocals are always fighting in the mid-range. Naming the fight is the first step to resolving it.",
      },
      {
        type: "production-stack",
      },
      {
        type: "prose",
        text: "Notice the vocal bar. It spans a wider range than almost anything else — roughly 200Hz to 3kHz — and that's why vocals are so hard to place. Guitars, pads, low-mid drums all sit inside the vocal's frequency territory. A 'sparse' prompt is sparse for a reason: fewer elements mean less competition for the vocal's real estate.",
      },
      { type: "h2", text: "Space is not empty — it is worked for." },
      {
        type: "prose",
        text: "'Wide reverb tail' sounds like decoration. It isn't. Reverb is how a mix tells you where a sound lives — in a bedroom, in a cathedral, on a stage, in outer space. Specifying reverb is specifying architecture. A vocal with no reverb sounds like a podcast. A vocal drowning in plate reverb sounds like 1982. A vocal with a short, early-reflection-heavy room sounds like a confession in a small room — intimate, urgent.",
      },
      {
        type: "annotated-quote",
        text: "Reverb is a lie about the space the sound was recorded in. Pick your lie carefully.",
        source: "Working principle · PB.III §1",
      },
      { type: "h2", text: "Vocabulary for the mix." },
      {
        type: "prose",
        text: "Below is a working vocabulary for prompt-level mix decisions. Each term maps to a real production choice the model has been trained on. Using them is how you move from asking for vibes to asking for architecture.",
      },
      {
        type: "list",
        label: "Mix terms that do real work",
        items: [
          "'Sidechained 808' — the kick momentarily ducks the bass, creating the pumping feel common in house, trap, and modern pop.",
          "'Wide stereo field' — instruments panned hard left and right, creating a sense of largeness. Opposite: 'mono-centered' for vintage or intimate recordings.",
          "'Gated reverb on snare' — the '80s power-ballad snare sound (Phil Collins). Dramatic, large, dated unless used deliberately.",
          "'Close-mic'd, dry vocal' — intimate, present, no reverb. The bedroom-pop aesthetic.",
          "'Tape saturation' or 'analog warmth' — compresses transients and adds harmonic richness. The opposite of clinical digital.",
          "'Lo-fi bitcrush' — deliberately degraded bit depth. The phonk, lo-fi hip-hop, chillwave signature.",
          "'Heavily compressed' vs. 'dynamic' — whether the track sits at a consistent loudness or breathes.",
        ],
      },
      { type: "h2", text: "The bedroom-to-arena spectrum." },
      {
        type: "prose",
        text: "Every prompt implicitly places its music on a spectrum from bedroom recording to arena production. Naming your position on this spectrum is one of the highest-leverage things you can do. 'Bedroom-lofi' signals limited frequency range, mono-adjacent, audible room tone. 'Radio-polished' signals full spectrum, wide stereo, sidechain compression, loudness-max mastering. The model has strong clusters for both, and for many intermediate flavors.",
      },
      {
        type: "stat-row",
        items: [
          { value: "3", unit: "BANDS", label: "Low, mid, high — the mental model starts here" },
          { value: "9", unit: "ELEMENTS", label: "Typical mix stack a prompt should address" },
          { value: "1", unit: "FOCAL", label: "Point of attention — usually the vocal" },
        ],
      },
      { type: "h2", text: "Side-chain is a groove tool, not a mastering effect." },
      {
        type: "prose",
        text: "Sidechain compression is often described as a mixing technique for preventing bass-kick masking. That is its original purpose. But in modern production — house, future bass, trap — sidechain is a groove tool, a compositional choice. The rhythmic pumping becomes part of the song. 'Sidechained synth pad' doesn't just mean 'cleaner mix'; it means 'pad breathes with the kick'. Specifying this in a prompt shifts the groove character, not just the mix clarity.",
      },
      {
        type: "example",
        weak: {
          label: "Vague mix spec",
          text: "Pop song with synth pads, 808s, and drums",
        },
        strong: {
          label: "Architectural mix spec",
          text: "Pop, 120 BPM, supersaw lead with wide stereo field, sidechained synth pad pumping with the kick, 808 sub-bass tight on the kick fundamental, breathy female vocal close-mic'd with short plate reverb, loud mastered bus compression",
        },
        why: "The strong prompt specifies relationships between elements — what ducks what, what sits where, how space is created. Each phrase names a production decision the model can execute.",
      },
    ],
  },
  {
    id: "hit-formulas",
    number: "IV",
    title: "Hit Formulas",
    subtitle: "Patterns from commercial chart-toppers, decoded.",
    status: "complete",
    readingMinutes: 8,
    runId: "PB.IV.2026",
    blocks: [
      {
        type: "manifesto",
        text: "A hit is not a melody. It is a time-managed architecture.",
      },
      {
        type: "prose",
        text: "Pop songs sound effortless because they're engineered to. The listener hears a song; the producer hears a structural plan executed within a 3:30 budget. Every second is accounted for. Intros don't meander. Verses don't wander. Choruses land on beats the brain is already waiting for. If this sounds cynical, consider that the same structural discipline governs good sonnets, good sitcom episodes, and good standup sets. Constraint is not the enemy of art; it is art's instrument.",
      },
      {
        type: "prose",
        text: "Understanding hit structure lets you prompt for it. You can tell a model 'build to a chorus' or 'drop at 0:45'. You can say 'bridge at the 3-minute mark' or 'four-on-the-floor from 1:00'. The model has seen thousands of hits; it knows these shapes. What it needs is for you to pick one.",
      },
      { type: "h2", text: "The shape of 3:30." },
      {
        type: "prose",
        text: "Below is the skeleton of a typical modern pop hit — not the only shape, but the dominant one since ~2015. Hover any section to see what it's designed to do. Notice how fast the first chorus arrives (around 1:00) and how the bridge reliably appears in the final third as a reset before the climactic chorus. This is not an accident.",
      },
      {
        type: "song-structure",
      },
      {
        type: "prose",
        text: "The first chorus lands at roughly 30% of the song's runtime. Streaming metrics have hardened this: if the hook doesn't arrive inside the first minute, skip-rate climbs sharply. A track that takes 90 seconds to reveal its chorus is a track many listeners never finish.",
      },
      { type: "h2", text: "The 15-second rule." },
      {
        type: "prose",
        text: "The first 15 seconds decide whether a listener stays. Modern hits open with the hook, a vocal teaser, or a signature production element that is immediately recognizable. Slow instrumental builds are a luxury only established artists can afford; a new track that begins with 20 seconds of atmospheric pad will be skipped before the vocal arrives. Prompt accordingly — 'intro with vocal hook teaser' or 'cold open on the chorus' are instructions worth giving.",
      },
      {
        type: "annotated-quote",
        text: "The first 15 seconds are the only ones that are guaranteed to be heard.",
        source: "Working principle · PB.IV §1",
      },
      { type: "h2", text: "The pre-chorus lift." },
      {
        type: "prose",
        text: "Between the verse and chorus sits the pre-chorus — a section most casual listeners don't consciously notice, which is precisely why it works. The pre-chorus is a lift: chord progressions that tilt upward, drum patterns that add density, filter sweeps or drum fills that signal 'arrival imminent'. Its job is to make the chorus feel inevitable, like the song has been building toward it all along.",
      },
      {
        type: "list",
        label: "Pre-chorus moves that make choruses land",
        items: [
          "A chord change that sits on the IV (subdominant) or a borrowed minor chord, creating harmonic tension.",
          "Drums drop to just kick and hi-hat, creating rhythmic space before the full drop.",
          "A filter sweep rising upward — white noise, reverb tail, or a synth opening up its cutoff.",
          "Vocal phrasing shifts from spoken-style to sung-melodic, signaling the emotional climb.",
          "A drum fill in the last two bars — the classic 'here comes the chorus' cue.",
        ],
      },
      { type: "h2", text: "The drop before the drop." },
      {
        type: "prose",
        text: "In electronic dance music, and increasingly in pop, there is a micro-pattern called the 'drop before the drop'. Just before the actual bass drop, everything cuts to silence for half a beat or a single beat. The ear notices the absence; the subsequent drop hits harder because of it. This is a direct borrowing from how drummers set up big fills — the silence is part of the hit.",
      },
      {
        type: "stat-row",
        items: [
          { value: "~1:00", unit: "FIRST HOOK", label: "When the first chorus typically lands" },
          { value: "~3:30", unit: "DURATION", label: "Modern pop's target runtime" },
          { value: "15s", unit: "DECIDE-BY", label: "The listener has committed or skipped" },
        ],
      },
      { type: "h2", text: "When to violate the formula." },
      {
        type: "prose",
        text: "Rules describe what works on average. Individual artists build their identities by knowing which rules to break and when. Billie Eilish broke the loudness rule — her songs are quiet, whispered, and still chart. Phoebe Bridgers broke the hook-at-1:00 rule — her songs meander intentionally. Bad Bunny breaks the 3:30 rule — his songs often run 2:30. In each case, the violation is the point. The artists know what they're breaking.",
      },
      {
        type: "annotated-quote",
        text: "You cannot subvert a rule you don't know.",
        source: "Working principle · PB.IV §4",
      },
      { type: "h2", text: "Prompting structural intent." },
      {
        type: "prose",
        text: "Most AI music generators accept structural directives in the prompt. Use them. Phrases like 'intro 8 bars', 'drop at 0:45', 'bridge at 2:00', or 'outro fade' steer the model toward specific arrangement choices. Without these, the model chooses structure from its training median — which for modern pop defaults to the shape above, but for other genres will drift unpredictably.",
      },
      {
        type: "example",
        weak: {
          label: "No structural intent",
          text: "Upbeat summer pop with tropical vibes",
        },
        strong: {
          label: "Structural intent",
          text: "Dance-pop, 118 BPM four-on-the-floor, intro 8 bars with supersaw teaser, verse 1 at 0:15 with filtered drums, pre-chorus lift at 0:45, drop chorus at 1:00 with full arrangement, bridge at 2:15 with stripped arrangement and vocal harmonies, final chorus at 2:45 with key change up a semitone",
        },
        why: "The strong prompt doesn't just specify genre and mood — it specifies the song's architecture. The model renders that architecture, and the result feels crafted rather than improvised.",
      },
    ],
  },
  {
    id: "common-traps",
    number: "V",
    title: "Common Traps",
    subtitle: "The mistakes nobody warns you about until you've wasted a week.",
    status: "complete",
    readingMinutes: 6,
    runId: "PB.V.2026",
    blocks: [
      {
        type: "manifesto",
        text: "The mistakes are not random. They are predictable. You are not the first to make them.",
      },
      {
        type: "prose",
        text: "Everyone who has spent a month prompting AI music generators has hit the same set of walls. They're so consistent that they might as well be listed in a manual — except no one wrote that manual, so each new user falls into each trap individually, wastes hours or days, and gradually learns what not to do. This chapter is that manual. You may have fallen into some of these already. You will recognize them.",
      },
      {
        type: "prose",
        text: "The good news: once you see an anti-pattern clearly, you stop writing it. The mistakes below are easy to make because they feel like you're being more descriptive — adding more adjectives, more genres, more atmosphere. The model doesn't reward that. It rewards structure.",
      },
      { type: "h2", text: "The gallery of wrong prompts." },
      {
        type: "prose",
        text: "Below is a catalog of the six most common anti-patterns, each with a real-looking example prompt, a diagnosis of what went wrong, and a cleaned-up version. Click any one to see the full breakdown. The severity dots (●) indicate how badly the pattern tends to sabotage output — three dots means the model often produces something unusable.",
      },
      {
        type: "anti-patterns",
      },
      { type: "h2", text: "Why 'more' is usually worse." },
      {
        type: "prose",
        text: "The common thread across these anti-patterns is the assumption that more information produces better results. It doesn't. More information produces more constraints, and past a certain point, constraints conflict. A prompt that tries to specify fifteen things ends up under-specifying each one, because the model's attention is finite and spread thin. The craft is not in saying more — it is in saying the right things with precision.",
      },
      {
        type: "annotated-quote",
        text: "A prompt of twelve precise words outperforms a prompt of forty vague ones.",
        source: "Working principle · PB.V §1",
      },
      { type: "h2", text: "The locking trap." },
      {
        type: "prose",
        text: "Hit Engine lets you lock any slot to prevent it from randomizing. This is a powerful feature — and a dangerous one. If you lock too many slots, you've eliminated the creative disruption the randomizer is meant to provide. Rolling becomes pointless. The sweet spot is one or two anchors and the rest free. If you find yourself locking every slot, you're not rolling anymore — you're manually building a prompt, which you can do faster by typing.",
      },
      {
        type: "stat-row",
        items: [
          { value: "1–2", unit: "LOCKED", label: "Ideal number of anchors when rolling" },
          { value: "5+", unit: "IS TOO MANY", label: "You've turned randomizer into typing" },
          { value: "0", unit: "IS CHAOS", label: "Nothing to discover without an anchor" },
        ],
      },
      { type: "h2", text: "The 'sounds like' trap." },
      {
        type: "prose",
        text: "Describing what you want a song to 'sound like' is fine when you reference specific artists ('in the style of Billie Eilish' does real work). It's poor when the reference is vague ('sounds like a summer afternoon', 'sounds emotional'). Metaphors don't translate to the model's training data; specific artists and specific songs do. When you feel the urge to reach for a metaphor, reach for a name instead.",
      },
      { type: "h2", text: "The contradiction trap." },
      {
        type: "prose",
        text: "Beginners often combine terms that make stylistic sense individually but contradict each other in combination. 'Minimalist maximalist', 'aggressive gentle', 'fast slow'. The model attempts to reconcile these, and the result is either averaged mush or one signal dominating and the other disappearing. If you catch yourself writing a contradiction, pick one side. If you truly want both, name an artist who fuses them successfully.",
      },
      {
        type: "annotated-quote",
        text: "Two contradictions cancel. Two specifics reinforce.",
        source: "Working principle · PB.V §3",
      },
      { type: "h2", text: "The 'try everything' trap." },
      {
        type: "prose",
        text: "When a prompt isn't producing what you want, the temptation is to add more to it. Another adjective. Another genre tag. Another mix direction. Almost always, the correct move is the opposite: remove something. Prompts get better when they're tightened, not when they're stuffed. If your prompt exceeds 400 characters and isn't producing what you want, the problem is rarely that you need more — the problem is usually that two of the things you already wrote are fighting each other.",
      },
      {
        type: "example",
        weak: {
          label: "Stuffed and conflicting",
          text: "Epic emotional pop song with cinematic strings, dubstep drops, country twang, hip-hop drums, opera vocals, ambient textures, jazz chord changes, 128 BPM and also 80 BPM, loud and quiet, happy and sad",
        },
        strong: {
          label: "Tightened and coherent",
          text: "Cinematic pop ballad, 72 BPM, orchestral strings with a modern sub-bass foundation, breathy female vocal in English with one climactic belted chorus, loud-quiet-loud dynamics",
        },
        why: "The weak prompt contradicts itself six different ways. The strong prompt keeps the 'cinematic' and 'emotional' intent but commits to one tempo, one vocal style, and one dynamic arc. The model can now execute.",
      },
      { type: "h2", text: "The closing move." },
      {
        type: "prose",
        text: "Most of these traps share an origin: uncertainty about what you actually want. When you're unsure, you add more, in the hope that the model will surface the right option from the pile. A better move is to pause, decide what one thing matters most, write that one thing as clearly as you can, and let the model fill in the rest. You can always roll again. You cannot un-confuse the model mid-generation.",
      },
    ],
  },
];

function PlaybookPage() {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const [activeChapter, setActiveChapter] = useState(PLAYBOOK_CHAPTERS[0].id);
  const chapterRefs = useRef({});

  // Scroll-tracking for TOC via IntersectionObserver
  useEffect(() => {
    if (isMobile) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveChapter(visible[0].target.dataset.chapterId);
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );
    PLAYBOOK_CHAPTERS.forEach(ch => {
      const el = chapterRefs.current[ch.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isMobile]);

  const scrollToChapter = (id) => {
    const el = chapterRefs.current[id];
    if (!el) return;
    const yOffset = -90;
    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // Build session timestamp for the 2035-research-paper feel
  const now = new Date();
  const sessionId = `SESS.${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div style={{
      maxWidth: 1200,
      margin: "0 auto",
      padding: isMobile ? `${T.s6}px ${T.s4}px ${T.s10}px` : `${T.s8}px ${T.s7}px ${T.s10}px`,
    }}>
      {/* ═══════════════════════ EDITORIAL MASTHEAD ═══════════════════════ */}
      <div style={{
        marginBottom: isMobile ? T.s8 : T.s10,
        paddingBottom: T.s7,
        borderBottom: `1px solid ${T.border}`,
        position: "relative",
        minHeight: isMobile ? "auto" : 320,
      }}>
        <GridBackdrop />
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Top metadata bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: T.s3,
            marginBottom: T.s5, flexWrap: "wrap",
            fontSize: 10, fontFamily: T.font_mono, letterSpacing: "0.2em",
          }}>
            <span style={{ color: V.neonGold, fontWeight: 700 }}>
              VIP · VOL. I
            </span>
            <span style={{ color: T.textMuted }}>·</span>
            <span style={{ color: T.textMuted }}>
              {sessionId}
            </span>
            <span style={{ color: T.textMuted }}>·</span>
            <span style={{ color: T.textMuted }}>
              {PLAYBOOK_CHAPTERS.filter(c => c.status === "complete").length}/{PLAYBOOK_CHAPTERS.length} CH.
            </span>
            <div style={{ flex: 1 }} />
            <span style={{
              color: T.success, fontSize: 9,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                background: T.success,
                boxShadow: `0 0 6px ${T.success}`,
                animation: "pulse 2s ease-in-out infinite",
              }} />
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
              LIVE
            </span>
          </div>

          <h1 style={{
            fontSize: isMobile ? "clamp(52px, 15vw, 92px)" : "clamp(88px, 10vw, 168px)",
            lineHeight: 0.9,
            letterSpacing: "-0.035em",
            margin: 0,
            marginBottom: T.s4,
            fontFamily: T.font_display,
            fontWeight: 400,
            fontStyle: "italic",
            color: T.text,
          }}>
            The Playbook
          </h1>
          <p style={{
            fontSize: isMobile ? T.fs_lg : T.fs_xl,
            lineHeight: 1.4,
            color: T.textSec,
            fontFamily: T.font_display,
            fontStyle: "italic",
            margin: 0,
            maxWidth: 640,
            fontWeight: 400,
          }}>
            Field-tested wisdom for extracting real music from AI — learned the hard way, written down once, so the next person doesn't start from zero.
          </p>
        </div>
      </div>

      {/* ════════════════════ LAYOUT: TOC + CONTENT ════════════════════════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "220px 1fr",
        gap: isMobile ? 0 : T.s9,
        alignItems: "start",
      }}>
        {/* ────── TABLE OF CONTENTS (desktop only) ────── */}
        {!isMobile && (
          <nav style={{ position: "sticky", top: 90, paddingTop: T.s2 }}>
            <div style={{
              fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
              color: T.textMuted, letterSpacing: "0.28em",
              marginBottom: T.s4, paddingBottom: T.s2,
              borderBottom: `1px solid ${T.border}`,
            }}>
              / CONTENTS
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {PLAYBOOK_CHAPTERS.map(ch => {
                const isActive = activeChapter === ch.id;
                const isComplete = ch.status === "complete";
                return (
                  <li key={ch.id} style={{ marginBottom: T.s3 }}>
                    <button type="button"
                      onClick={() => scrollToChapter(ch.id)}
                      style={{
                        background: "transparent", border: "none", padding: 0,
                        cursor: "pointer", textAlign: "left", width: "100%",
                        display: "block",
                        borderLeft: `2px solid ${isActive ? V.neonGold : "transparent"}`,
                        paddingLeft: 12,
                        transition: "all 180ms ease-out",
                        opacity: isComplete ? 1 : 0.45,
                      }}>
                      <div style={{
                        fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
                        color: isActive ? V.neonGold : T.textMuted,
                        letterSpacing: "0.18em",
                        marginBottom: 2,
                        transition: "color 180ms ease-out",
                      }}>
                        CH. {ch.number}
                      </div>
                      <div style={{
                        fontSize: 13, fontFamily: T.font_display,
                        fontStyle: "italic", fontWeight: 400,
                        color: isActive ? T.text : T.textSec,
                        lineHeight: 1.25,
                        transition: "color 180ms ease-out",
                      }}>
                        {ch.title}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div style={{
              marginTop: T.s6, paddingTop: T.s4,
              borderTop: `1px solid ${T.border}`,
              fontSize: 10, fontFamily: T.font_mono,
              color: T.textMuted, letterSpacing: "0.12em",
              lineHeight: 1.7,
            }}>
              ~{PLAYBOOK_CHAPTERS.reduce((sum, c) => sum + c.readingMinutes, 0)} MIN · VOL. I<br/>
              <span style={{ color: T.textTer }}>REV. 2026.04</span>
            </div>
          </nav>
        )}

        {/* ────── MAIN CONTENT COLUMN ────── */}
        <article style={{ maxWidth: 720, minWidth: 0 }}>
          {PLAYBOOK_CHAPTERS.map(ch => (
            <section
              key={ch.id}
              ref={el => chapterRefs.current[ch.id] = el}
              data-chapter-id={ch.id}
              style={{
                marginBottom: T.s10,
                opacity: ch.status === "complete" ? 1 : 0.65,
              }}>
              {/* ── Chapter header ── */}
              <header style={{ marginBottom: T.s6 }}>
                {/* Scanline divider */}
                <div style={{
                  height: 1,
                  background: `linear-gradient(90deg, ${V.neonGold}aa 0%, ${V.neonGold}33 30%, transparent 100%)`,
                  marginBottom: T.s4,
                }} />
                <div style={{
                  display: "flex", alignItems: "baseline", gap: T.s3,
                  marginBottom: T.s3, flexWrap: "wrap",
                }}>
                  <div style={{
                    fontSize: 11, fontFamily: T.font_mono, fontWeight: 700,
                    color: V.neonGold, letterSpacing: "0.25em",
                  }}>
                    CHAPTER {ch.number}
                  </div>
                  <div style={{
                    fontSize: 9, fontFamily: T.font_mono, color: T.textTer,
                    letterSpacing: "0.12em",
                  }}>
                    / {ch.runId}
                  </div>
                  {ch.status === "upcoming" && (
                    <span style={{
                      fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
                      color: T.textMuted, letterSpacing: "0.15em",
                      padding: "2px 7px",
                      border: `1px solid ${T.border}`,
                      borderRadius: 3,
                      background: T.surface,
                    }}>
                      ◇ DRAFT
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <div style={{
                    fontSize: 10, fontFamily: T.font_mono,
                    color: T.textMuted, letterSpacing: "0.12em",
                  }}>
                    {ch.readingMinutes} MIN
                  </div>
                </div>
                <h2 style={{
                  fontSize: isMobile ? "clamp(36px, 9vw, 60px)" : "clamp(48px, 5.5vw, 76px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.028em",
                  margin: 0,
                  marginBottom: T.s3,
                  fontFamily: T.font_display,
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: T.text,
                }}>
                  {ch.title}
                </h2>
                <p style={{
                  fontSize: isMobile ? T.fs_base : T.fs_lg,
                  lineHeight: 1.5,
                  color: T.textSec,
                  fontFamily: T.font_sans,
                  margin: 0,
                  maxWidth: 560,
                }}>
                  {ch.subtitle}
                </p>
              </header>
              {/* Chapter body */}
              <div>
                {ch.blocks.map((block, i) => (
                  <PlaybookBlock key={i} block={block} isMobile={isMobile} />
                ))}
              </div>
            </section>
          ))}

          {/* Closing note */}
          <div style={{
            marginTop: T.s8,
            padding: `${T.s6}px ${T.s5}px`,
            background: `linear-gradient(180deg, ${V.neonGold}08 0%, transparent 100%)`,
            border: `1px solid ${V.neonGold}33`,
            borderRadius: T.r_lg,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Top accent line */}
            <div style={{
              position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
              width: 60, height: 2,
              background: V.neonGold,
              boxShadow: `0 0 10px ${V.neonGold}66`,
            }} />
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              color: V.neonGold, letterSpacing: "0.28em",
              marginBottom: T.s3,
              textShadow: `0 0 6px ${V.neonGold}44`,
            }}>
              ━━ END OF VOLUME I ━━
            </div>
            <div style={{
              fontSize: isMobile ? T.fs_lg : T.fs_xl,
              fontFamily: T.font_display,
              fontStyle: "italic",
              color: T.text,
              marginBottom: T.s3,
              lineHeight: 1.4,
            }}>
              New chapters added as the experiments run.
            </div>
            <div style={{
              color: T.textTer, fontSize: T.fs_sm, fontFamily: T.font_sans,
              maxWidth: 440, margin: "0 auto", lineHeight: 1.6,
            }}>
              Your feedback shapes what gets researched next. Tell us what's working — or what isn't.
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

// ── PlaybookBlock — renders each block type with its own aesthetic treatment ─
function PlaybookBlock({ block, isMobile }) {
  const baseProseStyle = {
    fontSize: isMobile ? T.fs_base : 17,
    lineHeight: 1.75,
    color: T.textSec,
    fontFamily: T.font_sans,
    margin: 0,
    marginBottom: T.s4,
    fontWeight: 400,
  };

  switch (block.type) {
    case "prose":
      return <p style={baseProseStyle}>{block.text}</p>;

    case "h2":
      return (
        <h3 style={{
          fontSize: isMobile ? T.fs_xl : 28,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          margin: 0,
          marginTop: T.s7,
          marginBottom: T.s4,
          fontFamily: T.font_display,
          fontStyle: "italic",
          fontWeight: 400,
          color: T.text,
        }}>
          {block.text}
        </h3>
      );

    case "h3":
      return (
        <h4 style={{
          fontSize: T.fs_lg,
          lineHeight: 1.3,
          margin: 0,
          marginTop: T.s5,
          marginBottom: T.s3,
          fontFamily: T.font_sans,
          fontWeight: 600,
          color: T.text,
          letterSpacing: "-0.01em",
        }}>
          {block.text}
        </h4>
      );

    case "manifesto":
      // Oversized statement that reframes the chapter's thesis. Serif italic,
      // big, with top/bottom scanline rules and a leading mono annotation.
      return (
        <div style={{
          margin: `${T.s6}px 0 ${T.s7}px`,
          padding: `${T.s5}px 0`,
          borderTop: `1px solid ${V.neonGold}66`,
          borderBottom: `1px solid ${V.neonGold}22`,
          position: "relative",
        }}>
          <div style={{
            fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
            color: V.neonGold, letterSpacing: "0.28em",
            marginBottom: T.s3,
          }}>
            ◆ THESIS
          </div>
          <div style={{
            fontSize: isMobile ? 28 : 40,
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            fontFamily: T.font_display,
            fontStyle: "italic",
            fontWeight: 400,
            color: T.text,
          }}>
            {block.text}
          </div>
        </div>
      );

    case "annotated-quote":
      // Pull-quote with source annotation. More specific than a plain quote —
      // cites itself like a referenced footnote.
      return (
        <blockquote style={{
          margin: `${T.s6}px 0`,
          padding: `${T.s4}px ${T.s4}px`,
          background: T.bg,
          border: `1px solid ${V.neonGold}33`,
          borderLeft: `3px solid ${V.neonGold}`,
          borderRadius: `0 ${T.r_md}px ${T.r_md}px 0`,
          position: "relative",
        }}>
          <div style={{
            fontSize: isMobile ? 20 : 24,
            lineHeight: 1.3,
            color: T.text,
            fontFamily: T.font_display,
            fontStyle: "italic",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            marginBottom: T.s2,
          }}>
            {block.text}
          </div>
          {block.source && (
            <div style={{
              fontSize: 10, fontFamily: T.font_mono,
              color: T.textMuted, letterSpacing: "0.12em",
              fontWeight: 500,
            }}>
              ── {block.source}
            </div>
          )}
        </blockquote>
      );

    case "inspector":
      return <PromptAnatomyInspector isMobile={isMobile} />;

    case "diagram":
      return <GenreFusionDiagram isMobile={isMobile} />;

    case "production-stack":
      return <ProductionStackVisualizer isMobile={isMobile} />;

    case "song-structure":
      return <SongStructureDeconstructor isMobile={isMobile} />;

    case "anti-patterns":
      return <AntiPatternDetector isMobile={isMobile} />;

    case "stat-row":
      // Research-paper-style stat strip. Big value + small unit + label.
      return (
        <div style={{
          margin: `${T.s6}px 0`,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : `repeat(${block.items.length}, 1fr)`,
          gap: isMobile ? T.s3 : 0,
          border: `1px solid ${T.border}`,
          borderRadius: T.r_md,
          overflow: "hidden",
          background: T.surface,
        }}>
          {block.items.map((item, i) => (
            <div key={i} style={{
              padding: `${T.s4}px ${T.s4}px`,
              borderRight: !isMobile && i < block.items.length - 1 ? `1px solid ${T.border}` : "none",
              borderBottom: isMobile && i < block.items.length - 1 ? `1px solid ${T.border}` : "none",
              position: "relative",
            }}>
              <div style={{
                fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
                color: T.textMuted, letterSpacing: "0.22em",
                marginBottom: T.s2,
              }}>
                / {item.unit}
              </div>
              <div style={{
                fontSize: isMobile ? 36 : 44,
                fontFamily: T.font_display,
                fontStyle: "italic",
                fontWeight: 400,
                color: T.text,
                lineHeight: 1,
                marginBottom: T.s2,
                letterSpacing: "-0.02em",
              }}>
                {item.value}
              </div>
              <div style={{
                fontSize: T.fs_xs, fontFamily: T.font_sans,
                color: T.textSec, lineHeight: 1.4,
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      );

    case "example":
      return (
        <div style={{
          margin: `${T.s5}px 0`,
          border: `1px solid ${T.border}`,
          borderRadius: T.r_lg,
          overflow: "hidden",
          background: T.surface,
        }}>
          <div style={{
            padding: `${T.s4}px ${T.s4}px`,
            borderBottom: `1px solid ${T.border}`,
            background: `linear-gradient(90deg, ${T.danger}08 0%, transparent 60%)`,
          }}>
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              color: T.danger, letterSpacing: "0.2em", marginBottom: T.s2,
            }}>
              ✗ {block.weak.label.toUpperCase()}
            </div>
            <div style={{
              fontSize: T.fs_md, color: T.textSec,
              fontFamily: T.font_mono, lineHeight: 1.6,
            }}>
              {block.weak.text}
            </div>
          </div>
          <div style={{
            padding: `${T.s4}px ${T.s4}px`,
            background: `linear-gradient(90deg, ${T.success}0a 0%, transparent 60%)`,
          }}>
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              color: T.success, letterSpacing: "0.2em", marginBottom: T.s2,
            }}>
              ✓ {block.strong.label.toUpperCase()}
            </div>
            <div style={{
              fontSize: T.fs_md, color: T.text,
              fontFamily: T.font_mono, lineHeight: 1.6,
            }}>
              {block.strong.text}
            </div>
          </div>
          {block.why && (
            <div style={{
              padding: `${T.s3}px ${T.s4}px`,
              background: T.bg,
              borderTop: `1px dashed ${T.border}`,
            }}>
              <div style={{
                fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
                color: T.textMuted, letterSpacing: "0.2em", marginBottom: T.s1,
              }}>
                WHY IT WORKS
              </div>
              <div style={{
                fontSize: T.fs_sm, color: T.textSec,
                fontFamily: T.font_sans, lineHeight: 1.6, fontStyle: "italic",
              }}>
                {block.why}
              </div>
            </div>
          )}
        </div>
      );

    case "list":
      return (
        <div style={{ margin: `${T.s5}px 0` }}>
          {block.label && (
            <div style={{
              fontSize: 10, fontFamily: T.font_mono, fontWeight: 700,
              color: T.textMuted, letterSpacing: "0.2em", marginBottom: T.s3,
            }}>
              / {block.label.toUpperCase()}
            </div>
          )}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {block.items.map((item, i) => (
              <li key={i} style={{
                position: "relative",
                paddingLeft: 28,
                marginBottom: T.s3,
                fontSize: isMobile ? T.fs_base : 16,
                lineHeight: 1.65,
                color: T.textSec,
                fontFamily: T.font_sans,
              }}>
                <span style={{
                  position: "absolute",
                  left: 0, top: "2px",
                  fontSize: 11,
                  fontFamily: T.font_mono,
                  color: V.neonGold,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      );

    case "divider":
      return (
        <div style={{
          margin: `${T.s6}px auto`,
          width: 120,
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${T.border} 50%, transparent 100%)`,
        }} />
      );

    default:
      return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SHOP PAGE — demo shop for purchasing tier upgrades with fake credits
// ════════════════════════════════════════════════════════════════════════════

function ShopPage() {
  const { tier, ownedTiers, purchaseTier } = useTier();
  const { refillForTier } = useFuel();
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  const [feedback, setFeedback] = useState(null);
  const [payModal, setPayModal] = useState(null); // { tierId, billing }
  const [billing, setBilling] = useState("monthly"); // monthly | yearly

  const showFeedback = (ok, text) => {
    setFeedback({ ok, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSubscribe = (tierId) => {
    setPayModal({ tierId, billing });
  };

  const completePayment = (tierId, bill) => {
    const result = purchaseTier(tierId, bill);
    if (result.ok) {
      refillForTier(tierId);
      const tierLabel = TIERS[tierId].label;
      showFeedback(true, `Welcome to ${tierLabel}! Your subscription is active.`);
      setPayModal(null);
    } else {
      showFeedback(false, result.error);
    }
  };

  const currentHighestRank = Math.max(...[...ownedTiers].map(x => TIER_RANK[x] ?? 0));
  const shopOrder = ["free", "pro", "vip"];

  // Feature lists — hand-authored for each tier, ordered by importance
  const getFeatureList = (tierId) => {
    const f = TIER_FEATURES[tierId];
    if (tierId === "free") {
      return [
        { text: "10 Hits per day", highlight: true },
        { text: "Simple & Moderated modes" },
        { text: "Basic genre slots (1)" },
        { text: "5 options per section" },
        { text: "No locks or favorites", muted: true },
        { text: "No Pop profile meter", muted: true },
      ];
    }
    if (tierId === "pro") {
      return [
        { text: "Unlimited daily Hits", highlight: true },
        { text: "All 5 prompt modes (incl. Chaos)" },
        { text: "3 genre slots" },
        { text: "Full option library" },
        { text: "Locks & favorites" },
        { text: "Pop profile meter" },
        { text: "Shareable prompt links" },
      ];
    }
    if (tierId === "vip") {
      return [
        { text: "Everything in Pro", highlight: true },
        { text: "Unlimited daily Hits" },
        { text: "Batch generation (5 variants)" },
        { text: "JSON export for power users" },
        { text: "The Playbook (deep guides)" },
        { text: "Monthly genre graphs" },
        { text: "Priority feature drops" },
      ];
    }
    return [];
  };

  return (
    <div style={{
      maxWidth: 1100, margin: "0 auto",
      padding: isMobile
        ? `${T.s5}px ${T.s3}px ${T.s8}px`
        : `${T.s9}px ${T.s7}px ${T.s10}px`,
    }}>
      {/* ─ HEADER ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: isMobile ? T.s5 : T.s6 }}>
        <Label color={T.textTer} style={{ display: "block", marginBottom: T.s3 }}>
          Membership · demo pricing · no real charges
        </Label>
        <h1 style={{
          fontSize: isMobile ? "32px" : "clamp(36px, 5vw, 64px)",
          lineHeight: 1.02, letterSpacing: "-0.025em",
          margin: 0, marginBottom: T.s3,
          fontFamily: T.font_display, fontWeight: 400,
          fontStyle: "italic",
        }}>
          Choose your plan.
        </h1>
        <p style={{
          color: T.textSec, fontSize: T.fs_lg, lineHeight: 1.55,
          maxWidth: 640, fontFamily: T.font_sans, margin: 0,
        }}>
          Unlock unlimited Hits, power-user tools, and deeper options.
          Cancel anytime.
        </p>
      </div>

      {/* ─ BILLING TOGGLE (monthly / yearly) ───────────────────── */}
      <div style={{
        display: "inline-flex",
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: 4, marginBottom: T.s5,
        position: "relative",
      }}>
        {[
          { id: "monthly", label: "Monthly" },
          { id: "yearly",  label: "Yearly", badge: "SAVE 35%" },
        ].map(b => {
          const active = billing === b.id;
          return (
            <button key={b.id} type="button"
              onClick={() => setBilling(b.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: isMobile ? "8px 14px" : "10px 20px",
                background: active ? T.elevated : "transparent",
                border: "none",
                color: active ? T.text : T.textSec,
                fontSize: 13, fontFamily: T.font_sans, fontWeight: 500,
                borderRadius: 8, cursor: "pointer",
                transition: "all 160ms ease-out",
              }}>
              {b.label}
              {b.badge && (
                <span style={{
                  padding: "2px 6px",
                  background: `${V.neonGold}22`,
                  border: `1px solid ${V.neonGold}66`,
                  color: V.neonGold,
                  fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
                  letterSpacing: "0.15em", borderRadius: 3,
                  textShadow: `0 0 4px ${V.neonGold}66`,
                }}>{b.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─ FEEDBACK TOAST ─────────────────────────────────────── */}
      {feedback && (
        <div style={{
          padding: `${T.s3}px ${T.s4}px`,
          marginBottom: T.s5,
          background: feedback.ok ? `${T.success}11` : `${T.danger}11`,
          border: `1px solid ${feedback.ok ? T.success : T.danger}44`,
          borderRadius: T.r_md,
          color: feedback.ok ? T.success : T.danger,
          fontSize: T.fs_md, fontFamily: T.font_sans, fontWeight: 500,
        }}>
          {feedback.text}
        </div>
      )}

      {/* ─ TIER CARDS ─────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: isMobile ? T.s3 : T.s4,
        marginBottom: T.s7,
      }}>
        {shopOrder.map(tierId => {
          const t = TIERS[tierId];
          const priceData = TIER_PRICE[tierId] || { monthly: 0, yearly: 0 };
          const owned = ownedTiers.has(tierId);
          const tierRank = TIER_RANK[tierId];
          const blockedByHigher = tierRank < currentHighestRank;
          const isFeatured = tierId === "pro"; // highlight Pro as the "most popular" pick
          const disabled = owned || blockedByHigher || tierId === "free";

          // Compute price display based on billing toggle
          const isYearly = billing === "yearly";
          const displayPrice = isYearly
            ? (priceData.yearly / 12).toFixed(2)
            : priceData.monthly.toFixed(2);
          const fullYearlyPrice = priceData.yearly;

          let buttonLabel = isYearly
            ? `SUBSCRIBE — $${fullYearlyPrice}/yr`
            : `SUBSCRIBE — $${priceData.monthly}/mo`;
          if (tierId === "free") buttonLabel = "YOUR PLAN";
          else if (owned) buttonLabel = "● ACTIVE";
          else if (blockedByHigher) buttonLabel = "LOWER THAN CURRENT";

          return (
            <div key={tierId} style={{
              padding: isMobile ? T.s4 : T.s5,
              background: isFeatured
                ? `linear-gradient(180deg, ${t.color}14 0%, transparent 60%), ${T.surface}`
                : `linear-gradient(180deg, ${t.color}0a 0%, transparent 60%), ${T.surface}`,
              border: `1px solid ${owned ? t.color + "88" : isFeatured ? t.color + "55" : T.border}`,
              borderRadius: T.r_lg,
              boxShadow: owned
                ? `0 0 30px ${t.color}22, inset 0 0 20px ${t.color}0a`
                : isFeatured ? `0 0 20px ${t.color}11` : "none",
              position: "relative",
              transition: `all ${T.dur_norm} ${T.ease}`,
            }}>
              {/* Badges */}
              {owned && (
                <div style={{
                  position: "absolute", top: -10, right: T.s3,
                  padding: "3px 8px",
                  background: `${t.color}`, color: T.bg,
                  borderRadius: 4,
                  fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
                  letterSpacing: "0.2em",
                  boxShadow: `0 0 10px ${t.color}aa`,
                }}>● ACTIVE</div>
              )}
              {!owned && isFeatured && (
                <div style={{
                  position: "absolute", top: -10, right: T.s3,
                  padding: "3px 8px",
                  background: T.accent, color: T.text,
                  borderRadius: 4,
                  fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
                  letterSpacing: "0.2em",
                  boxShadow: `0 0 10px ${T.accent}aa`,
                }}>MOST POPULAR</div>
              )}

              {/* Tier label */}
              <div style={{
                fontSize: 11, fontFamily: T.font_mono, fontWeight: 700,
                letterSpacing: "0.25em", color: t.color,
                textShadow: `0 0 6px ${t.color}66`, marginBottom: 10,
              }}>
                {t.label.toUpperCase()}
              </div>

              {/* Price */}
              <div style={{ marginBottom: T.s3, display: "flex", alignItems: "baseline", gap: 6 }}>
                {tierId === "free" ? (
                  <span style={{
                    fontSize: 44, fontFamily: T.font_display, fontStyle: "italic",
                    color: T.text, lineHeight: 1,
                  }}>Free</span>
                ) : (
                  <>
                    <span style={{
                      fontSize: 44, fontFamily: T.font_display, fontStyle: "italic",
                      color: T.text, lineHeight: 1, fontWeight: 400,
                    }}>${displayPrice}</span>
                    <span style={{
                      fontSize: 13, color: T.textTer,
                      fontFamily: T.font_sans, fontStyle: "normal",
                    }}>/month</span>
                  </>
                )}
              </div>

              {/* Yearly billing note */}
              {tierId !== "free" && (
                <div style={{
                  fontSize: 11, color: T.textMuted, fontFamily: T.font_mono,
                  marginBottom: T.s4, minHeight: 16,
                  letterSpacing: "0.05em",
                }}>
                  {isYearly
                    ? `Billed $${fullYearlyPrice}/year · save ${yearlySavingsPct(tierId)}%`
                    : "Billed monthly · cancel anytime"}
                </div>
              )}
              {tierId === "free" && (
                <div style={{
                  fontSize: 11, color: T.textMuted, fontFamily: T.font_mono,
                  marginBottom: T.s4, minHeight: 16,
                  letterSpacing: "0.05em",
                }}>Forever free · no card required</div>
              )}

              {/* Description */}
              <div style={{
                color: T.textSec, fontSize: T.fs_md, lineHeight: 1.5,
                marginBottom: T.s4, fontFamily: T.font_sans,
              }}>
                {t.description}
              </div>

              {/* Feature list */}
              <ul style={{
                listStyle: "none", padding: 0, margin: 0, marginBottom: T.s5,
                display: "flex", flexDirection: "column", gap: 7,
              }}>
                {getFeatureList(tierId).map((feat, i) => (
                  <li key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    color: feat.muted ? T.textTer : T.textSec,
                    fontSize: T.fs_sm, fontFamily: T.font_sans,
                    fontWeight: feat.highlight ? 500 : 400,
                  }}>
                    <span style={{
                      color: feat.muted ? T.textMuted : t.color,
                      flexShrink: 0,
                      fontSize: 14, lineHeight: 1.3,
                    }}>{feat.muted ? "○" : "✓"}</span>
                    <span style={feat.highlight ? { color: T.text, fontWeight: 500 } : {}}>
                      {feat.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Subscribe button */}
              <button type="button"
                onClick={() => !disabled && handleSubscribe(tierId)}
                disabled={disabled}
                style={{
                  width: "100%",
                  padding: `${T.s3}px ${T.s4}px`,
                  minHeight: 44,
                  background: owned ? `${t.color}22`
                    : disabled ? T.surface
                    : isFeatured
                      ? `linear-gradient(135deg, ${t.color} 0%, ${t.color}dd 100%)`
                      : `linear-gradient(135deg, ${t.color}33 0%, ${t.color}11 100%)`,
                  border: `1px solid ${owned ? t.color + "66" : disabled ? T.border : t.color + "aa"}`,
                  color: owned ? t.color : disabled ? T.textTer : isFeatured ? T.bg : t.color,
                  fontSize: 11, fontFamily: T.font_mono, fontWeight: 700,
                  letterSpacing: "0.18em",
                  cursor: disabled ? "not-allowed" : "pointer",
                  borderRadius: 6,
                  textShadow: disabled || owned || isFeatured ? "none" : `0 0 6px ${t.color}66`,
                  boxShadow: isFeatured && !disabled ? `0 0 16px ${t.color}66` : "none",
                  transition: "all 120ms ease-out",
                }}
                onMouseEnter={e => {
                  if (disabled) return;
                  e.currentTarget.style.background = isFeatured
                    ? `linear-gradient(135deg, ${t.color} 0%, ${t.color} 100%)`
                    : `linear-gradient(135deg, ${t.color}55 0%, ${t.color}22 100%)`;
                }}
                onMouseLeave={e => {
                  if (disabled) return;
                  e.currentTarget.style.background = isFeatured
                    ? `linear-gradient(135deg, ${t.color} 0%, ${t.color}dd 100%)`
                    : `linear-gradient(135deg, ${t.color}33 0%, ${t.color}11 100%)`;
                }}>
                {buttonLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* ─ COMPARISON / FAQ FOOTER ────────────────────────────── */}
      <div style={{
        padding: T.s5,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.r_lg,
        marginBottom: T.s5,
      }}>
        <Label color={T.text} style={{ display: "block", marginBottom: T.s3 }}>
          Why subscribe?
        </Label>
        <div style={{
          color: T.textSec, fontSize: T.fs_md, lineHeight: 1.6,
          fontFamily: T.font_sans,
        }}>
          HIT-ENGINE generates deterministic prompt structures that get better results
          from modern AI music generators — less trial-and-error, fewer
          wasted credits on those platforms. Pro pays for itself after a handful of
          cleaner prompts.
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {payModal && (
        <PaymentModal
          tierId={payModal.tierId}
          billing={payModal.billing}
          onClose={() => setPayModal(null)}
          onComplete={(bill) => completePayment(payModal.tierId, bill)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT MODAL — simulated prod-ready checkout flow
// Three tabs: Credits (in-app), Card (Stripe-style), PayPal
// Card form has validation + processing spinner + success animation
// ════════════════════════════════════════════════════════════════════════════
function PaymentModal({ tierId, billing, onClose, onComplete }) {
  const t = TIERS[tierId];
  const priceData = TIER_PRICE[tierId] || { monthly: 0, yearly: 0 };
  const isYearly = billing === "yearly";
  const chargeAmount = isYearly ? priceData.yearly : priceData.monthly;
  const displayAmount = chargeAmount.toFixed(2);
  const [method, setMethod] = useState("card");
  const [stage, setStage] = useState("form"); // form | processing | success

  // Card form fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});

  // Auto-format card number in groups of 4
  const formatCardNumber = (v) => v.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0,2)}/${digits.slice(2)}` : digits;
  };

  const validate = () => {
    const e = {};
    const numClean = cardNumber.replace(/\s/g, "");
    if (numClean.length < 13 || numClean.length > 19) e.cardNumber = "Invalid card number";
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) e.cardExpiry = "MM/YY";
    if (!/^\d{3,4}$/.test(cardCvc)) e.cardCvc = "Invalid";
    if (!cardName.trim()) e.cardName = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    return e;
  };

  const handleSubmit = () => {
    if (method === "card") {
      const e = validate();
      if (Object.keys(e).length) { setErrors(e); return; }
    }
    setErrors({});
    setStage("processing");
    setTimeout(() => {
      setStage("success");
      setTimeout(() => onComplete(billing), 1100);
    }, 1400);
  };

  // Close on ESC
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && stage === "form") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stage, onClose]);

  return (
    <div
      onClick={stage === "form" ? onClose : undefined}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(12px)",
        display: "grid", placeItems: "center",
        padding: 12,
        zIndex: 10000,
        animation: "payModalBgIn 240ms ease-out",
        overflowY: "auto",
      }}>
      <style>{`
        @keyframes payModalBgIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes payModalCardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes paySpin { to { transform: rotate(360deg); } }
        @keyframes paySuccessPop {
          0%   { transform: scale(0.3); opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          maxHeight: "calc(100vh - 24px)",
          overflowY: "auto",
          background: "linear-gradient(180deg, #0f1014 0%, #0a0b0e 100%)",
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 0,
          boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "payModalCardIn 320ms cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative",
        }}>
        {/* Accent strip */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${t.color} 0%, ${t.color}aa 50%, ${t.color} 100%)`,
          boxShadow: `0 0 14px ${t.color}88`,
        }} />

        {stage === "form" && (
          <>
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{
                    fontSize: 9, fontFamily: T.font_mono, fontWeight: 700,
                    letterSpacing: "0.22em", color: T.textMuted, marginBottom: 6,
                  }}>SECURE CHECKOUT</div>
                  <div style={{
                    fontSize: 20, fontFamily: T.font_sans, fontWeight: 600,
                    color: T.text, lineHeight: 1.1,
                  }}>
                    Subscribe to <span style={{ color: t.color }}>{t.label}</span>
                  </div>
                  <div style={{
                    fontSize: 13, fontFamily: T.font_sans, color: T.textSec, marginTop: 4,
                  }}>
                    {isYearly ? "Annual plan · save " + yearlySavingsPct(tierId) + "%" : "Monthly plan · cancel anytime"}
                  </div>
                </div>
                <button type="button" onClick={onClose}
                  aria-label="Close"
                  style={{
                    background: "transparent", border: "none", color: T.textTer,
                    fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4,
                  }}>×</button>
              </div>
              <div style={{
                marginTop: 14, padding: "12px 14px",
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 8,
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "baseline", marginBottom: isYearly ? 6 : 0,
                }}>
                  <span style={{ fontSize: 13, color: T.textSec, fontFamily: T.font_sans }}>
                    {isYearly ? "Annual subscription" : "Monthly subscription"}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: t.color, fontFamily: T.font_sans }}>
                    ${displayAmount}
                  </span>
                </div>
                {isYearly && (
                  <div style={{
                    fontSize: 11, color: T.textMuted, fontFamily: T.font_mono,
                    letterSpacing: "0.05em",
                  }}>
                    ${(priceData.yearly / 12).toFixed(2)}/month · billed annually
                  </div>
                )}
              </div>
            </div>

            {/* Method tabs — Card + PayPal only */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              borderBottom: `1px solid ${T.border}`,
            }}>
              {[
                { id: "card",    label: "Card",    icon: "▮" },
                { id: "paypal",  label: "PayPal",  icon: "P" },
              ].map(m => (
                <button key={m.id} type="button"
                  onClick={() => setMethod(m.id)}
                  style={{
                    padding: "12px 8px",
                    background: method === m.id ? T.surface : "transparent",
                    border: "none",
                    borderBottom: `2px solid ${method === m.id ? t.color : "transparent"}`,
                    color: method === m.id ? T.text : T.textSec,
                    fontSize: 12, fontFamily: T.font_sans, fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 160ms ease-out",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                  <span style={{ fontSize: 11 }}>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>

            {/* Form body */}
            <div style={{ padding: "20px 24px" }}>
              {method === "card" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <PayField label="Email receipt" value={email} onChange={setEmail}
                    placeholder="you@example.com" error={errors.email} />
                  <PayField label="Card number" value={cardNumber}
                    onChange={v => setCardNumber(formatCardNumber(v))}
                    placeholder="4242 4242 4242 4242" error={errors.cardNumber}
                    suffix={<span style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em" }}>VISA · MC · AMEX</span>} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <PayField label="Expiry" value={cardExpiry}
                      onChange={v => setCardExpiry(formatExpiry(v))}
                      placeholder="MM/YY" error={errors.cardExpiry} />
                    <PayField label="CVC" value={cardCvc}
                      onChange={v => setCardCvc(v.replace(/\D/g,"").slice(0,4))}
                      placeholder="123" error={errors.cardCvc} />
                  </div>
                  <PayField label="Name on card" value={cardName} onChange={setCardName}
                    placeholder="Full name" error={errors.cardName} />
                </div>
              )}

              {method === "paypal" && (
                <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
                  <div style={{
                    fontSize: 13, color: T.textSec, fontFamily: T.font_sans,
                    marginBottom: 16, lineHeight: 1.5,
                  }}>
                    You'll be redirected to PayPal to complete the subscription of <strong style={{ color: T.text }}>${displayAmount}</strong>
                    {isYearly ? " for the first year." : " for your first month."}
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button type="button"
                onClick={handleSubmit}
                style={{
                  marginTop: 18, width: "100%",
                  padding: "14px",
                  minHeight: 48,
                  background: `linear-gradient(180deg, ${t.color} 0%, ${t.color}cc 100%)`,
                  border: `1px solid ${t.color}`,
                  color: "#000",
                  fontFamily: T.font_sans, fontSize: 14, fontWeight: 700,
                  letterSpacing: "0.02em",
                  cursor: "pointer",
                  borderRadius: 8,
                  boxShadow: `0 4px 14px ${t.color}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
                  transition: "transform 100ms ease-out",
                }}
                onMouseDown={e => e.currentTarget.style.transform = "translateY(1px)"}
                onMouseUp={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                {method === "paypal"
                  ? `Continue to PayPal · $${displayAmount}`
                  : `Subscribe · $${displayAmount}`}
              </button>

              {/* Billing note */}
              <div style={{
                marginTop: 10,
                fontSize: 11, color: T.textMuted, fontFamily: T.font_sans,
                textAlign: "center", lineHeight: 1.5,
              }}>
                {isYearly
                  ? `You'll be charged $${displayAmount} today, then $${displayAmount} each year. Cancel anytime.`
                  : `You'll be charged $${displayAmount} today, then $${displayAmount} each month. Cancel anytime.`}
              </div>

              {/* Trust row */}
              <div style={{
                marginTop: 14, display: "flex", justifyContent: "center",
                alignItems: "center", gap: 14,
                fontSize: 10, color: T.textMuted, fontFamily: T.font_mono, letterSpacing: "0.12em",
              }}>
                <span>🔒 SSL</span>
                <span>·</span>
                <span>PCI DSS</span>
                <span>·</span>
                <span>CANCEL ANYTIME</span>
              </div>
              <div style={{
                marginTop: 10, padding: "6px 10px",
                background: `${T.warning}08`,
                border: `1px dashed ${T.warning}33`,
                borderRadius: 6,
                fontSize: 10, fontFamily: T.font_mono,
                color: T.warning, textAlign: "center", letterSpacing: "0.1em",
              }}>
                DEMO — NO REAL PAYMENT PROCESSED
              </div>
            </div>
          </>
        )}

        {stage === "processing" && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, margin: "0 auto 20px",
              border: `3px solid ${T.border}`,
              borderTopColor: t.color,
              borderRadius: "50%",
              animation: "paySpin 0.8s linear infinite",
              boxShadow: `0 0 20px ${t.color}44`,
            }} />
            <div style={{
              fontSize: 14, fontFamily: T.font_sans, fontWeight: 500,
              color: T.text, marginBottom: 6,
            }}>Processing subscription…</div>
            <div style={{ fontSize: 11, color: T.textTer, fontFamily: T.font_mono, letterSpacing: "0.1em" }}>
              DO NOT CLOSE THIS WINDOW
            </div>
          </div>
        )}

        {stage === "success" && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, margin: "0 auto 20px",
              borderRadius: "50%",
              background: `${t.color}22`,
              border: `2px solid ${t.color}`,
              display: "grid", placeItems: "center",
              fontSize: 32, color: t.color,
              animation: "paySuccessPop 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: `0 0 30px ${t.color}66`,
            }}>✓</div>
            <div style={{
              fontSize: 18, fontFamily: T.font_sans, fontWeight: 600,
              color: t.color, marginBottom: 6,
            }}>Subscription active</div>
            <div style={{ fontSize: 13, color: T.textSec, fontFamily: T.font_sans }}>
              Welcome to {t.label}…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: a single labeled field for PaymentModal. Keeps the modal readable.
function PayField({ label, value, onChange, placeholder, error, suffix }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{
        fontSize: 10, fontFamily: T.font_mono, fontWeight: 600,
        letterSpacing: "0.14em", color: T.textTer, marginBottom: 5,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{label.toUpperCase()}</span>
        {suffix}
      </div>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "12px 12px",
          background: T.bg,
          border: `1px solid ${error ? T.danger : T.border}`,
          color: T.text,
          fontSize: 16, fontFamily: T.font_sans, // 16px prevents iOS zoom on focus
          borderRadius: 6,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 140ms ease-out",
          WebkitAppearance: "none",
        }}
        onFocus={e => e.currentTarget.style.borderColor = error ? T.danger : T.borderFocus}
        onBlur={e => e.currentTarget.style.borderColor = error ? T.danger : T.border}
      />
      {error && (
        <div style={{ fontSize: 11, color: T.danger, fontFamily: T.font_sans, marginTop: 4 }}>
          {error}
        </div>
      )}
    </label>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════

// DailyBonusToast — floating notification when user earns daily login bonus.
// Auto-dismisses after 6s (timer lives in TierProvider), but user can tap to
// dismiss earlier. Positioned bottom-right; appears with slide-up animation.
function DailyBonusToast() {
  const { dailyBonus, dismissDailyBonus } = useTier();
  if (!dailyBonus) return null;
  const { streak } = dailyBonus;
  const streakEmoji = streak >= 7 ? "🔥" : streak >= 3 ? "⚡" : "✨";
  return (
    <div
      onClick={dismissDailyBonus}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 20, bottom: 20,
        zIndex: 9999,
        padding: "14px 18px",
        minWidth: 240,
        background: `linear-gradient(135deg, ${V.neonGold}18 0%, ${V.orange}12 100%)`,
        border: `1px solid ${V.neonGold}66`,
        borderRadius: 10,
        boxShadow: `
          0 8px 24px rgba(0,0,0,0.6),
          0 0 40px ${V.neonGold}22,
          inset 0 1px 0 ${V.neonGold}22`,
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        fontFamily: T.font_sans,
        color: T.text,
        animation: "dailyBonusSlide 420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
      <style>{`
        @keyframes dailyBonusSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
      }}>
        <span style={{ fontSize: 18 }}>{streakEmoji}</span>
        <span style={{
          color: V.neonGold, fontFamily: T.font_mono, fontSize: 10,
          fontWeight: 700, letterSpacing: "0.2em",
          textShadow: `0 0 6px ${V.neonGold}66`,
        }}>
          {streak}-DAY STREAK
        </span>
      </div>
      <div style={{
        fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: T.text,
      }}>
        Welcome back
      </div>
      <div style={{
        fontSize: 12, color: T.textSec, marginTop: 3, lineHeight: 1.4,
      }}>
        {streak >= 2 && streak < 6 && "Keep the streak alive"}
        {streak >= 6 && streak < 14 && "You're on fire 🔥"}
        {streak >= 14 && "Legend status"}
      </div>
    </div>
  );
}

export default function HitEngine() {
  const [page, setPage] = useState("engine");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.background = T.bg;
      document.body.style.color = T.text;
      document.body.style.margin = "0";
      document.body.style.fontFamily = T.font_sans;
      document.body.style.fontSize = `${T.fs_base}px`;
      document.body.style.lineHeight = "1.5";
      document.body.style.WebkitFontSmoothing = "antialiased";
      document.body.style.MozOsxFontSmoothing = "grayscale";
    }
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; background: ${T.bg}; }
        body { font-family: ${T.font_sans}; color: ${T.text}; }
        button, input { font-family: inherit; }
        button:focus-visible, input:focus-visible, [role="button"]:focus-visible {
          outline: 1px solid ${T.accent}; outline-offset: 2px;
        }
        .pane-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${T.borderHi} transparent;
        }
        .pane-scroll::-webkit-scrollbar { width: 6px; }
        .pane-scroll::-webkit-scrollbar-track { background: transparent; }
        .pane-scroll::-webkit-scrollbar-thumb {
          background: ${T.border};
          border-radius: 3px;
        }
        .pane-scroll::-webkit-scrollbar-thumb:hover { background: ${T.borderHi}; }
        ::selection { background: ${T.accent}; color: #FFFFFF; }

        /* Page transition — used when switching routes via fuel lever or nav */
        @keyframes pageFadeIn {
          0%   { opacity: 0; transform: translateY(8px) scale(0.996); }
          100% { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .page-transition {
          animation: pageFadeIn 380ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      <TierProvider>
        <LayoutProvider>
          <FuelProvider>
            <div style={{
              minHeight: "100vh",
              background: T.bg,
              color: T.text,
              position: "relative",
              overflowX: "hidden",
            }}>
              {/* ── ATMOSPHERIC BACKGROUND LAYER ─────────────────────────
                  Two stacked effects for depth without noise:
                  1. A soft radial gradient glow from top-center that fades
                     into the page background, giving the viewport dimension
                  2. A fine SVG noise/grain overlay (~2% opacity) that breaks
                     up flat dark surfaces — the 'film grain' texture
                  Both are pointer-events: none so they never interfere. */}
              <div aria-hidden="true" style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 0,
                background: `
                  radial-gradient(ellipse 80% 50% at 50% -10%, ${T.accent}0d 0%, transparent 60%),
                  radial-gradient(ellipse 60% 40% at 10% 110%, ${V.purple}0a 0%, transparent 55%),
                  radial-gradient(ellipse 60% 40% at 90% 110%, ${V.cyan}08 0%, transparent 55%)
                `,
              }} />
              <div aria-hidden="true" style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 0,
                opacity: 0.025,
                mixBlendMode: "overlay",
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
                backgroundSize: "200px 200px",
              }} />
              {/* Everything interactive sits above the background layer */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <Nav page={page} onNavigate={setPage} />
                <ErrorBoundary>
                  <div key={page} className="page-transition">
                    {page === "engine"  && <EnginePage />}
                    {page === "future"  && <FuturePage />}
                    {page === "history" && <HistoryPage />}
                    {page === "secrets" && <PlaybookPage />}
                    {page === "shop"    && <ShopPage />}
                  </div>
                </ErrorBoundary>
                <DailyBonusToast />
              </div>
            </div>
          </FuelProvider>
        </LayoutProvider>
      </TierProvider>
    </>
  );
}
