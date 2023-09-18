"use client";
import { useState, useEffect } from "react";
import { useEthers } from "../hooks/useEthers";
import deployContract from "@/utils/deployContract";

export function ConnectWallet() {
  const { signer, loading, error } = useEthers();
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    connectToMetaMask();
  }, [signer]);

  const connectToMetaMask = async () => {
    if (!signer) {
      console.log("Unable to connect to MetaMask.");
      return;
    }
    try {
      const address = await signer.getAddress();
      setUserAddress(address);
    } catch (err) {
      console.error("Error connecting to MetaMask:", err);
    }
  };

  const logout = () => {
    setUserAddress(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: Unable to connect to MetaMask.</div>;
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
          <button className="bg-amber-500	 text-white p-2 rounded-md ml-1">Chain</button>
        </div>
      )}
    </div>
  );
}
