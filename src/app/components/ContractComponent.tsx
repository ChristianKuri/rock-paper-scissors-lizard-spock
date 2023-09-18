"use client";

import deployContract from "@/utils/deployContract";
import { useState, useEffect } from "react";
import { useEthers } from "../hooks/useEthers";
import { Addressable, type Contract } from "ethers";
import { getContract } from "@/utils/getContract";

export function ContractComponent() {
  const [contractAddress, setContractAddress] = useState<string>();
  const [contract, setContract] = useState<Contract>();
  const { signer } = useEthers();
  console.log("contract", contract);

  async function deploy() {
    const deployedContract = await deployContract(signer);
    setContractAddress(deployedContract.target.toString());
    console.log("Contract deployed:", deployedContract.target);
  }

  useEffect(() => {
    setupContract();
  }, [contractAddress, signer]);

  async function setupContract() {
    if (!contractAddress || !signer) return;
    setContract(getContract(contractAddress, signer));
  }

  return (
    <div>
      <button className="bg-amber-500	 text-white p-2 rounded-md ml-1" onClick={() => deploy()}>
        Deploy
      </button>
      {contractAddress?.toString()}
    </div>
  );
}
