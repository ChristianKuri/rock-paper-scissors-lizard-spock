import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { initEthers } from "@/utils/initEthers";

export function useEthers() {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const { provider: initializedProvider, signer: initializedSigner } = await initEthers();
        setProvider(initializedProvider);
        setSigner(initializedSigner);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return { provider, signer, loading, error };
}
