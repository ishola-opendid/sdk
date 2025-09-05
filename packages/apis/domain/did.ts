export interface DIDDocument {
  claimId: string;
  context: string[];
  data: {
    [key: string]: any;
  };
  issuerId: string;
  issuedAt: Date;
  subjectId: string;
  expirationDate?: Date;
}
