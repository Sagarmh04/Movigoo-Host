import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { BankDetailsData } from "@/components/payments/BankDetailsForm";

export interface StoredBankDetails {
  beneficiaryName: string;
  accountType: "SAVINGS" | "CURRENT";
  bankName: string;
  accountNumberLast4: string;
  ifscCode: string;
}

export interface OrganizerPaymentData {
  bankDetails?: StoredBankDetails;
  payoutStatus: "NOT_ADDED" | "ADDED";
  bankAddedAt?: any;
}

export async function saveBankDetails(bankData: BankDetailsData): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const last4Digits = bankData.accountNumber.slice(-4);
  
  const storedData: StoredBankDetails = {
    beneficiaryName: bankData.beneficiaryName,
    accountType: bankData.accountType,
    bankName: bankData.bankName,
    accountNumberLast4: last4Digits,
    ifscCode: bankData.ifscCode.toUpperCase(),
  };

  const organizerRef = doc(db, "organizers", user.uid);
  
  await setDoc(
    organizerRef,
    {
      bankDetails: storedData,
      payoutStatus: "ADDED",
      bankAddedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getBankDetails(): Promise<OrganizerPaymentData | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  const organizerRef = doc(db, "organizers", user.uid);
  const organizerDoc = await getDoc(organizerRef);

  if (!organizerDoc.exists()) {
    return {
      payoutStatus: "NOT_ADDED",
    };
  }

  const data = organizerDoc.data();
  return {
    bankDetails: data.bankDetails,
    payoutStatus: data.payoutStatus || "NOT_ADDED",
    bankAddedAt: data.bankAddedAt,
  };
}

export async function updateBankDetails(bankData: BankDetailsData): Promise<void> {
  await saveBankDetails(bankData);
}
