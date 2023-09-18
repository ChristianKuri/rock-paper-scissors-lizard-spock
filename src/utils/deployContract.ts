import { ContractFactory, type Signer } from "ethers";
import RPS from "@/app/contracts/RPS.json";

export default async function deployContract(signer: Signer | null) {
  const factory = new ContractFactory(RPS.abi, RPS.bytecode, signer);

  // If your contract requires constructor args, you can specify them here
  const contract = await factory.deploy(["0xed3f9376df1b7d0044fcf8eda878342ddaaf5873678230133492e9974d5a79f4", "0x7e74983DcF46Fdcaffa76c3e7F84fb3eF86e1bF5"]);
  await contract.waitForDeployment();

  return contract;
}
