// encrypt.ts
import { CompactEncrypt, importJWK, type JWK } from "jose";

export async function encryptDidDoc(didDoc: unknown, recipientPubJwk: JWK) {
  const publicKey = await importJWK(recipientPubJwk, "ECDH-ES");

  const plaintext = new TextEncoder().encode(JSON.stringify(didDoc));

  const jwe = await new CompactEncrypt(plaintext)
    .setProtectedHeader({
      alg: "ECDH-ES",   // key agreement (no RSA here)
      enc: "A256GCM",   // AES-GCM content encryption
      typ: "JWE"
    })
    .encrypt(publicKey);

  // jwe is a compact string like "eyJhbGciOi...~...~...~...~..."
  return jwe;
}
