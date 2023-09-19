import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { initEthers } from "@/utils/initEthers";

export function useEthers() {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function init() {
    try {
      setLoading(true);
      const { provider: initializedProvider, signer: initializedSigner } = await initEthers();
      setProvider(initializedProvider);
      setSigner(initializedSigner);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    init();
  }, []);

  return { provider, signer, loading, error, init };
}
