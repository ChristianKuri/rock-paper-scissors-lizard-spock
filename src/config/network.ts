const providerRPC = {
  sepholia: {
    chainId: 11155111,
    chainName: "Sepolia test network",
    network: "sepolia",
    rpc: process.env.INFURA_API_KEY,
    rpcUrls: ["https://sepolia.infura.io/v3/"],
    nativeCurrency: { name: "SepoliaETH", symbol: "SETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
    testnet: true,
  },
};

export default providerRPC;
