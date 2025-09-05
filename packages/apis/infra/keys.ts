// keys.ts
import { generateKeyPair, exportJWK, importJWK, type JWK } from "jose";

// Generate recipient key pair (one time during setup)
// ECDH-ES = key agreement; P-256 curve is widely supported
export async function makeRecipientKeypair() {
  const { publicKey, privateKey } = await generateKeyPair("ECDH-ES", { crv: "P-256" });
  const pubJwk = await exportJWK(publicKey);
  const privJwk = await exportJWK(privateKey);
  // Persist privJwk securely (wallet/keystore); share pubJwk with senders
  return { pubJwk, privJwk };
}

// Example of importing a stored JWK:
export async function importRecipientPublicKey(pubJwk: JWK) {
  return await importJWK(pubJwk, "ECDH-ES");
}
export async function importRecipientPrivateKey(privJwk: JWK) {
  return await importJWK(privJwk, "ECDH-ES");
}
