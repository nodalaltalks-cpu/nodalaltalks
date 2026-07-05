"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EVENT_NAMES } from "@core/domain/events";
import {
  buyerDetailsSchema,
  phoneSchema,
  BUDGETS,
  CITIES,
  INTENTS,
  STAGES,
  TIMELINES,
  type BuyerDetailsValues,
  type PhoneValues,
} from "@/lib/validations/buyer-signup";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useTrack } from "@/presentation/analytics/use-track";
import { createRecaptchaVerifier } from "@infra/auth/firebase-auth-service";
import type { OtpChallenge } from "@core/application/ports";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Field, FieldRow } from "@/presentation/components/ui/field";
import { Input, Select } from "@/presentation/components/ui/input";
import { cn } from "@/lib/utils";
import { useRegisterBuyer } from "./hooks";

type Step = "phone" | "otp" | "details" | "done";

export function BuyerSignupForm() {
  const { auth } = useAuth();
  const track = useTrack();
  const register = useRegisterBuyer();
  const recaptcha = useRef<unknown>(null);
  // Auth-at-the-intent-moment: "Talk Now" (and future gated actions) send
  // buyers here with ?next= so they land back where their intent was.
  const next = useSearchParams().get("next");

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneForm = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });
  const detailsForm = useForm<BuyerDetailsValues>({
    resolver: zodResolver(buyerDetailsSchema),
    defaultValues: {
      displayName: "",
      email: "",
      city: "",
      intent: "live_in",
      targetProject: "",
      budget: "",
      stage: "exploring",
      timeline: "",
    },
  });

  async function sendOtp(values: PhoneValues) {
    if (!auth) return;
    setBusy(true);
    setError(null);
    try {
      recaptcha.current ??= createRecaptchaVerifier("recaptcha-container");
      // 25s timeout: the reCAPTCHA/SMS path can wedge without ever rejecting
      // (seen against emulators, possible on flaky networks) — never leave the
      // user staring at "Sending…" forever with no explanation.
      const ch = await Promise.race([
        auth.sendPhoneOtp(values.phone, recaptcha.current),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Couldn't reach the SMS service. Check your connection and try again.")),
            25_000,
          ),
        ),
      ]);
      track(EVENT_NAMES.BUYER_OTP_REQUESTED, { actorType: "buyer" });
      setPhone(values.phone);
      setChallenge(ch);
      setStep("otp");
    } catch (e) {
      setError((e as Error).message || "Couldn't send OTP. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!auth || !challenge) return;
    setBusy(true);
    setError(null);
    try {
      await auth.confirmPhoneOtp(challenge, code);
      track(EVENT_NAMES.BUYER_OTP_VERIFIED, { actorType: "buyer" });
      setStep("details");
    } catch (e) {
      setError((e as Error).message || "Invalid code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const submitDetails = detailsForm.handleSubmit((values) => {
    register.mutate(
      { ...values, source: "organic" },
      { onSuccess: () => setStep("done") },
    );
  });

  return (
    <div className="mx-auto max-w-[560px] px-[5%] py-12">
      {/* invisible reCAPTCHA mount point for phone auth */}
      <div id="recaptcha-container" />

      {step === "phone" && (
        <>
          <Head tag="Sign up or log in · Step 1 of 3" title="What's your mobile number?" sub="New here or coming back — same OTP either way. Your number is never shown to advisors." />
          <Card>
            <form onSubmit={phoneForm.handleSubmit(sendOtp)} noValidate>
              <Field label="Mobile Number" required hint="Used for login and call routing only." error={phoneForm.formState.errors.phone?.message}>
                <Input placeholder="+91 98765 43210" {...phoneForm.register("phone")} />
              </Field>
              {error && <p className="mb-3 text-[13px] font-semibold text-rose">{error}</p>}
              <Button type="submit" size="block" disabled={busy}>
                {busy ? "Sending…" : "Send OTP →"}
              </Button>
            </form>
          </Card>
        </>
      )}

      {step === "otp" && (
        <>
          <Head tag="Step 2 of 3" title="Enter the OTP" sub={`Sent via SMS to ${phone}.`} />
          <Card>
            <Field label="Verification code" required>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                className="text-center text-2xl tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            {error && <p className="mb-3 text-[13px] font-semibold text-rose">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("phone")}>← Edit number</Button>
              <Button type="button" className="flex-1" disabled={busy || code.length < 4} onClick={verifyOtp}>
                {busy ? "Verifying…" : "Verify & Continue →"}
              </Button>
            </div>
          </Card>
        </>
      )}

      {step === "details" && (
        <>
          <Head tag="Step 3 of 3" title="A few details about you" sub="This helps us recommend the right advisors for your project and budget." />
          <Card>
            <form onSubmit={submitDetails} noValidate>
              <FieldRow>
                <Field label="Full Name" required error={detailsForm.formState.errors.displayName?.message}>
                  <Input placeholder="Ananya Verma" {...detailsForm.register("displayName")} />
                </Field>
                <Field label="Email" required error={detailsForm.formState.errors.email?.message}>
                  <Input placeholder="you@email.com" {...detailsForm.register("email")} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="City" required error={detailsForm.formState.errors.city?.message}>
                  <Select {...detailsForm.register("city")}>
                    <option value="">Select city</option>
                    {CITIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="I'm looking to" required>
                  <Select {...detailsForm.register("intent")}>
                    {INTENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </Select>
                </Field>
              </FieldRow>
              <Field label="Project or Developer (optional)">
                <Input placeholder="e.g. Lodha Palava, Prestige Lakeside" {...detailsForm.register("targetProject")} />
              </Field>
              <FieldRow>
                <Field label="Budget" required error={detailsForm.formState.errors.budget?.message}>
                  <Select {...detailsForm.register("budget")}>
                    <option value="">Select budget</option>
                    {BUDGETS.map((b) => <option key={b}>{b}</option>)}
                  </Select>
                </Field>
                <Field label="Purchase Stage" required>
                  <Select {...detailsForm.register("stage")}>
                    {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </Field>
              </FieldRow>
              <Field label="When do you plan to buy?" required error={detailsForm.formState.errors.timeline?.message}>
                <Select {...detailsForm.register("timeline")}>
                  <option value="">Select timeline</option>
                  {TIMELINES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              {register.isError && <p className="mb-3 text-[13px] font-semibold text-rose">{register.error?.message}</p>}
              <Button type="submit" size="block" disabled={register.isPending}>
                {register.isPending ? "Creating account…" : "Create My Account →"}
              </Button>
            </form>
          </Card>
        </>
      )}

      {step === "done" && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green text-4xl text-white">✓</div>
          <h2 className="text-3xl font-extrabold tracking-tight">You&apos;re in! 🎉</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Your buyer account is ready. Browse verified advisors who already own
            in the projects you&apos;re evaluating.
          </p>
          <Link href={next ?? "/buyer"} className="mt-7 inline-block">
            <Button>{next ? "Continue where you left off →" : "Browse Advisors →"}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function Head({ tag, title, sub }: { tag: string; title: string; sub: string }) {
  return (
    <div className="mb-6 text-center">
      <div className={cn("mb-3 inline-flex rounded-full bg-amber-pale px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#92400E]")}>
        {tag}
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 text-[13.5px] text-muted-foreground">{sub}</p>
    </div>
  );
}
