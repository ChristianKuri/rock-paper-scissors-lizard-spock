import { JsonRpcProvider, formatEther } from "ethers";
import { getContract } from "@/utils/getContract";
import RPS from "@/app/contracts/RPS.json";
import providerRPC from "@/config/network";
import { redis } from "@/utils/redis";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export async function GET(request: Request) {
  const address: string | null = await redis.get("contract_address");
  if (!address) return Response.json({}, { status: 200 });

  return Response.json(
    { address },
    {
      headers: {
        "content-type": "application/json",
      },
    }
  );
}

export async function POST(request: Request) {
  const { address } = await request.json();

  const currentAddress: string | null = await redis.get("contract_address");

  if (currentAddress) {
    return new Response("Contract address already set", {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  await redis.set("contract_address", address);

  return new Response(address, {
    headers: {
      "content-type": "application/json",
    },
  });
}

export async function DELETE() {
  try {
    const provider = new JsonRpcProvider(providerRPC.sepholia.rpc, {
      name: providerRPC.sepholia.chainName,
      chainId: providerRPC.sepholia.chainId,
    });

    const address: string | null = await redis.get("contract_address");
    if (!address) return new Response("Contract address not set", { status: 404 });

    const balance = await provider.getBalance(address);

    if (Number(balance) !== 0) return new Response("Contract balance not 0", { status: 400 });

    await redis.del("contract_address");

    return new Response("Contract address deleted", {
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
