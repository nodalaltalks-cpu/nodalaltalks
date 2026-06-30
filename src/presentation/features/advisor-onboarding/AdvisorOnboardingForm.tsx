"use client";

import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  advisorOnboardingSchema,
  defaultOnboardingValues,
  STEP_FIELDS,
  type OnboardingFormValues,
} from "@/lib/validations/advisor-onboarding";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardTitle } from "@/presentation/components/ui/card";
import { Field, FieldRow } from "@/presentation/components/ui/field";
import { Input, Select, Textarea } from "@/presentation/components/ui/input";
import { Stepper } from "@/presentation/components/ui/stepper";
import { UploadBox } from "@/presentation/components/ui/upload-box";
import { cn } from "@/lib/utils";
import * as O from "./options";
import { buildSubmitInput, type OnboardingFiles } from "./build-submit-input";
import { useSubmitAdvisorApplication } from "./use-submit-advisor-application";

const STEPS = [
  { n: 1, label: "Personal Info" },
  { n: 2, label: "Property Details" },
  { n: 3, label: "Documents & Bank" },
  { n: 4, label: "Profile & Rate" },
  { n: 5, label: "Agreement" },
];

type ArrayPath =
  | "personal.languages"
  | "personal.availableDays"
  | "property.expertise";

export function AdvisorOnboardingForm() {
  const [step, setStep] = useState(1);
  const [fileError, setFileError] = useState<string | null>(null);
  const [files, setFiles] = useState<OnboardingFiles>({
    primaryDocType: O.PRIMARY_DOC_TYPES[0].value,
    primaryDocName: O.PRIMARY_DOC_TYPES[0].label,
    primary: null,
    idType: "aadhaar",
    idFront: null,
    idBack: null,
    photo: null,
  });

  const mutation = useSubmitAdvisorApplication();

  const {
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(advisorOnboardingSchema),
    defaultValues: defaultOnboardingValues,
    mode: "onTouched",
  });

  const toggle = (name: ArrayPath, val: string) => {
    const cur = (watch(name) as string[]) ?? [];
    setValue(
      name,
      cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val],
      { shouldValidate: true },
    );
  };
  const has = (name: ArrayPath, val: string) =>
    ((watch(name) as string[]) ?? []).includes(val);

  async function next() {
    const key = STEP_FIELDS[step as keyof typeof STEP_FIELDS];
    const ok = await trigger(key);
    if (step === 3) {
      if (!files.primary || !files.idFront) {
        setFileError("Upload your ownership proof and ID front to continue.");
        return;
      }
      setFileError(null);
    }
    if (ok) setStep((s) => Math.min(s + 1, 5));
  }

  const onSubmit = handleSubmit((values) => {
    if (!files.primary || !files.idFront) {
      setStep(3);
      setFileError("Upload your ownership proof and ID front to continue.");
      return;
    }
    mutation.mutate(buildSubmitInput(values, files));
  });

  const rate = Number(watch("rate.ratePerMinRupees") || "0");
  const keepPerMin = Math.round(rate * O.PLATFORM_KEEP);

  if (mutation.isSuccess) {
    return <SuccessPanel />;
  }

  return (
    <div className="mx-auto max-w-[860px] px-[5%] py-12">
      <div className="mb-8 rounded-lg border-[1.5px] border-border bg-white px-4 py-3 shadow-sh">
        <Stepper steps={STEPS} current={step} />
      </div>

      <form onSubmit={onSubmit} noValidate>
        {/* ───────── STEP 1: PERSONAL ───────── */}
        {step === 1 && (
          <>
            <PanelHead
              tag="Step 1 of 5"
              title="Tell us about yourself"
              sub="This appears on your public advisor profile. Use your real name — it builds buyer trust."
            />
            <Card>
              <CardTitle icon="👤">Basic Details</CardTitle>
              <FieldRow>
                <Field label="First Name" required error={errors.personal?.firstName?.message}>
                  <Input placeholder="Rahul" {...register("personal.firstName")} />
                </Field>
                <Field label="Last Name" required error={errors.personal?.lastName?.message}>
                  <Input placeholder="Sharma" {...register("personal.lastName")} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Mobile Number" required hint="Used for call routing. Not shown publicly." error={errors.personal?.phone?.message}>
                  <Input placeholder="+91 98765 43210" {...register("personal.phone")} />
                </Field>
                <Field label="Email Address" required error={errors.personal?.email?.message}>
                  <Input placeholder="rahul@email.com" {...register("personal.email")} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="City of Residence" required error={errors.personal?.city?.message}>
                  <Select {...register("personal.city")}>
                    <option value="">Select your city</option>
                    {O.CITIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Languages for Calls" required error={errors.personal?.languages?.message as string | undefined}>
                  <ChipRow>
                    {O.LANGUAGES.map((l) => (
                      <Chip key={l} on={has("personal.languages", l)} onClick={() => toggle("personal.languages", l)}>{l}</Chip>
                    ))}
                  </ChipRow>
                </Field>
              </FieldRow>
            </Card>

            <Card>
              <CardTitle icon="💼">Professional Background (optional)</CardTitle>
              <FieldRow>
                <Field label="Current Occupation">
                  <Input placeholder="e.g. Software Engineer" {...register("personal.occupation")} />
                </Field>
                <Field label="Industry / Sector">
                  <Input placeholder="e.g. IT / Software" {...register("personal.industry")} />
                </Field>
              </FieldRow>
              <Field label="Short Bio" hint="First person, max 200 characters. Buyers decide to call you based on this." error={errors.personal?.bio?.message}>
                <Textarea placeholder="e.g. Bought a 2BHK at Lodha Palava in 2021. Happy to share RERA timelines, possession and society charges…" {...register("personal.bio")} />
              </Field>
            </Card>

            <Card>
              <CardTitle icon="📅">Availability</CardTitle>
              <Field label="Available Days" required error={errors.personal?.availableDays?.message as string | undefined}>
                <ChipRow>
                  {O.DAYS.map((d) => (
                    <Chip key={d} on={has("personal.availableDays", d)} onClick={() => toggle("personal.availableDays", d)}>{d}</Chip>
                  ))}
                </ChipRow>
              </Field>
              <FieldRow>
                <Field label="Call Hours — From">
                  <Select {...register("personal.callHoursFrom")}>
                    {O.CALL_HOURS.map((h) => <option key={h}>{h}</option>)}
                  </Select>
                </Field>
                <Field label="Call Hours — To">
                  <Select {...register("personal.callHoursTo")}>
                    {O.CALL_HOURS.map((h) => <option key={h}>{h}</option>)}
                  </Select>
                </Field>
              </FieldRow>
              <Field label="Maximum calls per day">
                <RadioRow>
                  {O.MAX_CALLS.map((m) => (
                    <RadioCard key={m.value} value={m.value} label={m.label} field={register("personal.maxCallsPerDay")} />
                  ))}
                </RadioRow>
              </Field>
            </Card>
          </>
        )}

        {/* ───────── STEP 2: PROPERTY ───────── */}
        {step === 2 && (
          <>
            <PanelHead tag="Step 2 of 5" title="Your Property Details" sub="Buyers search by project — accurate details bring you more relevant calls." />
            <Card>
              <CardTitle icon="🏗️">Project Information</CardTitle>
              <Field label="Developer / Builder Name" required error={errors.property?.builder?.message}>
                <Input placeholder="e.g. Lodha Group, Godrej Properties…" {...register("property.builder")} />
              </Field>
              <Field label="Project / Society Name" required error={errors.property?.project?.message}>
                <Input placeholder="e.g. Lodha Palava City" {...register("property.project")} />
              </Field>
              <FieldRow>
                <Field label="City" required error={errors.property?.city?.message}>
                  <Select {...register("property.city")}>
                    <option value="">Select city</option>
                    {O.CITIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Locality / Micro-area" required error={errors.property?.locality?.message}>
                  <Input placeholder="e.g. Palava, Whitefield…" {...register("property.locality")} />
                </Field>
              </FieldRow>
              <Field label="Full Address / Landmark" hint="Approximate area is fine — exact addresses are never shown publicly.">
                <Input placeholder="e.g. near Dombivali East Station" {...register("property.address")} />
              </Field>
            </Card>

            <Card>
              <CardTitle icon="🏠">Unit & Purchase Details</CardTitle>
              <Field label="Property Type" required>
                <RadioRow wrap>
                  {O.PROPERTY_TYPES.map((p) => (
                    <RadioCard key={p.value} value={p.value} label={p.label} field={register("property.propertyType")} />
                  ))}
                </RadioRow>
              </Field>
              <FieldRow>
                <Field label="Configuration">
                  <Select {...register("property.configuration")}>
                    <option value="">Select BHK</option>
                    {O.CONFIGURATIONS.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Carpet / Built-up Area (sq ft)" error={errors.property?.carpetAreaSqft?.message}>
                  <Input type="number" placeholder="750" {...register("property.carpetAreaSqft")} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Floor Number"><Input placeholder="e.g. 12th floor" {...register("property.floor")} /></Field>
                <Field label="Tower / Wing"><Input placeholder="e.g. Tower B" {...register("property.tower")} /></Field>
              </FieldRow>
              <FieldRow>
                <Field label="Year of Purchase" required error={errors.property?.yearOfPurchase?.message}>
                  <Select {...register("property.yearOfPurchase")}>
                    <option value="">Select year</option>
                    {Array.from({ length: 26 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Purchase Price Range" required error={errors.property?.purchasePriceBucket?.message}>
                  <Select {...register("property.purchasePriceBucket")}>
                    <option value="">Select range</option>
                    {O.PRICE_BUCKETS.map((b) => <option key={b}>{b}</option>)}
                  </Select>
                </Field>
              </FieldRow>
              <Field label="Price you actually paid (₹)" hint="Actual price paid, not listing price. Stored privately, used only in aggregate — the most valuable field in the form.">
                <Input type="number" placeholder="e.g. 6800000" {...register("property.pricePaidRupees")} />
              </Field>
              <Field label="Current Possession Status" required>
                <RadioRow wrap>
                  {O.POSSESSION.map((p) => (
                    <RadioCard key={p.value} value={p.value} label={p.label} field={register("property.possessionStatus")} />
                  ))}
                </RadioRow>
              </Field>
              <FieldRow>
                <Field label="Possession promised (year)"><Input type="number" placeholder="2022" {...register("property.possessionPromisedYear")} /></Field>
                <Field label="Possession actual (year)"><Input type="number" placeholder="2024" {...register("property.possessionActualYear")} /></Field>
              </FieldRow>
              <Field label="Home Loan Taken?">
                <RadioRow wrap>
                  {O.HOME_LOAN.map((h) => (
                    <RadioCard key={h.value} value={h.value} label={h.label} field={register("property.homeLoan")} />
                  ))}
                </RadioRow>
              </Field>
            </Card>

            <Card>
              <CardTitle icon="💬">What can you speak about?</CardTitle>
              <ChipRow>
                {O.EXPERTISE.map((e) => (
                  <Chip key={e} on={has("property.expertise", e)} onClick={() => toggle("property.expertise", e)}>{e}</Chip>
                ))}
              </ChipRow>
              <Field label="" className="mt-4">
                <Textarea placeholder="Anything else buyers should know? (optional)" {...register("property.notes")} />
              </Field>
            </Card>
          </>
        )}

        {/* ───────── STEP 3: DOCUMENTS & BANK ───────── */}
        {step === 3 && (
          <>
            <PanelHead tag="Step 3 of 5" title="Document Verification" sub="We manually verify every advisor. Documents are reviewed privately and never shared publicly." />
            <Card>
              <CardTitle icon="📄">Primary Proof of Purchase (required)</CardTitle>
              <Field label="Document Type" required>
                <Select
                  value={files.primaryDocType}
                  onChange={(e) => {
                    const opt = O.PRIMARY_DOC_TYPES.find((d) => d.value === e.target.value)!;
                    setFiles((f) => ({ ...f, primaryDocType: opt.value, primaryDocName: opt.label }));
                  }}
                >
                  {O.PRIMARY_DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
              </Field>
              <UploadBox
                label="Click to upload your ownership document"
                sublabel="PDF / JPG / PNG · clear, all pages readable · max 10 MB"
                accept=".pdf,.jpg,.jpeg,.png"
                file={files.primary}
                onPick={(f) => setFiles((s) => ({ ...s, primary: f }))}
                required
              />
            </Card>

            <Card>
              <CardTitle icon="🪪">Identity Verification (required)</CardTitle>
              <FieldRow>
                <UploadBox label="ID — Front" sublabel="JPG / PNG / PDF · max 5 MB" accept=".pdf,.jpg,.jpeg,.png" file={files.idFront} onPick={(f) => setFiles((s) => ({ ...s, idFront: f }))} required />
                <UploadBox label="ID — Back" sublabel="JPG / PNG / PDF · max 5 MB" accept=".pdf,.jpg,.jpeg,.png" file={files.idBack} onPick={(f) => setFiles((s) => ({ ...s, idBack: f }))} />
              </FieldRow>
            </Card>

            <Card>
              <CardTitle icon="🏦">Bank Account for Payouts (required)</CardTitle>
              <FieldRow>
                <Field label="Account Holder Name" required error={errors.payout?.accountHolderName?.message}>
                  <Input placeholder="As per bank records" {...register("payout.accountHolderName")} />
                </Field>
                <Field label="Bank Name" required error={errors.payout?.bankName?.message}>
                  <Select {...register("payout.bankName")}>
                    <option value="">Select bank</option>
                    {O.BANKS.map((b) => <option key={b}>{b}</option>)}
                  </Select>
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Account Number" required error={errors.payout?.accountNumber?.message}>
                  <Input placeholder="Enter account number" {...register("payout.accountNumber")} />
                </Field>
                <Field label="IFSC Code" required error={errors.payout?.ifsc?.message}>
                  <Input placeholder="e.g. HDFC0001234" className="uppercase" {...register("payout.ifsc")} />
                </Field>
              </FieldRow>
              <Field label="UPI ID (optional — faster payouts)">
                <Input placeholder="yourname@upi" {...register("payout.upiId")} />
              </Field>
            </Card>
            {fileError && <p className="mb-4 text-[13px] font-semibold text-rose">{fileError}</p>}
          </>
        )}

        {/* ───────── STEP 4: RATE ───────── */}
        {step === 4 && (
          <>
            <PanelHead tag="Step 4 of 5" title="Set Your Rate & Profile" sub="You decide how much to charge per minute." />
            <Card>
              <CardTitle icon="💰">Consultation Rate (per minute)</CardTitle>
              <div className="py-2 text-center">
                <div className="font-display text-5xl font-extrabold tracking-tight text-ink">₹{rate}</div>
                <div className="mt-1 text-base text-muted-foreground">per minute</div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-green/20 bg-[rgba(16,185,129,.08)] px-4 py-1.5 text-[13px] font-semibold text-[#065F46]">
                  You keep ₹{keepPerMin}/min after platform fee
                </div>
              </div>
              <input
                type="range"
                min={O.RATE_MIN}
                max={O.RATE_MAX}
                step={5}
                className="mt-4 w-full"
                {...register("rate.ratePerMinRupees")}
              />
              <div className="flex justify-between text-[11px] font-semibold text-soft">
                <span>₹{O.RATE_MIN}/min</span><span>₹75/min</span><span>₹{O.RATE_MAX}/min</span>
              </div>
              {errors.rate?.ratePerMinRupees?.message && (
                <p className="mt-2 text-[11.5px] font-medium text-rose">{errors.rate.ratePerMinRupees.message}</p>
              )}
            </Card>
            <Card>
              <CardTitle icon="📸">Profile Photo (recommended)</CardTitle>
              <UploadBox label="Upload your photo" sublabel="Profiles with a photo get 3× more calls · JPG / PNG · max 3 MB" accept=".jpg,.jpeg,.png,.webp" file={files.photo} onPick={(f) => setFiles((s) => ({ ...s, photo: f }))} />
              <Field label="Profile Headline (optional)" className="mt-4" error={errors.rate?.headline?.message}>
                <Input placeholder="e.g. Lodha Palava owner · honest possession & RERA advice" {...register("rate.headline")} />
              </Field>
            </Card>
          </>
        )}

        {/* ───────── STEP 5: AGREEMENT ───────── */}
        {step === 5 && (
          <>
            <PanelHead tag="Step 5 of 5" title="Review & Agree" sub="A few commitments that keep NoDalalTalks broker-free and trustworthy." />
            <Card>
              <ul className="mb-5 space-y-3 text-[13px] leading-relaxed text-ink">
                <li>✅ I am a genuine owner/buyer of the property I listed, and my documents are authentic.</li>
                <li>✅ I will share honest, first-hand experience — not act as a broker or solicit deals.</li>
                <li>✅ I understand calls may be recorded with buyer consent for quality and safety.</li>
                <li>✅ I agree to the platform fee and weekly payout terms (TDS applies per Indian tax law).</li>
              </ul>
              <label className="flex items-start gap-3 text-[13px] text-ink">
                <input type="checkbox" className="mt-0.5 h-4 w-4" {...register("agreement.agreedToTerms")} />
                <span>I have read and accept the NoDalalTalks Advisor Agreement and Privacy Policy.</span>
              </label>
              {errors.agreement?.agreedToTerms?.message && (
                <p className="mt-2 text-[11.5px] font-medium text-rose">{errors.agreement.agreedToTerms.message}</p>
              )}
            </Card>
            {mutation.isError && (
              <p className="mb-4 text-[13px] font-semibold text-rose">{mutation.error?.message}</p>
            )}
          </>
        )}

        {/* ───────── NAV ───────── */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>← Back</Button>
          ) : <span />}
          {step < 5 ? (
            <Button type="button" onClick={next}>Continue →</Button>
          ) : (
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit Application →"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ───────── local presentational helpers ───────── */

function SuccessPanel() {
  return (
    <div className="mx-auto max-w-[560px] px-[5%] py-16 text-center">
      <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-green text-4xl text-white">
        ✓
      </div>
      <h2 className="text-3xl font-extrabold tracking-tight text-ink">
        Application submitted!
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Our verification team will review your documents (usually within 48
        hours). You&apos;ll be notified the moment your profile goes live and you
        can start taking calls.
      </p>
      <div className="mt-8 space-y-2.5 text-left">
        {[
          ["1", "We verify ownership", "Your documents are checked privately against your claimed property."],
          ["2", "Your profile goes live", "Once approved, buyers searching your project can call you."],
          ["3", "You start earning", "Per-minute payouts, transferred weekly to your bank."],
        ].map(([n, t, d]) => (
          <div key={n} className="flex gap-3 rounded-lg border border-border bg-white p-4">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-ink font-display text-xs font-extrabold text-white">{n}</span>
            <div className="text-[13px] leading-relaxed">
              <strong className="block">{t}</strong>
              <span className="text-muted-foreground">{d}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelHead({ tag, title, sub }: { tag: string; title: string; sub: string }) {
  return (
    <div className="mb-8">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-pale px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#92400E]">
        {tag}
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-[1.5px] px-3.5 py-2 text-[12.5px] font-semibold transition-all",
        on
          ? "border-amber bg-amber-pale text-[#92400E]"
          : "border-[color:var(--border-2)] bg-white text-ink hover:border-amber-2",
      )}
    >
      {children}
    </button>
  );
}

function RadioRow({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) {
  return <div className={cn("grid gap-2", wrap ? "sm:grid-cols-2" : "sm:grid-cols-3")}>{children}</div>;
}

function RadioCard({
  value,
  label,
  field,
}: {
  value: string;
  label: string;
  field: UseFormRegisterReturn;
}) {
  const id = `${field.name}-${value}`;
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-[10px] border-2 border-[color:var(--border-2)] px-4 py-3 text-sm font-medium text-ink transition-all has-[:checked]:border-amber has-[:checked]:bg-amber-pale hover:border-amber-2"
    >
      {/* Spread on the host <input> so RHF's ref attaches correctly. */}
      <input id={id} type="radio" value={value} className="sr-only" {...field} />
      {label}
    </label>
  );
}
