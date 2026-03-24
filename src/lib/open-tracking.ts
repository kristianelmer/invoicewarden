import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type OpenTrackingPayload = {
  invoiceId: string;
  userId: string;
  trackingId: string;
  iat: number;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days

function getSecret() {
  return process.env.OPEN_TRACKING_SECRET || process.env.STRIPE_WEBHOOK_SECRET || null;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payloadSegment: string, secret: string) {
  return createHmac("sha256", secret).update(payloadSegment).digest("base64url");
}

export function buildOpenTrackingToken(params: {
  invoiceId: string;
  userId: string;
  ttlSeconds?: number;
}) {
  const secret = getSecret();
  if (!secret) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: OpenTrackingPayload = {
    invoiceId: params.invoiceId,
    userId: params.userId,
    trackingId: randomUUID(),
    iat: now,
    exp: now + (params.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };

  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadSegment, secret);
  return `${payloadSegment}.${signature}`;
}

export function verifyOpenTrackingToken(token: string) {
  const secret = getSecret();
  if (!secret) return null;

  const [payloadSegment, signature] = token.split(".");
  if (!payloadSegment || !signature) return null;

  const expected = sign(payloadSegment, secret);
  const sigA = Buffer.from(signature, "utf8");
  const sigB = Buffer.from(expected, "utf8");

  if (sigA.length !== sigB.length) return null;
  if (!timingSafeEqual(sigA, sigB)) return null;

  try {
    const raw = base64UrlDecode(payloadSegment);
    const payload = JSON.parse(raw) as OpenTrackingPayload;

    if (!payload.invoiceId || !payload.userId || !payload.trackingId) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function buildOpenTrackingPixelUrl(baseUrl: string, token: string) {
  const encoded = encodeURIComponent(token);
  return `${baseUrl}/api/enforcement/open?token=${encoded}`;
}
