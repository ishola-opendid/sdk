export function getEthereumABI(): any[] {
  return [
    {
      inputs: [{ type: "string", name: "ensName" }],
      name: "registerDID",
      outputs: [],
      type: "function",
    },
    {
      inputs: [
        { type: "string", name: "ensName" },
        { type: "string", name: "cid" },
        { type: "string", name: "credentialType" },
        { type: "address", name: "filecoinContract" },
      ],
      name: "generateClaimMessage",
      outputs: [{ type: "bytes32", name: "messageHash" }],
      type: "function",
    },
    {
      inputs: [
        { type: "string", name: "ensName" },
        { type: "address", name: "filecoinContract" },
      ],
      name: "generateRegistrationMessage",
      outputs: [{ type: "bytes32", name: "messageHash" }],
      type: "function",
    },
    {
      inputs: [{ type: "string", name: "ensName" }],
      name: "hasDID",
      outputs: [{ type: "bool" }],
      type: "function",
    },
  ];
}

export function getFilecoinABI(): any[] {
  return [
    {
      inputs: [
        { type: "string", name: "credentialType" },
        { type: "string", name: "description" },
      ],
      name: "createCredentialType",
      outputs: [],
      type: "function",
    },
    {
      inputs: [
        { type: "string", name: "did" },
        { type: "address", name: "expectedEthOwner" },
        { type: "bytes", name: "sig" },
      ],
      name: "registerDID",
      outputs: [],
      type: "function",
    },
    {
      inputs: [
        { type: "string", name: "did" },
        { type: "string", name: "cid" },
        { type: "string", name: "credentialType" },
        { type: "bytes", name: "sig" },
      ],
      name: "issueClaim",
      outputs: [],
      type: "function",
    },
    {
      inputs: [
        { type: "string", name: "did" },
        { type: "string", name: "credentialType" },
      ],
      name: "getClaim",
      outputs: [{ type: "string", name: "cid" }],
      type: "function",
    },
    {
      inputs: [{ type: "string", name: "credentialType" }],
      name: "credentialExists",
      outputs: [{ type: "bool" }],
      type: "function",
    },
    {
      inputs: [{ type: "string", name: "did" }],
      name: "isDIDRegistered",
      outputs: [{ type: "bool" }],
      type: "function",
    },
  ];
}
