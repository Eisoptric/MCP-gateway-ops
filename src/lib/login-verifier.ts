import { argon2id } from "hash-wasm";

const encoder = new TextEncoder();

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

/**
 * The two forms of a password the API accepts at sign-in. They must match the API's own
 * sign-in page byte for byte, or an account set up there cannot sign in here.
 *
 * v2 is Argon2id (the API's parameters, salted with the email) run through HKDF. v1 is the
 * older single SHA-256, sent only when the API asks an account to prove it.
 */
export async function loginVerifiers(email: string, password: string) {
  const v1 = "v1." + hex(await sha256("saturn-login-v1\n" + password));
  const master = await argon2id({
    password,
    salt: await sha256("saturn-argon2-salt-v1\n" + email),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 64,
    outputType: "binary",
  });
  const key = await crypto.subtle.importKey("raw", new Uint8Array(master), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: encoder.encode("saturn-login-v2") },
    key,
    256
  );
  return { v1, v2: "v2." + hex(new Uint8Array(bits)) };
}
