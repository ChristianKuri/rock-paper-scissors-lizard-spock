import { Contract, type Signer, type Provider, type Interface, type InterfaceAbi } from "ethers";

export function getContract(addresss: string, abi: Interface | InterfaceAbi, signerOrProvider: Signer | Provider): Contract {
  return new Contract(addresss, abi, signerOrProvider);
}
