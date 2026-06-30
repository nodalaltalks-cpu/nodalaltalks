/** Option sets for the onboarding form — values mirror the approved prototype. */

export const CITIES = [
  "Mumbai", "Pune", "Delhi NCR", "Bengaluru", "Hyderabad", "Chennai",
  "Ahmedabad", "Kolkata", "Noida", "Thane", "Navi Mumbai", "Gurgaon",
  "Dombivali", "Other",
];

export const LANGUAGES = [
  "Hindi", "English", "Marathi", "Kannada", "Telugu", "Tamil",
  "Gujarati", "Bengali", "Punjabi",
];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const CALL_HOURS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];

export const PROPERTY_TYPES = [
  { value: "apartment", label: "🏢 Apartment / Flat" },
  { value: "villa", label: "🏡 Independent House / Villa" },
  { value: "rowhouse", label: "🏘️ Row House / Townhouse" },
  { value: "commercial", label: "🏬 Commercial / Shop" },
  { value: "plot", label: "🌳 Plotted Development" },
  { value: "other", label: "🏨 Other" },
] as const;

export const CONFIGURATIONS = [
  "Studio / 1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK",
  "4+ BHK / Penthouse", "Commercial / Non-residential",
];

export const PRICE_BUCKETS = [
  "Under ₹25 lakh", "₹25 – ₹50 lakh", "₹50 lakh – ₹1 crore",
  "₹1 – ₹2 crore", "₹2 – ₹5 crore", "₹5 crore +",
];

export const POSSESSION = [
  { value: "received_living", label: "✅ Received / Living here" },
  { value: "received_rented", label: "⏳ Received / Rented out" },
  { value: "under_construction", label: "🏗️ Under construction" },
] as const;

export const HOME_LOAN = [
  { value: "bank", label: "Yes — from a Bank" },
  { value: "hfc_nbfc", label: "Yes — HFC / NBFC" },
  { value: "self_funded", label: "No — self-funded" },
] as const;

export const EXPERTISE = [
  "Construction quality & materials",
  "Possession delays & RERA timeline",
  "Hidden charges & maintenance fees",
  "Builder responsiveness & after-sales",
  "Society / RWA management",
  "Resale value & rental yields",
  "Home loan & bank experience",
  "Legal documentation & registration",
  "Connectivity & infrastructure",
  "Neighbourhood & lifestyle",
];

export const BANKS = [
  "SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
  "PNB", "Bank of Baroda", "Canara Bank", "Yes Bank", "IndusInd Bank", "Other",
];

export const MAX_CALLS = [
  { value: "1-2", label: "1–2 calls" },
  { value: "3-5", label: "3–5 calls" },
  { value: "unlimited", label: "Unlimited" },
] as const;

/** The document slots collected in step 3, mapped to use-case upload metadata. */
export const PRIMARY_DOC_TYPES = [
  { value: "sale_deed", label: "Registered Sale Deed" },
  { value: "allotment_letter", label: "Builder Allotment Letter" },
  { value: "agreement_for_sale", label: "Agreement for Sale / AFS" },
  { value: "possession_receipt", label: "Possession Letter + Receipt" },
] as const;

export const RATE_MIN = 30;
export const RATE_MAX = 120;
export const PLATFORM_KEEP = 0.8; // advisor keeps 80% (20% take-rate)
