import { ContractFactory, parseEther, type Signer } from "ethers";
import RPS from "@/app/contracts/RPS.json";

export async function deployContract(signer: Signer, hash: string, secondPlayerAddress: string, bet: string) {
  const factory = new ContractFactory(RPS.abi, RPS.bytecode, signer);

  // If your contract requires constructor args, you can specify them here
  const contract = await factory.deploy(hash, secondPlayerAddress, { value: parseEther(bet) });
  await contract.waitForDeployment();

  return contract;
}
