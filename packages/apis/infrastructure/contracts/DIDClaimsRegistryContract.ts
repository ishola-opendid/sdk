// DIDClaimsRegistry Contract Interface
export interface DIDClaimsRegistryContract {
  // Contract address
  address: string;
  
  // Events
  events: {
    DIDRegistered: {
      didHash: string;
      did: string;
      ethOwner: string;
    };
    ClaimAppended: {
      didHash: string;
      did: string;
      index: number;
      cid: string;
      claimType: string;
      submitter: string;
    };
    ClaimTypeCreated: {
      claimType: string;
      issuer: string;
      description: string;
    };
  };

  // Methods
  methods: {
    // Claim Type Management
    createClaimType(claimType: string, description: string): Promise<any>;
    isClaimTypeExists(claimType: string): Promise<boolean>;
    getClaimType(claimType: string): Promise<{
      claimType: string;
      issuer: string;
      description: string;
      exists: boolean;
      createdAt: number;
    }>;
    
    // DID Registration
    registerDID(
      did: string,
      expectedEthOwner: string,
      sig: string
    ): Promise<any>;
    
    // Claim Management
    appendClaim(
      did: string,
      cid: string,
      claimType: string,
      sig: string
    ): Promise<any>;
    
    // General Claim Queries
    getLatestCID(did: string): Promise<string>;
    getClaimsCount(did: string): Promise<number>;
    getClaim(did: string, index: number): Promise<string>;
    getAllClaims(did: string): Promise<string[]>;
    getClaimsRange(
      did: string,
      start: number,
      end: number
    ): Promise<string[]>;
    
    // Claim Type Specific Queries
    getLatestCIDByType(did: string, claimType: string): Promise<string>;
    getClaimsCountByType(did: string, claimType: string): Promise<number>;
    getClaimByType(
      did: string,
      claimType: string,
      index: number
    ): Promise<string>;
    getAllClaimsByType(did: string, claimType: string): Promise<string[]>;
    getClaimsRangeByType(
      did: string,
      claimType: string,
      start: number,
      end: number
    ): Promise<string[]>;
    hasClaimsOfType(did: string, claimType: string): Promise<boolean>;
    
    // Utility Methods
    isDIDRegistered(did: string): Promise<boolean>;
    getCurrentNonce(did: string): Promise<number>;
    didHash(did: string): Promise<string>;
  };
}
