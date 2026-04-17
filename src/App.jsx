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
  vip:   { id: "vip",   label: "VIP",   color: "#FFD700", description: "Everything + trend radar + exports" },
  admin: { id: "admin", label: "Admin", color: "#EF4444", description: "Behind-the-scenes debug view" },
};

// Feature flags per tier — single source of truth
const TIER_FEATURES = {
  free: {
    // Engine capabilities
    maxSlots: 1,
    modes: ["simple", "moderated", "chaos"],
    maxInstruments: 5,
    maxOptionsPerSection: 5,   // NEW: free sees only first 5 options of each section
    showOptionNames: false,    // NEW: option names hidden, shown as ??? placeholders
    hasOnToggle: false,        // NEW: toggles limited to Off / Auto
    locks: false,
    favorites: false,
    presets: false,
    popHitMeter: false,
    casinoFlash: false,
    // Daily fuel allocation
    dailyFuel: { free: Infinity, pro: 1, trend: 0 },
    // Genre History access
    historyAccess: "main-yearly",   // only main genres, yearly graph only
    historyMaxSelect: 3,
    historyShowsTrendBar: false,
    // Pages
    vipSecretsPage: false,
    adminDebug: false,
  },
  pro: {
    maxSlots: 3,
    modes: ["simple", "moderated", "expanded", "vast", "chaos"],
    maxInstruments: 10,
    maxOptionsPerSection: Infinity,
    showOptionNames: true,
    hasOnToggle: true,
    locks: true,
    favorites: true,
    presets: true,
    popHitMeter: true,
    casinoFlash: true,
    dailyFuel: { free: Infinity, pro: 99, trend: 0 },
    historyAccess: "full-yearly",  // full tree, yearly graph only, 5-graph compare
    historyMaxSelect: 5,
    historyShowsTrendBar: true,
    vipSecretsPage: false,
    adminDebug: false,
  },
  vip: {
    maxSlots: 3,
    modes: ["simple", "moderated", "expanded", "vast", "chaos"],
    maxInstruments: 10,
    maxOptionsPerSection: Infinity,
    showOptionNames: true,
    hasOnToggle: true,
    locks: true,
    favorites: true,
    presets: true,
    popHitMeter: true,
    casinoFlash: true,
    dailyFuel: { free: Infinity, pro: 500, trend: 50 },
    historyAccess: "full-monthly", // full tree, monthly+weekly, 25-graph compare
    historyMaxSelect: 25,
    historyShowsTrendBar: true,
    vipSecretsPage: true,
    adminDebug: false,
  },
  admin: {
    maxSlots: 3,
    modes: ["simple", "moderated", "expanded", "vast", "chaos"],
    maxInstruments: 10,
    maxOptionsPerSection: Infinity,
    showOptionNames: true,
    hasOnToggle: true,
    locks: true,
    favorites: true,
    presets: true,
    popHitMeter: true,
    casinoFlash: true,
    dailyFuel: { free: Infinity, pro: 9999, trend: 9999 },
    historyAccess: "full-monthly",
    historyMaxSelect: 25,
    historyShowsTrendBar: true,
    vipSecretsPage: true,
    adminDebug: true,
  },
};

// ────────────────────────────────────────────────────────────────────────────
// FUEL SYSTEM — three fuel types. Daily counters persist via localStorage.
// ────────────────────────────────────────────────────────────────────────────
const FUEL_TYPES = {
  free:  { id: "free",  label: "Free Hit",  color: "#00FF88", emoji: "🟢" },
  pro:   { id: "pro",   label: "Pro Hit",   color: "#FF1744", emoji: "🔴" },
  trend: { id: "trend", label: "Trend Hit", color: "#1E90FF", emoji: "🔵" },
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

  // Reset fuel allocation whenever tier changes
  useEffect(() => {
    setFuels({ ...features.dailyFuel });
  }, [tier]);

  // If user tries to use a fuel type their tier can't access, bounce to free
  useEffect(() => {
    if (fuels[activeFuel] === 0 && fuels.free > 0) {
      setActiveFuel("free");
    }
  }, [fuels, activeFuel]);

  const consumeFuel = (type) => {
    const t = type || activeFuel;
    if (!Number.isFinite(fuels[t])) return true; // Infinity → no decrement, always allow
    if (fuels[t] <= 0) return false;
    setFuels(prev => ({ ...prev, [t]: Math.max(0, prev[t] - 1) }));
    return true;
  };

  const refillAll = () => setFuels({ ...features.dailyFuel });
  const setFuel = (type, v) => setFuels(prev => ({ ...prev, [type]: v }));

  const value = useMemo(() => ({
    fuels, activeFuel, setActiveFuel, consumeFuel, refillAll, setFuel,
  }), [fuels, activeFuel]);

  return <FuelContext.Provider value={value}>{children}</FuelContext.Provider>;
}

function fuelDisplay(v) {
  if (!Number.isFinite(v)) return "∞";
  return String(v);
}

const TierContext = createContext({ tier: "free", setTier: () => {}, features: TIER_FEATURES.free });

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
    { id: "trend", ...FUEL_TYPES.trend, angle: 0 },
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

function TierProvider({ children }) {
  const [tier, setTier] = useState("pro"); // default new users to Pro so the site feels unlocked
  const features = TIER_FEATURES[tier] || TIER_FEATURES.free;
  const value = useMemo(() => ({ tier, setTier, features }), [tier, features]);
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
  },
  "FX": {
    "Granular texture": ["dense cloud","sparse grains","pitch-shifted grains"],
    "Vocoder": ["Kraftwerk classic","robotic speech","harmonized pad-vocoder"],
    "Pitched risers": ["whoosh build","noise riser","tonal riser"],
    "Vinyl crackle": ["lo-fi crackle","surface noise","sampled vinyl"],
    "Reverse cymbals": ["pre-downbeat swell","snare reverse","long reverse crash"],
    "Field recording": ["urban ambience","nature field","crowd noise","rain"],
    "Sound design hit": ["cinematic boom","sub-drop","metallic clang"],
  },
};

const SPECIFIC_INSTRUMENT_FLAT = Object.entries(SPECIFIC_INSTRUMENTS).flatMap(
  ([cat, insts]) => Object.keys(insts).map(i => ({ cat, name: i }))
);

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
  { id: "chaos",     label: "Chaos",     limit: 800, sub: "maximum narrative",    level: 5 },
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

// Suno-format detailed prompt: structured, compact, label-driven.
// Suno's description field responds best to clear declarative lines, not
// flowing prose. Each line is a self-contained instruction. No meta-
// commentary about what the AI should aim for — just facts.
function buildDetailedSentences(state, lyricsOn) {
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

  // ── LINE 3: VOCALS (explicit and early — critical for Suno) ────────
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

  // ── LINE 6: INSTRUMENTATION (explicit list, Suno-parseable) ────────
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

  // ── LINE 9: STRUCTURE HINT (brief, Suno responds to this) ──────────
  if (lyricsOn) {
    sentences.push({ priority: 10,
      text: `Structure: intro, verse, chorus, verse, chorus, bridge, chorus, outro.` });
  } else {
    sentences.push({ priority: 10,
      text: `Structure: intro, main theme, development, climax, resolution.` });
  }

  // ── LINE 10: PRODUCTION DIRECTIVES (concrete, Suno-actionable) ─────
  sentences.push({ priority: 11,
    text: `Production: modern, professional, radio-ready, cohesive mix, full frequency balance.` });

  // ── LINE 11: AVOID LIST (Suno negatives that improve output) ───────
  if (primary) {
    const genreLow = primary.genre.toLowerCase();
    sentences.push({ priority: 12,
      text: `Avoid: generic ${genreLow} tropes, MIDI-stock presets, thin mixing, loop-based repetition without variation.` });
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
// ── Suno-grammar sanitizer ────────────────────────────────────────────────
// Suno and similar music generators parse commas, periods, and plain words
// well. Em-dashes, semicolons, parentheticals, and bracket notation can
// cause prompt drift. This pass normalizes to Suno-friendly punctuation.
// Note: hyphens inside words (Hip-Hop, TR-808, Lo-Fi, 12-string) are kept
// because they are part of proper names — removing them would damage meaning.
// Suno sanitizer: normalize punctuation to Suno-friendly forms, but
// preserve structural newlines and label colons that Suno uses to parse
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

function compressDetailedPrompt(state, lyricsOn, limit) {
  const sentences = buildDetailedSentences(state, lyricsOn);
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
function Chip({ label, selected, onClick, onDoubleClick, onLockToggle, favorite, locked, disabled, size = "md", casinoOutline }) {
  const [hover, setHover] = useState(false);
  const { layout } = useLayout();
  const { features } = useTier();
  const isMobile = layout === "mobile";
  // Free tier hides option names and shows ??? placeholders. Click still works.
  const hideName = features && features.showOptionNames === false;
  const displayLabel = hideName ? "???" : label;
  const sizes = isMobile ? {
    sm: { padding: "9px 14px", fontSize: T.fs_md, minHeight: 36 },
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
    background: selected ? T.accentBg : (hover && !disabled ? T.hover : "transparent"),
    color: selected ? T.accentHi : (hover && !disabled ? T.text : T.textSec),
    border: `1px solid ${borderColor}`,
    boxShadow: casinoOutline
      ? `0 0 0 1px ${casinoOutline}, 0 0 12px ${casinoOutline}66`
      : locked
        ? `0 0 0 1px ${V.neonGold}, 0 0 10px ${V.neonGold}55`
        : "none",
  };
  return (
    <span
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      onContextMenu={disabled ? undefined : (e) => {
        if (onLockToggle) { e.preventDefault(); onLockToggle(); }
      }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={hideName
        ? `Upgrade to Pro to see option names`
        : onLockToggle
          ? "Click: select · Double-click: favorite · Right-click: lock"
          : undefined}
      style={{
        ...sizes[size], ...base,
        fontFamily: hideName ? T.font_mono : T.font_sans,
        fontWeight: 450,
        letterSpacing: hideName ? "0.15em" : "normal",
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: T.r_md, userSelect: "none",
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: `background ${T.dur_fast} ${T.ease}, color ${T.dur_fast} ${T.ease}, border-color ${T.dur_fast} ${T.ease}, box-shadow ${T.dur_fast} ${T.ease}`,
        opacity: disabled ? 0.35 : 1,
        position: "relative",
      }}>
      {locked && (
        <span style={{
          color: V.neonGold, fontSize: T.fs_xs, lineHeight: 1,
          textShadow: `0 0 6px ${V.neonGold}`,
        }}>🔒</span>
      )}
      {favorite && !locked && (
        <span style={{ color: T.warning, fontSize: T.fs_xs, lineHeight: 1 }}>●</span>
      )}
      {displayLabel}
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
  const { tier, setTier, features } = useTier();
  const { layout } = useLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = layout === "mobile";
  const links = [
    { id: "engine",  label: "Engine" },
    { id: "trend",   label: "Trend Engine" },
    { id: "history", label: "Genre History" },
    { id: "future",  label: "Future of Sound" },
    ...(features.vipSecretsPage ? [{ id: "secrets", label: "VIP Secrets 🤫" }] : []),
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

      {/* Right side — fuel badges + layout toggle + tier switcher + (mobile) hamburger */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {!isMobile && <FuelBadgesNav />}
        <LayoutToggle />
        <TierSwitcher tier={tier} onChange={setTier} />
        {isMobile && (
          <button type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: menuOpen ? T.elevated : T.surface,
              border: `1px solid ${menuOpen ? T.borderFocus : T.border}`,
              color: T.text,
              width: 36, height: 32,
              borderRadius: 6, cursor: "pointer",
              display: "grid", placeItems: "center",
              fontSize: 16, lineHeight: 1,
            }}>{menuOpen ? "×" : "≡"}</button>
        )}
      </div>

      {/* Mobile menu overlay */}
      {isMobile && menuOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "rgba(8,9,11,0.98)",
          borderBottom: `1px solid ${T.border}`,
          backdropFilter: "blur(20px) saturate(150%)",
          padding: T.s2,
          display: "flex", flexDirection: "column", gap: 2,
          zIndex: 99,
        }}>
          {links.map(l => (
            <button key={l.id} type="button"
              onClick={() => { onNavigate(l.id); setMenuOpen(false); }}
              style={{
                background: page === l.id ? T.elevated : "transparent",
                border: "none",
                color: page === l.id ? T.text : T.textSec,
                padding: "14px 18px",
                cursor: "pointer",
                fontSize: 15, fontFamily: T.font_sans, fontWeight: 500,
                borderRadius: 8,
                textAlign: "left",
              }}>{l.label}</button>
          ))}
        </div>
      )}
    </nav>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODE SELECTOR — 5 segmented tabs, Linear-style
// ════════════════════════════════════════════════════════════════════════════

function ModeSelector({ value, onChange, allowedModes }) {
  const activeIdx = MODES.findIndex(m => m.id === value);
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: T.s3,
      }}>
        <Label color={T.textSec}>Prompt depth</Label>
        <span style={{ fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_sans }}>
          {getModeById(value).sub}
        </span>
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
                padding: `${T.s3}px ${T.s2}px`,
                cursor: locked ? "not-allowed" : "pointer",
                fontFamily: T.font_sans, fontSize: T.fs_sm, fontWeight: 500,
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

function GenreSlotPicker({ slots, onChange, slotLocks, onToggleSlotLock, maxSlots = 3, restrictSubgenres = false }) {
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
                {/* Per-slot lock button */}
                <button type="button"
                  onClick={e => { e.stopPropagation(); onToggleSlotLock?.(i); }}
                  title={isLocked ? "Unlock slot" : "Lock slot against randomize"}
                  style={{
                    background: isLocked ? `${V.neonGold}22` : "transparent",
                    border: `1px solid ${isLocked ? V.neonGold : T.border}`,
                    color: isLocked ? V.neonGold : T.textTer,
                    padding: "2px 8px", cursor: "pointer",
                    fontSize: T.fs_xs, fontFamily: T.font_mono, fontWeight: 700,
                    letterSpacing: "0.15em",
                    textShadow: isLocked ? `0 0 6px ${V.neonGold}` : "none",
                    borderRadius: T.r_sm,
                    transition: `all ${T.dur_fast} ${T.ease}`,
                  }}>
                  {isLocked ? "🔒" : "🔓"}
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

function SpecificInstrumentsPicker({ state, setState, favorites, onFavorite, casinoOutlines }) {
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
      <div style={{ display: "flex", gap: T.s2, alignItems: "center", marginBottom: T.s3 }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search instruments"
          style={{
            flex: 1, minWidth: 140,
            background: T.surface, border: `1px solid ${T.border}`,
            color: T.text, padding: `${T.s2}px ${T.s3}px`, fontSize: T.fs_md,
            fontFamily: T.font_sans, outline: "none",
            borderRadius: T.r_md, height: 32,
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
                    {matching.filter(([inst]) => !selected.includes(inst)).map(([inst]) => {
                      const isFav = favorites ? favorites.has(inst) : false;
                      const co = casinoOutlines ? casinoOutlines.get(`si:${inst}`) : null;
                      return (
                        <span key={inst}
                          onClick={() => toggleInst(inst)}
                          onDoubleClick={() => onFavorite && onFavorite(inst)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "5px 10px", cursor: "pointer",
                            background: "transparent",
                            border: `1px solid ${co || T.border}`,
                            boxShadow: co ? `0 0 0 1px ${co}, 0 0 12px ${co}66` : "none",
                            color: T.textSec,
                            fontSize: T.fs_sm, fontFamily: T.font_sans, fontWeight: 450,
                            borderRadius: T.r_md,
                            transition: `all ${T.dur_fast} ${T.ease}`,
                            userSelect: "none",
                          }}>
                          {isFav && <span style={{ color: T.warning, fontSize: T.fs_xs }}>●</span>}
                          {inst}
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
            Pop hit probability
          </div>
          <span style={{ fontSize: T.fs_sm, color: T.textTer, fontFamily: T.font_sans }}>
            rule based estimate of mainstream potential worldwide
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
      }}>
        <div style={{
          height: "100%", width: `${score}%`,
          background: color,
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
    { n: "01", t: "Choose your depth mode", b: "Pick Simple / Moderated / Expanded / Vast / Chaos. This is a hard character ceiling for both outputs and also enforces how many sections appear in the prompt." },
    { n: "02", t: "Add at least one genre slot", b: "Click a slot. Pick a main genre and optionally drill into subgenre and microstyle. You can commit with just a main genre — no need to go deep." },
    { n: "03", t: "Decide Song vs Instrumental", b: "Instrumental auto-disables all vocal sections. Song auto-enables them. You can still override per-section with Off / Auto / On." },
    { n: "04", t: "Anchor the emotion", b: "Pick a Mood and Energy Arc. These do the heaviest lifting toward vibe. If you pick nothing else, pick these." },
    { n: "05", t: "Lock the rhythm", b: "Groove sets feel. BPM is inferred from groove + energy. Leave on Default for flexibility." },
    { n: "06", t: "Name specific instruments sparingly", b: "Select 1–10 instruments with optional articulations. Fewer calls with clear articulation beat long undifferentiated lists." },
    { n: "07", t: "Use Off / Auto / On to shape output", b: "Off suppresses a section entirely. Auto includes it if you've selected something. On forces it in with a fallback if empty." },
    { n: "08", t: "Hit Randomize to explore", b: "The randomizer respects every toggle, fills the exact section count your mode requires, and biases toward your starred favorites." },
    { n: "09", t: "Two outputs, two destinations", b: "Short Prompt is comma-separated tags for a style field. Detailed is natural-language for a description field. Both are hard-validated." },
  ];
  return (
    <div>
      <Label color={T.textSec} style={{ display: "block", marginBottom: T.s3 }}>How to build a prompt</Label>
      <p style={{ color: T.textSec, fontSize: T.fs_base, lineHeight: 1.6, marginBottom: T.s5, maxWidth: 520, fontFamily: T.font_sans }}>
        A sequenced guide to getting a usable prompt out of the engine. Follow in order on your first pass; skip around after.
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
        <Label color={T.textSec} style={{ display: "block", marginBottom: 6 }}>Self-contained guarantee</Label>
        <div style={{ fontSize: T.fs_md, color: T.textSec, lineHeight: 1.6, fontFamily: T.font_sans }}>
          No network calls. No external models. No probabilistic outputs. Every character of every prompt is produced by local, deterministic rules.
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
  const rollTimersRef = useRef([]);

  // ── EFFECTIVE LIMITS — combines tier features + active fuel constraints ──
  // Active fuel TIGHTENS limits further than tier alone. A Pro-tier user
  // rolling Free Fuel gets Free-fuel output: 1 slot, 3 modes, 5 options,
  // free-subgenre whitelist only. Pro Fuel unlocks everything the tier allows.
  const effectiveLimits = useMemo(() => {
    const isFreeFuel = activeFuel === "free";
    return {
      maxSlots: isFreeFuel ? 1 : features.maxSlots,
      modes: isFreeFuel
        ? features.modes.filter(m => ["simple","moderated","chaos"].includes(m))
        : features.modes,
      maxInstruments: isFreeFuel ? Math.min(5, features.maxInstruments) : features.maxInstruments,
      maxOptionsPerSection: isFreeFuel ? 5 : features.maxOptionsPerSection,
      restrictSubgenres: isFreeFuel,   // when true, only FREE_SUBGENRES allowed per main
    };
  }, [activeFuel, features]);

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
  const toggleSlotLock = (i) => setState(s => {
    const next = [...(s.slotLocks || [false, false, false])];
    next[i] = !next[i];
    return { ...s, slotLocks: next };
  });

  // Per-section lock toggle — when true, section's current value is preserved
  const toggleSectionLock = (sectionKey) => setState(s => ({
    ...s,
    sectionLocks: { ...s.sectionLocks, [sectionKey]: !s.sectionLocks?.[sectionKey] },
  }));

  // Per-option lock toggle — stored as "sectionKey:value" in optionLocks array
  const toggleOptionLock = (sectionKey, value) => {
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
  const renderLockBtn = (sectionKey) => {
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
      mood:      maybe("mood",     () => favPick("mood", MOODS)),
      energy:    maybe("energy",   () => favPick("energy", ENERGIES)),
      groove:    maybe("groove",   () => favPick("groove", GROOVES.slice(1).map(g => g.id)), "default"),
      vocalist:  maybe("vocalist", () => favPick("vocalist", VOCALISTS)),
      // Language: sectionLock OR legacy languageLocked both preserve
      language:  (secLocks.language || state.languageLocked)
                   ? state.language
                   : (chosen.has("language")
                       ? favPick("language", LANGUAGES.map(l => l.code))
                       : "en"),
      languageLocked: state.languageLocked,
      lyricalVibe: maybe("lyricalVibe", () => favPick("lyricalVibe", LYRICAL_VIBES)),
      specificInstruments:   specInsts,
      specificArticulations: specArts,
      specificCount:         specCount,
      mix:       maybe("mix",      () => favPick("mix", MIX_CHARS)),
      harmonic:  maybe("harmonic", () => favPick("harmonic", HARMONIC_STYLES)),
      texture:   maybe("texture",  () => favPick("texture", SOUND_TEXTURES)),
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
      // Out of this fuel type — flash a soft warning, bail out
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
  const detailedResult = useMemo(() => compressDetailedPrompt(state, lyricsOn, maxLen), [state, lyricsOn, maxLen]);
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
              Music prompt engine for Suno, Udio, and beyond.
            </p>
            <p style={{
              color: T.textSec, fontSize: T.fs_md, lineHeight: 1.55,
              maxWidth: 600, margin: 0, marginBottom: T.s3,
              fontFamily: T.font_sans,
            }}>
              Pick a genre, hit the red button, get a prompt tuned for how modern AI music models interpret language.
            </p>
            <p style={{
              color: T.textTer, fontSize: T.fs_sm, lineHeight: 1.55,
              maxWidth: 600, margin: 0, fontFamily: T.font_sans,
            }}>
              <span style={{ color: T.text, fontWeight: 500 }}>Click</span> to select
              {" · "}
              <span style={{ color: T.text, fontWeight: 500 }}>Double-click</span> to favorite
              {" · "}
              <span style={{ color: V.neonGold, fontWeight: 500 }}>Right-click</span> to lock against randomize
            </p>
          </div>

          {/* ── PRESETS ─ quick-start configurations ──────────────────────── */}
          {features.presets ? (
            <div style={{ marginBottom: T.s6 }}>
              <Label color={T.textSec} style={{ display: "block", marginBottom: T.s3 }}>
                Quick starts
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

          <Section title="Genre slots" hint="pick up to 3 · main genre alone is fine · instant commit · lock per slot">
            <GenreSlotPicker slots={state.slots} onChange={v => set("slots", v)}
              slotLocks={state.slotLocks} onToggleSlotLock={toggleSlotLock}
              maxSlots={effectiveLimits.maxSlots}
              restrictSubgenres={effectiveLimits.restrictSubgenres} />
          </Section>

          <Section title="Mood"
            toggle={state.toggles.mood} onToggleChange={v => setToggle("mood", v)}
            extra={renderLockBtn("mood")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {MOODS.map(o => (
                <Chip key={o} label={o} selected={state.mood === o}
                  favorite={favSetFor("mood").has(o)}
                  locked={optionLockSetFor("mood").has(o)}
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
              {ENERGIES.map(o => (
                <Chip key={o} label={o} selected={state.energy === o}
                  favorite={favSetFor("energy").has(o)}
                  locked={optionLockSetFor("energy").has(o)}
                  casinoOutline={casinoOutlines.get(`energy:${o}`)}
                  onClick={() => set("energy", state.energy === o ? "" : o)}
                  onDoubleClick={() => toggleFavorite("energy", o)}
                  onLockToggle={() => toggleOptionLock("energy", o)} />
              ))}
            </div>
          </Section>

          <Section title="Groove" hint={`${GROOVES.length} options`}
            toggle={state.toggles.groove} onToggleChange={v => setToggle("groove", v)}
            extra={renderLockBtn("groove")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {GROOVES.map(g => (
                <Chip key={g.id} label={g.label} selected={state.groove === g.id}
                  favorite={favSetFor("groove").has(g.id)}
                  locked={optionLockSetFor("groove").has(g.id)}
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
                  {VOCALISTS.map(o => (
                    <Chip key={o} label={o} selected={state.vocalist === o}
                      favorite={favSetFor("vocalist").has(o)}
                      locked={optionLockSetFor("vocalist").has(o)}
                      casinoOutline={casinoOutlines.get(`vocalist:${o}`)}
                      onClick={() => set("vocalist", state.vocalist === o ? "" : o)}
                      onDoubleClick={() => toggleFavorite("vocalist", o)}
                      onLockToggle={() => toggleOptionLock("vocalist", o)} />
                  ))}
                </div>
              </Section>

              <Section title="Language" hint={`${LANGUAGES.length} options`}
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

              <Section title="Lyrical vibe" hint="framing of the words"
                toggle={state.toggles.lyricalVibe} onToggleChange={v => setToggle("lyricalVibe", v)}
                extra={renderLockBtn("lyricalVibe")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
                  {LYRICAL_VIBES.map(o => (
                    <Chip key={o} label={o} selected={state.lyricalVibe === o}
                      favorite={favSetFor("lyricalVibe").has(o)}
                      locked={optionLockSetFor("lyricalVibe").has(o)}
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
              state.toggles.specificInstruments === "off" ? "excluded"
              : state.toggles.specificInstruments === "on"
                ? `${state.specificInstruments.length} selected · forced count ${state.specificCount}`
                : `${state.specificInstruments.length} selected · auto`
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
              casinoOutlines={casinoOutlines} />
          </Section>

          <Section title="Harmonic style"
            toggle={state.toggles.harmonic} onToggleChange={v => setToggle("harmonic", v)}
            extra={renderLockBtn("harmonic")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.s1 }}>
              {HARMONIC_STYLES.map(o => (
                <Chip key={o} label={o} selected={state.harmonic === o}
                  favorite={favSetFor("harmonic").has(o)}
                  locked={optionLockSetFor("harmonic").has(o)}
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
              {SOUND_TEXTURES.map(o => (
                <Chip key={o} label={o} selected={state.texture === o}
                  favorite={favSetFor("texture").has(o)}
                  locked={optionLockSetFor("texture").has(o)}
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
              {MIX_CHARS.map(o => (
                <Chip key={o} label={o} selected={state.mix === o}
                  favorite={favSetFor("mix").has(o)}
                  locked={optionLockSetFor("mix").has(o)}
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
                OUT OF {FUEL_TYPES[activeFuel].label.toUpperCase()} · RESETS TOMORROW
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
                <TierLock feature="Pop-hit probability meter" requiredTier="pro" />
              )}

              <OutputBlock title="Short prompt" subtitle="comma-separated tags for a style field"
                text={shortResult.text} length={shortResult.text.length} limit={maxLen}
                compressed={shortResult.compressed} compressionLevel={shortResult.level}
                onCopy={() => doCopy("short", shortResult.text)} copyState={copyState.short} />

              <OutputBlock title="Detailed producer prompt" subtitle="natural language for a description field"
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
// HISTORY PAGE — expanded, scored, multi-chart view
// ════════════════════════════════════════════════════════════════════════════

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
  const [sortMode, setSortMode] = useState("trend");
  const [viewMode, setViewMode] = useState("grid");
  const [resolution, setResolution] = useState("yearly"); // yearly|monthly|weekly
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
    if (sortMode === "trend") list = [...list].sort((a, b) => trendIndex[b] - trendIndex[a]);
    else if (sortMode === "az") list = [...list].sort((a, b) => a.localeCompare(b));
    return list;
  }, [searchLower, sortMode, trendIndex]);

  // Top trending (for the featured panel)
  const topTrending = useMemo(() =>
    [...ALL_GENRES].sort((a, b) => trendIndex[b] - trendIndex[a]).slice(0, 10),
    [trendIndex]
  );

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
          Genre History · time-decay trend index
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
          Every genre and subgenre in the engine, plotted from 1960 to now. A time-decay scoring model ranks each by current momentum — genres peaking today score highest, genres that peaked a year ago score lower, a decade ago lower still.
        </p>
        <p style={{
          color: T.textTer, fontSize: T.fs_sm, lineHeight: 1.5, fontFamily: T.font_sans,
        }}>
          Curated data, not real-time. Popularity curves are hand-authored estimates of cultural weight, revisited periodically.
        </p>
      </div>

      {/* ── TOP TRENDING LEADERBOARD ─────────────────────────────────── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: T.r_lg, padding: T.s5, marginBottom: T.s6,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: T.s4 }}>
          <Label color={T.text} size={T.fs_sm}>Top trending right now</Label>
          <span style={{ fontSize: T.fs_xs, color: T.textTer, fontFamily: T.font_mono }}>
            by trend-index score
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: T.s2 }}>
          {topTrending.map((g, i) => {
            const score = trendIndex[g];
            const isOn = selected.includes(g);
            const barColor = score >= 85 ? T.success : score >= 70 ? T.warning : T.accent;
            return (
              <div key={g} onClick={() => toggleGenre(g)} style={{
                padding: T.s3, cursor: "pointer",
                background: isOn ? T.elevated : "transparent",
                border: `1px solid ${isOn ? T.borderHi : T.border}`,
                borderRadius: T.r_md,
                transition: `all ${T.dur_fast} ${T.ease}`,
                position: "relative",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{
                    fontSize: T.fs_xs, color: T.textTer,
                    fontFamily: T.font_mono,
                  }}>#{i + 1}</span>
                  <span style={{
                    fontSize: T.fs_base, fontWeight: 700,
                    color: barColor, fontFamily: T.font_mono,
                  }}>{score}</span>
                </div>
                <div style={{
                  fontSize: T.fs_md, color: T.text, fontWeight: 500,
                  fontFamily: T.font_sans, lineHeight: 1.2, marginBottom: 8,
                }}>{g}</div>
                <div style={{ height: 2, background: T.border, borderRadius: 1, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${score}%`,
                    background: barColor,
                    transition: `width ${T.dur_slow} ${T.ease}`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
            color: T.text, padding: `${T.s2}px ${T.s3}px`,
            fontSize: T.fs_md, fontFamily: T.font_sans,
            borderRadius: T.r_md, outline: "none",
            transition: `border-color ${T.dur_fast} ${T.ease}`,
          }}
          onFocus={e => e.currentTarget.style.borderColor = T.borderFocus}
          onBlur={e => e.currentTarget.style.borderColor = T.border}
        />

        {/* Sort picker */}
        <div style={{
          display: "flex", background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: T.r_md, padding: 2,
        }}>
          {[
            { id: "trend", label: "By trend" },
            { id: "az",    label: "A–Z" },
          ].map(o => (
            <button key={o.id} type="button" onClick={() => setSortMode(o.id)} style={{
              background: sortMode === o.id ? T.elevated : "transparent",
              border: "none",
              color: sortMode === o.id ? T.text : T.textTer,
              padding: `${T.s2}px ${T.s3}px`, cursor: "pointer",
              fontSize: T.fs_sm, fontFamily: T.font_sans, fontWeight: 500,
              borderRadius: T.r_sm,
              transition: `all ${T.dur_fast} ${T.ease}`,
            }}>{o.label}</button>
          ))}
        </div>

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
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
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
// TREND ENGINE PAGE — exclusive to Trend Hit fuel. Pulls from the trend-index
// scoring to propose high-momentum genre combinations the user can roll.
// ════════════════════════════════════════════════════════════════════════════

function TrendEnginePage({ onNavigate }) {
  const { layout } = useLayout();
  const { features, tier } = useTier();
  const { fuels, activeFuel, setActiveFuel, consumeFuel } = useFuel();
  const isMobile = layout === "mobile";

  const [result, setResult] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  // Compute trending genres on mount
  const trendingGenres = useMemo(() => {
    const scored = Object.keys(GENRE_HISTORY).map(g => ({
      name: g, score: calcTrendIndex(GENRE_HISTORY[g]),
    }));
    return scored.sort((a, b) => b.score - a.score);
  }, []);

  // When entering this page, auto-select Trend fuel if available
  useEffect(() => {
    if (fuels.trend > 0 && activeFuel !== "trend") setActiveFuel("trend");
  }, []);

  const canRoll = fuels.trend > 0 && !isRolling;

  const rollTrend = () => {
    if (!canRoll) return;
    if (!consumeFuel("trend")) return;
    setIsRolling(true);
    setTimeout(() => {
      // Pick from top 15 weighted by score
      const top = trendingGenres.slice(0, 15);
      const weights = top.map(t => t.score);
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      let picked = top[0];
      for (const t of top) {
        roll -= t.score;
        if (roll <= 0) { picked = t; break; }
      }
      // Suggest a vocal + mood that's currently hot
      const hotMoods = ["Confident", "Melancholic", "Euphoric", "Sensual", "Dark & brooding", "Nostalgic"];
      const hotVocals = ["Auto-tuned melodic rapper", "Breathy pop vocal", "Anthemic clear lead", "Whispered intimate vocal"];
      const hotGrooves = ["halftime trap", "afrobeats log-drum", "4-on-the-floor", "amapiano log-drum bounce"];

      setResult({
        genre: picked.name,
        score: picked.score,
        mood: hotMoods[Math.floor(Math.random() * hotMoods.length)],
        vocal: hotVocals[Math.floor(Math.random() * hotVocals.length)],
        groove: hotGrooves[Math.floor(Math.random() * hotGrooves.length)],
        bpm: 80 + Math.floor(Math.random() * 80),
      });
      setIsRolling(false);
    }, 900);
  };

  if (fuels.trend <= 0 && features.dailyFuel.trend === 0) {
    // User doesn't have trend fuel access at all
    return (
      <div style={{
        maxWidth: 720, margin: "0 auto",
        padding: isMobile ? `${T.s6}px ${T.s4}px ${T.s10}px` : `${T.s10}px ${T.s7}px ${T.s10}px`,
      }}>
        <Label color={T.textTer} style={{ display: "block", marginBottom: T.s4 }}>
          Trend Engine · real-time momentum rolls
        </Label>
        <h1 style={{
          fontSize: "clamp(32px, 4vw, 48px)",
          lineHeight: 1.05, letterSpacing: "-0.025em",
          margin: 0, marginBottom: T.s4,
          fontFamily: T.font_sans, fontWeight: 600,
        }}>
          What's hot, rolled for you
        </h1>
        <p style={{
          color: T.textSec, fontSize: T.fs_lg, lineHeight: 1.55,
          marginBottom: T.s6, fontFamily: T.font_sans,
        }}>
          The Trend Engine uses live time-decay scoring to roll genre + vibe combinations that are actually trending right now — not evergreen picks. Each roll uses one Trend Hit fuel.
        </p>
        <TierLock feature="Trend Engine rolls" requiredTier="vip" />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 860, margin: "0 auto",
      padding: isMobile ? `${T.s6}px ${T.s4}px ${T.s10}px` : `${T.s10}px ${T.s7}px ${T.s10}px`,
    }}>
      <Label color={T.textTer} style={{ display: "block", marginBottom: T.s4 }}>
        Trend Engine · real-time momentum rolls
      </Label>
      <h1 style={{
        fontSize: "clamp(32px, 4vw, 48px)",
        lineHeight: 1.05, letterSpacing: "-0.025em",
        margin: 0, marginBottom: T.s4,
        fontFamily: T.font_sans, fontWeight: 600,
      }}>
        What's hot, rolled for you
      </h1>
      <p style={{
        color: T.textSec, fontSize: T.fs_lg, lineHeight: 1.55,
        marginBottom: T.s7, fontFamily: T.font_sans, maxWidth: 600,
      }}>
        Each roll samples from the top 15 genres by live trend-index score, weighted by momentum. Uses one Trend Hit fuel per roll.
      </p>

      {/* Current top 5 */}
      <div style={{ marginBottom: T.s7 }}>
        <Label color={T.textSec} style={{ display: "block", marginBottom: T.s3 }}>
          Top 5 trending right now
        </Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: T.s2 }}>
          {trendingGenres.slice(0, 5).map((t, i) => (
            <div key={t.name} style={{
              padding: T.s3,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: T.r_md,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: T.fs_xs, color: T.textTer, fontFamily: T.font_mono }}>#{i + 1}</span>
                <span style={{ color: FUEL_TYPES.trend.color, fontFamily: T.font_mono, fontSize: T.fs_sm, fontWeight: 700 }}>{t.score}</span>
              </div>
              <div style={{ color: T.text, fontSize: T.fs_md, fontWeight: 500, marginTop: 4 }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Roll area */}
      <div style={{
        background: `linear-gradient(180deg, ${T.surface} 0%, ${T.bg} 100%)`,
        border: `1px solid ${FUEL_TYPES.trend.color}55`,
        borderRadius: T.r_lg, padding: T.s6, marginBottom: T.s6,
        boxShadow: `0 0 40px ${FUEL_TYPES.trend.color}22`,
      }}>
        <button type="button" onClick={rollTrend} disabled={!canRoll}
          style={{
            width: "100%",
            padding: "20px 24px",
            background: canRoll
              ? `radial-gradient(circle at 50% 25%, #4FB0FF 0%, ${FUEL_TYPES.trend.color} 50%, #0052CC 100%)`
              : "#1a1d24",
            border: `3px solid ${canRoll ? FUEL_TYPES.trend.color : T.border}`,
            color: canRoll ? "#FFFFFF" : T.textMuted,
            fontSize: 36, fontWeight: 900, letterSpacing: "0.1em",
            fontFamily: T.font_display, fontStyle: "italic",
            cursor: canRoll ? "pointer" : "not-allowed",
            borderRadius: 12,
            boxShadow: canRoll ? `0 0 30px ${FUEL_TYPES.trend.color}88` : "none",
            textShadow: canRoll ? `0 0 12px rgba(255,255,255,0.6), 0 0 24px ${FUEL_TYPES.trend.color}` : "none",
            transition: "all 180ms cubic-bezier(0.16,1,0.3,1)",
          }}>
          {isRolling ? "ROLLING…" : canRoll ? "ROLL TREND" : "OUT OF FUEL"}
        </button>
        <div style={{
          marginTop: T.s3, textAlign: "center",
          fontSize: T.fs_xs, color: T.textTer, fontFamily: T.font_mono, letterSpacing: "0.2em",
        }}>
          {fuelDisplay(fuels.trend)} TREND FUEL REMAINING
        </div>
      </div>

      {/* Result panel */}
      {result && (
        <div style={{
          background: T.surface, border: `1px solid ${FUEL_TYPES.trend.color}44`,
          borderRadius: T.r_lg, padding: T.s5,
        }}>
          <Label color={FUEL_TYPES.trend.color} style={{ display: "block", marginBottom: T.s3 }}>
            Trend roll · {result.score} score
          </Label>
          <div style={{
            fontSize: 28, color: T.text, fontWeight: 700, marginBottom: T.s4,
            fontFamily: T.font_sans, letterSpacing: "-0.02em",
          }}>
            {result.genre}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: T.s3 }}>
            <TrendDetail label="Mood" value={result.mood} />
            <TrendDetail label="Vocal" value={result.vocal} />
            <TrendDetail label="Groove" value={result.groove} />
            <TrendDetail label="Tempo" value={`${result.bpm} BPM`} />
          </div>
          <div style={{
            marginTop: T.s4, padding: T.s3,
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.r_md,
            fontFamily: T.font_mono, fontSize: T.fs_sm, color: T.textSec, lineHeight: 1.5,
          }}>
            <span style={{ color: FUEL_TYPES.trend.color, fontWeight: 700 }}>PROMPT</span>
            <div style={{ marginTop: 6, color: T.text }}>
              {result.genre.toLowerCase()}, {result.mood.toLowerCase()}, {result.vocal.toLowerCase()}, {result.groove} groove, {result.bpm} BPM, modern production, radio-ready.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendDetail({ label, value }) {
  return (
    <div style={{
      padding: T.s3, background: T.bg, border: `1px solid ${T.border}`,
      borderRadius: T.r_md,
    }}>
      <div style={{ fontSize: T.fs_xs, color: T.textTer, fontFamily: T.font_mono, letterSpacing: "0.15em", marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ color: T.text, fontSize: T.fs_md, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VIP SECRETS PAGE — guides to maximize use of Hit Engine
// ════════════════════════════════════════════════════════════════════════════

const VIP_SECRETS = [
  {
    icon: "🎯",
    title: "Prompt depth matters more than prompt length",
    body: "Suno and Udio don't reward essays — they reward well-structured lists. Use Expanded mode (499 chars) as your default. Simple mode cuts useful detail; Chaos mode often bloats with filler that confuses the model. When in doubt, Expanded.",
  },
  {
    icon: "🔒",
    title: "Lock one genre slot, randomize the rest",
    body: "The best fusions come from holding one element steady while the others rotate. Pick your anchor genre (e.g., Trap), right-click to lock, then keep hitting. You'll discover fusions you wouldn't have thought to combine manually.",
  },
  {
    icon: "🎙",
    title: "Always pair vocal style with a specific language",
    body: "Suno interprets \"Breathy female vocal\" + \"English\" very differently from just \"Breathy female vocal.\" Specifying the language reshapes phrasing, cadence, and diction. For non-English, lock the language before rolling.",
  },
  {
    icon: "⚡",
    title: "Halftime trap beats most drum selections",
    body: "When in doubt about rhythm, halftime trap is the most versatile groove for vocal-forward tracks. It works under R&B, hip-hop, pop, dark pop, alt R&B. It's the pocket default of modern production.",
  },
  {
    icon: "🎨",
    title: "Use favorites to build your signature palette",
    body: "Double-click any chip to add to favorites. Do this over a week while rolling. By day 7 you'll have 20-30 favorited options across sections — that's your taste fingerprint. The randomizer weights favorites more heavily.",
  },
  {
    icon: "🔥",
    title: "Pop-hit meter isn't a judge — it's a predictor",
    body: "A 40% score doesn't mean your track is bad. It means the feature combination is less aligned with mainstream pop DNA. Experimental, art-pop, and niche genres will always score lower. Use the meter to know where on the spectrum you're landing, not whether it's good.",
  },
  {
    icon: "📐",
    title: "Specific instruments beat generic descriptions",
    body: "\"Rhodes electric piano with vibrato on\" produces vastly better results than \"electric piano\". Suno's training includes thousands of instrument-specific references. Use the articulation layer — it's what separates amateur prompts from pro ones.",
  },
  {
    icon: "🧭",
    title: "Trend Engine is for when you don't know what's hot",
    body: "Use Trend Engine (costs Trend fuel) when you're out of creative ideas but know you want something currently in the culture. It won't give you niche genres — it rolls from the top 15 by momentum. Good for commercial or viral-leaning tracks.",
  },
];

function VipSecretsPage() {
  const { layout } = useLayout();
  const isMobile = layout === "mobile";
  return (
    <div style={{
      maxWidth: 860, margin: "0 auto",
      padding: isMobile ? `${T.s6}px ${T.s4}px ${T.s10}px` : `${T.s10}px ${T.s7}px ${T.s10}px`,
    }}>
      <Label color={V.neonGold} style={{ display: "block", marginBottom: T.s4 }}>
        VIP Secrets 🤫
      </Label>
      <h1 style={{
        fontSize: "clamp(32px, 4vw, 56px)",
        lineHeight: 1.0, letterSpacing: "-0.03em",
        margin: 0, marginBottom: T.s4,
        fontFamily: T.font_sans, fontWeight: 600,
      }}>
        Maximize what you get from Hit Engine
      </h1>
      <p style={{
        color: T.textSec, fontSize: T.fs_lg, lineHeight: 1.55,
        maxWidth: 640, marginBottom: T.s8, fontFamily: T.font_sans,
      }}>
        Field-tested techniques for extracting the best possible output from Suno, Udio, and other music AIs — learned the hard way so you don't have to.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: T.s3 }}>
        {VIP_SECRETS.map((s, i) => (
          <div key={i} style={{
            padding: T.s5,
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.r_lg,
            display: "flex", gap: T.s4, alignItems: "flex-start",
          }}>
            <div style={{
              fontSize: 28, lineHeight: 1, flexShrink: 0,
              width: 48, height: 48, display: "grid", placeItems: "center",
              background: T.elevated, border: `1px solid ${T.borderHi}`,
              borderRadius: T.r_md,
            }}>{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: T.fs_lg, color: T.text, fontWeight: 600,
                fontFamily: T.font_sans, marginBottom: T.s2, letterSpacing: "-0.01em",
              }}>
                <span style={{
                  color: V.neonGold, fontFamily: T.font_mono, fontSize: T.fs_xs,
                  fontWeight: 700, letterSpacing: "0.25em", marginRight: 10,
                }}>#{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </div>
              <div style={{
                color: T.textSec, fontSize: T.fs_md, lineHeight: 1.6,
                fontFamily: T.font_sans,
              }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: T.s8, padding: T.s5,
        background: `${V.neonGold}08`, border: `1px dashed ${V.neonGold}44`,
        borderRadius: T.r_lg, textAlign: "center",
      }}>
        <div style={{
          fontSize: T.fs_xs, fontFamily: T.font_mono, letterSpacing: "0.25em",
          color: V.neonGold, fontWeight: 700, marginBottom: T.s2,
          textShadow: `0 0 6px ${V.neonGold}66`,
        }}>VIP THANKS</div>
        <div style={{ color: T.textSec, fontSize: T.fs_md, fontFamily: T.font_sans }}>
          More secrets added as we learn them. Your feedback shapes the guide — what's working for you?
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════

export default function app() {
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
      `}</style>
      <TierProvider>
        <LayoutProvider>
          <FuelProvider>
            <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
              <Nav page={page} onNavigate={setPage} />
              <ErrorBoundary>
                {page === "engine"  && <EnginePage />}
                {page === "future"  && <FuturePage />}
                {page === "history" && <HistoryPage />}
                {page === "trend"   && <TrendEnginePage onNavigate={setPage} />}
                {page === "secrets" && <VipSecretsPage />}
              </ErrorBoundary>
            </div>
          </FuelProvider>
        </LayoutProvider>
      </TierProvider>
    </>
  );
}
