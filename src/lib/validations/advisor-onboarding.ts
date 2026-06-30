import { z } from "zod";

/**
 * Advisor onboarding — the single validation source consumed by React Hook Form.
 * Fields are modeled as the form actually holds them (text inputs are strings,
 * multi-selects are string[]), so RHF value types and these schemas never fight.
 * Numeric strings are range-checked here and converted to numbers/paise by the
 * mapper (build-submit-input.ts) when constructing the use-case input.
 *
 * Field set and option values mirror the approved 5-step onboarding prototype.
 */

const required = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

const optionalNumberInRange = (min: number, max: number, label: string) =>
  z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && +v >= min && +v <= max),
      `${label} must be between ${min} and ${max}`,
    );

export const personalSchema = z.object({
  firstName: required("First name"),
  lastName: required("Last name"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Enter a valid mobile number"),
  email: z.string().trim().email("Enter a valid email"),
  city: required("City"),
  languages: z.array(z.string()).min(1, "Pick at least one language"),
  occupation: z.string().optional(),
  industry: z.string().optional(),
  bio: z.string().max(200, "Keep your bio under 200 characters").optional(),
  availableDays: z.array(z.string()).min(1, "Select at least one available day"),
  callHoursFrom: z.string().optional(),
  callHoursTo: z.string().optional(),
  maxCallsPerDay: z.enum(["1-2", "3-5", "unlimited"]),
});

export const propertySchema = z.object({
  builder: required("Developer / builder"),
  project: required("Project / society"),
  city: required("City"),
  locality: required("Locality"),
  address: z.string().optional(),
  propertyType: z.enum([
    "apartment",
    "villa",
    "rowhouse",
    "commercial",
    "plot",
    "other",
  ]),
  configuration: z.string().optional(),
  carpetAreaSqft: optionalNumberInRange(1, 100000, "Carpet area"),
  floor: z.string().optional(),
  tower: z.string().optional(),
  yearOfPurchase: required("Year of purchase"),
  purchasePriceBucket: required("Purchase price range"),
  /** V1 intelligence — exact price paid in rupees (→ paise on save). */
  pricePaidRupees: z.string().optional(),
  possessionStatus: z.enum([
    "received_living",
    "received_rented",
    "under_construction",
  ]),
  possessionPromisedYear: z.string().optional(),
  possessionActualYear: z.string().optional(),
  homeLoan: z.enum(["bank", "hfc_nbfc", "self_funded"]).optional(),
  expertise: z.array(z.string()),
  notes: z.string().optional(),
});

export const payoutSchema = z.object({
  accountHolderName: required("Account holder name"),
  bankName: required("Bank name"),
  accountNumber: required("Account number"),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
  upiId: z.string().optional(),
});

export const rateSchema = z.object({
  ratePerMinRupees: optionalNumberInRange(30, 120, "Rate").and(
    required("Rate"),
  ),
  headline: z.string().max(80).optional(),
});

export const agreementSchema = z.object({
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the advisor agreement" }),
  }),
});

export const advisorOnboardingSchema = z.object({
  personal: personalSchema,
  property: propertySchema,
  payout: payoutSchema,
  rate: rateSchema,
  agreement: agreementSchema,
});

export type OnboardingFormValues = z.infer<typeof advisorOnboardingSchema>;

/** Step subtrees, for per-step validation with RHF `trigger`. */
export const STEP_FIELDS = {
  1: "personal",
  2: "property",
  3: "payout",
  4: "rate",
  5: "agreement",
} as const;

export const defaultOnboardingValues: OnboardingFormValues = {
  personal: {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    languages: [],
    occupation: "",
    industry: "",
    bio: "",
    availableDays: [],
    callHoursFrom: "9:00 AM",
    callHoursTo: "7:00 PM",
    maxCallsPerDay: "3-5",
  },
  property: {
    builder: "",
    project: "",
    city: "",
    locality: "",
    address: "",
    propertyType: "apartment",
    configuration: "",
    carpetAreaSqft: "",
    floor: "",
    tower: "",
    yearOfPurchase: "",
    purchasePriceBucket: "",
    pricePaidRupees: "",
    possessionStatus: "received_living",
    possessionPromisedYear: "",
    possessionActualYear: "",
    homeLoan: undefined,
    expertise: [],
    notes: "",
  },
  payout: {
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  },
  rate: { ratePerMinRupees: "50", headline: "" },
  // agreement starts unchecked; literal(true) fails until the user accepts.
  agreement: { agreedToTerms: false as unknown as true },
};
