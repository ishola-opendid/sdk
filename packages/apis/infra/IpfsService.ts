import { type IPFSResponse } from "../domain/types.js";

export class IpfsService {
  private ipfsEndpoint: string;

  constructor(ipfsEndpoint: string = "http://localhost:5001") {
    this.ipfsEndpoint = ipfsEndpoint;
  }

  async upload(data: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([data], { type: "application/json" });
    formData.append("file", blob);

    const response = await fetch(`${this.ipfsEndpoint}/api/v0/add`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`);
    }

    const result: IPFSResponse = await response.json();
    return result.Hash;
  }

  async retrieve(cid: string): Promise<string> {
    const response = await fetch(`${this.ipfsEndpoint}/api/v0/cat?arg=${cid}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`IPFS retrieval failed: ${response.statusText}`);
    }

    return await response.text();
  }
}
