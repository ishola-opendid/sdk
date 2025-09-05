// OpenDID Contract Interface
export interface OpenDIDContract {
  // Contract address
  address: string;
  
  // Events
  events: {
    DIDClaimed: {
      node: string;
      ensName: string;
      didRecord: string;
      claimer: string;
    };
    ClaimMessageGenerated: {
      node: string;
      ensName: string;
      messageHash: string;
      claimer: string;
    };
  };

  // Methods
  methods: {
    // Register a DID for an ENS name
    registerDID(ensName: string): Promise<any>;
    
    // Generate a signed message for adding a claim to Filecoin
    generateClaimMessage(
      ensName: string,
      cid: string,
      claimType: string
    ): Promise<string>;
    
    // Generate a signed message for registering DID on Filecoin (first time)
    generateRegistrationMessage(ensName: string): Promise<string>;
    
    // Increment nonce after successful operation
    incrementNonce(user: string): Promise<any>;
    
    // Get DID record for an ENS name
    getDID(ensName: string): Promise<string>;
    
    // Check if an ENS name has a DID record
    hasDID(ensName: string): Promise<boolean>;
    
    // Get the namehash of an ENS name
    getNamehash(name: string): Promise<string>;
    
    // Get nonce for a user
    getNonce(user: string): Promise<number>;
  };
}

// ENS Registry Interface
export interface ENSRegistry {
  address: string;
  
  methods: {
    // Get the resolver for a node
    resolver(node: string): Promise<string>;
    
    // Get the owner of a node
    owner(node: string): Promise<string>;
  };
}

// ENS Resolver Interface
export interface ENSResolver {
  address: string;
  
  methods: {
    // Set a text record
    setText(node: string, key: string, value: string): Promise<any>;
    
    // Get a text record
    text(node: string, key: string): Promise<string>;
    
    // Check if resolver supports an interface
    supportsInterface(interfaceID: string): Promise<boolean>;
  };
}
