// The API sends WebAuthn options as JSON with base64url strings where the browser wants bytes,
// and expects the browser's answer back the same way. These two functions do that conversion.

type Descriptor = { id: string; type: string; transports?: string[] };

export interface PasskeyRequestOptions {
  challenge: string;
  allowCredentials?: Descriptor[];
  [key: string]: unknown;
}

export interface PasskeyCreationOptions {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  excludeCredentials?: Descriptor[];
  [key: string]: unknown;
}

function toBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toText(buffer: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function descriptors(items: Descriptor[] | undefined) {
  return items?.map((item) => ({ ...item, id: toBytes(item.id) }));
}

export function passkeysSupported() {
  return typeof window !== "undefined" && "PublicKeyCredential" in window && Boolean(navigator.credentials);
}

/** The browser shows no passkey prompt, or the person dismissed it or let it time out. */
export function passkeyDismissed(error: unknown) {
  return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError");
}

function common(credential: PublicKeyCredential) {
  return {
    id: credential.id,
    rawId: toText(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

/** Asks the browser to sign in with a passkey and returns its answer for the API. */
export async function getPasskey(options: PasskeyRequestOptions) {
  const publicKey = {
    ...options,
    challenge: toBytes(options.challenge),
    allowCredentials: descriptors(options.allowCredentials),
  } as unknown as PublicKeyCredentialRequestOptions;
  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new DOMException("No passkey was chosen", "NotAllowedError");
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    ...common(credential),
    response: {
      clientDataJSON: toText(response.clientDataJSON),
      authenticatorData: toText(response.authenticatorData),
      signature: toText(response.signature),
      userHandle: response.userHandle ? toText(response.userHandle) : undefined,
    },
  };
}

/** Asks the browser to make a new passkey and returns it for the API to store. */
export async function createPasskey(options: PasskeyCreationOptions) {
  const publicKey = {
    ...options,
    challenge: toBytes(options.challenge),
    user: { ...options.user, id: toBytes(options.user.id) },
    excludeCredentials: descriptors(options.excludeCredentials),
  } as unknown as PublicKeyCredentialCreationOptions;
  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new DOMException("No passkey was made", "NotAllowedError");
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    ...common(credential),
    response: {
      clientDataJSON: toText(response.clientDataJSON),
      attestationObject: toText(response.attestationObject),
      transports: response.getTransports?.(),
    },
  };
}
