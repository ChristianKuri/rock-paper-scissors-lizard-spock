"use client";
import { useState, useEffect } from "react";
import { useEthers } from "../hooks/useEthers";

export function ConnectWallet() {
  const { signer, provider, loading, error, init } = useEthers();
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);

  useEffect(() => {
    if (!signer) return;
    connectToMetaMask();
  }, [signer]);

  useEffect(() => {
    if (!provider) return;
    provider.getNetwork().then((network) => {
      setNetwork(network.name);
    });

    provider.provider.on("network", (chainId) => {
      setNetwork(chainId);
    });
  }, [provider]);

  async function connectToMetaMask() {
    if (!signer) {
      console.log("No signer, run useEthers init");
      init();
      return;
    }
    try {
      const address = await signer.getAddress();
      setUserAddress(address);
    } catch (err) {
      console.error("Error connecting to MetaMask:", err);
    }
  }

  async function changeNetwork() {
    if (!provider) return;
    await provider.provider.send?.("wallet_switchEthereumChain", [{ chainId: "0xaa36a7" }]);
    window.location.reload();
  }

  function logout() {
    setUserAddress(null);
  }

  if (loading) {
    return <button className="bg-amber-500 text-white p-2 rounded-md">Connecting...</button>;
  }

  function shortenAddress(address: string): string {
    if (!address || address.length < 6) return address;
    return `${address.substring(0, 3)}...${address.substring(address.length - 3)}`;
  }

  return (
    <div className="flex justify-end">
      {!userAddress ? (
        <button onClick={connectToMetaMask} className="bg-amber-500 text-white p-2 rounded-md">
          Connect to MetaMask
        </button>
      ) : (
        <div>
          <button onClick={logout} className="bg-amber-500	 text-white p-2 rounded-md">
            Logout as {shortenAddress(userAddress)}
          </button>
          {network !== "sepolia" ? (
            <button className="bg-red-500	 text-white p-2 rounded-md ml-1" onClick={() => changeNetwork()}>
              Wrong Network, change to sepolia
            </button>
          ) : (
            <button className="bg-amber-500	 text-white p-2 rounded-md ml-1">{network}</button>
          )}
        </div>
      )}
    </div>
  );
}
