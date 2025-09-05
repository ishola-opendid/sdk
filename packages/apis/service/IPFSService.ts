// IPFS Service for managing file storage and retrieval
export interface IPFSConfig {
  endpoint: string;
  apiKey?: string;
}

export interface IPFSResponse {
  Hash: string;
  Name: string;
  Size: string;
}

export class IPFSService {
  private config: IPFSConfig;

  constructor(config: IPFSConfig) {
    this.config = config;
  }

  /**
   * Upload data to IPFS
   * @param data The data to upload (string, Blob, or File)
   * @param filename Optional filename
   * @returns IPFS hash (CID)
   */
  async upload(data: string | Blob | File, filename?: string): Promise<string> {
    try {
      const formData = new FormData();
      
      if (typeof data === 'string') {
        const blob = new Blob([data], { type: 'application/json' });
        formData.append('file', blob, filename || 'data.json');
      } else {
        formData.append('file', data, filename);
      }

      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.config.endpoint}/api/v0/add`, {
        method: 'POST',
        body: formData,
        headers
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result: IPFSResponse = await response.json();
      return result.Hash;
    } catch (error) {
      throw new Error(
        `IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve data from IPFS
   * @param cid The IPFS hash (CID)
   * @returns The data as string
   */
  async retrieve(cid: string): Promise<string> {
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(
        `${this.config.endpoint}/api/v0/cat?arg=${cid}`,
        {
          method: 'POST',
          headers
        }
      );

      if (!response.ok) {
        throw new Error(`IPFS retrieval failed: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      throw new Error(
        `IPFS retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve data from IPFS as JSON
   * @param cid The IPFS hash (CID)
   * @returns The data as parsed JSON
   */
  async retrieveJSON<T = any>(cid: string): Promise<T> {
    const data = await this.retrieve(cid);
    try {
      return JSON.parse(data);
    } catch (error) {
      throw new Error(
        `Failed to parse JSON from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Pin a file to IPFS
   * @param cid The IPFS hash (CID)
   * @returns Success status
   */
  async pin(cid: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(
        `${this.config.endpoint}/api/v0/pin/add?arg=${cid}`,
        {
          method: 'POST',
          headers
        }
      );

      return response.ok;
    } catch (error) {
      console.error('IPFS pin failed:', error);
      return false;
    }
  }

  /**
   * Unpin a file from IPFS
   * @param cid The IPFS hash (CID)
   * @returns Success status
   */
  async unpin(cid: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(
        `${this.config.endpoint}/api/v0/pin/rm?arg=${cid}`,
        {
          method: 'POST',
          headers
        }
      );

      return response.ok;
    } catch (error) {
      console.error('IPFS unpin failed:', error);
      return false;
    }
  }

  /**
   * Get file information from IPFS
   * @param cid The IPFS hash (CID)
   * @returns File information
   */
  async stat(cid: string): Promise<{
    Hash: string;
    Size: number;
    CumulativeSize: number;
    Blocks: number;
    Type: string;
  }> {
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(
        `${this.config.endpoint}/api/v0/object/stat?arg=${cid}`,
        {
          method: 'POST',
          headers
        }
      );

      if (!response.ok) {
        throw new Error(`IPFS stat failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        `IPFS stat failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if IPFS node is accessible
   * @returns True if accessible
   */
  async isAccessible(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(
        `${this.config.endpoint}/api/v0/version`,
        {
          method: 'POST',
          headers
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
