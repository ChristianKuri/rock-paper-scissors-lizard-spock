import { Contract } from "ethers";
import RPS from "@/app/contracts/RPS.json";
import { Signer, Provider } from "ethers";

export function getContract(addresss: string, signerOrProvider: Signer | Provider): Contract {
  return new Contract(addresss, RPS.abi, signerOrProvider);
}
