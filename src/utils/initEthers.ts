import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum: any;
  }
}

export async function initEthers(): Promise<{ provider: ethers.BrowserProvider | null; signer: ethers.Signer | null }> {
  let signer: ethers.Signer | null = null;
  let provider: ethers.BrowserProvider | null = null;

  try {
    const isClient = typeof window !== "undefined";

    if (isClient && window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      if (provider instanceof ethers.BrowserProvider) {
        signer = await provider.getSigner();
      }
    }

    return { provider, signer };
  } catch (err) {
    throw new Error(`Failed to initialize ethers: ${(err as Error).message}`);
  }
}
