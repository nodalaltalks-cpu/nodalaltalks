import { z } from "zod";

/** Buyer signup — validation + option sets, mirroring the buyer-flow prototype. */

export const INTENTS = [
  { value: "live_in", label: "🏠 Buy to live in" },
  { value: "invest", label: "📈 Buy to invest" },
  { value: "resale", label: "🔁 Resale / flip" },
] as const;

export const BUDGETS = [
  "Under ₹50 Lakh",
  "₹50L – ₹1 Cr",
  "₹1 Cr – ₹2 Cr",
  "₹2 Cr – ₹5 Cr",
  "Above ₹5 Cr",
];

export const STAGES = [
  { value: "exploring", label: "Just exploring" },
  { value: "shortlisting", label: "Shortlisting projects" },
  { value: "negotiating", label: "Negotiating" },
  { value: "ready_to_book", label: "Ready to book" },
] as const;

export const TIMELINES = [
  "Within 1 month",
  "1–3 months",
  "3–6 months",
  "6–12 months",
  "More than a year",
];

export const CITIES = [
  "Mumbai", "Pune", "Delhi NCR", "Bengaluru", "Hyderabad",
  "Chennai", "Thane", "Navi Mumbai", "Gurgaon", "Other",
];

export const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Enter a valid mobile number"),
});

export const buyerDetailsSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  city: z.string().trim().min(1, "City is required"),
  intent: z.enum(["live_in", "invest", "resale"]),
  targetProject: z.string().optional(),
  budget: z.string().trim().min(1, "Budget is required"),
  stage: z.enum(["exploring", "shortlisting", "negotiating", "ready_to_book"]),
  timeline: z.string().trim().min(1, "Timeline is required"),
});

export type PhoneValues = z.infer<typeof phoneSchema>;
export type BuyerDetailsValues = z.infer<typeof buyerDetailsSchema>;
