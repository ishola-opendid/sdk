import { generateKeyPair, exportJWK, importJWK, type JWK } from "jose";
import { type KeyPair } from "../domain/types.js";

export class KeyService {
  static async makeRecipientKeypair(): Promise<KeyPair> {
    const { publicKey, privateKey } = await generateKeyPair("ECDH-ES", {
      crv: "P-256",
    });
    const pubJwk = await exportJWK(publicKey);
    const privJwk = await exportJWK(privateKey);
    return { pubJwk, privJwk };
  }

  static async importRecipientPublicKey(pubJwk: JWK) {
    return await importJWK(pubJwk, "ECDH-ES");
  }

  static async importRecipientPrivateKey(privJwk: JWK) {
    return await importJWK(privJwk, "ECDH-ES");
  }
}
