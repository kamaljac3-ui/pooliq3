import { useState, useEffect } from "react";

const PARAMS = [
  { key: "chlorine", label: "Free chlorine", unit: "ppm", min: 0, max: 10, step: 0.2, ideal: "1-3 ppm", idealMin: 1, idealMax: 3, target: 2,
    zones: [{ to: 1, tone: "danger" }, { to: 3, tone: "good" }, { to: 5, tone: "warn" }, { to: 10, tone: "danger" }] },
  { key: "ph", label: "pH", unit: "", min: 6.8, max: 8.2, step: 0.1, ideal: "7.2-7.6", idealMin: 7.2, idealMax: 7.6, target: 7.4,
    zones: [{ to: 7.2, tone: "danger" }, { to: 7.6, tone: "good" }, { to: 7.8, tone: "warn" }, { to: 8.2, tone: "danger" }] },
  { key: "alkalinity", label: "Total alkalinity", unit: "ppm", min: 0, max: 240, step: 10, ideal: "80-120 ppm", idealMin: 80, idealMax: 120, target: 100,
    zones: [{ to: 80, tone: "danger" }, { to: 120, tone: "good" }, { to: 180, tone: "warn" }, { to: 240, tone: "danger" }] },
  { key: "cya", label: "Cyanuric acid", unit: "ppm", min: 0, max: 100, step: 5, ideal: "30-50 ppm", idealMin: 30, idealMax: 50, target: 40,
    zones: [{ to: 30, tone: "danger" }, { to: 50, tone: "good" }, { to: 80, tone: "warn" }, { to: 100, tone: "danger" }] },
];

const DEFAULT_READINGS = { chlorine: 2, ph: 7.4, alkalinity: 100, cya: 40 };

const CHEMICAL_CHECKLIST = [
  { key: "tabs", label: "Chlorine tabs", unit: "tabs", dosingMatch: ["Trichlor tabs"] },
  { key: "sodaAsh", label: "Soda ash", unit: "lb", dosingMatch: ["Soda ash"] },
  { key: "bicarb", label: "Bicarb", unit: "lb", dosingMatch: ["Sodium bicarb"] },
  { key: "de", label: "DE", unit: "lb", dosingMatch: [] },
  { key: "liquidChlorine", label: "Liquid chlorine", unit: "gal", dosingMatch: ["Liquid chlorine"] },
  { key: "acid", label: "Acid", unit: "gal", dosingMatch: ["Muriatic acid"] },
  { key: "powerQuest", label: "Power Quest", unit: "oz", dosingMatch: [] },
  { key: "stabilizer", label: "Stabilizer", unit: "lb", dosingMatch: [] },
  { key: "algaecide", label: "Algaecide", unit: "oz", dosingMatch: [] },
  { key: "calcium", label: "Calcium", unit: "lb", dosingMatch: [] },
];
const UNITS = ["oz", "gal", "lb", "tabs"];

const TASKS = [
  "Skimmed surface", "Brushed walls & steps", "Vacuumed floor",
  "Emptied skimmer & pump baskets", "Backwashed filter", "Checked equipment pad",
];

const RAIN_SERVICE_TASKS = [
  "Emptied skimmer & pump baskets", "Checked/adjusted water level", "Checked equipment for flooding",
  "Cleared debris from drains", "Confirmed pump running - no tripped breaker",
];

const WATER_CONDITIONS = ["Clear", "Cloudy", "Algae", "Iron stains"];
const OPENING_WATER_CONDITIONS = ["Clear", "Cloudy", "Green", "Algae", "Black algae", "Iron stains"];
const OPENING_DEFAULT_READINGS = { chlorine: 0, ph: 7.8, alkalinity: 60, cya: 20 };

const OPENING_EQUIPMENT_CHECKLIST = [
  "Winter plugs removed", "Drain plugs reinstalled", "Pump primed", "Filter reassembled",
  "Skimmer baskets installed", "Return fittings / eyeballs installed", "Ladder & handrails installed",
  "Pool light checked", "Heater inspected", "Automation / controls checked", "Water level filled to proper height",
  "Vacuumed floor", "Brushed walls & steps",
];

const FINAL_READY_CHECKLIST = [
  "No leaks at equipment", "Time clock set to run 12 hours",
];

const COVER_STATUS_OPTIONS = ["On the pool", "Removed and stored", "Removed - left out to dry"];

const HEATER_ISSUE_TYPES = ["Heater tray not installed", "Error code displayed", "Won't ignite", "Other"];

const REPAIR_ISSUE_TYPES = [
  "Pump", "Filter", "Heater", "Plumbing / leak", "Electrical",
  "Equipment pad", "Structural / deck", "Automation / controls", "Cover", "Other",
];

const GATE_OPTIONS = ["Front gate", "Side gate", "Back gate", "Pool fence gate", "Other"];

const HOT_TUB_CHEMICAL_CHECKLIST = [
  { key: "bromineTabs", label: "Bromine tabs", unit: "tabs" },
  { key: "chlorineTabs1in", label: "1\" Chlorine tabs", unit: "tabs" },
  { key: "foamOut", label: "Foam out", unit: "oz" },
  { key: "clarifier", label: "Clarifier", unit: "oz" },
  { key: "granularChlorine", label: "Granular chlorine", unit: "oz" },
  { key: "liquidChlorine", label: "Liquid chlorine", unit: "oz" },
  { key: "powerQuest", label: "Power Quest", unit: "oz" },
];

const HOT_TUB_TASKS = ["Vacuumed spa", "Cleaned scum line", "Cleaned cover"];

const EQUIPMENT_REASSEMBLY_TASKS = [
  "Cleaned debris from equipment", "Pump(s) reinstalled", "Filter cartridge reinstalled",
  "Drain plug installed - heater", "Drain plug installed - pump", "Drain plug installed - filter",
  "Water turned on",
];

const FREEZE_DAMAGE_TYPES = ["Cracked pipe", "Cracked pump housing", "Cracked filter", "Cracked heater", "Other"];

const WATER_LEVEL_OPTIONS = ["Low", "Normal", "High"];
const POOL_CLARITY_OPTIONS = ["Clear", "Cloudy", "Very cloudy / green"];

function linerAgeYears(dateStr) {
  if (!dateStr || dateStr === "N/A") return null;
  const then = new Date(dateStr + (dateStr.length === 7 ? "-01" : "") + "T00:00:00");
  if (isNaN(then.getTime())) return null;
  return (Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function shockAllowedFor(info) {
  if (!info) return { allowed: true, reason: "" };
  if (info.poolType === "Gunite") return { allowed: true, reason: "" };
  if (info.poolType === "Vinyl") {
    const age = linerAgeYears(info.lastLinerReplacement);
    if (age === null) return { allowed: false, reason: "Vinyl liner age unknown - confirm the install date before shocking." };
    if (age <= 4) return { allowed: false, reason: `Vinyl liner is ${age.toFixed(1)} years old - no shocking liners 4 years or newer.` };
    return { allowed: true, reason: "" };
  }
  return { allowed: true, reason: "" };
}

const HOT_TUB_REPAIR_ISSUE_TYPES = [
  "Jets", "Spa heater", "Topside control panel", "Blower", "Pump",
  "Cover", "Electrical", "Plumbing / leak", "Other",
];

const HOT_TUB_DRAIN_STEPS = [
  "Drained", "Interior cleaned", "Refilled", "Chemicals rebalanced",
];

const HOT_TUB_CLEANER_TYPES = ["Simple cleaner", "Sequestrant (stains / fungus)"];

const NOT_SERVICEABLE_REASONS = [
  "Gate locked / no access", "Aggressive dog on-site", "Customer not home - access blocked",
  "Unsafe conditions", "Other",
];

const DEFAULT_CUSTOMERS = [
  { name: "Alvarez residence - 214 Cactus Wren Dr", gallons: 15000, poolType: "Gunite", poolSurround: "Deck", town: "Amagansett", frontOfHousePhoto: null,
    hasDogs: true, dogNotes: "Two labs in the backyard, friendly but loud. Owner prefers they're kept inside during service if possible.",
    gateCode: "4471", entryInstructions: "Side gate on the north side of the house, next to the AC unit. Latch is a slide bolt above the handle.",
    coverLocation: "Cover is on the pool when not in use.", coverStorage: "Store rolled cover on the wall mount inside the pool equipment enclosure.",
    coverSize: "16' x 32' rectangle", pumpType: "Pentair IntelliFlo VS", filterType: "DE - 48 sq ft (Pentair FNS Plus)",
    saltCellType: "Pentair IntelliChlor IC40", automationType: "Pentair IntelliCenter", lastHeaterReplacement: "2022-03",
    lastLinerReplacement: "", lastPumpReplacement: "2023-06", skimmerBasketType: "Pentair 513200 standard",
    returnCount: 3, hasAutofill: true, hasPool: true, hasHotTub: true, hotTubGallons: 400, hotTubFilterType: "Cartridge - Pentair Pleatco PWW50", lastFilterCleaning: "2026-07-18",
    contacts: [{ name: "Maria Alvarez", phone: "(602) 555-0114", email: "malvarez@email.com" }] },
  { name: "Desert Ridge HOA - Pool 3", gallons: 42000, poolType: "Gunite", poolSurround: "Patio", town: "East Hampton", frontOfHousePhoto: null,
    hasDogs: false, dogNotes: "",
    gateCode: "8823#", entryInstructions: "Enter through the maintenance gate on the east side of the clubhouse, not the resident gate.",
    coverLocation: "No cover - pool stays uncovered year-round.", coverStorage: "N/A",
    coverSize: "N/A", pumpType: "Pentair WhisperFlo (2x, commercial)", filterType: "Sand - Triton II TR140",
    saltCellType: "None (liquid chlorine feed)", automationType: "None", lastHeaterReplacement: "N/A",
    lastLinerReplacement: "", lastPumpReplacement: "2021-09", skimmerBasketType: "Commercial deck-level skimmers (4)",
    returnCount: 6, hasAutofill: true, hasPool: true, hasHotTub: false, hotTubGallons: null, hotTubFilterType: "", lastFilterCleaning: null,
    contacts: [{ name: "HOA Property Management", phone: "(480) 555-0199", email: "management@desertridgehoa.com" }] },
  { name: "Whitfield residence - 88 Saguaro Ct", gallons: 18000, poolType: "Gunite", poolSurround: "Grass", town: "Sag Harbor", frontOfHousePhoto: null,
    hasDogs: true, dogNotes: "One large dog, kept in a kennel run on the side yard - does not have access to the pool area.",
    gateCode: "1290", entryInstructions: "Front gate combo box to the right of the driveway; walk straight back along the side yard.",
    coverLocation: "Cover is stored, not on the pool during the season.", coverStorage: "Folded cover lives in the shed behind the pump pad.",
    coverSize: "18' x 36' rectangle", pumpType: "Hayward Super Pump VS", filterType: "Cartridge - Hayward SwimClear C4030",
    saltCellType: "Hayward AquaRite T-15", automationType: "Hayward OmniLogic", lastHeaterReplacement: "2024-01",
    lastLinerReplacement: "", lastPumpReplacement: "2024-01", skimmerBasketType: "Hayward SPX1091R",
    returnCount: 4, hasAutofill: false, hasPool: true, hasHotTub: true, hotTubGallons: 450, hotTubFilterType: "Cartridge - Hayward CX870RE", lastFilterCleaning: "2026-07-10",
    contacts: [{ name: "David Whitfield", phone: "(602) 555-0177", email: "dwhitfield@email.com" }, { name: "Susan Whitfield", phone: "(602) 555-0178", email: "" }] },
  { name: "Thompson residence - 40 Camelback Rd", gallons: 12000, poolType: "Vinyl", poolSurround: "Deck", town: "Springs", frontOfHousePhoto: null,
    hasDogs: false, dogNotes: "",
    gateCode: "6604", entryInstructions: "Gate is on the west side, behind the RV parking pad.",
    coverLocation: "Cover is on the pool.", coverStorage: "Cover reel is mounted at the shallow end - crank handle is in the equipment shed.",
    coverSize: "14' x 28' rectangle", pumpType: "Jandy FloPro VS", filterType: "Cartridge - Jandy CV460",
    saltCellType: "Jandy AquaPure 1400", automationType: "Jandy iAqualink", lastHeaterReplacement: "2020-11",
    lastLinerReplacement: "2023-04", lastPumpReplacement: "2022-05", skimmerBasketType: "Jandy R0311800",
    returnCount: 2, hasAutofill: false, hasPool: true, hasHotTub: false, hotTubGallons: null, hotTubFilterType: "", lastFilterCleaning: null,
    contacts: [{ name: "Karen Thompson", phone: "(480) 555-0142", email: "kthompson@email.com" }] },
  { name: "Sunview Apartments - Main Pool", gallons: 30000, poolType: "Gunite", poolSurround: "Patio", town: "Southampton", frontOfHousePhoto: null,
    hasDogs: false, dogNotes: "No pets allowed on property.",
    gateCode: "No code - leasing office unlocks at 6am", entryInstructions: "Access through the leasing office breezeway, then the pool gate on the left.",
    coverLocation: "No cover.", coverStorage: "N/A",
    coverSize: "N/A", pumpType: "Pentair IntelliFlo3 VSF (commercial)", filterType: "Sand - Pentair Triton II TR100",
    saltCellType: "None (liquid chlorine feed)", automationType: "Pentair IntelliCenter", lastHeaterReplacement: "N/A",
    lastLinerReplacement: "", lastPumpReplacement: "2023-02", skimmerBasketType: "Commercial deck-level skimmers (3)",
    returnCount: 5, hasAutofill: true, hasPool: true, hasHotTub: false, hotTubGallons: null, hotTubFilterType: "", lastFilterCleaning: null,
    contacts: [{ name: "Leasing Office", phone: "(602) 555-0188", email: "leasing@sunviewapts.com" }] },
  { name: "Reyes residence - 55 Ocotillo Way", gallons: null, poolType: "N/A - no pool", poolSurround: "Patio", town: "Wainscott", frontOfHousePhoto: null,
    hasDogs: false, dogNotes: "",
    gateCode: "2298", entryInstructions: "Side gate off the driveway, spa is on the back patio right past the gate.",
    coverLocation: "Spa cover is on the spa.", coverStorage: "N/A - stays on the spa.",
    coverSize: "7' x 7' spa cover", pumpType: "Balboa 2-speed", filterType: "Cartridge - Pleatco PDM28",
    saltCellType: "None", automationType: "Balboa topside control panel", lastHeaterReplacement: "2023-08",
    lastLinerReplacement: "", lastPumpReplacement: "2023-08", skimmerBasketType: "N/A - spa skim only",
    returnCount: 4, hasAutofill: false, hasPool: false, hasHotTub: true, hotTubGallons: 400,
    hotTubFilterType: "Cartridge - Pleatco PDM28", lastFilterCleaning: "2026-07-05",
    contacts: [{ name: "Ana Reyes", phone: "(602) 555-0163", email: "areyes@email.com" }] },
  { name: "Bennett residence - 12 Paseo del Sol", gallons: 16500, poolType: "Gunite", poolSurround: "Deck", town: "Sagaponack", frontOfHousePhoto: null,
    hasDogs: false, dogNotes: "",
    gateCode: "3315", entryInstructions: "Gate on the east side, past the AC condensers.",
    coverLocation: "No cover - year round pool.", coverStorage: "N/A",
    coverSize: "N/A", pumpType: "Pentair IntelliFlo VS", filterType: "Cartridge - Pentair Clean & Clear 320",
    saltCellType: "Pentair IntelliChlor IC20", automationType: "None", lastHeaterReplacement: "2021-06",
    lastLinerReplacement: "", lastPumpReplacement: "2022-11", skimmerBasketType: "Pentair 513200 standard",
    returnCount: 2, hasAutofill: false, hasPool: true, hasHotTub: false, hotTubGallons: null, hotTubFilterType: "", lastFilterCleaning: null,
    contacts: [{ name: "Tom Bennett", phone: "(602) 555-0129", email: "tbennett@email.com" }] },
  { name: "Ortiz residence - 901 Desert Willow Ln", gallons: 20000, poolType: "Gunite", poolSurround: "Grass", town: "Bridgehampton", frontOfHousePhoto: null,
    hasDogs: true, dogNotes: "One small dog, usually kept indoors - shouldn't be an issue in the yard.",
    gateCode: "7742", entryInstructions: "Back gate behind the RV gate, code box on the post.",
    coverLocation: "Cover is on the pool.", coverStorage: "Cover reel at the shallow end.",
    coverSize: "18' x 40' rectangle", pumpType: "Jandy FloPro VS", filterType: "DE - 60 sq ft",
    saltCellType: "Jandy AquaPure 1400", automationType: "Jandy iAqualink", lastHeaterReplacement: "2024-09",
    lastLinerReplacement: "", lastPumpReplacement: "2024-09", skimmerBasketType: "Jandy R0311800",
    returnCount: 4, hasAutofill: true, hasPool: true, hasHotTub: true, hotTubGallons: 425,
    hotTubFilterType: "Cartridge - Jandy CV340", lastFilterCleaning: "2026-06-28",
    contacts: [{ name: "Luis Ortiz", phone: "(480) 555-0155", email: "lortiz@email.com" }] },
  { name: "Fairview Townhomes - Community Pool", gallons: 35000, poolType: "Gunite", poolSurround: "Patio", town: "Water Mill", frontOfHousePhoto: null,
    hasDogs: false, dogNotes: "No pets allowed on property.",
    gateCode: "9910", entryInstructions: "Gate code box at the main pool entrance off the parking lot.",
    coverLocation: "No cover.", coverStorage: "N/A",
    coverSize: "N/A", pumpType: "Hayward Super Pump (2x, commercial)", filterType: "Sand - Hayward ProGrid",
    saltCellType: "None (liquid chlorine feed)", automationType: "Hayward OmniLogic", lastHeaterReplacement: "N/A",
    lastLinerReplacement: "", lastPumpReplacement: "2022-04", skimmerBasketType: "Commercial deck-level skimmers (5)",
    returnCount: 6, hasAutofill: true, hasPool: true, hasHotTub: false, hotTubGallons: null, hotTubFilterType: "", lastFilterCleaning: null,
    contacts: [{ name: "HOA Management", phone: "(602) 555-0171", email: "info@fairviewhoa.com" }] },
  { name: "Nguyen residence - 233 Copper Ridge Dr", gallons: 14000, poolType: "Vinyl", poolSurround: "Deck", town: "Northwest Woods", frontOfHousePhoto: null,
    hasDogs: false, dogNotes: "",
    gateCode: "5561", entryInstructions: "Side yard gate, latch is a hook-and-eye above the handle.",
    coverLocation: "Cover is on the pool.", coverStorage: "Cover reel at the shallow end.",
    coverSize: "16' x 34' rectangle", pumpType: "Hayward Super Pump VS", filterType: "Cartridge - Hayward SwimClear C3025",
    saltCellType: "Hayward AquaRite T-9", automationType: "None", lastHeaterReplacement: "2023-02",
    lastLinerReplacement: "2025-05", lastPumpReplacement: "2023-02", skimmerBasketType: "Hayward SPX1091R",
    returnCount: 2, hasAutofill: false, hasPool: true, hasHotTub: false, hotTubGallons: null, hotTubFilterType: "", lastFilterCleaning: null,
    contacts: [{ name: "Mai Nguyen", phone: "(480) 555-0188", email: "mnguyen@email.com" }] },
];

const POOL_TYPES = ["Gunite", "Vinyl", "N/A - no pool"];

const SURROUND_TYPES = ["Deck", "Grass", "Patio", "Other"];

const TOWNS = [
  "Amagansett", "Northwest Woods", "Springs", "East Hampton", "Sag Harbor",
  "Wainscott", "Sagaponack", "Bridgehampton", "Water Mill", "Southampton",
];

const BLANK_CUSTOMER = {
  name: "", gallons: 15000, poolType: "Gunite", poolSurround: "Deck", town: "East Hampton", frontOfHousePhoto: null,
  hasDogs: false, dogNotes: "", gateCode: "", entryInstructions: "",
  coverLocation: "", coverStorage: "", coverSize: "", pumpType: "", filterType: "",
  saltCellType: "", automationType: "", lastHeaterReplacement: "", lastLinerReplacement: "",
  lastPumpReplacement: "", skimmerBasketType: "", returnCount: 2, hasAutofill: false,
  hasPool: true, hasHotTub: false, hotTubGallons: null, hotTubFilterType: "", lastFilterCleaning: null,
  contacts: [{ name: "", phone: "", email: "" }],
};

const PUMP_DOWN_STEPS = [
  "Submersible pump placed at deep end", "Pool drained", "Power washed", "Refilling started",
];


const ACID_WASH_TARGETS = ["Pool", "Spa", "Pool and Spa"];

function toneVar(tone) {
  if (tone === "good") return "var(--good)";
  if (tone === "warn") return "var(--warn)";
  return "var(--danger)";
}
function zoneOf(param, value) {
  for (const z of param.zones) if (value <= z.to) return z.tone;
  return param.zones[param.zones.length - 1].tone;
}
function worstTone(tones) {
  if (tones.includes("danger")) return "danger";
  if (tones.includes("warn")) return "warn";
  return "good";
}
function round(n, step) {
  const p = step >= 1 ? 0 : 2;
  return +n.toFixed(p);
}
function buildDosing({ readings, gallons, avgForecastHigh, daysUntilNext }) {
  const scale = gallons / 10000;
  const suggestions = [];
  if (readings.chlorine < PARAMS[0].idealMin) {
    const deficit = PARAMS[0].target - readings.chlorine;
    const liquidGal = round((deficit * 13 * scale) / 128, 0.1);
    suggestions.push({ chemical: "Liquid chlorine", amount: `${liquidGal}`, unit: "gal",
      why: `Free chlorine is at ${readings.chlorine} ppm, below the ${PARAMS[0].ideal} target.` });
    if (avgForecastHigh >= 100) {
      const tabs = Math.ceil(gallons / 7500) * Math.ceil(daysUntilNext / 7);
      suggestions.push({ chemical: "Trichlor tabs", amount: `${tabs}`, unit: "tabs",
        why: `Avg forecast high of ${avgForecastHigh}°F over ${daysUntilNext} days until next visit will burn off liquid chlorine fast - tabs hold a steadier residual in the feeder or skimmer.` });
    }
  }
  if (readings.ph < PARAMS[1].idealMin) {
    const deficit = PARAMS[1].target - readings.ph;
    const sodaAshLb = round((deficit / 0.2) * 6 * scale / 16, 0.1);
    suggestions.push({ chemical: "Soda ash", amount: `${sodaAshLb}`, unit: "lb",
      why: `pH is at ${readings.ph}, below the ${PARAMS[1].ideal} target.` });
  }
  if (readings.alkalinity < PARAMS[2].idealMin) {
    const deficit = PARAMS[2].target - readings.alkalinity;
    const bicarbLb = round((deficit / 10) * 1.5 * scale, 2);
    suggestions.push({ chemical: "Sodium bicarb", amount: `${bicarbLb}`, unit: "lb",
      why: `Total alkalinity is at ${readings.alkalinity} ppm, below the ${PARAMS[2].ideal} target.` });
  }

  if (readings.chlorine > PARAMS[0].idealMax) {
    if (readings.chlorine > 5) {
      const excess = readings.chlorine - PARAMS[0].target;
      const thiosulfateOz = round(excess * 2 * scale, 1);
      suggestions.push({ chemical: "Sodium thiosulfate", amount: `${thiosulfateOz}`, unit: "oz",
        why: `Free chlorine is very high at ${readings.chlorine} ppm. This neutralizes the excess - add gradually and retest before swimmers go back in.` });
    } else {
      suggestions.push({ chemical: "Hold off on chlorine", amount: "-", unit: "",
        why: `Free chlorine is at ${readings.chlorine} ppm, above the ${PARAMS[0].ideal} target. Skip adding more this visit and let it drop naturally.` });
    }
  }

  const highPh = readings.ph > PARAMS[1].idealMax;
  const highAlk = readings.alkalinity > PARAMS[2].idealMax;
  if (highPh || highAlk) {
    const phExcess = highPh ? readings.ph - PARAMS[1].target : 0;
    const phAcidOz = phExcess > 0 ? round((phExcess / 0.2) * 25 * scale, 1) : 0;
    const alkExcess = highAlk ? readings.alkalinity - PARAMS[2].target : 0;
    const alkAcidOz = alkExcess > 0 ? round((alkExcess / 10) * 25 * scale, 1) : 0;
    const acidGal = round(Math.max(phAcidOz, alkAcidOz) / 128, 0.1);
    let why;
    if (highPh && highAlk) {
      why = `pH is at ${readings.ph} and total alkalinity is at ${readings.alkalinity} ppm, both above target. Acid lowers both together - add once and retest before dosing again.`;
    } else if (highPh) {
      why = `pH is at ${readings.ph}, above the ${PARAMS[1].ideal} target.`;
    } else {
      why = `Total alkalinity is at ${readings.alkalinity} ppm, above the ${PARAMS[2].ideal} target. Lowering it fully may take more than one treatment.`;
    }
    suggestions.push({ chemical: "Muriatic acid", amount: `${acidGal}`, unit: "gal", why });
  }

  return suggestions;
}
function formatDuration(ms) {
  if (!ms || ms < 0) return "0m 0s";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}
function formatClock(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function dateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function todayStr() { return dateStr(0); }
function tomorrowStr() { return dateStr(1); }

const TRANSLATIONS = {
  "Field log": "Registro de campo",
  "Phone or email": "Teléfono o correo electrónico",
  "Password": "Contraseña",
  "Log in as technician": "Iniciar sesión como técnico",
  "Log in as service manager": "Iniciar sesión como gerente",
  "Prototype login - any phone/email and password combination works.": "Inicio de sesión de prueba - cualquier combinación de teléfono/correo y contraseña funciona.",
  "Log out": "Cerrar sesión",
  "Today's Route": "Ruta de hoy",
  "Weekly Service": "Servicio semanal",
  "Equipment Setup": "Preparación de equipo",
  "Pool Opening": "Apertura de piscina",
  "Hot Tub Service": "Servicio de jacuzzi",
  "No route assigned for today yet - check with your service manager.": "Aún no hay ruta asignada para hoy - consulte con su gerente de servicio.",
  "Customer": "Cliente",
  "Select a stop...": "Seleccione una parada...",
  "Site info": "Información del sitio",
  "Edit": "Editar",
  "Dogs on property": "Hay perros en la propiedad",
  "No dogs on property": "No hay perros en la propiedad",
  "Pool type": "Tipo de piscina",
  "Surround": "Área alrededor",
  "Gate code": "Código de la puerta",
  "Backyard access": "Acceso al patio",
  "Pool cover": "Cubierta de la piscina",
  "Cover storage": "Almacenamiento de la cubierta",
  "Can't service this stop today": "No se puede realizar el servicio hoy",
  "Reason": "Motivo",
  "Details": "Detalles",
  "Mark not serviceable": "Marcar como no realizado",
  "Photos": "Fotos",
  "Before": "Antes",
  "After": "Después",
  "On site longer than 30 minutes": "En el sitio más de 30 minutos",
  "Why": "Por qué",
  "Downpour - rain service": "Lluvia intensa - servicio de lluvia",
  "Chemical readings": "Lecturas químicas",
  "Suggested dosing": "Dosis sugerida",
  "Water condition": "Condición del agua",
  "This stop needs a repair": "Esta parada necesita una reparación",
  "Issue type": "Tipo de problema",
  "What's wrong": "Qué está mal",
  "Gate closed": "Puerta cerrada",
  "Chemicals added": "Químicos agregados",
  "Miscellaneous": "Varios",
  "Notes": "Notas",
  "Anything the office should know...": "Cualquier cosa que la oficina deba saber...",
  "Log this stop": "Registrar esta parada",
  "Today's stops": "Paradas de hoy",
  "No stops logged yet - your first one will show up here.": "Aún no se han registrado paradas - la primera aparecerá aquí.",
  "Sent": "Enviado",
  "Draft": "Borrador",
  "Delete": "Eliminar",
  "Yes": "Sí",
  "No": "No",
  "Note language": "Idioma de la nota",
  "This note is in Spanish": "Esta nota está en español",
};

function t(lang, text) {
  if (lang !== "es") return text;
  return TRANSLATIONS[text] || text;
}

const GLOBAL_STYLES = `
  .pfl-root {
    --bg: #F6FAF9; --card: #FFFFFF; --ink: #10262A; --muted: #5C7A80;
    --line: #DCE7E6; --primary: #0F5C66; --accent: #E8873B; --repair: #B23A48;
    --good: #3F9142; --warn: #C98A1E; --danger: #C1503F;
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg); color: var(--ink);
    padding: 20px; border-radius: 16px; max-width: 480px; margin: 0 auto;
  }
  .pfl-root * { box-sizing: border-box; }
  .pfl-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
  .pfl-header h1 { font-family: 'Space Grotesk', Inter, sans-serif; font-size: 20px; font-weight: 700; margin: 0; color: var(--primary); }
  .pfl-header span { font-size: 13px; color: var(--muted); }
  .session-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 12px; color: var(--muted); }
  .session-bar button { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; color: var(--muted); }
  .pfl-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
  .pfl-field-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin-bottom: 6px; display: block; }
  .pfl-select, .pfl-textarea, .pfl-num, .pfl-unit, .pfl-text {
    width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px;
    font-size: 15px; font-family: inherit; background: #fff; color: var(--ink);
  }
  .pfl-textarea { min-height: 64px; resize: vertical; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-2 label.pfl-field-label { margin-top: 10px; }
  .grid-2 > div:first-child label.pfl-field-label { margin-top: 0; }
  .timer-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .lang-toggle-row { display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 8px; }
  .lang-btn { border: 1px solid var(--line); background: #fff; color: var(--muted); font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 8px; cursor: pointer; }
  .lang-btn.on { background: var(--primary); border-color: var(--primary); color: #fff; }
  .brand-hero {
    position: relative; overflow: hidden; border-radius: 14px; margin-bottom: 16px;
    background: linear-gradient(135deg, #1450C4 0%, #2E7CF6 55%, #4FA0FF 100%);
    padding: 28px 20px 20px; text-align: center;
  }
  .brand-waves { position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; }
  .brand-hero-content { position: relative; z-index: 1; }
  .brand-name { font-family: 'Space Grotesk', Inter, sans-serif; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: 0.08em; }
  .brand-sub { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.85); letter-spacing: 0.18em; margin-top: 2px; }
  .brand-tagline { font-size: 12px; font-style: italic; color: rgba(255,255,255,0.9); margin-top: 10px; }
  .brand-location { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 4px; }
  .no-service-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; margin-bottom: 12px; }
  .readiness-row { display: flex; align-items: center; gap: 14px; }
  .readiness-row input[type=range] { flex: 1; accent-color: var(--primary); }
  .readiness-pct { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; width: 54px; text-align: right; }
  .mode-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
  .route-page { text-align: center; }
  .route-page-name { font-family: 'Space Grotesk', Inter, sans-serif; font-size: 22px; font-weight: 700; color: var(--primary); }
  .route-page-date { font-size: 14px; color: var(--muted); margin-top: 2px; margin-bottom: 18px; }
  .route-list { text-align: left; }
  .route-item { display: flex; align-items: flex-start; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line); }
  .route-item-clickable { cursor: pointer; }
  .route-item:first-child { border-top: none; }
  .route-status-box { width: 36px; height: 36px; border-radius: 8px; border: 2px solid var(--line); background: #fff; flex-shrink: 0; cursor: default; }
  .route-status-box.completed { background: var(--good); border-color: var(--good); }
  .route-status-box.notServiceable { background: var(--danger); border-color: var(--danger); cursor: pointer; }
  .route-item-body { flex: 1; }
  .route-item-name { font-size: 15px; font-weight: 600; margin-top: 6px; }
  .route-item-reason { font-size: 12px; color: var(--repair); margin-top: 4px; }
  .mode-tab { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--line); background: #fff; font-size: 13px; font-weight: 700; color: var(--muted); cursor: pointer; }
  .mode-tab.on { background: var(--primary); border-color: var(--primary); color: #fff; }
  .stop-flag.opening { color: #6B4FBB; border-color: #6B4FBB; }
  .stop-flag.rain { color: #1D6FA8; border-color: #1D6FA8; }
  .site-card { border-color: var(--primary); }
  .house-photo-wrap { cursor: pointer; margin-bottom: 10px; }
  .house-photo { width: 100%; height: 110px; object-fit: cover; border-radius: 10px; border: 1px solid var(--line); display: block; }
  .house-photo.expanded { height: 260px; }
  .house-photo-caption { font-size: 11px; color: var(--muted); text-align: center; margin-top: 4px; }
  .site-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .site-edit-link { border: none; background: none; color: var(--primary); font-size: 12px; font-weight: 700; cursor: pointer; }
  .site-dropdown-arrow { font-size: 10px; color: var(--muted); margin-left: 4px; }
  .dog-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-bottom: 8px; }
  .dog-badge.yes { background: #FFF1D6; color: var(--warn); }
  .dog-badge.no { background: #E9F5EA; color: var(--good); }
  .site-note { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
  .site-row { display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; border-top: 1px solid var(--line); font-size: 13px; }
  .site-row span:first-child { font-weight: 600; color: var(--muted); flex-shrink: 0; }
  .site-row.stacked { flex-direction: column; gap: 2px; }
  .site-value { color: var(--ink); text-align: right; }
  .site-row.stacked .site-value { text-align: left; }
  .site-dog-toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .site-edit-actions { display: flex; gap: 10px; margin-top: 14px; }
  .site-save-btn { flex: 1; padding: 10px; border: none; border-radius: 10px; background: var(--primary); color: #fff; font-weight: 700; cursor: pointer; }
  .site-cancel-btn { flex: 1; padding: 10px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--muted); font-weight: 700; cursor: pointer; }
  .manual-time-row { display: flex; align-items: flex-end; gap: 12px; }
  .manual-time-field { width: 70px; }
  .manual-time-total { margin-left: auto; text-align: right; }
  .timer-display { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .timer-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .timer-btn { padding: 10px 16px; border-radius: 10px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; }
  .timer-btn.start { background: var(--primary); color: #fff; }
  .timer-btn.complete { background: var(--accent); color: #fff; }
  .timer-btn:disabled { background: var(--line); color: var(--muted); cursor: default; }
  .capture-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
  .capture-slot { display: flex; flex-direction: column; }
  .capture-label { font-size: 12px; font-weight: 700; color: var(--muted); margin-bottom: 6px; }
  .capture-btn {
    height: 100px; border: 1px dashed var(--line); border-radius: 10px; background: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    font-size: 12px; color: var(--muted); cursor: pointer; text-align: center; padding: 8px;
  }
  .capture-icon { font-size: 20px; font-style: normal; color: var(--primary); }
  .capture-btn input { display: none; }
  .capture-thumb { position: relative; height: 100px; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); }
  .capture-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .capture-stamp { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(16,38,42,0.65); color: #fff; font-size: 10px; padding: 2px 6px; text-align: center; }
  .capture-retake { position: absolute; top: 4px; right: 4px; background: rgba(16,38,42,0.7); color: #fff; border: none; border-radius: 6px; font-size: 10px; padding: 3px 6px; cursor: pointer; }
  .capture-note { font-size: 11px; color: var(--muted); margin-top: 10px; }
  .reading { margin-bottom: 18px; }
  .reading:last-child { margin-bottom: 0; }
  .reading-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .reading-label { font-size: 14px; font-weight: 600; }
  .reading-value { font-size: 14px; font-weight: 700; }
  .reading-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; position: relative; margin-bottom: 8px; }
  .reading-marker { position: absolute; top: -3px; width: 3px; height: 14px; background: var(--ink); border-radius: 2px; transform: translateX(-1px); }
  .reading-controls { display: flex; align-items: center; gap: 8px; }
  .reading-controls button {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line);
    background: #fff; font-size: 16px; font-weight: 700; color: var(--primary); cursor: pointer; flex-shrink: 0;
  }
  .reading-controls input[type=range] { flex: 1; accent-color: var(--primary); }
  .reading-ideal { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .chem-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .chem-item:last-child { border-bottom: none; }
  .chem-item label { flex: 1; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .chem-item .pfl-num { width: 70px; flex: none; }
  .chem-item .chem-unit { font-size: 12px; color: var(--muted); width: 34px; flex: none; }
  .chem-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; margin-top: 10px; }
  .chem-row input.pfl-select { flex: 2; }
  .chem-row input.pfl-num { flex: 1; width: 60px; }
  .chem-row select.pfl-unit { flex: 1; }
  .chem-row button { border: none; background: none; color: var(--danger); font-size: 18px; cursor: pointer; padding: 4px 8px; }
  .add-chem-btn {
    width: 100%; padding: 10px; border: 1px dashed var(--line); border-radius: 10px;
    background: none; color: var(--primary); font-weight: 600; font-size: 14px; cursor: pointer; margin-top: 10px;
  }
  .task-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .task-chip {
    padding: 8px 12px; border-radius: 20px; border: 1px solid var(--line); background: #fff;
    font-size: 13px; cursor: pointer; color: var(--muted);
  }
  .task-chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
  .task-chip.condition.on { background: var(--accent); border-color: var(--accent); }
  .dosing-card { border-color: var(--accent); background: #FFF6EC; }
  .rain-card { border-color: var(--primary); background: #EAF4F6; }
  .dosing-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F0DDC4; }
  .dosing-item:last-child { border-bottom: none; }
  .dosing-chem { font-size: 14px; font-weight: 700; color: var(--accent); }
  .dosing-why { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .dosing-amount { font-size: 15px; font-weight: 700; white-space: nowrap; }
  .dosing-note { font-size: 11px; color: var(--muted); margin-top: 10px; }
  .follow-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
  .follow-row label { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .follow-reason { font-size: 12px; color: var(--muted); }
  .repair-toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .repair-body { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  .photo-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .photo-thumb { position: relative; width: 64px; height: 64px; border-radius: 8px; overflow: hidden; border: 1px solid var(--line); }
  .photo-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .photo-thumb button { position: absolute; top: 2px; right: 2px; background: rgba(16,38,42,0.7); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; line-height: 1; cursor: pointer; }
  .photo-add {
    width: 64px; height: 64px; border-radius: 8px; border: 1px dashed var(--line); background: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 22px; color: var(--muted); cursor: pointer;
  }
  .photo-add input { display: none; }
  .submit-btn {
    width: 100%; padding: 14px; border: none; border-radius: 12px; background: var(--accent);
    color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 4px;
  }
  .endday-btn {
    width: 100%; padding: 14px; border: none; border-radius: 12px; background: var(--primary);
    color: #fff; font-size: 16px; font-weight: 700; cursor: pointer;
  }
  .endday-btn:disabled { background: var(--line); color: var(--muted); cursor: default; }
  .endday-note { font-size: 12px; color: var(--muted); text-align: center; margin-top: 8px; }
  .error-msg { color: var(--danger); font-size: 13px; margin-bottom: 10px; }
  .log-title { font-size: 14px; font-weight: 700; color: var(--muted); margin: 4px 0 10px; }
  .town-label { font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
  .empty-log { font-size: 13px; color: var(--muted); text-align: center; padding: 20px 0; }
  .stop-row { border: 1px solid var(--line); border-radius: 12px; margin-bottom: 8px; overflow: hidden; background: #fff; }
  .stop-summary { display: flex; align-items: center; gap: 10px; padding: 12px; cursor: pointer; }
  .stop-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .stop-summary-text { flex: 1; }
  .stop-customer { font-size: 14px; font-weight: 600; }
  .stop-time { font-size: 12px; color: var(--muted); }
  .stop-flag { font-size: 11px; font-weight: 700; color: var(--accent); border: 1px solid var(--accent); border-radius: 10px; padding: 2px 8px; }
  .stop-flag.repair { color: var(--repair); border-color: var(--repair); margin-left: 4px; }
  .stop-flag.sent { color: var(--good); border-color: var(--good); margin-left: 4px; }
  .stop-flag.draft { color: var(--muted); border-color: var(--line); margin-left: 4px; }
  .stop-del { border: none; background: none; color: var(--danger); font-size: 16px; cursor: pointer; }
  .stop-detail { padding: 0 14px 14px; font-size: 13px; color: var(--muted); border-top: 1px solid var(--line); }
  .stop-detail p { margin: 8px 0 2px; }
  .stop-detail .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .stop-detail .before-after { display: flex; gap: 8px; margin-top: 6px; }
  .stop-detail .before-after img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); }
  .section-gap { margin-top: 16px; }
  .checkup-card { border-color: var(--accent); }
  .checkup-row { padding: 10px 0; border-bottom: 1px solid var(--line); }
  .checkup-row:last-child { border-bottom: none; }
  .checkup-row-head { display: flex; align-items: center; justify-content: space-between; }
  .checkup-name { font-size: 13px; font-weight: 600; }
  .checkup-reason { font-size: 12px; color: var(--muted); text-transform: capitalize; }
  .checkup-actions { display: flex; gap: 6px; margin-top: 6px; }
  .checkup-actions button { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer; color: var(--muted); }
  .checkup-actions button.primary { border-color: var(--primary); color: var(--primary); }
  .repair-card { border-color: var(--repair); }
  .repair-row { padding: 10px 0; border-bottom: 1px solid var(--line); }
  .repair-row:last-child { border-bottom: none; }
  .repair-row-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .repair-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .repair-row button { border: 1px solid var(--repair); background: #fff; color: var(--repair); border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }
  .repair-row button.sent { background: var(--repair); color: #fff; }
  .repair-photos { display: flex; gap: 6px; margin-top: 8px; }
  .repair-photos img { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--line); }
  .sent-tag { font-size: 11px; font-weight: 700; color: var(--good); }
  .route-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .route-row:last-child { border-bottom: none; }
  .route-row button { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer; color: var(--muted); }
  .tech-tag { font-size: 11px; color: var(--muted); }
  .login-wrap { display: flex; flex-direction: column; gap: 12px; }
  .login-btn { padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; }
  .login-btn.tech { background: var(--primary); color: #fff; }
  .login-btn.manager { background: var(--accent); color: #fff; }
  .login-note { font-size: 11px; color: var(--muted); text-align: center; }
`;

function ReadingBar({ param, value, onChange }) {
  const pct = ((value - param.min) / (param.max - param.min)) * 100;
  const tone = zoneOf(param, value);
  return (
    <div className="reading">
      <div className="reading-head">
        <span className="reading-label">{param.label}</span>
        <span className="reading-value" style={{ color: toneVar(tone) }}>
          {value}{param.unit ? ` ${param.unit}` : ""}
        </span>
      </div>
      <div className="reading-bar">
        {param.zones.map((z, i) => {
          const from = i === 0 ? param.min : param.zones[i - 1].to;
          const width = ((z.to - from) / (param.max - param.min)) * 100;
          return <div key={i} style={{ width: `${width}%`, background: toneVar(z.tone) }} />;
        })}
        <div className="reading-marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="reading-controls">
        <button type="button" onClick={() => onChange(Math.max(param.min, +(value - param.step).toFixed(2)))}>-</button>
        <input type="range" min={param.min} max={param.max} step={param.step} value={value}
          onChange={(e) => onChange(+e.target.value)} />
        <button type="button" onClick={() => onChange(Math.min(param.max, +(value + param.step).toFixed(2)))}>+</button>
      </div>
      <div className="reading-ideal">Ideal: {param.ideal}</div>
    </div>
  );
}

function CaptureSlot({ label, photo, onCapture, onRetake, lang = "en" }) {
  return (
    <div className="capture-slot">
      <div className="capture-label">{label}</div>
      {photo ? (
        <div className="capture-thumb">
          <img src={photo.url} alt={label} />
          <div className="capture-stamp">{formatClock(photo.takenAt)}</div>
          <button type="button" className="capture-retake" onClick={onRetake}>{lang === "es" ? "Repetir" : "Retake"}</button>
        </div>
      ) : (
        <label className="capture-btn">
          <i className="capture-icon">+</i>
          {lang === "es" ? `Tomar foto de ${label.toLowerCase()}` : `Take ${label.toLowerCase()} photo`}
          <input type="file" accept="image/*" capture="environment" onChange={(e) => onCapture(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}

function NotServiceableCard({ notServiceable, setNotServiceable, reason, setReason, details, setDetails, error, onSubmit, lang = "en" }) {
  return (
    <div className={`pfl-card ${notServiceable ? "repair-card" : ""}`}>
      <label className="repair-toggle">
        <input type="checkbox" checked={notServiceable} onChange={(e) => setNotServiceable(e.target.checked)} />
        {t(lang, "Can't service this stop today")}
      </label>
      {notServiceable && (
        <div className="repair-body">
          <label className="pfl-field-label">{t(lang, "Reason")}</label>
          <select className="pfl-select" value={reason} onChange={(e) => setReason(e.target.value)}>
            {NOT_SERVICEABLE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="pfl-field-label" style={{ marginTop: "10px" }}>{t(lang, "Details")}</label>
          <textarea className="pfl-textarea" placeholder={t(lang, "Anything the office should know...")} value={details} onChange={(e) => setDetails(e.target.value)} />
          {error && <div className="error-msg" style={{ marginTop: "10px" }}>{error}</div>}
          <button type="button" className="submit-btn" style={{ marginTop: "10px", background: "var(--repair)" }} onClick={onSubmit}>
            {t(lang, "Mark not serviceable")}
          </button>
        </div>
      )}
    </div>
  );
}

function GateClosedCard({ gateOption, setGateOption, photo, onCapture, onRetake, lang = "en" }) {
  return (
    <div className="pfl-card">
      <label className="pfl-field-label">{t(lang, "Gate closed")}</label>
      <select className="pfl-select" value={gateOption} onChange={(e) => setGateOption(e.target.value)}>
        {GATE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <div className="capture-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "180px", marginTop: "10px" }}>
        <CaptureSlot label={t(lang, "Gate closed")} photo={photo} onCapture={onCapture} onRetake={onRetake} lang={lang} />
      </div>
    </div>
  );
}

function CoverStatusCard({ coverStatus, setCoverStatus }) {
  return (
    <div className="pfl-card">
      <label className="pfl-field-label">Cover status</label>
      <div className="task-grid">
        {COVER_STATUS_OPTIONS.map((opt) => (
          <button type="button" key={opt} className={`task-chip condition ${coverStatus === opt ? "on" : ""}`} onClick={() => setCoverStatus(opt)}>
            {opt}
          </button>
        ))}
      </div>
      {coverStatus === "Removed - left out to dry" && (
        <div className="follow-reason" style={{ marginTop: "8px" }}>
          Cover is wet and left out to dry - remember to check and store it on the next visit.
        </div>
      )}
    </div>
  );
}

function HeaterTestCard({ heaterWorking, setHeaterWorking, heaterIssueType, setHeaterIssueType, heaterIssueDescription, setHeaterIssueDescription, heaterIssuePhoto, onCapturePhoto, onRetakePhoto }) {
  return (
    <div className="pfl-card">
      <label className="pfl-field-label">Heater test</label>
      <div className="task-grid">
        <button type="button" className={`task-chip condition ${heaterWorking === true ? "on" : ""}`} onClick={() => setHeaterWorking(true)}>
          Working
        </button>
        <button type="button" className={`task-chip condition ${heaterWorking === false ? "on" : ""}`} onClick={() => setHeaterWorking(false)}>
          Issue found
        </button>
      </div>
      {heaterWorking === false && (
        <div className="repair-body">
          <label className="pfl-field-label">Issue type</label>
          <select className="pfl-select" value={heaterIssueType} onChange={(e) => setHeaterIssueType(e.target.value)}>
            {HEATER_ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="pfl-field-label" style={{ marginTop: "10px" }}>Describe the issue</label>
          <textarea className="pfl-textarea" placeholder="e.g. displaying error code E03, tray missing..."
            value={heaterIssueDescription} onChange={(e) => setHeaterIssueDescription(e.target.value)} />
          <label className="pfl-field-label" style={{ marginTop: "10px" }}>Photo</label>
          <div className="capture-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "180px" }}>
            <CaptureSlot label="Heater issue" photo={heaterIssuePhoto} onCapture={onCapturePhoto} onRetake={onRetakePhoto} />
          </div>
        </div>
      )}
    </div>
  );
}

function StopDetail({ s }) {
  if (s.notServiceable) {
    return (
      <div className="stop-detail">
        <p>Not serviceable</p>
        <div className="row"><span>Reason</span><span>{s.notServiceableReason}</span></div>
        {s.notServiceableDetails && <div className="row"><span>{s.notServiceableDetails}</span></div>}
      </div>
    );
  }
  return (
    <div className="stop-detail">
      {s.onSiteLonger && (
        <div className="row"><span>On site longer than 30 min</span><span>{s.onSiteLongerNote || "-"}</span></div>
      )}
      {(s.beforePhoto || s.afterPhoto) && (
        <div className="before-after">
          {s.beforePhoto && <img src={s.beforePhoto.url} alt="Before" />}
          {s.afterPhoto && <img src={s.afterPhoto.url} alt="After" />}
        </div>
      )}
      {s.stopType === "opening" && <>
        <p>Opening checklist</p>
        {s.poolType && <div className="row"><span>Pool type</span><span>{s.poolType}</span></div>}
        <div className="row"><span>Cover status</span><span>{s.coverStatus || (s.coverRemoved ? "Removed and stored" : "On the pool")}</span></div>
        {s.equipmentChecklist && s.equipmentChecklist.length > 0 && (
          <div className="row"><span>{s.equipmentChecklist.join(", ")}</span></div>
        )}
        {s.pumpingDown && <>
          <p>Pumping down</p>
          {s.pumpDownSteps && s.pumpDownSteps.length > 0 && (
            <div className="row"><span>{s.pumpDownSteps.join(", ")}</span></div>
          )}
          {s.acidWashed && <>
            <div className="row"><span>Acid washed</span><span>{s.acidWashTarget}</span></div>
            {(s.acidWashBeforePhoto || s.acidWashAfterPhoto) && (
              <div className="before-after">
                {s.acidWashBeforePhoto && <img src={s.acidWashBeforePhoto.url} alt="Acid wash before" />}
                {s.acidWashAfterPhoto && <img src={s.acidWashAfterPhoto.url} alt="Acid wash after" />}
              </div>
            )}
          </>}
        </>}
        {s.heaterWorking !== null && s.heaterWorking !== undefined && (
          <div className="row"><span>Heater test</span><span>{s.heaterWorking ? "Working" : `Issue - ${s.heaterIssueType}`}</span></div>
        )}
        {s.heaterWorking === false && s.heaterIssueDescription && (
          <div className="row"><span>{s.heaterIssueDescription}</span></div>
        )}
        {s.heaterIssuePhoto && (
          <div className="before-after">
            <img src={s.heaterIssuePhoto.url} alt="Heater issue" />
          </div>
        )}
        {typeof s.readiness === "number" && (
          <div className="row"><span>Pool readiness</span><span>{s.readiness}%</span></div>
        )}
        {s.finalReadyChecklist && s.finalReadyChecklist.length > 0 && (
          <div className="row"><span>{s.finalReadyChecklist.join(", ")}</span></div>
        )}
        {s.pocNeeded && (
          <div className="row"><span>Follow-up scheduled</span><span>{s.pocLabel}</span></div>
        )}
      </>}
      {(s.stopType === "hoseOff" || s.stopType === "poolkeeper") && <>
        <p>{s.stopType === "poolkeeper" ? "Poolkeeper check" : "Hose off"}</p>
        {s.waterLevelPhoto && (
          <div className="before-after">
            <img src={s.waterLevelPhoto.url} alt="Water level" />
          </div>
        )}
        {s.chemicals && s.chemicals.length > 0 && <>
          <p>Chemicals</p>
          {s.chemicals.map((c, i) => (
            <div className="row" key={i}><span>{c.type}</span><span>{c.amount} {c.unit}</span></div>
          ))}
        </>}
      </>}
      {(s.gateOption || s.gateClosedPhoto) && <>
        <p>Gate closed</p>
        <div className="row"><span>{s.gateOption || "-"}</span></div>
        {s.gateClosedPhoto && (
          <div className="before-after">
            <img src={s.gateClosedPhoto.url} alt="Gate closed" />
          </div>
        )}
      </>}
      {s.stopType === "hotTub" && <>
        <p>Hot tub</p>
        {s.hotTubTasks && s.hotTubTasks.length > 0 && (
          <div className="row"><span>{s.hotTubTasks.join(", ")}</span></div>
        )}
        <div className="row"><span>Filter cleaned</span><span>{s.filterCleaned ? "Yes" : "No"}</span></div>
        {s.filterCleaned && (s.filterBeforePhoto || s.filterAfterPhoto) && (
          <div className="before-after">
            {s.filterBeforePhoto && <img src={s.filterBeforePhoto.url} alt="Filter before" />}
            {s.filterAfterPhoto && <img src={s.filterAfterPhoto.url} alt="Filter after" />}
          </div>
        )}
      </>}
      {s.stopType === "hotTubDrain" && <>
        <p>Drain &amp; refill</p>
        <div className="row"><span>Hot tub size</span><span>{s.gallons?.toLocaleString()} gal</span></div>
        {s.drainReason && <div className="row"><span>Reason</span><span>{s.drainReason}</span></div>}
        {s.drainSteps && s.drainSteps.length > 0 && (
          <div className="row"><span>{s.drainSteps.join(", ")}</span></div>
        )}
        {s.cleanerType && <div className="row"><span>Cleaner used</span><span>{s.cleanerType}</span></div>}
        {s.cleanerType === HOT_TUB_CLEANER_TYPES[1] && s.cleanerReason && (
          <div className="row"><span>{s.cleanerReason}</span></div>
        )}
        {(s.beforePhoto || s.afterPhoto) && (
          <div className="before-after">
            {s.beforePhoto && <img src={s.beforePhoto.url} alt="Before" />}
            {s.afterPhoto && <img src={s.afterPhoto.url} alt="After" />}
          </div>
        )}
        {s.readings && <>
          <p>Readings (after refill)</p>
          {PARAMS.map((p) => (
            <div className="row" key={p.key}><span>{p.label}</span><span>{s.readings[p.key]}{p.unit ? ` ${p.unit}` : ""}</span></div>
          ))}
        </>}
        {s.chemicals && s.chemicals.length > 0 && <>
          <p>Chemicals</p>
          {s.chemicals.map((c, i) => (
            <div className="row" key={i}><span>{c.type}</span><span>{c.amount} {c.unit}</span></div>
          ))}
        </>}
      </>}
      {s.stopType === "reassembly" && <>
        <p>Equipment reassembly</p>
        {s.tasksDone && s.tasksDone.length > 0 && (
          <div className="row"><span>{s.tasksDone.join(", ")}</span></div>
        )}
        {s.pumpHasPower !== null && s.pumpHasPower !== undefined && (
          <div className="row"><span>Pump power</span><span>{s.pumpHasPower ? "Has power" : "No power"}</span></div>
        )}
        {s.pumpHasPower === false && <>
          <div className="row"><span>Customer notified</span><span>{s.customerNotified ? "Yes" : "No"}</span></div>
          {s.pumpPowerNotes && <div className="row"><span>{s.pumpPowerNotes}</span></div>}
        </>}
        {s.waterLevel && <div className="row"><span>Water level</span><span>{s.waterLevel}{s.waterLevel === "High" ? ` - ${s.waterLowered ? "lowered" : "not lowered"}` : ""}</span></div>}
        {s.poolClarity && <div className="row"><span>Pool clarity</span><span>{s.poolClarity}{s.poolClarity !== "Clear" ? ` - ${s.shockAndCirculate ? "shocked & circulated" : "not shocked"}` : ""}</span></div>}
        {s.freezeDamage && <>
          <p>Freeze damage</p>
          <div className="row"><span>{s.freezeDamageType}</span></div>
          {s.freezeDamageDescription && <div className="row"><span>{s.freezeDamageDescription}</span></div>}
          {(s.freezeDamagePhoto1 || s.freezeDamagePhoto2) && (
            <div className="before-after">
              {s.freezeDamagePhoto1 && <img src={s.freezeDamagePhoto1.url} alt="Freeze damage 1" />}
              {s.freezeDamagePhoto2 && <img src={s.freezeDamagePhoto2.url} alt="Freeze damage 2" />}
            </div>
          )}
        </>}
      </>}
      {s.stopType === "pumpPickup" && <>
        <p>Pump pickup</p>
        {s.pumpPickupReason && <div className="row"><span>{s.pumpPickupReason}</span></div>}
        <div className="row"><span>Pump retrieved</span><span>{s.pumpRetrieved ? "Yes" : "No"}</span></div>
        {s.waterLevelNow && <div className="row"><span>Water level now</span><span>{s.waterLevelNow}</span></div>}
      </>}
      {s.stopType !== "hoseOff" && s.stopType !== "poolkeeper" && s.stopType !== "hotTubDrain" && s.stopType !== "reassembly" && s.stopType !== "pumpPickup" && <>
        <p>{s.stopType === "hotTub" ? "Hot tub size" : "Pool"}</p>
        <div className="row"><span>Size</span><span>{s.gallons.toLocaleString()} gal</span></div>
        {s.rainService && <div className="row"><span>Rain service</span><span>Yes - simplified visit</span></div>}
        <p>Readings</p>
        {PARAMS.map((p) => (
          <div className="row" key={p.key}><span>{p.label}</span><span>{s.readings[p.key]}{p.unit ? ` ${p.unit}` : ""}</span></div>
        ))}
        {s.chemicals.length > 0 && <>
          <p>Chemicals</p>
          {s.chemicals.map((c, i) => (
            <div className="row" key={i}><span>{c.type}</span><span>{c.amount} {c.unit}</span></div>
          ))}
        </>}
        {s.tasks && s.tasks.length > 0 && <>
          <p>Tasks</p>
          <div className="row"><span>{s.tasks.join(", ")}</span></div>
        </>}
      </>}
      {s.repairNeeded && <>
        <p>Repair reported</p>
        <div className="row"><span>Issue type</span><span>{s.repairIssueType}</span></div>
        <div className="row"><span>{s.repairDescription}</span></div>
        {(s.repairPhoto1 || s.repairPhoto2) && (
          <div className="repair-photos">
            {s.repairPhoto1 && <img src={s.repairPhoto1.url} alt="Repair photo 1" />}
            {s.repairPhoto2 && <img src={s.repairPhoto2.url} alt="Repair photo 2" />}
          </div>
        )}
      </>}
      {s.notes && <>
        <p>Notes{s.noteIsSpanish ? " (written in Spanish - not yet translated)" : ""}</p>
        <div className="row"><span>{s.notes}</span></div>
      </>}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [lang, setLang] = useState("en");

  function submit(role) {
    if (!identifier.trim() || !password.trim()) {
      setErr(lang === "es" ? "Ingrese su teléfono o correo y una contraseña." : "Enter your phone or email and a password.");
      return;
    }
    setErr("");
    onLogin({ id: identifier.trim(), role, lang });
  }

  return (
    <div className="pfl-root">
      <style>{GLOBAL_STYLES}</style>
      <div className="lang-toggle-row">
        <button type="button" className={`lang-btn ${lang === "en" ? "on" : ""}`} onClick={() => setLang("en")}>EN</button>
        <button type="button" className={`lang-btn ${lang === "es" ? "on" : ""}`} onClick={() => setLang("es")}>ES</button>
      </div>
      <div className="brand-hero">
        <svg className="brand-waves" viewBox="0 0 400 90" preserveAspectRatio="none">
          <path d="M0,40 C50,10 100,10 150,40 C200,70 250,70 300,40 C330,20 360,20 400,40 L400,90 L0,90 Z" fill="rgba(255,255,255,0.14)" />
          <path d="M0,55 C50,30 100,30 150,55 C200,80 250,80 300,55 C330,38 360,38 400,55 L400,90 L0,90 Z" fill="rgba(255,255,255,0.22)" />
        </svg>
        <div className="brand-hero-content">
          <div className="brand-name">IMMACULATE</div>
          <div className="brand-sub">SWIMMING POOLS &amp; SPAS</div>
          <div className="brand-tagline">Proudly serving the East End of Long Island</div>
          <div className="brand-location">Sag Harbor, NY - Est. 2004</div>
        </div>
      </div>
      <div className="pfl-header">
        <h1>{t(lang, "Field log")}</h1>
      </div>
      <div className="pfl-card login-wrap">
        <div>
          <label className="pfl-field-label">{t(lang, "Phone or email")}</label>
          <input className="pfl-text" type="text" placeholder="you@company.com" value={identifier}
            onChange={(e) => setIdentifier(e.target.value)} />
        </div>
        <div>
          <label className="pfl-field-label">{t(lang, "Password")}</label>
          <input className="pfl-text" type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="error-msg">{err}</div>}
        <button type="button" className="login-btn tech" onClick={() => submit("tech")}>{t(lang, "Log in as technician")}</button>
        <button type="button" className="login-btn manager" onClick={() => submit("manager")}>{t(lang, "Log in as service manager")}</button>
        <div className="login-note">{t(lang, "Prototype login - any phone/email and password combination works.")}</div>
      </div>
    </div>
  );
}

function SiteInfoCard({ info, onUpdate, lang = "en" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(info);
  const [expandPhoto, setExpandPhoto] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => { setDraft(info); setEditing(false); setExpandPhoto(false); setDetailsOpen(false); }, [info.name]);

  function save() {
    onUpdate(draft);
    setEditing(false);
  }
  function setHousePhoto(file) {
    if (file) setDraft({ ...draft, frontOfHousePhoto: { url: URL.createObjectURL(file), takenAt: Date.now() } });
  }

  if (editing) {
    return (
      <div className="pfl-card site-card">
        <label className="pfl-field-label">Site info - editing</label>
        <label className="pfl-field-label">Pool type</label>
        <select className="pfl-select" value={draft.poolType} onChange={(e) => setDraft({ ...draft, poolType: e.target.value })}>
          {POOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Pool surround</label>
        <select className="pfl-select" value={draft.poolSurround} onChange={(e) => setDraft({ ...draft, poolSurround: e.target.value })}>
          {SURROUND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Front of house photo</label>
        <div className="capture-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "180px" }}>
          <CaptureSlot label="Front of house" photo={draft.frontOfHousePhoto} onCapture={setHousePhoto}
            onRetake={() => setDraft({ ...draft, frontOfHousePhoto: null })} />
        </div>
        <label className="site-dog-toggle" style={{ marginTop: "14px" }}>
          <input type="checkbox" checked={draft.hasDogs} onChange={(e) => setDraft({ ...draft, hasDogs: e.target.checked })} />
          Dogs on property
        </label>
        <textarea className="pfl-textarea" placeholder="Dog notes..." value={draft.dogNotes}
          onChange={(e) => setDraft({ ...draft, dogNotes: e.target.value })} style={{ marginTop: "8px" }} />
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Gate code</label>
        <input className="pfl-text" value={draft.gateCode} onChange={(e) => setDraft({ ...draft, gateCode: e.target.value })} />
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>How to get to the backyard</label>
        <textarea className="pfl-textarea" value={draft.entryInstructions}
          onChange={(e) => setDraft({ ...draft, entryInstructions: e.target.value })} />
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Pool cover location</label>
        <input className="pfl-text" value={draft.coverLocation} onChange={(e) => setDraft({ ...draft, coverLocation: e.target.value })} />
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Pool cover storage</label>
        <input className="pfl-text" value={draft.coverStorage} onChange={(e) => setDraft({ ...draft, coverStorage: e.target.value })} />
        <div className="site-edit-actions">
          <button type="button" className="site-save-btn" onClick={save}>Save site info</button>
          <button type="button" className="site-cancel-btn" onClick={() => { setDraft(info); setEditing(false); }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pfl-card site-card">
      <div className="site-card-head" onClick={() => setDetailsOpen((v) => !v)} style={{ cursor: "pointer" }}>
        <label className="pfl-field-label" style={{ marginBottom: 0 }}>
          {t(lang, "Site info")} <span className="site-dropdown-arrow">{detailsOpen ? "\u25B4" : "\u25BE"}</span>
        </label>
        <button type="button" className="site-edit-link" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>{t(lang, "Edit")}</button>
      </div>
      <div className={`dog-badge ${info.hasDogs ? "yes" : "no"}`}>
        {info.hasDogs ? t(lang, "Dogs on property") : t(lang, "No dogs on property")}
      </div>
      {info.hasDogs && info.dogNotes && <div className="site-note">{info.dogNotes}</div>}
      {detailsOpen && (
        <>
          {info.frontOfHousePhoto && (
            <div className="house-photo-wrap" onClick={() => setExpandPhoto((v) => !v)}>
              <img
                src={info.frontOfHousePhoto.url}
                alt="Front of house"
                className={expandPhoto ? "house-photo expanded" : "house-photo"}
              />
              <div className="house-photo-caption">Front of house - tap to {expandPhoto ? "shrink" : "expand"}</div>
            </div>
          )}
          <div className="site-row"><span>{t(lang, "Pool type")}</span><span className="site-value">{info.poolType || "-"}</span></div>
          <div className="site-row"><span>{t(lang, "Surround")}</span><span className="site-value">{info.poolSurround || "-"}</span></div>
          <div className="site-row"><span>{t(lang, "Gate code")}</span><span className="site-value">{info.gateCode || "-"}</span></div>
          <div className="site-row stacked"><span>{t(lang, "Backyard access")}</span><span className="site-value">{info.entryInstructions || "-"}</span></div>
          <div className="site-row stacked"><span>{t(lang, "Pool cover")}</span><span className="site-value">{info.coverLocation || "-"}</span></div>
          <div className="site-row stacked"><span>{t(lang, "Cover storage")}</span><span className="site-value">{info.coverStorage || "-"}</span></div>
        </>
      )}
    </div>
  );
}

function WeeklyServiceForm({ session, allStops, setAllStops, customers, setCustomers, routeJump, lang }) {
  const [customer, setCustomer] = useState("");
  const [gallons, setGallons] = useState(15000);
  const [notServiceable, setNotServiceable] = useState(false);
  const [nsReason, setNsReason] = useState(NOT_SERVICEABLE_REASONS[0]);
  const [nsDetails, setNsDetails] = useState("");
  const [nsError, setNsError] = useState("");
  const [outdoorTemp, setOutdoorTemp] = useState(114);
  const [avgForecastHigh, setAvgForecastHigh] = useState(110);
  const [daysUntilNext, setDaysUntilNext] = useState(7);
  const [rainService, setRainService] = useState(false);
  const [onSiteLonger, setOnSiteLonger] = useState(false);
  const [onSiteLongerNote, setOnSiteLongerNote] = useState("");
  const [beforePhoto, setBeforePhotoState] = useState(null);
  const [afterPhoto, setAfterPhotoState] = useState(null);
  const [readings, setReadings] = useState(DEFAULT_READINGS);
  const [chemChecklist, setChemChecklist] = useState({});
  const [customChemicals, setCustomChemicals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [waterCondition, setWaterCondition] = useState("Clear");
  const [followUpOverride, setFollowUpOverride] = useState(null);
  const [repairNeeded, setRepairNeeded] = useState(false);
  const [repairIssueType, setRepairIssueType] = useState(REPAIR_ISSUE_TYPES[0]);
  const [repairDescription, setRepairDescription] = useState("");
  const [repairPhoto1, setRepairPhoto1State] = useState(null);
  const [repairPhoto2, setRepairPhoto2State] = useState(null);
  const [gateOption, setGateOption] = useState(GATE_OPTIONS[0]);
  const [gateClosedPhoto, setGateClosedPhotoState] = useState(null);
  const [hoseOn, setHoseOn] = useState(false);
  const [hoseHandling, setHoseHandling] = useState("tech-today");
  const [poolkeeperOn, setPoolkeeperOn] = useState(false);
  const [notes, setNotes] = useState("");
  const [noteIsSpanish, setNoteIsSpanish] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState("");

  function updateReading(key, val) {
    setReadings((r) => ({ ...r, [key]: val }));
  }
  function selectCustomer(name) {
    setCustomer(name);
    const found = customers.find((c) => c.name === name);
    if (found) setGallons(found.gallons);
  }
  useEffect(() => {
    if (routeJump && routeJump.customer) selectCustomer(routeJump.customer);
  }, [routeJump]);
  function updateSiteInfo(updated) {
    setCustomers((cs) => cs.map((c) => (c.name === updated.name ? updated : c)));
  }
  function toggleTask(t) {
    setTasks((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }
  function setRepairPhoto1(file) { if (file) setRepairPhoto1State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setRepairPhoto2(file) { if (file) setRepairPhoto2State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setBeforePhoto(file) { if (file) setBeforePhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setAfterPhoto(file) { if (file) setAfterPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setGateClosedPhoto(file) { if (file) setGateClosedPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }

  const worst = worstTone(PARAMS.map((p) => zoneOf(p, readings[p.key])));
  const dosing = buildDosing({ readings, gallons, avgForecastHigh, daysUntilNext });
  const autoFollowUp = waterCondition !== "Clear" || worst === "danger";
  const followUpNeeded = followUpOverride === null ? autoFollowUp : followUpOverride;
  const followUpReasons = [];
  if (waterCondition !== "Clear") followUpReasons.push(waterCondition.toLowerCase());
  if (worst === "danger") followUpReasons.push("chemistry out of range");

  function toggleChecklistItem(key) {
    setChemChecklist((c) => {
      const cur = c[key] || { checked: false, amount: 0 };
      const nextChecked = !cur.checked;
      let amount = cur.amount;
      if (nextChecked && (!amount || amount === 0)) {
        const item = CHEMICAL_CHECKLIST.find((i) => i.key === key);
        const match = dosing.find((d) => item.dosingMatch.includes(d.chemical));
        amount = match ? parseFloat(match.amount) || 1 : 1;
      }
      return { ...c, [key]: { checked: nextChecked, amount } };
    });
  }
  function updateChecklistAmount(key, amount) {
    setChemChecklist((c) => ({ ...c, [key]: { checked: true, amount } }));
  }
  function addCustomChemical() {
    setCustomChemicals((c) => [...c, { id: Date.now() + Math.random(), name: "", amount: 1, unit: "oz" }]);
  }
  function updateCustomChemical(id, patch) {
    setCustomChemicals((c) => c.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  function removeCustomChemical(id) {
    setCustomChemicals((c) => c.filter((row) => row.id !== id));
  }

  function resetForm() {
    setCustomer(""); setGallons(15000); setRainService(false);
    setOnSiteLonger(false); setOnSiteLongerNote("");
    setBeforePhotoState(null); setAfterPhotoState(null); setReadings(DEFAULT_READINGS);
    setChemChecklist({}); setCustomChemicals([]); setTasks([]); setWaterCondition("Clear");
    setFollowUpOverride(null); setRepairNeeded(false); setRepairIssueType(REPAIR_ISSUE_TYPES[0]);
    setRepairDescription(""); setRepairPhoto1State(null); setRepairPhoto2State(null);
    setGateOption(GATE_OPTIONS[0]); setGateClosedPhotoState(null);
    setHoseOn(false); setHoseHandling("tech-today"); setPoolkeeperOn(false); setNotes(""); setNoteIsSpanish(false);
    setNotServiceable(false); setNsReason(NOT_SERVICEABLE_REASONS[0]); setNsDetails(""); setNsError("");
  }

  function submitNotServiceable() {
    if (!customer) { setNsError("Select a customer before marking not serviceable."); return; }
    if (nsReason === "Other" && !nsDetails.trim()) { setNsError("Add details for \"Other\" before marking not serviceable."); return; }
    setNsError("");
    setAllStops((s) => [{
      id: Date.now(), technician: session.id, sent: false, sentAt: null,
      stopType: "weekly", dueDate: todayStr(), customer, gallons,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      notServiceable: true, notServiceableReason: nsReason, notServiceableDetails: nsDetails,
      tone: "danger", followUp: false, repairNeeded: false,
    }, ...s]);
    resetForm();
  }

  function submitStop() {
    if (!customer) { setError("Select a customer before logging this stop."); return; }
    if (onSiteLonger && !onSiteLongerNote.trim()) {
      setError("Add a quick note on why this visit ran long.");
      return;
    }
    if (repairNeeded && !repairDescription.trim()) { setError("Describe the repair issue before logging this stop."); return; }
    setError("");
    const checklistChems = CHEMICAL_CHECKLIST
      .filter((i) => chemChecklist[i.key]?.checked && chemChecklist[i.key].amount > 0)
      .map((i) => ({ type: i.label, amount: chemChecklist[i.key].amount, unit: i.unit }));
    const customChems = customChemicals
      .filter((c) => c.name.trim() && c.amount > 0)
      .map((c) => ({ type: c.name, amount: c.amount, unit: c.unit }));
    const stopId = Date.now();
    const stop = {
      id: stopId, technician: session.id, sent: false, sentAt: null, repairHandled: false,
      stopType: "weekly", dueDate: todayStr(), rainService,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      customer, gallons,
      onSiteLonger, onSiteLongerNote,
      beforePhoto, afterPhoto, readings: { ...readings },
      chemicals: [...checklistChems, ...customChems], tasks: [...tasks],
      waterCondition, notes, noteIsSpanish, tone: worst, followUp: followUpNeeded,
      repairNeeded, repairIssueType, repairDescription, repairPhoto1, repairPhoto2,
      gateOption, gateClosedPhoto, hoseOn, hoseHandling, poolkeeperOn,
    };
    const followUpStops = [];
    if (hoseOn && hoseHandling !== "customer") {
      followUpStops.push({
        id: stopId + 1, technician: session.id, sent: false, sentAt: null,
        stopType: "hoseOff", pending: true, linkedStopId: stopId,
        dueDate: hoseHandling === "tech-overnight" ? tomorrowStr() : todayStr(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        customer, gallons, tone: "good", followUp: false, repairNeeded: false,
      });
    }
    if (poolkeeperOn) {
      followUpStops.push({
        id: stopId + 2, technician: session.id, sent: false, sentAt: null,
        stopType: "poolkeeper", pending: true, linkedStopId: stopId,
        dueDate: tomorrowStr(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        customer, gallons, tone: "good", followUp: false, repairNeeded: false,
      });
    }
    setAllStops((s) => [...followUpStops, stop, ...s]);
    resetForm();
  }

  return (
    <>
      <div className="pfl-card">
        <label className="pfl-field-label">{t(lang, "Customer")}</label>
        <select className="pfl-select" value={customer} onChange={(e) => selectCustomer(e.target.value)}>
          <option value="">{t(lang, "Select a stop...")}</option>
          {customers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>


      <NotServiceableCard
        notServiceable={notServiceable} setNotServiceable={setNotServiceable}
        reason={nsReason} setReason={setNsReason} details={nsDetails} setDetails={setNsDetails}
        error={nsError} onSubmit={submitNotServiceable} lang={lang}
      />
      {customer && (
        <SiteInfoCard info={customers.find((c) => c.name === customer)} onUpdate={updateSiteInfo} lang={lang} />
      )}

      <div className="pfl-card">
        <label className="pfl-field-label">{t(lang, "Photos")}</label>
        <div className="capture-grid">
          <CaptureSlot label={t(lang, "Before")} photo={beforePhoto} onCapture={setBeforePhoto} onRetake={() => setBeforePhotoState(null)} lang={lang} />
          <CaptureSlot label={t(lang, "After")} photo={afterPhoto} onCapture={setAfterPhoto} onRetake={() => setAfterPhotoState(null)} lang={lang} />
        </div>
        <div className="capture-note">Opens the camera directly instead of the photo library, so each visit needs a fresh shot rather than a saved one. Photo capture works even with no signal.</div>
      </div>

      <div className={`pfl-card ${onSiteLonger ? "repair-card" : ""}`}>
        <label className="repair-toggle">
          <input type="checkbox" checked={onSiteLonger} onChange={(e) => setOnSiteLonger(e.target.checked)} />
          {t(lang, "On site longer than 30 minutes")}
        </label>
        {onSiteLonger && (
          <div className="repair-body">
            <label className="pfl-field-label">{t(lang, "Why")}</label>
            <textarea className="pfl-textarea" placeholder="e.g. heavy algae treatment, customer conversation, troubleshooting equipment..."
              value={onSiteLongerNote} onChange={(e) => setOnSiteLongerNote(e.target.value)} />
          </div>
        )}
      </div>

      <div className="pfl-card rain-card">
        <label className="repair-toggle">
          <input type="checkbox" checked={rainService} onChange={(e) => setRainService(e.target.checked)} />
          {t(lang, "Downpour - rain service")}
        </label>
        {rainService && (
          <div className="follow-reason" style={{ marginTop: "8px" }}>
            Simplified visit for active rain: check chemicals, empty baskets, add tabs as needed. Skip brushing/vacuuming and full readings until the water settles - if there's lightning, don't enter the pool area at all.
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Pool & weather</label>
        <div className="grid-2">
          <div>
            <label className="pfl-field-label">Pool size (gal)</label>
            <input className="pfl-num" type="number" step="500" value={gallons} onChange={(e) => setGallons(+e.target.value)} />
          </div>
          <div>
            <label className="pfl-field-label">Days until next visit</label>
            <input className="pfl-num" type="number" step="1" min="1" value={daysUntilNext} onChange={(e) => setDaysUntilNext(+e.target.value)} />
          </div>
          <div>
            <label className="pfl-field-label">Outdoor temp now (°F)</label>
            <input className="pfl-num" type="number" step="1" value={outdoorTemp} onChange={(e) => setOutdoorTemp(+e.target.value)} />
          </div>
          <div>
            <label className="pfl-field-label">Avg forecast high (°F)</label>
            <input className="pfl-num" type="number" step="1" value={avgForecastHigh} onChange={(e) => setAvgForecastHigh(+e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">{t(lang, "Chemical readings")}</label>
        {PARAMS.map((p) => (
          <ReadingBar key={p.key} param={p} value={readings[p.key]} onChange={(v) => updateReading(p.key, v)} />
        ))}
      </div>

      {dosing.length > 0 && (
        <div className="pfl-card dosing-card">
          <label className="pfl-field-label">{t(lang, "Suggested dosing")}</label>
          {dosing.map((d, i) => (
            <div className="dosing-item" key={i}>
              <div>
                <div className="dosing-chem">{d.chemical}</div>
                <div className="dosing-why">{d.why}</div>
              </div>
              <div className="dosing-amount">{d.amount} {d.unit}</div>
            </div>
          ))}
          <div className="dosing-note">Estimates from standard dosing rules of thumb, scaled to pool size and the forecast. Check the box below to pull a suggested amount straight into the log, then adjust as needed.</div>
        </div>
      )}

      <div className="pfl-card">
        <label className="pfl-field-label">{t(lang, "Water condition")}</label>
        <div className="task-grid">
          {WATER_CONDITIONS.map((w) => (
            <button type="button" key={w} className={`task-chip condition ${waterCondition === w ? "on" : ""}`} onClick={() => setWaterCondition(w)}>
              {w}
            </button>
          ))}
        </div>
        <div className="follow-row">
          <label>
            <input type="checkbox" checked={followUpNeeded} onChange={(e) => setFollowUpOverride(e.target.checked)} />
            Flag for follow-up checkup tomorrow
          </label>
        </div>
        {followUpNeeded && followUpReasons.length > 0 && (
          <div className="follow-reason">Auto-flagged: {followUpReasons.join(", ")}</div>
        )}
      </div>

      <div className="pfl-card">
        <label className="repair-toggle">
          <input type="checkbox" checked={repairNeeded} onChange={(e) => setRepairNeeded(e.target.checked)} />
          {t(lang, "This stop needs a repair")}
        </label>
        {repairNeeded && (
          <div className="repair-body">
            <label className="pfl-field-label">{t(lang, "Issue type")}</label>
            <select className="pfl-select" value={repairIssueType} onChange={(e) => setRepairIssueType(e.target.value)}>
              {REPAIR_ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>{t(lang, "What's wrong")}</label>
            <textarea className="pfl-textarea" placeholder="e.g. pump making grinding noise, cracked skimmer lid..."
              value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)} />
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>{t(lang, "Photos")}</label>
            <div className="capture-grid">
              <CaptureSlot label="Photo 1" photo={repairPhoto1} onCapture={setRepairPhoto1} onRetake={() => setRepairPhoto1State(null)} lang={lang} />
              <CaptureSlot label="Photo 2" photo={repairPhoto2} onCapture={setRepairPhoto2} onRetake={() => setRepairPhoto2State(null)} lang={lang} />
            </div>
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="repair-toggle">
          <input type="checkbox" checked={hoseOn} onChange={(e) => setHoseOn(e.target.checked)} />
          Hose on (filling pool)
        </label>
        {hoseOn && (
          <div className="repair-body">
            <div className="task-grid">
              <button type="button" className={`task-chip condition ${hoseHandling === "tech-today" ? "on" : ""}`} onClick={() => setHoseHandling("tech-today")}>
                Turn off later today
              </button>
              <button type="button" className={`task-chip condition ${hoseHandling === "tech-overnight" ? "on" : ""}`} onClick={() => setHoseHandling("tech-overnight")}>
                Leave on overnight (trickle)
              </button>
              <button type="button" className={`task-chip condition ${hoseHandling === "customer" ? "on" : ""}`} onClick={() => setHoseHandling("customer")}>
                Customer is shutting it off
              </button>
            </div>
            <div className="follow-reason" style={{ marginTop: "8px" }}>
              {hoseHandling === "tech-overnight"
                ? "Adds a \"Hose off\" work order to tomorrow's list for this customer."
                : hoseHandling === "customer"
                ? "No work order added - the customer is handling the hose themselves."
                : "Adds a \"Hose off\" work order to today's list - it'll need to be completed before the day is sent in."}
            </div>
          </div>
        )}

        <label className="repair-toggle" style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
          <input type="checkbox" checked={poolkeeperOn} onChange={(e) => setPoolkeeperOn(e.target.checked)} />
          Poolkeeper on
        </label>
        {poolkeeperOn && (
          <div className="follow-reason" style={{ marginTop: "8px" }}>
            Adds a "Poolkeeper check" work order to tomorrow's list for this customer.
          </div>
        )}
      </div>

      <GateClosedCard
        gateOption={gateOption}
        setGateOption={setGateOption}
        photo={gateClosedPhoto}
        onCapture={setGateClosedPhoto}
        onRetake={() => setGateClosedPhotoState(null)}
        lang={lang}
      />

      <div className="pfl-card">
        <label className="pfl-field-label">{t(lang, "Chemicals added")}</label>
        {CHEMICAL_CHECKLIST.map((item) => {
          const entry = chemChecklist[item.key] || { checked: false, amount: 0 };
          return (
            <div className="chem-item" key={item.key}>
              <label>
                <input type="checkbox" checked={entry.checked} onChange={() => toggleChecklistItem(item.key)} />
                {item.label}
              </label>
              <input className="pfl-num" type="number" min="0" step="0.5" disabled={!entry.checked}
                value={entry.amount || ""} onChange={(e) => updateChecklistAmount(item.key, +e.target.value)} />
              <span className="chem-unit">{item.unit}</span>
            </div>
          );
        })}
        {customChemicals.length > 0 && (
          <div className="pfl-field-label" style={{ marginTop: "14px" }}>{t(lang, "Miscellaneous")}</div>
        )}
        {customChemicals.map((row) => (
          <div className="chem-row" key={row.id}>
            <input className="pfl-select" type="text" placeholder="e.g. Clarifier, phosphate remover..." value={row.name}
              onChange={(e) => updateCustomChemical(row.id, { name: e.target.value })} />
            <input className="pfl-num" type="number" min="0" step="0.5" value={row.amount}
              onChange={(e) => updateCustomChemical(row.id, { amount: +e.target.value })} />
            <select className="pfl-unit" value={row.unit} onChange={(e) => updateCustomChemical(row.id, { unit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <button type="button" onClick={() => removeCustomChemical(row.id)} aria-label="Remove">x</button>
          </div>
        ))}
        <button type="button" className="add-chem-btn" onClick={addCustomChemical}>+ Add miscellaneous chemical</button>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">{rainService ? "Rain service tasks" : "Tasks completed"}</label>
        <div className="task-grid">
          {(rainService ? RAIN_SERVICE_TASKS : TASKS).map((t) => (
            <button type="button" key={t} className={`task-chip ${tasks.includes(t) ? "on" : ""}`} onClick={() => toggleTask(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">{t(lang, "Notes")}</label>
        <textarea className="pfl-textarea" placeholder={t(lang, "Anything the office should know...")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {lang === "es" && notes.trim() && (
          <label className="repair-toggle" style={{ marginTop: "8px", fontSize: "12px" }}>
            <input type="checkbox" checked={noteIsSpanish} onChange={(e) => setNoteIsSpanish(e.target.checked)} />
            {t(lang, "This note is in Spanish")}
          </label>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}
      <button type="button" className="submit-btn" onClick={submitStop}>{t(lang, "Log this stop")}</button>
    </>
  );
}

function HoseOffForm({ session, setAllStops, pendingStop, onComplete }) {
  const [onSiteLonger, setOnSiteLonger] = useState(false);
  const [onSiteLongerNote, setOnSiteLongerNote] = useState("");
  const [waterLevelPhoto, setWaterLevelPhotoState] = useState(null);
  const [gateOption, setGateOption] = useState(GATE_OPTIONS[0]);
  const [gateClosedPhoto, setGateClosedPhotoState] = useState(null);
  const [chemChecklist, setChemChecklist] = useState({});
  const [customChemicals, setCustomChemicals] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function setWaterLevelPhoto(file) { if (file) setWaterLevelPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setGateClosedPhoto(file) { if (file) setGateClosedPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function toggleChecklistItem(key) {
    setChemChecklist((c) => {
      const cur = c[key] || { checked: false, amount: 0 };
      const nextChecked = !cur.checked;
      const amount = nextChecked && (!cur.amount || cur.amount === 0) ? 1 : cur.amount;
      return { ...c, [key]: { checked: nextChecked, amount } };
    });
  }
  function updateChecklistAmount(key, amount) {
    setChemChecklist((c) => ({ ...c, [key]: { checked: true, amount } }));
  }
  function addCustomChemical() {
    setCustomChemicals((c) => [...c, { id: Date.now() + Math.random(), name: "", amount: 1, unit: "oz" }]);
  }
  function updateCustomChemical(id, patch) {
    setCustomChemicals((c) => c.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  function removeCustomChemical(id) {
    setCustomChemicals((c) => c.filter((row) => row.id !== id));
  }

  if (!pendingStop) return null;

  function submitHoseOff() {
    if (onSiteLonger && !onSiteLongerNote.trim()) {
      setError("Add a quick note on why this visit ran long.");
      return;
    }
    if (!waterLevelPhoto) { setError("Take a photo of the water level before completing."); return; }
    if (!gateClosedPhoto) { setError("Take a photo confirming the gate is closed before completing."); return; }
    setError("");
    const checklistChems = CHEMICAL_CHECKLIST
      .filter((i) => chemChecklist[i.key]?.checked && chemChecklist[i.key].amount > 0)
      .map((i) => ({ type: i.label, amount: chemChecklist[i.key].amount, unit: i.unit }));
    const customChems = customChemicals
      .filter((c) => c.name.trim() && c.amount > 0)
      .map((c) => ({ type: c.name, amount: c.amount, unit: c.unit }));
    setAllStops((all) => all.map((st) => st.id === pendingStop.id ? {
      ...st,
      pending: false,
      onSiteLonger, onSiteLongerNote,
      waterLevelPhoto, gateOption, gateClosedPhoto, notes,
      chemicals: [...checklistChems, ...customChems],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    } : st));
    onComplete();
  }

  const isPoolkeeper = pendingStop.stopType === "poolkeeper";

  return (
    <>
      <div className="pfl-card">
        <label className="pfl-field-label">{isPoolkeeper ? "Poolkeeper check - work order" : "Hose off - work order"}</label>
        <div className="site-row"><span>Customer</span><span className="site-value">{pendingStop.customer}</span></div>
        <div className="site-row"><span>Pool size</span><span className="site-value">{pendingStop.gallons.toLocaleString()} gal</span></div>
      </div>

      <div className={`pfl-card ${onSiteLonger ? "repair-card" : ""}`}>
        <label className="repair-toggle">
          <input type="checkbox" checked={onSiteLonger} onChange={(e) => setOnSiteLonger(e.target.checked)} />
          On site longer than 30 minutes
        </label>
        {onSiteLonger && (
          <div className="repair-body">
            <label className="pfl-field-label">Why</label>
            <textarea className="pfl-textarea" placeholder="e.g. hose took longer to drain than expected..."
              value={onSiteLongerNote} onChange={(e) => setOnSiteLongerNote(e.target.value)} />
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Water level</label>
        <div className="capture-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "180px" }}>
          <CaptureSlot label="Water level" photo={waterLevelPhoto} onCapture={setWaterLevelPhoto} onRetake={() => setWaterLevelPhotoState(null)} />
        </div>
      </div>

      <GateClosedCard
        gateOption={gateOption}
        setGateOption={setGateOption}
        photo={gateClosedPhoto}
        onCapture={setGateClosedPhoto}
        onRetake={() => setGateClosedPhotoState(null)}
      />

      <div className="pfl-card">
        <label className="pfl-field-label">Chemicals added (optional)</label>
        {CHEMICAL_CHECKLIST.map((item) => {
          const entry = chemChecklist[item.key] || { checked: false, amount: 0 };
          return (
            <div className="chem-item" key={item.key}>
              <label>
                <input type="checkbox" checked={entry.checked} onChange={() => toggleChecklistItem(item.key)} />
                {item.label}
              </label>
              <input className="pfl-num" type="number" min="0" step="0.5" disabled={!entry.checked}
                value={entry.amount || ""} onChange={(e) => updateChecklistAmount(item.key, +e.target.value)} />
              <span className="chem-unit">{item.unit}</span>
            </div>
          );
        })}
        {customChemicals.length > 0 && (
          <div className="pfl-field-label" style={{ marginTop: "14px" }}>Miscellaneous</div>
        )}
        {customChemicals.map((row) => (
          <div className="chem-row" key={row.id}>
            <input className="pfl-select" type="text" placeholder="e.g. Clarifier, phosphate remover..." value={row.name}
              onChange={(e) => updateCustomChemical(row.id, { name: e.target.value })} />
            <input className="pfl-num" type="number" min="0" step="0.5" value={row.amount}
              onChange={(e) => updateCustomChemical(row.id, { amount: +e.target.value })} />
            <select className="pfl-unit" value={row.unit} onChange={(e) => updateCustomChemical(row.id, { unit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <button type="button" onClick={() => removeCustomChemical(row.id)} aria-label="Remove">x</button>
          </div>
        ))}
        <button type="button" className="add-chem-btn" onClick={addCustomChemical}>+ Add miscellaneous chemical</button>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Notes</label>
        <textarea className="pfl-textarea" placeholder="Anything the office should know..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}
      <button type="button" className="submit-btn" onClick={submitHoseOff}>{isPoolkeeper ? "Mark poolkeeper check complete" : "Mark hose off complete"}</button>
    </>
  );
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr + "T00:00:00");
  const diffMs = Date.now() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function HotTubServiceForm({ session, setAllStops, customers, setCustomers }) {
  const [customer, setCustomer] = useState("");
  const [hotTubGallons, setHotTubGallons] = useState(400);
  const [notServiceable, setNotServiceable] = useState(false);
  const [nsReason, setNsReason] = useState(NOT_SERVICEABLE_REASONS[0]);
  const [nsDetails, setNsDetails] = useState("");
  const [nsError, setNsError] = useState("");
  const [onSiteLonger, setOnSiteLonger] = useState(false);
  const [onSiteLongerNote, setOnSiteLongerNote] = useState("");
  const [beforePhoto, setBeforePhotoState] = useState(null);
  const [afterPhoto, setAfterPhotoState] = useState(null);
  const [hotTubTasks, setHotTubTasks] = useState([]);
  const [filterCleaned, setFilterCleaned] = useState(false);
  const [filterBeforePhoto, setFilterBeforePhotoState] = useState(null);
  const [filterAfterPhoto, setFilterAfterPhotoState] = useState(null);
  const [readings, setReadings] = useState(DEFAULT_READINGS);
  const [chemChecklist, setChemChecklist] = useState({});
  const [customChemicals, setCustomChemicals] = useState([]);
  const [waterCondition, setWaterCondition] = useState("Clear");
  const [repairNeeded, setRepairNeeded] = useState(false);
  const [repairIssueType, setRepairIssueType] = useState(HOT_TUB_REPAIR_ISSUE_TYPES[0]);
  const [repairDescription, setRepairDescription] = useState("");
  const [repairPhoto1, setRepairPhoto1State] = useState(null);
  const [repairPhoto2, setRepairPhoto2State] = useState(null);
  const [gateOption, setGateOption] = useState(GATE_OPTIONS[0]);
  const [gateClosedPhoto, setGateClosedPhotoState] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const hotTubCustomers = customers.filter((c) => c.hasHotTub);
  const selectedInfo = customers.find((c) => c.name === customer);
  const lastCleanedDays = selectedInfo ? daysAgo(selectedInfo.lastFilterCleaning) : null;
  const filterOverdue = lastCleanedDays !== null && lastCleanedDays > 14;

  function selectCustomer(name) {
    setCustomer(name);
    const found = customers.find((c) => c.name === name);
    if (found) setHotTubGallons(found.hotTubGallons || 400);
  }
  function toggleHotTubTask(t) {
    setHotTubTasks((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }
  function updateReading(key, val) { setReadings((r) => ({ ...r, [key]: val })); }
  function setBeforePhoto(file) { if (file) setBeforePhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setAfterPhoto(file) { if (file) setAfterPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setFilterBeforePhoto(file) { if (file) setFilterBeforePhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setFilterAfterPhoto(file) { if (file) setFilterAfterPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setRepairPhoto1(file) { if (file) setRepairPhoto1State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setRepairPhoto2(file) { if (file) setRepairPhoto2State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setGateClosedPhoto(file) { if (file) setGateClosedPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }

  function toggleChecklistItem(key) {
    setChemChecklist((c) => {
      const cur = c[key] || { checked: false, amount: 0 };
      const nextChecked = !cur.checked;
      const amount = nextChecked && (!cur.amount || cur.amount === 0) ? 1 : cur.amount;
      return { ...c, [key]: { checked: nextChecked, amount } };
    });
  }
  function updateChecklistAmount(key, amount) {
    setChemChecklist((c) => ({ ...c, [key]: { checked: true, amount } }));
  }
  function addCustomChemical() {
    setCustomChemicals((c) => [...c, { id: Date.now() + Math.random(), name: "", amount: 1, unit: "oz" }]);
  }
  function updateCustomChemical(id, patch) {
    setCustomChemicals((c) => c.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  function removeCustomChemical(id) {
    setCustomChemicals((c) => c.filter((row) => row.id !== id));
  }

  const worst = worstTone(PARAMS.map((p) => zoneOf(p, readings[p.key])));

  function resetForm() {
    setCustomer(""); setHotTubGallons(400);
    setOnSiteLonger(false); setOnSiteLongerNote("");
    setBeforePhotoState(null); setAfterPhotoState(null);
    setHotTubTasks([]); setFilterCleaned(false);
    setFilterBeforePhotoState(null); setFilterAfterPhotoState(null);
    setReadings(DEFAULT_READINGS); setChemChecklist({}); setCustomChemicals([]);
    setWaterCondition("Clear"); setRepairNeeded(false); setRepairIssueType(HOT_TUB_REPAIR_ISSUE_TYPES[0]);
    setRepairDescription(""); setRepairPhoto1State(null); setRepairPhoto2State(null);
    setGateOption(GATE_OPTIONS[0]); setGateClosedPhotoState(null); setNotes("");
    setNotServiceable(false); setNsReason(NOT_SERVICEABLE_REASONS[0]); setNsDetails(""); setNsError("");
  }

  function submitNotServiceable() {
    if (!customer) { setNsError("Select a hot tub before marking not serviceable."); return; }
    if (nsReason === "Other" && !nsDetails.trim()) { setNsError("Add details for \"Other\" before marking not serviceable."); return; }
    setNsError("");
    setAllStops((s) => [{
      id: Date.now(), technician: session.id, sent: false, sentAt: null,
      stopType: "hotTub", dueDate: todayStr(), customer, gallons: hotTubGallons,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      notServiceable: true, notServiceableReason: nsReason, notServiceableDetails: nsDetails,
      tone: "danger", followUp: false, repairNeeded: false,
    }, ...s]);
    resetForm();
  }

  function submitStop() {
    if (!customer) { setError("Select a hot tub before logging this stop."); return; }
    if (onSiteLonger && !onSiteLongerNote.trim()) {
      setError("Add a quick note on why this visit ran long.");
      return;
    }
    if (filterCleaned && (!filterBeforePhoto || !filterAfterPhoto)) {
      setError("Take both a before and after photo of the filter cleaning before logging this stop.");
      return;
    }
    if (repairNeeded && !repairDescription.trim()) { setError("Describe the repair issue before logging this stop."); return; }
    setError("");
    const checklistChems = HOT_TUB_CHEMICAL_CHECKLIST
      .filter((i) => chemChecklist[i.key]?.checked && chemChecklist[i.key].amount > 0)
      .map((i) => ({ type: i.label, amount: chemChecklist[i.key].amount, unit: i.unit }));
    const customChems = customChemicals
      .filter((c) => c.name.trim() && c.amount > 0)
      .map((c) => ({ type: c.name, amount: c.amount, unit: c.unit }));
    const stop = {
      id: Date.now(), technician: session.id, sent: false, sentAt: null, repairHandled: false,
      stopType: "hotTub", dueDate: todayStr(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      customer, gallons: hotTubGallons,
      onSiteLonger, onSiteLongerNote,
      beforePhoto, afterPhoto, hotTubTasks: [...hotTubTasks], filterCleaned, filterBeforePhoto, filterAfterPhoto,
      readings: { ...readings }, chemicals: [...checklistChems, ...customChems], tasks: [],
      waterCondition, notes, tone: worst, followUp: false,
      repairNeeded, repairIssueType, repairDescription, repairPhoto1, repairPhoto2,
      gateOption, gateClosedPhoto,
    };
    setAllStops((s) => [stop, ...s]);
    if (filterCleaned) {
      setCustomers((cs) => cs.map((c) => (c.name === customer ? { ...c, lastFilterCleaning: todayStr() } : c)));
    }
    resetForm();
  }

  return (
    <>
      <div className="pfl-card">
        <label className="pfl-field-label">Hot tub</label>
        <select className="pfl-select" value={customer} onChange={(e) => selectCustomer(e.target.value)}>
          <option value="">Select a hot tub...</option>
          {hotTubCustomers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>


      <NotServiceableCard
        notServiceable={notServiceable} setNotServiceable={setNotServiceable}
        reason={nsReason} setReason={setNsReason} details={nsDetails} setDetails={setNsDetails}
        error={nsError} onSubmit={submitNotServiceable}
      />
      {customer && (
        <SiteInfoCard info={selectedInfo} onUpdate={(updated) => setCustomers((cs) => cs.map((c) => (c.name === updated.name ? updated : c)))} />
      )}

      {customer && (
        <div className={`pfl-card ${filterOverdue ? "repair-card" : ""}`}>
          <label className="pfl-field-label">Filter cleaning (bi-weekly - mandatory)</label>
          <div className="site-row">
            <span>Last cleaned</span>
            <span className="site-value">
              {selectedInfo?.lastFilterCleaning ? `${selectedInfo.lastFilterCleaning} (${lastCleanedDays}d ago)` : "No record"}
            </span>
          </div>
          {filterOverdue && <div className="follow-reason" style={{ color: "var(--repair)" }}>Overdue - it's been more than 14 days. Filter must be cleaned this visit.</div>}
          <label className="repair-toggle" style={{ marginTop: "10px" }}>
            <input type="checkbox" checked={filterCleaned} onChange={(e) => setFilterCleaned(e.target.checked)} />
            Filter cleaned this visit
          </label>
          {filterCleaned && (
            <div className="capture-grid" style={{ marginTop: "10px" }}>
              <CaptureSlot label="Filter before" photo={filterBeforePhoto} onCapture={setFilterBeforePhoto} onRetake={() => setFilterBeforePhotoState(null)} />
              <CaptureSlot label="Filter after" photo={filterAfterPhoto} onCapture={setFilterAfterPhoto} onRetake={() => setFilterAfterPhotoState(null)} />
            </div>
          )}
        </div>
      )}

      <div className="pfl-card">
        <label className="pfl-field-label">Photos</label>
        <div className="capture-grid">
          <CaptureSlot label="Before" photo={beforePhoto} onCapture={setBeforePhoto} onRetake={() => setBeforePhotoState(null)} />
          <CaptureSlot label="After" photo={afterPhoto} onCapture={setAfterPhoto} onRetake={() => setAfterPhotoState(null)} />
        </div>
      </div>

      <div className={`pfl-card ${onSiteLonger ? "repair-card" : ""}`}>
        <label className="repair-toggle">
          <input type="checkbox" checked={onSiteLonger} onChange={(e) => setOnSiteLonger(e.target.checked)} />
          On site longer than 30 minutes
        </label>
        {onSiteLonger && (
          <div className="repair-body">
            <label className="pfl-field-label">Why</label>
            <textarea className="pfl-textarea" placeholder="e.g. heavy scale buildup, customer conversation, troubleshooting..."
              value={onSiteLongerNote} onChange={(e) => setOnSiteLongerNote(e.target.value)} />
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Tasks completed</label>
        <div className="task-grid">
          {HOT_TUB_TASKS.map((t) => (
            <button type="button" key={t} className={`task-chip ${hotTubTasks.includes(t) ? "on" : ""}`} onClick={() => toggleHotTubTask(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Chemical readings</label>
        {PARAMS.map((p) => (
          <ReadingBar key={p.key} param={p} value={readings[p.key]} onChange={(v) => updateReading(p.key, v)} />
        ))}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Water condition</label>
        <div className="task-grid">
          {WATER_CONDITIONS.map((w) => (
            <button type="button" key={w} className={`task-chip condition ${waterCondition === w ? "on" : ""}`} onClick={() => setWaterCondition(w)}>
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="pfl-card">
        <label className="repair-toggle">
          <input type="checkbox" checked={repairNeeded} onChange={(e) => setRepairNeeded(e.target.checked)} />
          This stop needs a repair
        </label>
        {repairNeeded && (
          <div className="repair-body">
            <label className="pfl-field-label">Issue type</label>
            <select className="pfl-select" value={repairIssueType} onChange={(e) => setRepairIssueType(e.target.value)}>
              {HOT_TUB_REPAIR_ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>What's wrong</label>
            <textarea className="pfl-textarea" placeholder="e.g. jets weak on one side, topside panel unresponsive..."
              value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)} />
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>Photos</label>
            <div className="capture-grid">
              <CaptureSlot label="Photo 1" photo={repairPhoto1} onCapture={setRepairPhoto1} onRetake={() => setRepairPhoto1State(null)} />
              <CaptureSlot label="Photo 2" photo={repairPhoto2} onCapture={setRepairPhoto2} onRetake={() => setRepairPhoto2State(null)} />
            </div>
          </div>
        )}
      </div>

      <GateClosedCard
        gateOption={gateOption}
        setGateOption={setGateOption}
        photo={gateClosedPhoto}
        onCapture={setGateClosedPhoto}
        onRetake={() => setGateClosedPhotoState(null)}
      />

      <div className="pfl-card">
        <label className="pfl-field-label">Chemicals added</label>
        {HOT_TUB_CHEMICAL_CHECKLIST.map((item) => {
          const entry = chemChecklist[item.key] || { checked: false, amount: 0 };
          return (
            <div className="chem-item" key={item.key}>
              <label>
                <input type="checkbox" checked={entry.checked} onChange={() => toggleChecklistItem(item.key)} />
                {item.label}
              </label>
              <input className="pfl-num" type="number" min="0" step="0.5" disabled={!entry.checked}
                value={entry.amount || ""} onChange={(e) => updateChecklistAmount(item.key, +e.target.value)} />
              <span className="chem-unit">{item.unit}</span>
            </div>
          );
        })}
        {customChemicals.length > 0 && (
          <div className="pfl-field-label" style={{ marginTop: "14px" }}>Miscellaneous</div>
        )}
        {customChemicals.map((row) => (
          <div className="chem-row" key={row.id}>
            <input className="pfl-select" type="text" placeholder="e.g. pH increaser, mustard algae treatment..." value={row.name}
              onChange={(e) => updateCustomChemical(row.id, { name: e.target.value })} />
            <input className="pfl-num" type="number" min="0" step="0.5" value={row.amount}
              onChange={(e) => updateCustomChemical(row.id, { amount: +e.target.value })} />
            <select className="pfl-unit" value={row.unit} onChange={(e) => updateCustomChemical(row.id, { unit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <button type="button" onClick={() => removeCustomChemical(row.id)} aria-label="Remove">x</button>
          </div>
        ))}
        <button type="button" className="add-chem-btn" onClick={addCustomChemical}>+ Add miscellaneous chemical</button>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Notes</label>
        <textarea className="pfl-textarea" placeholder="Anything the office should know..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}
      <button type="button" className="submit-btn" onClick={submitStop}>Log this stop</button>
    </>
  );
}

function HotTubDrainForm({ session, setAllStops, pendingStop, onComplete }) {
  const [onSiteLonger, setOnSiteLonger] = useState(false);
  const [onSiteLongerNote, setOnSiteLongerNote] = useState("");
  const [beforePhoto, setBeforePhotoState] = useState(null);
  const [afterPhoto, setAfterPhotoState] = useState(null);
  const [drainSteps, setDrainSteps] = useState([]);
  const [cleanerType, setCleanerType] = useState(HOT_TUB_CLEANER_TYPES[0]);
  const [cleanerReason, setCleanerReason] = useState("");
  const [readings, setReadings] = useState(DEFAULT_READINGS);
  const [chemChecklist, setChemChecklist] = useState({});
  const [repairNeeded, setRepairNeeded] = useState(false);
  const [repairIssueType, setRepairIssueType] = useState(HOT_TUB_REPAIR_ISSUE_TYPES[0]);
  const [repairDescription, setRepairDescription] = useState("");
  const [repairPhoto1, setRepairPhoto1State] = useState(null);
  const [repairPhoto2, setRepairPhoto2State] = useState(null);
  const [gateOption, setGateOption] = useState(GATE_OPTIONS[0]);
  const [gateClosedPhoto, setGateClosedPhotoState] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function setBeforePhoto(file) { if (file) setBeforePhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setAfterPhoto(file) { if (file) setAfterPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setRepairPhoto1(file) { if (file) setRepairPhoto1State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setRepairPhoto2(file) { if (file) setRepairPhoto2State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setGateClosedPhoto(file) { if (file) setGateClosedPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function updateReading(key, val) { setReadings((r) => ({ ...r, [key]: val })); }
  function toggleDrainStep(t) {
    setDrainSteps((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }
  function toggleChecklistItem(key) {
    setChemChecklist((c) => {
      const cur = c[key] || { checked: false, amount: 0 };
      const nextChecked = !cur.checked;
      const amount = nextChecked && (!cur.amount || cur.amount === 0) ? 1 : cur.amount;
      return { ...c, [key]: { checked: nextChecked, amount } };
    });
  }
  function updateChecklistAmount(key, amount) {
    setChemChecklist((c) => ({ ...c, [key]: { checked: true, amount } }));
  }

  const worst = worstTone(PARAMS.map((p) => zoneOf(p, readings[p.key])));

  if (!pendingStop) return null;

  function submitDrain() {
    if (onSiteLonger && !onSiteLongerNote.trim()) {
      setError("Add a quick note on why this visit ran long.");
      return;
    }
    if (!beforePhoto || !afterPhoto) {
      setError("Take both a before and after photo before completing this drain & refill.");
      return;
    }
    if (cleanerType === HOT_TUB_CLEANER_TYPES[1] && !cleanerReason.trim()) {
      setError("Note why a sequestrant was used (stains, fungus, etc.) before completing.");
      return;
    }
    if (repairNeeded && !repairDescription.trim()) { setError("Describe the repair issue before completing."); return; }
    setError("");
    const checklistChems = HOT_TUB_CHEMICAL_CHECKLIST
      .filter((i) => chemChecklist[i.key]?.checked && chemChecklist[i.key].amount > 0)
      .map((i) => ({ type: i.label, amount: chemChecklist[i.key].amount, unit: i.unit }));
    setAllStops((all) => all.map((st) => st.id === pendingStop.id ? {
      ...st,
      pending: false,
      onSiteLonger, onSiteLongerNote,
      beforePhoto, afterPhoto, drainSteps: [...drainSteps], cleanerType, cleanerReason,
      readings: { ...readings }, chemicals: checklistChems, tone: worst,
      repairNeeded, repairIssueType, repairDescription, repairPhoto1, repairPhoto2,
      gateOption, gateClosedPhoto, notes,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    } : st));
    onComplete();
  }

  return (
    <>
      <div className="pfl-card site-card">
        <label className="pfl-field-label">Hot tub drain &amp; refill</label>
        <div className="site-row"><span>Customer</span><span className="site-value">{pendingStop.customer}</span></div>
        <div className="site-row"><span>Hot tub size</span><span className="site-value">{pendingStop.gallons.toLocaleString()} gal</span></div>
        {pendingStop.drainReason && (
          <div className="site-row stacked"><span>Reason (from service manager)</span><span className="site-value">{pendingStop.drainReason}</span></div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Photos</label>
        <div className="capture-grid">
          <CaptureSlot label="Before" photo={beforePhoto} onCapture={setBeforePhoto} onRetake={() => setBeforePhotoState(null)} />
          <CaptureSlot label="After" photo={afterPhoto} onCapture={setAfterPhoto} onRetake={() => setAfterPhotoState(null)} />
        </div>
      </div>

      <div className={`pfl-card ${onSiteLonger ? "repair-card" : ""}`}>
        <label className="repair-toggle">
          <input type="checkbox" checked={onSiteLonger} onChange={(e) => setOnSiteLonger(e.target.checked)} />
          On site longer than 30 minutes
        </label>
        {onSiteLonger && (
          <div className="repair-body">
            <label className="pfl-field-label">Why</label>
            <textarea className="pfl-textarea" placeholder="e.g. extra time needed for interior cleaning, refill took longer..."
              value={onSiteLongerNote} onChange={(e) => setOnSiteLongerNote(e.target.value)} />
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Drain &amp; refill steps</label>
        <div className="task-grid">
          {HOT_TUB_DRAIN_STEPS.map((t) => (
            <button type="button" key={t} className={`task-chip ${drainSteps.includes(t) ? "on" : ""}`} onClick={() => toggleDrainStep(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Cleaner used</label>
        <div className="task-grid">
          {HOT_TUB_CLEANER_TYPES.map((t) => (
            <button type="button" key={t} className={`task-chip condition ${cleanerType === t ? "on" : ""}`} onClick={() => setCleanerType(t)}>
              {t}
            </button>
          ))}
        </div>
        {cleanerType === HOT_TUB_CLEANER_TYPES[1] && (
          <div style={{ marginTop: "10px" }}>
            <label className="pfl-field-label">Why a sequestrant</label>
            <textarea className="pfl-textarea" placeholder="e.g. rust staining on shell, suspected pink mold/fungus..."
              value={cleanerReason} onChange={(e) => setCleanerReason(e.target.value)} />
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Chemical readings (after refill)</label>
        {PARAMS.map((p) => (
          <ReadingBar key={p.key} param={p} value={readings[p.key]} onChange={(v) => updateReading(p.key, v)} />
        ))}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Chemicals added</label>
        {HOT_TUB_CHEMICAL_CHECKLIST.map((item) => {
          const entry = chemChecklist[item.key] || { checked: false, amount: 0 };
          return (
            <div className="chem-item" key={item.key}>
              <label>
                <input type="checkbox" checked={entry.checked} onChange={() => toggleChecklistItem(item.key)} />
                {item.label}
              </label>
              <input className="pfl-num" type="number" min="0" step="0.5" disabled={!entry.checked}
                value={entry.amount || ""} onChange={(e) => updateChecklistAmount(item.key, +e.target.value)} />
              <span className="chem-unit">{item.unit}</span>
            </div>
          );
        })}
      </div>

      <div className="pfl-card">
        <label className="repair-toggle">
          <input type="checkbox" checked={repairNeeded} onChange={(e) => setRepairNeeded(e.target.checked)} />
          Issue found during drain
        </label>
        {repairNeeded && (
          <div className="repair-body">
            <label className="pfl-field-label">Issue type</label>
            <select className="pfl-select" value={repairIssueType} onChange={(e) => setRepairIssueType(e.target.value)}>
              {HOT_TUB_REPAIR_ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>What's wrong</label>
            <textarea className="pfl-textarea" value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)} />
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>Photos</label>
            <div className="capture-grid">
              <CaptureSlot label="Photo 1" photo={repairPhoto1} onCapture={setRepairPhoto1} onRetake={() => setRepairPhoto1State(null)} />
              <CaptureSlot label="Photo 2" photo={repairPhoto2} onCapture={setRepairPhoto2} onRetake={() => setRepairPhoto2State(null)} />
            </div>
          </div>
        )}
      </div>

      <GateClosedCard
        gateOption={gateOption}
        setGateOption={setGateOption}
        photo={gateClosedPhoto}
        onCapture={setGateClosedPhoto}
        onRetake={() => setGateClosedPhotoState(null)}
      />

      <div className="pfl-card">
        <label className="pfl-field-label">Notes</label>
        <textarea className="pfl-textarea" placeholder="Anything the office should know..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}
      <button type="button" className="submit-btn" onClick={submitDrain}>Mark drain &amp; refill complete</button>
    </>
  );
}

function PumpPickupForm({ session, setAllStops, pendingStop, onComplete }) {
  const [onSiteLonger, setOnSiteLonger] = useState(false);
  const [onSiteLongerNote, setOnSiteLongerNote] = useState("");
  const [pumpRetrieved, setPumpRetrieved] = useState(false);
  const [waterLevelNow, setWaterLevelNow] = useState("Normal");
  const [afterPhoto, setAfterPhotoState] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function setAfterPhoto(file) { if (file) setAfterPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }

  if (!pendingStop) return null;

  function submitPickup() {
    if (onSiteLonger && !onSiteLongerNote.trim()) {
      setError("Add a quick note on why this visit ran long.");
      return;
    }
    if (!pumpRetrieved) { setError("Confirm the pump was retrieved before completing."); return; }
    if (!afterPhoto) { setError("Take a photo of the water level before completing."); return; }
    setError("");
    setAllStops((all) => all.map((st) => st.id === pendingStop.id ? {
      ...st,
      pending: false,
      onSiteLonger, onSiteLongerNote,
      pumpRetrieved, waterLevelNow, afterPhoto, notes,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    } : st));
    onComplete();
  }

  return (
    <>
      <div className="pfl-card site-card">
        <label className="pfl-field-label">Pump pickup</label>
        <div className="site-row"><span>Customer</span><span className="site-value">{pendingStop.customer}</span></div>
        {pendingStop.pumpPickupReason && (
          <div className="site-row stacked"><span>Reason</span><span className="site-value">{pendingStop.pumpPickupReason}</span></div>
        )}
      </div>

      <div className={`pfl-card ${onSiteLonger ? "repair-card" : ""}`}>
        <label className="repair-toggle">
          <input type="checkbox" checked={onSiteLonger} onChange={(e) => setOnSiteLonger(e.target.checked)} />
          On site longer than 30 minutes
        </label>
        {onSiteLonger && (
          <div className="repair-body">
            <label className="pfl-field-label">Why</label>
            <textarea className="pfl-textarea" placeholder="e.g. pump was hard to reach, customer conversation..."
              value={onSiteLongerNote} onChange={(e) => setOnSiteLongerNote(e.target.value)} />
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="repair-toggle">
          <input type="checkbox" checked={pumpRetrieved} onChange={(e) => setPumpRetrieved(e.target.checked)} />
          Pump retrieved
        </label>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Water level now</label>
        <div className="task-grid">
          {WATER_LEVEL_OPTIONS.map((w) => (
            <button type="button" key={w} className={`task-chip condition ${waterLevelNow === w ? "on" : ""}`} onClick={() => setWaterLevelNow(w)}>
              {w}
            </button>
          ))}
        </div>
        <div className="capture-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "180px", marginTop: "10px" }}>
          <CaptureSlot label="Water level" photo={afterPhoto} onCapture={setAfterPhoto} onRetake={() => setAfterPhotoState(null)} />
        </div>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Notes</label>
        <textarea className="pfl-textarea" placeholder="Anything the office should know..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}
      <button type="button" className="submit-btn" onClick={submitPickup}>Mark pump pickup complete</button>
    </>
  );
}

function EquipmentReassemblyForm({ session, setAllStops, customers, setCustomers }) {
  const [customer, setCustomer] = useState("");
  const [gallons, setGallons] = useState(15000);
  const [notServiceable, setNotServiceable] = useState(false);
  const [nsReason, setNsReason] = useState(NOT_SERVICEABLE_REASONS[0]);
  const [nsDetails, setNsDetails] = useState("");
  const [nsError, setNsError] = useState("");
  const [onSiteLonger, setOnSiteLonger] = useState(false);
  const [onSiteLongerNote, setOnSiteLongerNote] = useState("");
  const [beforePhoto, setBeforePhotoState] = useState(null);
  const [afterPhoto, setAfterPhotoState] = useState(null);
  const [tasksDone, setTasksDone] = useState([]);
  const [pumpHasPower, setPumpHasPower] = useState(null);
  const [customerNotified, setCustomerNotified] = useState(false);
  const [pumpPowerNotes, setPumpPowerNotes] = useState("");
  const [freezeDamage, setFreezeDamage] = useState(false);
  const [freezeDamageType, setFreezeDamageType] = useState(FREEZE_DAMAGE_TYPES[0]);
  const [freezeDamageDescription, setFreezeDamageDescription] = useState("");
  const [freezeDamagePhoto1, setFreezeDamagePhoto1State] = useState(null);
  const [freezeDamagePhoto2, setFreezeDamagePhoto2State] = useState(null);
  const [waterLevel, setWaterLevel] = useState("Normal");
  const [waterLowered, setWaterLowered] = useState(false);
  const [poolClarity, setPoolClarity] = useState("Clear");
  const [shockAndCirculate, setShockAndCirculate] = useState(false);
  const [gateOption, setGateOption] = useState(GATE_OPTIONS[0]);
  const [gateClosedPhoto, setGateClosedPhotoState] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function selectCustomer(name) {
    setCustomer(name);
    const found = customers.find((c) => c.name === name);
    if (found) setGallons(found.gallons || 15000);
  }
  function updateSiteInfo(updated) {
    setCustomers((cs) => cs.map((c) => (c.name === updated.name ? updated : c)));
  }
  function toggleTaskDone(t) {
    setTasksDone((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }
  function setBeforePhoto(file) { if (file) setBeforePhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setAfterPhoto(file) { if (file) setAfterPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setFreezeDamagePhoto1(file) { if (file) setFreezeDamagePhoto1State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setFreezeDamagePhoto2(file) { if (file) setFreezeDamagePhoto2State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setGateClosedPhoto(file) { if (file) setGateClosedPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }

  const selectedInfo = customers.find((c) => c.name === customer);
  const shockInfo = shockAllowedFor(selectedInfo);

  function resetForm() {
    setCustomer(""); setGallons(15000);
    setOnSiteLonger(false); setOnSiteLongerNote("");
    setBeforePhotoState(null); setAfterPhotoState(null); setTasksDone([]);
    setPumpHasPower(null); setCustomerNotified(false); setPumpPowerNotes("");
    setFreezeDamage(false); setFreezeDamageType(FREEZE_DAMAGE_TYPES[0]);
    setFreezeDamageDescription(""); setFreezeDamagePhoto1State(null); setFreezeDamagePhoto2State(null);
    setWaterLevel("Normal"); setWaterLowered(false); setPoolClarity("Clear"); setShockAndCirculate(false);
    setGateOption(GATE_OPTIONS[0]); setGateClosedPhotoState(null); setNotes("");
    setNotServiceable(false); setNsReason(NOT_SERVICEABLE_REASONS[0]); setNsDetails(""); setNsError("");
  }

  function submitNotServiceable() {
    if (!customer) { setNsError("Select a customer before marking not serviceable."); return; }
    if (nsReason === "Other" && !nsDetails.trim()) { setNsError("Add details for \"Other\" before marking not serviceable."); return; }
    setNsError("");
    setAllStops((s) => [{
      id: Date.now(), technician: session.id, sent: false, sentAt: null,
      stopType: "reassembly", dueDate: todayStr(), customer, gallons,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      notServiceable: true, notServiceableReason: nsReason, notServiceableDetails: nsDetails,
      tone: "danger", followUp: false, repairNeeded: false,
    }, ...s]);
    resetForm();
  }

  function submitStop() {
    if (!customer) { setError("Select a customer before logging this stop."); return; }
    if (onSiteLonger && !onSiteLongerNote.trim()) {
      setError("Add a quick note on why this visit ran long.");
      return;
    }
    if (pumpHasPower === false && !pumpPowerNotes.trim()) {
      setError("Add a note about the pump power issue before logging this stop.");
      return;
    }
    if (freezeDamage && !freezeDamageDescription.trim()) {
      setError("Describe the freeze damage found before logging this stop.");
      return;
    }
    if (waterLevel === "High" && !waterLowered) {
      setError("Water level is high - confirm you lowered it before logging this stop.");
      return;
    }
    setError("");
    const stopId = Date.now();
    const stop = {
      id: stopId, technician: session.id, sent: false, sentAt: null, repairHandled: false,
      stopType: "reassembly", dueDate: todayStr(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      customer, gallons,
      onSiteLonger, onSiteLongerNote,
      beforePhoto, afterPhoto, tasksDone: [...tasksDone],
      pumpHasPower, customerNotified: pumpHasPower === false ? customerNotified : null, pumpPowerNotes,
      freezeDamage, freezeDamageType: freezeDamage ? freezeDamageType : null,
      freezeDamageDescription, freezeDamagePhoto1, freezeDamagePhoto2,
      waterLevel, waterLowered: waterLevel === "High" ? waterLowered : null,
      poolClarity, shockAndCirculate: poolClarity !== "Clear" ? shockAndCirculate : false,
      gateOption, gateClosedPhoto, notes,
      tone: (pumpHasPower === false || freezeDamage || waterLevel === "High") ? "danger" : "good",
      followUp: false, repairNeeded: false,
    };
    if (waterLevel === "High") {
      const pickupStop = {
        id: stopId + 1, technician: session.id, sent: false, sentAt: null,
        stopType: "pumpPickup", pending: true, linkedStopId: stopId, dueDate: tomorrowStr(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        customer, gallons, pumpPickupReason: "Water level was high during equipment setup - pump dropped in to lower it.",
        tone: "good", followUp: false, repairNeeded: false,
      };
      setAllStops((s) => [pickupStop, stop, ...s]);
    } else {
      setAllStops((s) => [stop, ...s]);
    }
    resetForm();
  }

  return (
    <>
      <div className="pfl-card">
        <label className="pfl-field-label">Customer</label>
        <select className="pfl-select" value={customer} onChange={(e) => selectCustomer(e.target.value)}>
          <option value="">Select a stop...</option>
          {customers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>


      <NotServiceableCard
        notServiceable={notServiceable} setNotServiceable={setNotServiceable}
        reason={nsReason} setReason={setNsReason} details={nsDetails} setDetails={setNsDetails}
        error={nsError} onSubmit={submitNotServiceable}
      />
      {customer && (
        <SiteInfoCard info={customers.find((c) => c.name === customer)} onUpdate={updateSiteInfo} />
      )}

      <div className="pfl-card">
        <label className="pfl-field-label">Photos</label>
        <div className="capture-grid">
          <CaptureSlot label="Before" photo={beforePhoto} onCapture={setBeforePhoto} onRetake={() => setBeforePhotoState(null)} />
          <CaptureSlot label="After" photo={afterPhoto} onCapture={setAfterPhoto} onRetake={() => setAfterPhotoState(null)} />
        </div>
      </div>

      <div className={`pfl-card ${onSiteLonger ? "repair-card" : ""}`}>
        <label className="repair-toggle">
          <input type="checkbox" checked={onSiteLonger} onChange={(e) => setOnSiteLonger(e.target.checked)} />
          On site longer than 30 minutes
        </label>
        {onSiteLonger && (
          <div className="repair-body">
            <label className="pfl-field-label">Why</label>
            <textarea className="pfl-textarea" placeholder="e.g. troubleshooting equipment, freeze damage repair, extended cleanup..."
              value={onSiteLongerNote} onChange={(e) => setOnSiteLongerNote(e.target.value)} />
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Equipment reassembly</label>
        <div className="task-grid">
          {EQUIPMENT_REASSEMBLY_TASKS.map((t) => (
            <button type="button" key={t} className={`task-chip ${tasksDone.includes(t) ? "on" : ""}`} onClick={() => toggleTaskDone(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={`pfl-card ${pumpHasPower === false ? "repair-card" : ""}`}>
        <label className="pfl-field-label">Pump power test</label>
        <div className="task-grid">
          <button type="button" className={`task-chip condition ${pumpHasPower === true ? "on" : ""}`} onClick={() => setPumpHasPower(true)}>
            Has power
          </button>
          <button type="button" className={`task-chip condition ${pumpHasPower === false ? "on" : ""}`} onClick={() => setPumpHasPower(false)}>
            No power
          </button>
        </div>
        {pumpHasPower === false && (
          <div className="repair-body">
            <label className="repair-toggle">
              <input type="checkbox" checked={customerNotified} onChange={(e) => setCustomerNotified(e.target.checked)} />
              Customer notified
            </label>
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>Notes</label>
            <textarea className="pfl-textarea" placeholder="e.g. breaker tripped, no power to pad, called homeowner..."
              value={pumpPowerNotes} onChange={(e) => setPumpPowerNotes(e.target.value)} />
          </div>
        )}
      </div>

      <div className={`pfl-card ${waterLevel === "High" ? "repair-card" : ""}`}>
        <label className="pfl-field-label">Water level</label>
        <div className="task-grid">
          {WATER_LEVEL_OPTIONS.map((w) => (
            <button type="button" key={w} className={`task-chip condition ${waterLevel === w ? "on" : ""}`} onClick={() => setWaterLevel(w)}>
              {w}
            </button>
          ))}
        </div>
        {waterLevel === "High" && (
          <div className="repair-body">
            <label className="repair-toggle">
              <input type="checkbox" checked={waterLowered} onChange={(e) => setWaterLowered(e.target.checked)} />
              Lowered the water level (pump dropped in)
            </label>
            <div className="follow-reason" style={{ marginTop: "8px" }}>
              Adds a "Pump pickup" work order to tomorrow's list to retrieve the pump.
            </div>
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Pool clarity</label>
        <div className="task-grid">
          {POOL_CLARITY_OPTIONS.map((c) => (
            <button type="button" key={c} className={`task-chip condition ${poolClarity === c ? "on" : ""}`} onClick={() => setPoolClarity(c)}>
              {c}
            </button>
          ))}
        </div>
        {poolClarity !== "Clear" && (
          shockInfo.allowed ? (
            <label className="repair-toggle" style={{ marginTop: "10px" }}>
              <input type="checkbox" checked={shockAndCirculate} onChange={(e) => setShockAndCirculate(e.target.checked)} />
              Shock and circulate
            </label>
          ) : (
            <div className="follow-reason" style={{ marginTop: "10px", color: "var(--repair)" }}>
              Shocking not available - {shockInfo.reason}
            </div>
          )
        )}
      </div>

      <div className={`pfl-card ${freezeDamage ? "repair-card" : ""}`}>
        <label className="repair-toggle">
          <input type="checkbox" checked={freezeDamage} onChange={(e) => setFreezeDamage(e.target.checked)} />
          Freeze damage found
        </label>
        {freezeDamage && (
          <div className="repair-body">
            <label className="pfl-field-label">Damage type</label>
            <select className="pfl-select" value={freezeDamageType} onChange={(e) => setFreezeDamageType(e.target.value)}>
              {FREEZE_DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>Describe the damage</label>
            <textarea className="pfl-textarea" value={freezeDamageDescription} onChange={(e) => setFreezeDamageDescription(e.target.value)} />
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>Photos</label>
            <div className="capture-grid">
              <CaptureSlot label="Photo 1" photo={freezeDamagePhoto1} onCapture={setFreezeDamagePhoto1} onRetake={() => setFreezeDamagePhoto1State(null)} />
              <CaptureSlot label="Photo 2" photo={freezeDamagePhoto2} onCapture={setFreezeDamagePhoto2} onRetake={() => setFreezeDamagePhoto2State(null)} />
            </div>
          </div>
        )}
      </div>

      <GateClosedCard
        gateOption={gateOption}
        setGateOption={setGateOption}
        photo={gateClosedPhoto}
        onCapture={setGateClosedPhoto}
        onRetake={() => setGateClosedPhotoState(null)}
      />

      <div className="pfl-card">
        <label className="pfl-field-label">Notes</label>
        <textarea className="pfl-textarea" placeholder="Anything the office should know..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}
      <button type="button" className="submit-btn" onClick={submitStop}>Log this stop</button>
    </>
  );
}

function PoolOpeningForm({ session, setAllStops, customers, setCustomers }) {
  const [customer, setCustomer] = useState("");
  const [gallons, setGallons] = useState(15000);
  const [notServiceable, setNotServiceable] = useState(false);
  const [nsReason, setNsReason] = useState(NOT_SERVICEABLE_REASONS[0]);
  const [nsDetails, setNsDetails] = useState("");
  const [nsError, setNsError] = useState("");
  const [outdoorTemp, setOutdoorTemp] = useState(75);
  const [avgForecastHigh, setAvgForecastHigh] = useState(80);
  const [daysUntilNext, setDaysUntilNext] = useState(3);
  const [onSiteLonger, setOnSiteLonger] = useState(false);
  const [onSiteLongerNote, setOnSiteLongerNote] = useState("");
  const [beforePhoto, setBeforePhotoState] = useState(null);
  const [afterPhoto, setAfterPhotoState] = useState(null);
  const [coverStatus, setCoverStatus] = useState("On the pool");
  const [equipmentDone, setEquipmentDone] = useState([]);
  const [heaterWorking, setHeaterWorking] = useState(null);
  const [heaterIssueType, setHeaterIssueType] = useState(HEATER_ISSUE_TYPES[0]);
  const [heaterIssueDescription, setHeaterIssueDescription] = useState("");
  const [heaterIssuePhoto, setHeaterIssuePhotoState] = useState(null);
  const [readiness, setReadiness] = useState(0);
  const [finalReadyDone, setFinalReadyDone] = useState([]);
  const [pumpingDown, setPumpingDown] = useState(false);
  const [pumpDownSteps, setPumpDownSteps] = useState([]);
  const [acidWashed, setAcidWashed] = useState(false);
  const [acidWashTarget, setAcidWashTarget] = useState(ACID_WASH_TARGETS[0]);
  const [acidWashBeforePhoto, setAcidWashBeforePhotoState] = useState(null);
  const [acidWashAfterPhoto, setAcidWashAfterPhotoState] = useState(null);
  const [readings, setReadings] = useState(OPENING_DEFAULT_READINGS);
  const [chemChecklist, setChemChecklist] = useState({});
  const [customChemicals, setCustomChemicals] = useState([]);
  const [waterCondition, setWaterCondition] = useState("Cloudy");
  const [pocOverride, setPocOverride] = useState(null);
  const [repairNeeded, setRepairNeeded] = useState(false);
  const [repairIssueType, setRepairIssueType] = useState(REPAIR_ISSUE_TYPES[0]);
  const [repairDescription, setRepairDescription] = useState("");
  const [repairPhoto1, setRepairPhoto1State] = useState(null);
  const [repairPhoto2, setRepairPhoto2State] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");


  function updateReading(key, val) {
    setReadings((r) => ({ ...r, [key]: val }));
  }
  function selectCustomer(name) {
    setCustomer(name);
    const found = customers.find((c) => c.name === name);
    if (found) setGallons(found.gallons);
  }
  function updateSiteInfo(updated) {
    setCustomers((cs) => cs.map((c) => (c.name === updated.name ? updated : c)));
  }
  function toggleEquipment(t) {
    setEquipmentDone((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }
  function toggleFinalReady(t) {
    setFinalReadyDone((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }
  function togglePumpDownStep(t) {
    setPumpDownSteps((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }
  function setAcidWashBeforePhoto(file) { if (file) setAcidWashBeforePhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setAcidWashAfterPhoto(file) { if (file) setAcidWashAfterPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setHeaterIssuePhoto(file) { if (file) setHeaterIssuePhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setRepairPhoto1(file) { if (file) setRepairPhoto1State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setRepairPhoto2(file) { if (file) setRepairPhoto2State({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setBeforePhoto(file) { if (file) setBeforePhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }
  function setAfterPhoto(file) { if (file) setAfterPhotoState({ url: URL.createObjectURL(file), takenAt: Date.now() }); }

  const selectedCustomerInfo = customers.find((c) => c.name === customer);
  const isGunite = selectedCustomerInfo?.poolType === "Gunite";
  const worst = worstTone(PARAMS.map((p) => zoneOf(p, readings[p.key])));
  const dosing = buildDosing({ readings, gallons, avgForecastHigh, daysUntilNext });
  const autoPoc = !pumpingDown && (waterCondition !== "Clear" || worst === "danger");
  const pocNeeded = pocOverride === null ? autoPoc : pocOverride;
  const pocReasons = [];
  if (waterCondition !== "Clear") pocReasons.push(waterCondition.toLowerCase());
  if (worst === "danger") pocReasons.push("chemistry out of range");

  function toggleChecklistItem(key) {
    setChemChecklist((c) => {
      const cur = c[key] || { checked: false, amount: 0 };
      const nextChecked = !cur.checked;
      let amount = cur.amount;
      if (nextChecked && (!amount || amount === 0)) {
        const item = CHEMICAL_CHECKLIST.find((i) => i.key === key);
        const match = dosing.find((d) => item.dosingMatch.includes(d.chemical));
        amount = match ? parseFloat(match.amount) || 1 : 1;
      }
      return { ...c, [key]: { checked: nextChecked, amount } };
    });
  }
  function updateChecklistAmount(key, amount) {
    setChemChecklist((c) => ({ ...c, [key]: { checked: true, amount } }));
  }
  function addCustomChemical() {
    setCustomChemicals((c) => [...c, { id: Date.now() + Math.random(), name: "", amount: 1, unit: "oz" }]);
  }
  function updateCustomChemical(id, patch) {
    setCustomChemicals((c) => c.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  function removeCustomChemical(id) {
    setCustomChemicals((c) => c.filter((row) => row.id !== id));
  }

  function resetForm() {
    setCustomer(""); setGallons(15000);
    setOnSiteLonger(false); setOnSiteLongerNote("");
    setBeforePhotoState(null); setAfterPhotoState(null); setCoverStatus("On the pool");
    setEquipmentDone([]); setHeaterWorking(null); setHeaterIssueType(HEATER_ISSUE_TYPES[0]);
    setHeaterIssueDescription(""); setHeaterIssuePhotoState(null);
    setReadiness(0); setFinalReadyDone([]); setPumpingDown(false); setPumpDownSteps([]);
    setAcidWashed(false); setAcidWashTarget(ACID_WASH_TARGETS[0]);
    setAcidWashBeforePhotoState(null); setAcidWashAfterPhotoState(null);
    setReadings(OPENING_DEFAULT_READINGS);
    setChemChecklist({}); setCustomChemicals([]); setWaterCondition("Cloudy");
    setPocOverride(null); setRepairNeeded(false); setRepairIssueType(REPAIR_ISSUE_TYPES[0]);
    setRepairDescription(""); setRepairPhoto1State(null); setRepairPhoto2State(null); setNotes("");
    setNotServiceable(false); setNsReason(NOT_SERVICEABLE_REASONS[0]); setNsDetails(""); setNsError("");
  }

  function submitNotServiceable() {
    if (!customer) { setNsError("Select a customer before marking not serviceable."); return; }
    if (nsReason === "Other" && !nsDetails.trim()) { setNsError("Add details for \"Other\" before marking not serviceable."); return; }
    setNsError("");
    setAllStops((s) => [{
      id: Date.now(), technician: session.id, sent: false, sentAt: null,
      stopType: "opening", dueDate: todayStr(), customer, gallons,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      notServiceable: true, notServiceableReason: nsReason, notServiceableDetails: nsDetails,
      tone: "danger", followUp: false, repairNeeded: false,
    }, ...s]);
    resetForm();
  }

  function submitStop() {
    if (!customer) { setError("Select a customer before logging this opening."); return; }
    if (onSiteLonger && !onSiteLongerNote.trim()) {
      setError("Add a quick note on why this visit ran long.");
      return;
    }
    if (repairNeeded && !repairDescription.trim()) { setError("Describe the issue found before logging this opening."); return; }
    if (heaterWorking === false && !heaterIssueDescription.trim()) {
      setError("Describe the heater issue before logging this opening.");
      return;
    }
    if (acidWashed && (!acidWashBeforePhoto || !acidWashAfterPhoto)) {
      setError("Take both a before and after photo of the acid wash before logging this opening.");
      return;
    }
    if (readiness >= 100) {
      if (finalReadyDone.length < FINAL_READY_CHECKLIST.length) {
        setError("Pool is marked 100% ready - confirm all final checklist items before logging.");
        return;
      }
      if (coverStatus !== "Removed and stored") {
        setError("Pool is marked 100% ready - the cover needs to be removed and stored first.");
        return;
      }
      if (heaterWorking !== true) {
        setError("Pool is marked 100% ready - the heater needs to test as working first.");
        return;
      }
    }
    setError("");
    const checklistChems = CHEMICAL_CHECKLIST
      .filter((i) => chemChecklist[i.key]?.checked && chemChecklist[i.key].amount > 0)
      .map((i) => ({ type: i.label, amount: chemChecklist[i.key].amount, unit: i.unit }));
    const customChems = customChemicals
      .filter((c) => c.name.trim() && c.amount > 0)
      .map((c) => ({ type: c.name, amount: c.amount, unit: c.unit }));
    const stop = {
      id: Date.now(), technician: session.id, sent: false, sentAt: null, repairHandled: false,
      stopType: "opening", dueDate: todayStr(), pocNeeded, pocLabel: pocNeeded ? "POC2" : null,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      customer, gallons, poolType: selectedCustomerInfo?.poolType || null,
      onSiteLonger, onSiteLongerNote,
      beforePhoto, afterPhoto, coverStatus, equipmentChecklist: [...equipmentDone],
      heaterWorking, heaterIssueType, heaterIssueDescription, heaterIssuePhoto,
      readiness, finalReadyChecklist: [...finalReadyDone],
      pumpingDown, pumpDownSteps: [...pumpDownSteps],
      acidWashed, acidWashTarget: acidWashed ? acidWashTarget : null,
      acidWashBeforePhoto: acidWashed ? acidWashBeforePhoto : null,
      acidWashAfterPhoto: acidWashed ? acidWashAfterPhoto : null,
      readings: { ...readings },
      chemicals: [...checklistChems, ...customChems], tasks: [],
      waterCondition, notes, tone: worst, followUp: pocNeeded,
      repairNeeded, repairIssueType, repairDescription, repairPhoto1, repairPhoto2,
    };
    setAllStops((s) => [stop, ...s]);
    resetForm();
  }

  return (
    <>
      <div className="pfl-card">
        <label className="pfl-field-label">Customer</label>
        <select className="pfl-select" value={customer} onChange={(e) => selectCustomer(e.target.value)}>
          <option value="">Select a pool...</option>
          {customers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>


      <NotServiceableCard
        notServiceable={notServiceable} setNotServiceable={setNotServiceable}
        reason={nsReason} setReason={setNsReason} details={nsDetails} setDetails={setNsDetails}
        error={nsError} onSubmit={submitNotServiceable}
      />
      {customer && (
        <SiteInfoCard info={customers.find((c) => c.name === customer)} onUpdate={updateSiteInfo} />
      )}

      <div className="pfl-card">
        <label className="pfl-field-label">Photos</label>
        <div className="capture-grid">
          <CaptureSlot label="Before" photo={beforePhoto} onCapture={setBeforePhoto} onRetake={() => setBeforePhotoState(null)} />
          <CaptureSlot label="After" photo={afterPhoto} onCapture={setAfterPhoto} onRetake={() => setAfterPhotoState(null)} />
        </div>
        <div className="capture-note">Opens the camera directly instead of the photo library, so each visit needs a fresh shot rather than a saved one. Photo capture works even with no signal.</div>
      </div>

      <div className={`pfl-card ${onSiteLonger ? "repair-card" : ""}`}>
        <label className="repair-toggle">
          <input type="checkbox" checked={onSiteLonger} onChange={(e) => setOnSiteLonger(e.target.checked)} />
          On site longer than 30 minutes
        </label>
        {onSiteLonger && (
          <div className="repair-body">
            <label className="pfl-field-label">Why</label>
            <textarea className="pfl-textarea" placeholder="e.g. heavy equipment issue, extended chemistry balancing, customer walkthrough..."
              value={onSiteLongerNote} onChange={(e) => setOnSiteLongerNote(e.target.value)} />
          </div>
        )}
      </div>

      <CoverStatusCard coverStatus={coverStatus} setCoverStatus={setCoverStatus} />

      <div className="pfl-card">
        <label className="pfl-field-label">Equipment checklist</label>
        <div className="task-grid">
          {OPENING_EQUIPMENT_CHECKLIST.map((t) => (
            <button type="button" key={t} className={`task-chip ${equipmentDone.includes(t) ? "on" : ""}`} onClick={() => toggleEquipment(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {isGunite && (
        <div className="pfl-card repair-card">
          <label className="repair-toggle">
            <input type="checkbox" checked={pumpingDown} onChange={(e) => setPumpingDown(e.target.checked)} />
            Pumping down (drain &amp; pressure wash)
          </label>
          {pumpingDown && (
            <div className="repair-body">
              <div className="follow-reason" style={{ marginBottom: "10px" }}>
                For when there's a deadline to hit instead of a multi-visit chemical clear: submersible pump to the deep end, drain the pool, then power wash and acid wash as needed.
              </div>
              <div className="task-grid">
                {PUMP_DOWN_STEPS.map((t) => (
                  <button type="button" key={t} className={`task-chip ${pumpDownSteps.includes(t) ? "on" : ""}`} onClick={() => togglePumpDownStep(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <label className="repair-toggle" style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
                <input type="checkbox" checked={acidWashed} onChange={(e) => setAcidWashed(e.target.checked)} />
                Acid washed
              </label>
              {acidWashed && (
                <div style={{ marginTop: "10px" }}>
                  <label className="pfl-field-label">What was acid washed</label>
                  <select className="pfl-select" value={acidWashTarget} onChange={(e) => setAcidWashTarget(e.target.value)}>
                    {ACID_WASH_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="pfl-field-label" style={{ marginTop: "10px" }}>Photos</label>
                  <div className="capture-grid">
                    <CaptureSlot label="Before" photo={acidWashBeforePhoto} onCapture={setAcidWashBeforePhoto} onRetake={() => setAcidWashBeforePhotoState(null)} />
                    <CaptureSlot label="After" photo={acidWashAfterPhoto} onCapture={setAcidWashAfterPhoto} onRetake={() => setAcidWashAfterPhotoState(null)} />
                  </div>
                  <div className="follow-reason" style={{ marginTop: "8px" }}>
                    Acid used for the wash still gets logged under Chemicals added below.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {customer && !isGunite && (
        <div className="follow-reason" style={{ marginBottom: "14px" }}>
          Pumping down isn't offered for vinyl pools - draining a vinyl liner risks it shifting or collapsing.
        </div>
      )}

      <HeaterTestCard
        heaterWorking={heaterWorking}
        setHeaterWorking={setHeaterWorking}
        heaterIssueType={heaterIssueType}
        setHeaterIssueType={setHeaterIssueType}
        heaterIssueDescription={heaterIssueDescription}
        setHeaterIssueDescription={setHeaterIssueDescription}
        heaterIssuePhoto={heaterIssuePhoto}
        onCapturePhoto={setHeaterIssuePhoto}
        onRetakePhoto={() => setHeaterIssuePhotoState(null)}
      />

      <div className="pfl-card">
        <label className="pfl-field-label">Pool readiness</label>
        <div className="readiness-row">
          <input type="range" min="0" max="100" step="5" value={readiness} onChange={(e) => setReadiness(+e.target.value)} />
          <div className="readiness-pct" style={{ color: toneVar(readiness >= 100 ? "good" : readiness >= 50 ? "warn" : "danger") }}>
            {readiness}%
          </div>
        </div>
        <div className="reading-ideal">How ready is this pool for regular service?</div>
      </div>

      {readiness >= 100 && (
        <div className="pfl-card dosing-card">
          <label className="pfl-field-label">Final steps before marking ready</label>
          <div className="task-grid">
            {FINAL_READY_CHECKLIST.map((t) => (
              <button type="button" key={t} className={`task-chip ${finalReadyDone.includes(t) ? "on" : ""}`} onClick={() => toggleFinalReady(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="dosing-note">Along with the cover being removed and stored, and the heater testing as working above, these must all be confirmed before logging this opening at 100% ready.</div>
        </div>
      )}

      <div className="pfl-card">
        <label className="pfl-field-label">Pool & weather</label>
        <div className="grid-2">
          <div>
            <label className="pfl-field-label">Pool size (gal)</label>
            <input className="pfl-num" type="number" step="500" value={gallons} onChange={(e) => setGallons(+e.target.value)} />
          </div>
          <div>
            <label className="pfl-field-label">Days until next visit</label>
            <input className="pfl-num" type="number" step="1" min="1" value={daysUntilNext} onChange={(e) => setDaysUntilNext(+e.target.value)} />
          </div>
          <div>
            <label className="pfl-field-label">Outdoor temp now (°F)</label>
            <input className="pfl-num" type="number" step="1" value={outdoorTemp} onChange={(e) => setOutdoorTemp(+e.target.value)} />
          </div>
          <div>
            <label className="pfl-field-label">Avg forecast high (°F)</label>
            <input className="pfl-num" type="number" step="1" value={avgForecastHigh} onChange={(e) => setAvgForecastHigh(+e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Chemical readings</label>
        {PARAMS.map((p) => (
          <ReadingBar key={p.key} param={p} value={readings[p.key]} onChange={(v) => updateReading(p.key, v)} />
        ))}
      </div>

      {dosing.length > 0 && (
        <div className="pfl-card dosing-card">
          <label className="pfl-field-label">Suggested dosing</label>
          {dosing.map((d, i) => (
            <div className="dosing-item" key={i}>
              <div>
                <div className="dosing-chem">{d.chemical}</div>
                <div className="dosing-why">{d.why}</div>
              </div>
              <div className="dosing-amount">{d.amount} {d.unit}</div>
            </div>
          ))}
          <div className="dosing-note">Opening water is often way out of balance - these are starting estimates. Retest after the initial dose settles, since openings frequently need more than one treatment.</div>
        </div>
      )}

      <div className="pfl-card">
        <label className="pfl-field-label">Water condition</label>
        <div className="task-grid">
          {OPENING_WATER_CONDITIONS.map((w) => (
            <button type="button" key={w} className={`task-chip condition ${waterCondition === w ? "on" : ""}`} onClick={() => setWaterCondition(w)}>
              {w}
            </button>
          ))}
        </div>
        <div className="follow-row">
          <label>
            <input type="checkbox" checked={pocNeeded} onChange={(e) => setPocOverride(e.target.checked)} />
            Schedule POC2 (pool opening continued)
          </label>
        </div>
        {pocNeeded && pocReasons.length > 0 && (
          <div className="follow-reason">Auto-flagged: {pocReasons.join(", ")}</div>
        )}
      </div>

      <div className="pfl-card">
        <label className="repair-toggle">
          <input type="checkbox" checked={repairNeeded} onChange={(e) => setRepairNeeded(e.target.checked)} />
          Damage or issue found during opening
        </label>
        {repairNeeded && (
          <div className="repair-body">
            <label className="pfl-field-label">Issue type</label>
            <select className="pfl-select" value={repairIssueType} onChange={(e) => setRepairIssueType(e.target.value)}>
              {REPAIR_ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>What's wrong</label>
            <textarea className="pfl-textarea" placeholder="e.g. cracked return line, torn cover, liner damage from freeze..."
              value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)} />
            <label className="pfl-field-label" style={{ marginTop: "10px" }}>Photos</label>
            <div className="capture-grid">
              <CaptureSlot label="Photo 1" photo={repairPhoto1} onCapture={setRepairPhoto1} onRetake={() => setRepairPhoto1State(null)} />
              <CaptureSlot label="Photo 2" photo={repairPhoto2} onCapture={setRepairPhoto2} onRetake={() => setRepairPhoto2State(null)} />
            </div>
          </div>
        )}
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Chemicals added</label>
        {CHEMICAL_CHECKLIST.map((item) => {
          const entry = chemChecklist[item.key] || { checked: false, amount: 0 };
          return (
            <div className="chem-item" key={item.key}>
              <label>
                <input type="checkbox" checked={entry.checked} onChange={() => toggleChecklistItem(item.key)} />
                {item.label}
              </label>
              <input className="pfl-num" type="number" min="0" step="0.5" disabled={!entry.checked}
                value={entry.amount || ""} onChange={(e) => updateChecklistAmount(item.key, +e.target.value)} />
              <span className="chem-unit">{item.unit}</span>
            </div>
          );
        })}
        {customChemicals.length > 0 && (
          <div className="pfl-field-label" style={{ marginTop: "14px" }}>Miscellaneous</div>
        )}
        {customChemicals.map((row) => (
          <div className="chem-row" key={row.id}>
            <input className="pfl-select" type="text" placeholder="e.g. Clarifier, phosphate remover..." value={row.name}
              onChange={(e) => updateCustomChemical(row.id, { name: e.target.value })} />
            <input className="pfl-num" type="number" min="0" step="0.5" value={row.amount}
              onChange={(e) => updateCustomChemical(row.id, { amount: +e.target.value })} />
            <select className="pfl-unit" value={row.unit} onChange={(e) => updateCustomChemical(row.id, { unit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <button type="button" onClick={() => removeCustomChemical(row.id)} aria-label="Remove">x</button>
          </div>
        ))}
        <button type="button" className="add-chem-btn" onClick={addCustomChemical}>+ Add miscellaneous chemical</button>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Notes</label>
        <textarea className="pfl-textarea" placeholder="Anything the office should know..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}
      <button type="button" className="submit-btn" onClick={submitStop}>Log this opening</button>
    </>
  );
}

function CustomerLocationsView({ customers }) {
  const grouped = TOWNS.map((town) => ({ town, list: customers.filter((c) => c.town === town) })).filter((g) => g.list.length > 0);
  const unassigned = customers.filter((c) => !c.town);

  return (
    <div>
      <div className="pfl-card">
        <label className="pfl-field-label">Customer locations</label>
        <div className="follow-reason">
          Every pool grouped by town, so you can build routes around what's actually close together instead of guessing.
        </div>
      </div>
      {grouped.map((g) => (
        <div className="pfl-card" key={g.town}>
          <label className="pfl-field-label">{g.town} ({g.list.length})</label>
          {g.list.map((c) => (
            <div className="route-row" key={c.name}>
              <div>
                <div className="checkup-name">{c.name}</div>
                <div className="checkup-reason">
                  {c.hasPool ? c.poolType : "No pool"}{c.hasHotTub ? " - Hot tub" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      {unassigned.length > 0 && (
        <div className="pfl-card repair-card">
          <label className="pfl-field-label">No town set ({unassigned.length})</label>
          {unassigned.map((c) => (
            <div className="route-row" key={c.name}>
              <div className="checkup-name">{c.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PoolProfilesManager({ customers, setCustomers }) {
  const [selectedName, setSelectedName] = useState(null);
  const [draft, setDraft] = useState(null);

  function openCustomer(c) {
    setSelectedName(c.name);
    setDraft({ ...c, contacts: c.contacts.map((x) => ({ ...x })) });
  }
  function addNew() {
    setSelectedName("__new__");
    setDraft({ ...BLANK_CUSTOMER, contacts: [{ name: "", phone: "", email: "" }] });
  }
  function updateDraft(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }
  function updateContact(i, patch) {
    setDraft((d) => ({ ...d, contacts: d.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  }
  function addContact() {
    setDraft((d) => ({ ...d, contacts: [...d.contacts, { name: "", phone: "", email: "" }] }));
  }
  function removeContact(i) {
    setDraft((d) => ({ ...d, contacts: d.contacts.filter((_, idx) => idx !== i) }));
  }
  function setHousePhoto(file) {
    if (file) updateDraft({ frontOfHousePhoto: { url: URL.createObjectURL(file), takenAt: Date.now() } });
  }
  function save() {
    if (!draft.name.trim()) return;
    if (selectedName === "__new__") {
      setCustomers((cs) => [...cs, draft]);
    } else {
      setCustomers((cs) => cs.map((c) => (c.name === selectedName ? draft : c)));
    }
    setSelectedName(null);
    setDraft(null);
  }
  function cancel() {
    setSelectedName(null);
    setDraft(null);
  }
  function removeCustomer(name) {
    setCustomers((cs) => cs.filter((c) => c.name !== name));
  }

  if (draft) {
    return (
      <div className="pfl-card">
        <label className="pfl-field-label">{selectedName === "__new__" ? "Add new pool" : "Edit pool profile"}</label>

        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Customer name / address</label>
        <input className="pfl-text" value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />

        <div className="grid-2">
          <div>
            <label className="pfl-field-label">Pool type</label>
            <select className="pfl-select" value={draft.poolType} onChange={(e) => updateDraft({ poolType: e.target.value })}>
              {POOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="pfl-field-label">Gallons</label>
            <input className="pfl-num" type="number" step="500" value={draft.gallons} onChange={(e) => updateDraft({ gallons: +e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Pool surround</label>
            <select className="pfl-select" value={draft.poolSurround} onChange={(e) => updateDraft({ poolSurround: e.target.value })}>
              {SURROUND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="pfl-field-label">Town</label>
            <select className="pfl-select" value={draft.town} onChange={(e) => updateDraft({ town: e.target.value })}>
              {TOWNS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Front of house photo</label>
        <div className="capture-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "180px" }}>
          <CaptureSlot label="Front of house" photo={draft.frontOfHousePhoto} onCapture={setHousePhoto}
            onRetake={() => updateDraft({ frontOfHousePhoto: null })} />
        </div>

        <div className="section-gap" />
        <label className="pfl-field-label">Equipment</label>
        <div className="grid-2">
          <div>
            <label className="pfl-field-label">Cover size</label>
            <input className="pfl-text" value={draft.coverSize} onChange={(e) => updateDraft({ coverSize: e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label"># of returns</label>
            <input className="pfl-num" type="number" min="0" value={draft.returnCount} onChange={(e) => updateDraft({ returnCount: +e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Pump type</label>
            <input className="pfl-text" value={draft.pumpType} onChange={(e) => updateDraft({ pumpType: e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Filter type</label>
            <input className="pfl-text" value={draft.filterType} onChange={(e) => updateDraft({ filterType: e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Salt cell type</label>
            <input className="pfl-text" value={draft.saltCellType} onChange={(e) => updateDraft({ saltCellType: e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Automation</label>
            <input className="pfl-text" value={draft.automationType} onChange={(e) => updateDraft({ automationType: e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Skimmer basket type</label>
            <input className="pfl-text" value={draft.skimmerBasketType} onChange={(e) => updateDraft({ skimmerBasketType: e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Autofill installed</label>
            <select className="pfl-select" value={draft.hasAutofill ? "yes" : "no"} onChange={(e) => updateDraft({ hasAutofill: e.target.value === "yes" })}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="section-gap" />
        <label className="pfl-field-label">Pool / hot tub on this property</label>
        <div className="grid-2">
          <div>
            <label className="pfl-field-label">Has a pool</label>
            <select className="pfl-select" value={draft.hasPool ? "yes" : "no"} onChange={(e) => updateDraft({ hasPool: e.target.value === "yes" })}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="pfl-field-label">Has a hot tub</label>
            <select className="pfl-select" value={draft.hasHotTub ? "yes" : "no"} onChange={(e) => updateDraft({ hasHotTub: e.target.value === "yes" })}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>
        {draft.hasHotTub && (
          <div className="grid-2">
            <div>
              <label className="pfl-field-label">Hot tub gallons</label>
              <input className="pfl-num" type="number" step="25" value={draft.hotTubGallons || 400} onChange={(e) => updateDraft({ hotTubGallons: +e.target.value })} />
            </div>
            <div>
              <label className="pfl-field-label">Hot tub filter type</label>
              <input className="pfl-text" value={draft.hotTubFilterType} onChange={(e) => updateDraft({ hotTubFilterType: e.target.value })} />
            </div>
          </div>
        )}

        <div className="section-gap" />
        <label className="pfl-field-label">Replacement history</label>
        <div className="grid-2">
          <div>
            <label className="pfl-field-label">Last heater replacement</label>
            <input className="pfl-text" placeholder="e.g. 2023-05 or N/A" value={draft.lastHeaterReplacement} onChange={(e) => updateDraft({ lastHeaterReplacement: e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Last pump replacement</label>
            <input className="pfl-text" placeholder="e.g. 2023-05 or N/A" value={draft.lastPumpReplacement} onChange={(e) => updateDraft({ lastPumpReplacement: e.target.value })} />
          </div>
          <div>
            <label className="pfl-field-label">Last liner replacement</label>
            <input className="pfl-text" type="date" value={draft.lastLinerReplacement} onChange={(e) => updateDraft({ lastLinerReplacement: e.target.value })} />
            <div className="reading-ideal">Leave blank for gunite pools - this date drives the vinyl shocking rule.</div>
          </div>
        </div>

        <div className="section-gap" />
        <label className="pfl-field-label">Access</label>
        <label className="pfl-field-label" style={{ marginTop: "6px" }}>Gate code</label>
        <input className="pfl-text" value={draft.gateCode} onChange={(e) => updateDraft({ gateCode: e.target.value })} />
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>How to get to the backyard</label>
        <textarea className="pfl-textarea" value={draft.entryInstructions} onChange={(e) => updateDraft({ entryInstructions: e.target.value })} />
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Pool cover location</label>
        <input className="pfl-text" value={draft.coverLocation} onChange={(e) => updateDraft({ coverLocation: e.target.value })} />
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Pool cover storage</label>
        <input className="pfl-text" value={draft.coverStorage} onChange={(e) => updateDraft({ coverStorage: e.target.value })} />

        <label className="site-dog-toggle" style={{ marginTop: "14px" }}>
          <input type="checkbox" checked={draft.hasDogs} onChange={(e) => updateDraft({ hasDogs: e.target.checked })} />
          Dogs on property
        </label>
        <textarea className="pfl-textarea" placeholder="Dog notes..." value={draft.dogNotes}
          onChange={(e) => updateDraft({ dogNotes: e.target.value })} style={{ marginTop: "8px" }} />

        <div className="section-gap" />
        <label className="pfl-field-label">Customer contacts</label>
        {draft.contacts.map((c, i) => (
          <div key={i} className="chem-row" style={{ flexWrap: "wrap" }}>
            <input className="pfl-select" type="text" placeholder="Name" value={c.name} onChange={(e) => updateContact(i, { name: e.target.value })} />
            <input className="pfl-select" type="text" placeholder="Phone" value={c.phone} onChange={(e) => updateContact(i, { phone: e.target.value })} />
            <input className="pfl-select" type="text" placeholder="Email" value={c.email} onChange={(e) => updateContact(i, { email: e.target.value })} />
            {draft.contacts.length > 1 && <button type="button" onClick={() => removeContact(i)} aria-label="Remove contact">x</button>}
          </div>
        ))}
        <button type="button" className="add-chem-btn" onClick={addContact}>+ Add contact</button>

        <div className="site-edit-actions">
          <button type="button" className="site-save-btn" onClick={save}>Save pool profile</button>
          <button type="button" className="site-cancel-btn" onClick={cancel}>Cancel</button>
        </div>
        {selectedName !== "__new__" && (
          <button type="button" className="stop-del" style={{ marginTop: "10px" }} onClick={() => { removeCustomer(selectedName); cancel(); }}>
            Delete this pool profile
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pfl-card">
      <label className="pfl-field-label">Pool profiles</label>
      {customers.map((c) => (
        <div className="route-row" key={c.name}>
          <div>
            <div className="checkup-name">{c.name}</div>
            <div className="checkup-reason">
              {c.town} - {c.hasPool ? `${c.poolType} - ${c.poolSurround} - ${c.gallons?.toLocaleString() || "-"} gal` : "No pool"}
              {c.hasHotTub ? " - Hot tub" : ""}
              {c.contacts?.[0]?.name ? ` - ${c.contacts[0].name}` : ""}
            </div>
          </div>
          <button type="button" onClick={() => openCustomer(c)}>Edit</button>
        </div>
      ))}
      <button type="button" className="add-chem-btn" onClick={addNew}>+ Add new pool</button>
    </div>
  );
}

function ManagerView({ session, onLogout, allStops, setAllStops, managerRoute, setManagerRoute, dismissed, setDismissed, openingSeasonActive, setOpeningSeasonActive, customers, setCustomers, dailyRoutes, setDailyRoutes }) {
  const [expanded, setExpanded] = useState(null);
  const [managerMode, setManagerMode] = useState("review");
  const [drainCustomer, setDrainCustomer] = useState("");
  const [drainTech, setDrainTech] = useState("");
  const [drainDueDate, setDrainDueDate] = useState("today");
  const [drainReason, setDrainReason] = useState("");
  const [routeTech, setRouteTech] = useState("");
  const [routeDate, setRouteDate] = useState("today");
  const [routeSelected, setRouteSelected] = useState([]);
  const sentStops = allStops.filter((s) => s.sent);
  const followUpCandidates = sentStops.filter(
    (s) => s.followUp && !dismissed.includes(s.id) && !managerRoute.some((r) => r.stopId === s.id)
  );
  const repairItems = sentStops.filter((s) => s.repairNeeded);
  const hotTubCustomers = customers.filter((c) => c.hasHotTub);
  const drainWorkOrders = allStops.filter((s) => s.stopType === "hotTubDrain");
  const knownTechs = [...new Set(allStops.map((s) => s.technician))];

  function addToRoute(stop, reason) {
    setManagerRoute((r) => [{ id: Date.now(), stopId: stop.id, customer: stop.customer, reason }, ...r]);
  }
  function dismissFollowUp(id) {
    setDismissed((d) => [...d, id]);
  }
  function removeFromRoute(id) {
    setManagerRoute((r) => r.filter((x) => x.id !== id));
  }
  function toggleRepairHandled(id) {
    allStops.forEach(() => {});
  }
  function scheduleDrain() {
    if (!drainCustomer || !drainTech.trim()) return;
    const info = customers.find((c) => c.name === drainCustomer);
    setAllStops((s) => [{
      id: Date.now(), technician: drainTech.trim(), sent: false, sentAt: null,
      stopType: "hotTubDrain", pending: true,
      dueDate: drainDueDate === "today" ? todayStr() : tomorrowStr(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      customer: drainCustomer, gallons: info?.hotTubGallons || 400,
      drainReason: drainReason.trim() || "Beyond chemical repair", tone: "good", followUp: false, repairNeeded: false,
    }, ...s]);
    setDrainCustomer(""); setDrainTech(""); setDrainDueDate("today"); setDrainReason("");
  }
  function cancelDrain(id) {
    setAllStops((s) => s.filter((st) => st.id !== id));
  }
  function toggleRouteCustomer(name) {
    setRouteSelected((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  }
  function assignRoute() {
    if (!routeTech.trim() || routeSelected.length === 0) return;
    const due = routeDate === "today" ? todayStr() : tomorrowStr();
    const newEntries = routeSelected.map((name) => ({ id: Date.now() + Math.random(), technician: routeTech.trim(), customer: name, dueDate: due }));
    setDailyRoutes((r) => [...newEntries, ...r]);
    setRouteSelected([]);
  }
  function removeRouteEntry(id) {
    setDailyRoutes((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="pfl-root">
      <style>{GLOBAL_STYLES}</style>
      <div className="session-bar">
        <span>Logged in as {session.id} (service manager)</span>
        <button type="button" onClick={onLogout}>Log out</button>
      </div>
      <div className="pfl-header">
        <h1>Manager review</h1>
        <span>{sentStops.length} stop{sentStops.length === 1 ? "" : "s"} submitted today</span>
      </div>

      <div className="mode-tabs">
        <button type="button" className={`mode-tab ${managerMode === "review" ? "on" : ""}`} onClick={() => setManagerMode("review")}>Review</button>
        <button type="button" className={`mode-tab ${managerMode === "profiles" ? "on" : ""}`} onClick={() => setManagerMode("profiles")}>Pool Profiles</button>
        <button type="button" className={`mode-tab ${managerMode === "locations" ? "on" : ""}`} onClick={() => setManagerMode("locations")}>Locations</button>
      </div>

      {managerMode === "profiles" ? (
        <PoolProfilesManager customers={customers} setCustomers={setCustomers} />
      ) : managerMode === "locations" ? (
        <CustomerLocationsView customers={customers} />
      ) : (
        <>
      <div className="pfl-card">
        <label className="pfl-field-label">Settings</label>
        <div className="follow-row" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
          <label>
            <input type="checkbox" checked={openingSeasonActive} onChange={(e) => setOpeningSeasonActive(e.target.checked)} />
            Pool opening season active
          </label>
        </div>
        <div className="follow-reason">
          {openingSeasonActive
            ? "Technicians see a \"Pool Opening\" tab alongside Weekly Service."
            : "Pool Opening is hidden from technicians - only Weekly Service shows."}
        </div>
      </div>

      <div className="pfl-card">
        <label className="pfl-field-label">Daily routes</label>
        <div className="follow-reason" style={{ marginBottom: "10px" }}>
          Assign which customers a technician should visit today or tomorrow - they'll see it as their route when they log in.
        </div>
        <div className="grid-2">
          <div>
            <label className="pfl-field-label">Technician</label>
            <input className="pfl-text" list="known-techs-route" placeholder="phone or email" value={routeTech} onChange={(e) => setRouteTech(e.target.value)} />
            <datalist id="known-techs-route">
              {knownTechs.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <label className="pfl-field-label">Date</label>
            <select className="pfl-select" value={routeDate} onChange={(e) => setRouteDate(e.target.value)}>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
            </select>
          </div>
        </div>
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Customers on this route</label>
        <div className="follow-reason" style={{ marginBottom: "8px" }}>Grouped by town - pick from the same town or two to keep the route tight.</div>
        {TOWNS.filter((t) => customers.some((c) => c.town === t)).map((t) => (
          <div key={t} style={{ marginBottom: "10px" }}>
            <div className="town-label">{t}</div>
            <div className="task-grid">
              {customers.filter((c) => c.town === t).map((c) => (
                <button type="button" key={c.name} className={`task-chip ${routeSelected.includes(c.name) ? "on" : ""}`} onClick={() => toggleRouteCustomer(c.name)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" className="add-chem-btn" onClick={assignRoute}>Assign route</button>

        {dailyRoutes.length > 0 && (
          <div className="section-gap">
            <div className="log-title" style={{ marginBottom: "6px" }}>Assigned</div>
            {dailyRoutes.map((r) => (
              <div className="route-row" key={r.id}>
                <div>
                  <div className="checkup-name">{r.customer}</div>
                  <div className="checkup-reason">{r.dueDate} - {r.technician}</div>
                </div>
                <button type="button" onClick={() => removeRouteEntry(r.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pfl-card repair-card">
        <label className="pfl-field-label">Hot tub drain &amp; refill</label>
        <div className="follow-reason" style={{ marginBottom: "10px" }}>
          For a spa beyond chemical repair - schedule a drain &amp; refill work order for a technician to complete.
        </div>
        <select className="pfl-select" value={drainCustomer} onChange={(e) => setDrainCustomer(e.target.value)}>
          <option value="">Select a hot tub...</option>
          {hotTubCustomers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <div className="grid-2" style={{ marginTop: "10px" }}>
          <div>
            <label className="pfl-field-label">Assign to technician</label>
            <input className="pfl-text" list="known-techs" placeholder="phone or email" value={drainTech} onChange={(e) => setDrainTech(e.target.value)} />
            <datalist id="known-techs">
              {knownTechs.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <label className="pfl-field-label">Due</label>
            <select className="pfl-select" value={drainDueDate} onChange={(e) => setDrainDueDate(e.target.value)}>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
            </select>
          </div>
        </div>
        <label className="pfl-field-label" style={{ marginTop: "10px" }}>Reason</label>
        <textarea className="pfl-textarea" placeholder="e.g. metals too high to clear, chronic cloudiness despite balanced chemistry..."
          value={drainReason} onChange={(e) => setDrainReason(e.target.value)} />
        <button type="button" className="add-chem-btn" onClick={scheduleDrain}>Schedule drain &amp; refill</button>

        {drainWorkOrders.length > 0 && (
          <div className="section-gap">
            <div className="log-title" style={{ marginBottom: "6px" }}>Scheduled</div>
            {drainWorkOrders.map((s) => (
              <div className="route-row" key={s.id}>
                <div>
                  <div className="checkup-name">{s.customer}</div>
                  <div className="checkup-reason">{s.dueDate} - {s.technician} - {s.pending ? "Pending" : "Completed"}</div>
                </div>
                {s.pending && <button type="button" onClick={() => cancelDrain(s.id)}>Cancel</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {managerRoute.length > 0 && (
        <div className="pfl-card">
          <label className="pfl-field-label">Tomorrow's route</label>
          {managerRoute.map((r) => (
            <div className="route-row" key={r.id}>
              <div>
                <div className="checkup-name">{r.customer}</div>
                <div className="checkup-reason">{r.reason}</div>
              </div>
              <button type="button" onClick={() => removeFromRoute(r.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {followUpCandidates.length > 0 && (
        <div className="pfl-card checkup-card">
          <label className="pfl-field-label">Suggested follow-ups</label>
          {followUpCandidates.map((s) => (
            <div className="checkup-row" key={s.id}>
              <div className="checkup-row-head">
                <div>
                  <div className="checkup-name">{s.customer}</div>
                  <div className="checkup-reason">{s.waterCondition !== "Clear" ? s.waterCondition : "chemistry out of range"} - {s.technician}</div>
                </div>
              </div>
              <div className="checkup-actions">
                <button type="button" className="primary" onClick={() => addToRoute(s, "flagged at last visit")}>Add to my route</button>
                <button type="button" onClick={() => dismissFollowUp(s.id)}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {repairItems.length > 0 && (
        <div className="pfl-card repair-card">
          <label className="pfl-field-label">Repairs reported</label>
          {repairItems.map((s) => (
            <div className="repair-row" key={s.id}>
              <div className="repair-row-head">
                <div>
                  <div className="checkup-name">{s.customer} - {s.repairIssueType}</div>
                  <div className="repair-desc">{s.repairDescription} - {s.technician}</div>
                </div>
                <button type="button" onClick={() => addToRoute(s, "repair reported")}>Add to my route</button>
              </div>
              {(s.repairPhoto1 || s.repairPhoto2) && (
                <div className="repair-photos">
                  {s.repairPhoto1 && <img src={s.repairPhoto1.url} alt="Repair photo 1" />}
                  {s.repairPhoto2 && <img src={s.repairPhoto2.url} alt="Repair photo 2" />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="section-gap">
        <div className="log-title">Submitted stops</div>
        {sentStops.length === 0 && <div className="empty-log">Nothing submitted yet - stops appear here once a tech sends their day.</div>}
        {sentStops.map((s) => (
          <div className="stop-row" key={s.id}>
            <div className="stop-summary" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
              <div className="stop-dot" style={{ background: toneVar(s.tone) }} />
              <div className="stop-summary-text">
                <div className="stop-customer">{s.customer}</div>
                <div className="stop-time">
                  {s.time} - {s.technician}{s.notServiceable ? " - not serviceable" : s.onSiteLonger ? " - ran long" : ""}
                </div>
              </div>
              {s.notServiceable && <span className="stop-flag repair">Not serviceable</span>}
              {s.followUp && <span className="stop-flag">Follow-up</span>}
              {s.repairNeeded && <span className="stop-flag repair">Repair</span>}
            </div>
            {expanded === s.id && <StopDetail s={s} />}
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

function TodaysRouteView({ session, allStops, dailyRoutes, onSelectStop, lang }) {
  const [expandedReason, setExpandedReason] = useState(null);
  const today = todayStr();
  const myRoute = dailyRoutes.filter((r) => (r.technician === session.id || r.technician === "*") && r.dueDate === today);

  function statusFor(customerName) {
    const match = allStops.find((s) =>
      s.technician === session.id && s.customer === customerName && s.dueDate === today &&
      ["weekly", "opening", "hotTub", "reassembly"].includes(s.stopType)
    );
    if (!match) return { status: "pending" };
    if (match.notServiceable) return { status: "notServiceable", reason: match.notServiceableReason, details: match.notServiceableDetails };
    return { status: "completed" };
  }

  return (
    <div className="pfl-card route-page">
      <div className="route-page-name">{session.id}</div>
      <div className="route-page-date">
        {new Date().toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <div className="route-list">
        {myRoute.length === 0 && (
          <div className="empty-log">{t(lang, "No route assigned for today yet - check with your service manager.")}</div>
        )}
        {myRoute.map((r) => {
          const st = statusFor(r.customer);
          return (
            <div className="route-item route-item-clickable" key={r.id} onClick={() => onSelectStop(r.customer)}>
              <div
                className={`route-status-box ${st.status}`}
                onClick={(e) => {
                  if (st.status === "notServiceable") {
                    e.stopPropagation();
                    setExpandedReason(expandedReason === r.id ? null : r.id);
                  }
                }}
              />
              <div className="route-item-body">
                <div className="route-item-name">{r.customer}</div>
                {st.status === "notServiceable" && expandedReason === r.id && (
                  <div className="route-item-reason">
                    {st.reason}{st.details ? ` - ${st.details}` : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TechnicianView({ session, onLogout, allStops, setAllStops, customers, setCustomers, openingSeasonActive, dailyRoutes }) {
  const [mode, setMode] = useState("route");
  const [lang, setLang] = useState(session.lang || "en");
  const [pendingHoseOffId, setPendingHoseOffId] = useState(null);
  const [pendingDrainId, setPendingDrainId] = useState(null);
  const [pendingPickupId, setPendingPickupId] = useState(null);
  const [routeJump, setRouteJump] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const effectiveMode = (mode === "opening" || mode === "reassembly") && !openingSeasonActive ? "weekly" : mode;
  const pendingHoseOffStop = allStops.find((s) => s.id === pendingHoseOffId) || null;
  const pendingDrainStop = allStops.find((s) => s.id === pendingDrainId) || null;
  const pendingPickupStop = allStops.find((s) => s.id === pendingPickupId) || null;

  const allMyStops = allStops.filter((s) => s.technician === session.id);
  const todayStops = allMyStops.filter((s) => s.dueDate === todayStr());
  const tomorrowStops = allMyStops.filter((s) => s.dueDate === tomorrowStr());
  const unsentCount = todayStops.filter((s) => !s.sent).length;
  const hasPendingHoseOff = todayStops.some((s) => (s.stopType === "hoseOff" || s.stopType === "poolkeeper" || s.stopType === "hotTubDrain" || s.stopType === "pumpPickup") && s.pending);

  function deleteStop(id) {
    setAllStops((s) => s.filter((s2) => s2.id !== id));
    if (expanded === id) setExpanded(null);
  }
  function endDay() {
    const sentAt = Date.now();
    setAllStops((s) => s.map((st) => (
      st.technician === session.id && st.dueDate === todayStr() && !st.sent ? { ...st, sent: true, sentAt } : st
    )));
  }
  function jumpToWeekly(customerName) {
    setRouteJump({ customer: customerName, seq: Date.now() });
    setMode("weekly");
  }
  function openHoseOff(id) {
    setPendingHoseOffId(id);
    setMode("hoseOff");
  }
  function hoseOffComplete() {
    setPendingHoseOffId(null);
    setMode("weekly");
  }
  function openDrain(id) {
    setPendingDrainId(id);
    setMode("hotTubDrain");
  }
  function drainComplete() {
    setPendingDrainId(null);
    setMode("weekly");
  }
  function openPickup(id) {
    setPendingPickupId(id);
    setMode("pumpPickup");
  }
  function pickupComplete() {
    setPendingPickupId(null);
    setMode("weekly");
  }

  return (
    <div className="pfl-root">
      <style>{GLOBAL_STYLES}</style>
      <div className="session-bar">
        <span>Logged in as {session.id} (technician)</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button type="button" className={`lang-btn ${lang === "en" ? "on" : ""}`} onClick={() => setLang("en")}>EN</button>
          <button type="button" className={`lang-btn ${lang === "es" ? "on" : ""}`} onClick={() => setLang("es")}>ES</button>
          <button type="button" onClick={onLogout}>{t(lang, "Log out")}</button>
        </div>
      </div>
      <div className="pfl-header">
        <h1>{t(lang, "Field log")}</h1>
        <span>{new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} - {todayStops.length} stop{todayStops.length === 1 ? "" : "s"} logged</span>
      </div>

      {effectiveMode !== "hoseOff" && effectiveMode !== "hotTubDrain" && effectiveMode !== "pumpPickup" && (
        <div className="mode-tabs">
          <button type="button" className={`mode-tab ${effectiveMode === "route" ? "on" : ""}`} onClick={() => setMode("route")}>{t(lang, "Today's Route")}</button>
          <button type="button" className={`mode-tab ${effectiveMode === "weekly" ? "on" : ""}`} onClick={() => setMode("weekly")}>{t(lang, "Weekly Service")}</button>
          {openingSeasonActive && (
            <button type="button" className={`mode-tab ${effectiveMode === "reassembly" ? "on" : ""}`} onClick={() => setMode("reassembly")}>{t(lang, "Equipment Setup")}</button>
          )}
          {openingSeasonActive && (
            <button type="button" className={`mode-tab ${effectiveMode === "opening" ? "on" : ""}`} onClick={() => setMode("opening")}>{t(lang, "Pool Opening")}</button>
          )}
          <button type="button" className={`mode-tab ${effectiveMode === "hotTub" ? "on" : ""}`} onClick={() => setMode("hotTub")}>{t(lang, "Hot Tub Service")}</button>
        </div>
      )}

      {effectiveMode === "route" && (
        <TodaysRouteView session={session} allStops={allStops} dailyRoutes={dailyRoutes} onSelectStop={jumpToWeekly} lang={lang} />
      )}
      {effectiveMode === "weekly" && (
        <WeeklyServiceForm session={session} allStops={allStops} setAllStops={setAllStops} customers={customers} setCustomers={setCustomers} routeJump={routeJump} lang={lang} />
      )}
      {effectiveMode === "reassembly" && (
        <EquipmentReassemblyForm session={session} setAllStops={setAllStops} customers={customers} setCustomers={setCustomers} />
      )}
      {effectiveMode === "opening" && (
        <PoolOpeningForm session={session} setAllStops={setAllStops} customers={customers} setCustomers={setCustomers} />
      )}
      {effectiveMode === "hotTub" && (
        <HotTubServiceForm session={session} setAllStops={setAllStops} customers={customers} setCustomers={setCustomers} />
      )}
      {effectiveMode === "hoseOff" && (
        <HoseOffForm session={session} setAllStops={setAllStops} pendingStop={pendingHoseOffStop} onComplete={hoseOffComplete} />
      )}
      {effectiveMode === "hotTubDrain" && (
        <HotTubDrainForm session={session} setAllStops={setAllStops} pendingStop={pendingDrainStop} onComplete={drainComplete} />
      )}
      {effectiveMode === "pumpPickup" && (
        <PumpPickupForm session={session} setAllStops={setAllStops} pendingStop={pendingPickupStop} onComplete={pickupComplete} />
      )}

      {tomorrowStops.length > 0 && (
        <div className="pfl-card checkup-card">
          <label className="pfl-field-label">Scheduled for tomorrow</label>
          {tomorrowStops.map((s) => (
            <div className="checkup-row" key={s.id}>
              <div className="checkup-name">{s.customer}</div>
              <div className="checkup-reason">
                {s.stopType === "hoseOff" ? "Hose off - left on overnight, complete tomorrow"
                  : s.stopType === "poolkeeper" ? "Poolkeeper check - complete tomorrow"
                  : s.stopType}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-gap">
        <div className="log-title">Today's stops</div>
        {todayStops.length === 0 && <div className="empty-log">No stops logged yet - your first one will show up here.</div>}
        {todayStops.map((s) => (
          (s.stopType === "hoseOff" || s.stopType === "poolkeeper" || s.stopType === "hotTubDrain" || s.stopType === "pumpPickup") && s.pending ? (
            <div className="stop-row" key={s.id}>
              <div className="stop-summary">
                <div className="stop-dot" style={{ background: "var(--warn)" }} />
                <div className="stop-summary-text">
                  <div className="stop-customer">{s.customer}</div>
                  <div className="stop-time">
                    {s.stopType === "poolkeeper" ? "Poolkeeper check" : s.stopType === "hotTubDrain" ? "Hot tub drain & refill" : s.stopType === "pumpPickup" ? "Pump pickup" : "Hose off"} - not yet completed
                  </div>
                </div>
                <button type="button" className="site-save-btn" style={{ flex: "none", padding: "6px 14px" }}
                  onClick={() => (s.stopType === "hotTubDrain" ? openDrain(s.id) : s.stopType === "pumpPickup" ? openPickup(s.id) : openHoseOff(s.id))}>Complete</button>
              </div>
            </div>
          ) : (
            <div className="stop-row" key={s.id}>
              <div className="stop-summary" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                <div className="stop-dot" style={{ background: toneVar(s.tone) }} />
                <div className="stop-summary-text">
                  <div className="stop-customer">{s.customer}</div>
                  <div className="stop-time">
                    {s.notServiceable ? `${s.time} - not serviceable` : `${s.time}${s.onSiteLonger ? " - ran long" : ""}${s.waterCondition ? ` - ${s.waterCondition}` : ""}`}
                  </div>
                </div>
                {s.stopType === "opening" && <span className="stop-flag opening">Opening</span>}
                {s.stopType === "hoseOff" && <span className="stop-flag opening">Hose off</span>}
                {s.stopType === "poolkeeper" && <span className="stop-flag opening">Poolkeeper</span>}
                {s.stopType === "hotTub" && <span className="stop-flag opening">Hot tub</span>}
                {s.stopType === "hotTubDrain" && <span className="stop-flag opening">Drain &amp; refill</span>}
                {s.stopType === "reassembly" && <span className="stop-flag opening">Equipment setup</span>}
                {s.stopType === "reassembly" && (s.pumpHasPower === false || s.freezeDamage) && <span className="stop-flag repair">Attention needed</span>}
                {s.stopType === "pumpPickup" && <span className="stop-flag opening">Pump pickup</span>}
                {s.notServiceable && <span className="stop-flag repair">Not serviceable</span>}
                {s.rainService && <span className="stop-flag rain">Rain</span>}
                {s.followUp && <span className="stop-flag">{s.stopType === "opening" ? s.pocLabel : "Follow-up"}</span>}
                {s.repairNeeded && <span className="stop-flag repair">Repair</span>}
                <span className={`stop-flag ${s.sent ? "sent" : "draft"}`}>{s.sent ? "Sent" : "Draft"}</span>
                {!s.sent && <button className="stop-del" onClick={(e) => { e.stopPropagation(); deleteStop(s.id); }} aria-label="Delete stop">Delete</button>}
              </div>
              {expanded === s.id && <StopDetail s={s} />}
            </div>
          )
        ))}
      </div>

      <div className="pfl-card section-gap">
        <button type="button" className="endday-btn" onClick={endDay} disabled={unsentCount === 0 || hasPendingHoseOff}>
          {hasPendingHoseOff
            ? "Complete the pending work order first"
            : unsentCount === 0 ? "All stops sent" : `Send ${unsentCount} stop${unsentCount === 1 ? "" : "s"} to service manager`}
        </button>
        <div className="endday-note">Sends today's completed stops, readings, photos, and repair reports for review.</div>
      </div>
    </div>
  );
}

export default function PoolFieldLogApp() {
  const [session, setSession] = useState(null);
  const [allStops, setAllStops] = useState([]);
  const [managerRoute, setManagerRoute] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [customers, setCustomers] = useState(DEFAULT_CUSTOMERS);
  const [openingSeasonActive, setOpeningSeasonActive] = useState(true);
  const [dailyRoutes, setDailyRoutes] = useState(() =>
    DEFAULT_CUSTOMERS.map((c, i) => ({ id: 1000 + i, technician: "*", customer: c.name, dueDate: todayStr() }))
  );

  if (!session) return <LoginScreen onLogin={setSession} />;

  if (session.role === "manager") {
    return (
      <ManagerView
        session={session}
        onLogout={() => setSession(null)}
        allStops={allStops}
        setAllStops={setAllStops}
        managerRoute={managerRoute}
        setManagerRoute={setManagerRoute}
        dismissed={dismissed}
        setDismissed={setDismissed}
        openingSeasonActive={openingSeasonActive}
        setOpeningSeasonActive={setOpeningSeasonActive}
        customers={customers}
        setCustomers={setCustomers}
        dailyRoutes={dailyRoutes}
        setDailyRoutes={setDailyRoutes}
      />
    );
  }

  return (
    <TechnicianView
      session={session}
      onLogout={() => setSession(null)}
      allStops={allStops}
      setAllStops={setAllStops}
      customers={customers}
      setCustomers={setCustomers}
      openingSeasonActive={openingSeasonActive}
      dailyRoutes={dailyRoutes}
    />
  );
}
