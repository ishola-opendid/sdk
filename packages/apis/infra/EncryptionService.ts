import { CompactEncrypt, compactDecrypt, importJWK, type JWK } from "jose";
import { type ClaimDocument } from "../domain/did.js";

export class EncryptionService {
  static async encrypt(claimDoc: ClaimDocument, recipientPubJwk: JWK): Promise<string> {
    const publicKey = await importJWK(recipientPubJwk, "ECDH-ES");
    const plaintext = new TextEncoder().encode(JSON.stringify(claimDoc));
    const jwe = await new CompactEncrypt(plaintext)
      .setProtectedHeader({
        alg: "ECDH-ES",
        enc: "A256GCM",
        typ: "JWE",
      })
      .encrypt(publicKey);
    return jwe;
  }

  static async decrypt(jweCompact: string, recipientPrivJwk: JWK): Promise<ClaimDocument> {
    const privateKey = await importJWK(recipientPrivJwk, "ECDH-ES");
    const { plaintext } = await compactDecrypt(jweCompact, privateKey);
    const json = JSON.parse(new TextDecoder().decode(plaintext));
    return json as ClaimDocument;
  }
}
