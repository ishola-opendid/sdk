// decrypt.ts
import { compactDecrypt, importJWK, type JWK } from "jose";

export async function decryptDidDoc(jweCompact: string, recipientPrivJwk: JWK) {
  const privateKey = await importJWK(recipientPrivJwk, "ECDH-ES");
  const { plaintext /*, protectedHeader */ } = await compactDecrypt(
    jweCompact,
    privateKey
  );
  const json = JSON.parse(new TextDecoder().decode(plaintext));
  return json;
}
