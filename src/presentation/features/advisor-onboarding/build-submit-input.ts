import type {
  ApplicationDocumentUpload,
  SubmitAdvisorApplicationInput,
} from "@core/application/use-cases/submit-advisor-application";
import { rupeesToPaise } from "@core/domain/value-objects/money";
import type { OnboardingFormValues } from "@/lib/validations/advisor-onboarding";

/** File slots collected in step 3. */
export interface OnboardingFiles {
  primaryDocType: string;
  primaryDocName: string;
  primary: File | null;
  idType: string;
  idFront: File | null;
  idBack: File | null;
  photo: File | null;
}

function toUpload(
  file: File,
  docType: string,
  name: string,
  group: string,
): ApplicationDocumentUpload {
  return {
    docType,
    name,
    group,
    file,
    fileName: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}

const num = (v?: string) => (v && v.trim() ? Number(v) : undefined);

/**
 * Maps the validated, form-shaped values + selected files into the pure
 * use-case input: numeric strings become numbers, rupees become paise, and the
 * file slots become the documents[] array (empty slots are skipped).
 */
export function buildSubmitInput(
  values: OnboardingFormValues,
  files: OnboardingFiles,
): SubmitAdvisorApplicationInput {
  const documents: ApplicationDocumentUpload[] = [];
  if (files.primary) {
    documents.push(
      toUpload(files.primary, files.primaryDocType, files.primaryDocName, "Ownership Proof"),
    );
  }
  if (files.idFront) {
    documents.push(toUpload(files.idFront, `${files.idType}_front`, "ID — Front", "Identity"));
  }
  if (files.idBack) {
    documents.push(toUpload(files.idBack, `${files.idType}_back`, "ID — Back", "Identity"));
  }
  if (files.photo) {
    documents.push(toUpload(files.photo, "profile_photo", "Profile Photo", "Profile & Rate"));
  }

  const pricePaid = num(values.property.pricePaidRupees);

  return {
    personal: {
      firstName: values.personal.firstName,
      lastName: values.personal.lastName,
      phone: values.personal.phone,
      email: values.personal.email,
      city: values.personal.city,
      languages: values.personal.languages,
      occupation: values.personal.occupation || undefined,
      industry: values.personal.industry || undefined,
      bio: values.personal.bio || undefined,
      availableDays: values.personal.availableDays,
      callHoursFrom: values.personal.callHoursFrom || undefined,
      callHoursTo: values.personal.callHoursTo || undefined,
      maxCallsPerDay: values.personal.maxCallsPerDay,
    },
    property: {
      builder: values.property.builder,
      project: values.property.project,
      city: values.property.city,
      locality: values.property.locality,
      address: values.property.address || undefined,
      propertyType: values.property.propertyType,
      configuration: values.property.configuration || undefined,
      carpetAreaSqft: num(values.property.carpetAreaSqft),
      floor: values.property.floor || undefined,
      tower: values.property.tower || undefined,
      yearOfPurchase: Number(values.property.yearOfPurchase),
      purchasePriceBucket: values.property.purchasePriceBucket,
      pricePaidPaise: pricePaid != null ? rupeesToPaise(pricePaid) : undefined,
      possessionStatus: values.property.possessionStatus,
      possessionPromisedYear: num(values.property.possessionPromisedYear),
      possessionActualYear: num(values.property.possessionActualYear),
      homeLoan: values.property.homeLoan,
      expertise: values.property.expertise,
      notes: values.property.notes || undefined,
    },
    payout: {
      accountHolderName: values.payout.accountHolderName,
      bankName: values.payout.bankName,
      accountNumber: values.payout.accountNumber,
      ifsc: values.payout.ifsc,
      upiId: values.payout.upiId || undefined,
    },
    rate: { ratePerMinPaise: rupeesToPaise(Number(values.rate.ratePerMinRupees)) },
    documents,
  };
}
