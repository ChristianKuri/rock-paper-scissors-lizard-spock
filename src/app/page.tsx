import { ConnectWallet } from "./components/ConnectWallet";
import { ContractComponent } from "./components/ContractComponent";
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 container mx-auto">
      <div className="flex justify-between w-full">
        <h1>Rock Paper</h1>
        <ConnectWallet />
      </div>
      <ContractComponent />
    </main>
  );
}
