import { kv } from "@vercel/kv";

export async function GET(request: Request) {
  const address: string | null = await kv.get("contract_address");

  return new Response(address, {
    headers: {
      "content-type": "application/json",
    },
  });
}

export async function POST(request: Request) {
  const { address, hash } = await request.json();

  const currentAddress: string | null = await kv.get("contract_address");

  if (currentAddress) {
    return new Response("Contract address already set", {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  await kv.set("contract_address", address);
  await kv.set("contract_hash", hash);

  return new Response(address, {
    headers: {
      "content-type": "application/json",
    },
  });
}

export async function DELETE(request: Request) {
  const currentAddress: string | null = await kv.get("contract_address");

  await kv.del("contract_address");
  await kv.del("contract_hash");

  return new Response("Contract address deleted", {
    headers: {
      "content-type": "application/json",
    },
  });
}
