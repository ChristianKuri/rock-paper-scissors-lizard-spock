import { Networkish } from "ethers";
import { sepolia } from "@wagmi/chains";

const sepoliaNetwork: Networkish = {
  name: sepolia.name,
  chainId: sepolia.id,
};

export { sepoliaNetwork };
