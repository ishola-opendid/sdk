export interface DIDDocument {
  claimId: string;
  context: string[];
  data: {
    [key: string]: any;
  };
  issuerDid: string;
  issuedAt: Date;
  subjectId: string;
  expirationDate?: Date;
}
