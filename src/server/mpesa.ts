import { z } from "zod";

const accessTokenSchema = z.object({ access_token: z.string().min(1) });
const stkResponseSchema = z.object({
  MerchantRequestID: z.string().optional(),
  CheckoutRequestID: z.string().optional(),
  ResponseCode: z.string().optional(),
  ResponseDescription: z.string().optional(),
});

function apiBase(): string {
  return process.env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`M-Pesa is not configured. Set ${name}.`);
  return value;
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0")
    ? `254${digits.slice(1)}`
    : digits.startsWith("254")
      ? digits
      : `254${digits}`;
  return /^254[17]\d{8}$/.test(normalized) ? normalized : null;
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${required("MPESA_CONSUMER_KEY")}:${required("MPESA_CONSUMER_SECRET")}`,
  ).toString("base64");
  const response = await fetch(`${apiBase()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Could not authenticate with the M-Pesa service.");
  return accessTokenSchema.parse(await response.json()).access_token;
}

export async function initiateStkPush(input: {
  phone: string;
  amount: number;
  accountReference: string;
  callbackUrl: string;
}): Promise<{ merchantRequestId: string; checkoutRequestId: string }> {
  const shortcode = required("MPESA_SHORTCODE");
  const passkey = required("MPESA_PASSKEY");
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const response = await fetch(`${apiBase()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: input.amount,
      PartyA: input.phone,
      PartyB: shortcode,
      PhoneNumber: input.phone,
      CallBackURL: input.callbackUrl,
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: "ElimuLabs wallet top-up",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = stkResponseSchema.parse(await response.json());
  if (!response.ok || data.ResponseCode !== "0" || !data.MerchantRequestID || !data.CheckoutRequestID) {
    throw new Error(data.ResponseDescription ?? "M-Pesa did not accept the top-up request.");
  }
  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
  };
}
