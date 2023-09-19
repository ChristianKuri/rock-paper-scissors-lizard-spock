"use client";
import { ButtonComponent } from "./ButtonComponent";
import { deployContract } from "@/utils/deployContract";
import { useState, useEffect, ChangeEvent, use } from "react";
import { useEthers } from "../hooks/useEthers";
import { parseEther, type Contract } from "ethers";
import { getContract } from "@/utils/getContract";
import Hasher from "@/app/contracts/Hasher.json";
import RPS from "@/app/contracts/RPS.json";
import { generateSalt } from "@/utils/random";
import { isAddress } from "web3-validator";
import { classNames } from "@/utils/object";
import useLocalStorage from "../hooks/useLocalStorage";
import axios from "axios";
import { Move } from "@/enums/move";
import { formatEther } from "ethers";
import { Signer } from "ethers";
import { timeAgo } from "@/utils/time";

export function ContractComponent() {
  const [salt, setSalt] = useLocalStorage("salt", 0);
  const [move, setMove] = useLocalStorage("move", Move.Null);
  const [contractAddress, setContractAddress] = useState<string>();
  const [currentAddress, setCurrentAddress] = useState<string>();
  const [firstPlayerAddress, setFirstPlayerAddress] = useState<string>();
  const [secondPlayerAddress, setSecondPlayerAddress] = useState<string>("");
  const [RPSContract, setRPSContract] = useState<Contract>();
  const [bet, setBet] = useState("0.01");
  const [validSecondPlayerAddress, setValidSecondPlayerAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secondPlayerMove, setSecondPlayerMove] = useState<string>();
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [lastAction, setLastAction] = useState<number>();
  const [shouldShowRefund, setShouldShowRefund] = useState<boolean>(false);
  const { signer } = useEthers();

  /**
   * On mount, fetch the contract from the database.
   */
  useEffect(() => {
    fetchContract();
    const interval = setInterval(() => {
      fetchContract();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * If the contract address is set, fetch the contract and set the contract state.
   */
  useEffect(() => {
    if (!signer) return;
    if (!contractAddress || contractAddress.length == 0) return;
    setRPSContract(getContract(contractAddress, RPS.abi, signer));

    fetchContractData(contractAddress, signer);
    const interval = setInterval(() => {
      fetchContractData(contractAddress, signer);
    }, 1000);

    return () => clearInterval(interval);
  }, [contractAddress, signer]);

  /**
   * If the signer is set, fetch the current address.
   */
  useEffect(() => {
    if (!signer) return;
    changeSigner();
  }, [signer]);

  /**
   * If the contract address is removed from the database, clear the state, the game is over.
   */
  useEffect(() => {
    if (!contractAddress) {
      clearState();
    }
  }, [contractAddress]);

  /**
   * Fetch the contract data from the blockchain.
   *
   * @param address The contract address.
   * @param signer The signer.
   * @returns Promise<void>
   */
  async function fetchContractData(address: string, signer: Signer) {
    const contract = getContract(address, RPS.abi, signer);
    const bet = formatEther((await contract.stake()).toString());
    const firstPlayerAddress = await contract.j1();
    const secondPlayerAddress = await contract.j2();
    const secondPlayerMove = await contract.c2();
    const lastAction = await contract.lastAction();
    const timeSinceLastAction = Math.floor(Date.now() / 1000 - Number(lastAction));

    setBet(bet);
    setFirstPlayerAddress(firstPlayerAddress);
    setSecondPlayerAddress(secondPlayerAddress);
    setSecondPlayerMove(secondPlayerMove);
    setLastAction(Number(lastAction));
    setShouldShowRefund(timeSinceLastAction >= 300);
  }

  /**
   * Deploy the contract.
   *
   * @returns Promise<void>
   */
  async function deploy() {
    if (!signer) return;
    if (!secondPlayerAddress || !validSecondPlayerAddress) return;

    /** set loading state */
    setIsSendingTx(true);

    try {
      /** Salt */
      const salt = generateSalt();
      setSalt(salt);

      /** Hash */
      const hasherContract = getContract(Hasher.address, Hasher.abi, signer);
      const hash = await hasherContract.hash(move, salt);

      /** Deploy */
      const contract = await deployContract(signer, hash, secondPlayerAddress, bet);
      setContractAddress(contract.target.toString());

      /** Store Contract Address */
      await axios.post("/api/contract", { address: contract.target.toString(), salt, secondPlayerAddress, bet });
    } catch (error) {
      console.log(error);
    }

    /** set loading state */
    setIsSendingTx(false);
  }

  /**
   * If the second player is the current address, play the game.
   *
   * @returns Promise<void>
   */
  async function play() {
    if (!signer) return;
    if (currentAddress !== secondPlayerAddress) return;
    if (!move) return;

    /** set loading state */
    setIsSendingTx(true);

    try {
      /** Play */
      const tx = await RPSContract?.play(move, { value: parseEther(bet) });
      const receipt = await tx.wait();
      await fetchContract();
    } catch (error) {
      console.log(error);
    }

    /** set loading state */
    setIsSendingTx(false);
  }

  /**
   * If the current address is the first player, solve the game.
   *
   * @returns Promise<void>
   */
  async function solve() {
    if (!signer) return;
    if (!move) return;
    if (!salt) return;

    /** set loading state */
    setIsSendingTx(true);

    try {
      /** Solve */
      const tx = await RPSContract?.solve(move, salt);
      const receipt = await tx.wait();

      /** The contract is solved */
      if (receipt.status === 1) {
        resetGame();
      }
    } catch (error) {
      console.log(error);
    }

    /** set loading state */
    setIsSendingTx(false);
  }

  /**
   *  If the other player stoped playing claim the funds.
   *
   * @returns Promise<void>
   */
  async function timeout() {
    if (shouldShowRefund) {
      try {
        let tx;
        if (currentAddress == firstPlayerAddress) {
          tx = await RPSContract?.j2Timeout();
        } else if (currentAddress == secondPlayerAddress) {
          tx = await RPSContract?.j1Timeout();
        } else {
          return;
        }

        const receipt = await tx.wait();

        /** The contract is solved */
        if (receipt.status === 1) {
          resetGame();
        }
      } catch (error) {
        console.log(error);
      }
    }
  }

  /**
   * Fetch the contract address from the redis database.
   */
  async function fetchContract() {
    await axios
      .get("/api/contract")
      .then((res) => {
        setContractAddress(res.data.address || undefined);
      })
      .catch((err) => {});

    setLoading(false);
  }

  /**
   * Reset the game.
   */
  async function resetGame() {
    try {
      const res = await axios.delete("/api/contract");
      clearState();
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Clear the state so we can start a new game.
   */
  function clearState() {
    setContractAddress(undefined);
    setFirstPlayerAddress(undefined);
    setSecondPlayerAddress("");
    setBet("0.01");
    setSecondPlayerMove(undefined);
  }

  /**
   * Validate the second player address.
   *
   * @param e  The event.
   */
  function validateSecondPlayerAddress(e: ChangeEvent<HTMLInputElement>) {
    const address = e.target.value;
    console.log(address, currentAddress);
    isAddress(address) && address !== currentAddress ? setValidSecondPlayerAddress(true) : setValidSecondPlayerAddress(false);
    setSecondPlayerAddress(address);
  }

  async function changeSigner() {
    if (!signer) return;
    const address = await signer.getAddress();
    setCurrentAddress(address);
  }

  if (loading) return <div className="w-full container mt-10">Loading...</div>;

  if (contractAddress && Number(secondPlayerMove) !== 0) {
    if (currentAddress === firstPlayerAddress) {
      return (
        <div>
          <div className="w-full container mt-10">The second player is done, lets resolve the game!</div>
          <ButtonComponent call={solve} isSendingTx={isSendingTx} text="Solve Game" sendingText="Solving game..." />
        </div>
      );
    }

    if (currentAddress === secondPlayerAddress) {
      return (
        <div>
          <div className="w-full container mt-10">Your move is Set, lets wait for the first player to resolve the game!</div>
          {lastAction && <div>Last action {timeAgo(Number(new Date(lastAction * 1000)))}</div>}
          {shouldShowRefund && <ButtonComponent call={timeout} isSendingTx={isSendingTx} text="Claim  your price!" sendingText="claiming..." />}
        </div>
      );
    }
  }

  if (contractAddress && contractAddress.length > 0 && currentAddress !== secondPlayerAddress) {
    return (
      <div>
        <div className="w-full container mt-10">Game started, waiting for second player... ({secondPlayerAddress})</div>
        {lastAction && <div>Last action {timeAgo(Number(new Date(lastAction * 1000)))}</div>}
        {shouldShowRefund && <ButtonComponent call={timeout} isSendingTx={isSendingTx} text="Refund your Token" sendingText="refunding..." />}
      </div>
    );
  }

  return (
    <div className="w-full container">
      {!contractAddress && (
        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-6">
          <div className="md:col-span-3">
            <label htmlFor="address" className="block text-sm font-medium leading-6 text-gray-900">
              Second Player Address
            </label>
            <div className="mt-2">
              <input
                value={secondPlayerAddress}
                onChange={(e) => validateSecondPlayerAddress(e)}
                type="text"
                name="address"
                id="address"
                placeholder="0x0000000000000000000000000000000000000000"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            {!validSecondPlayerAddress && secondPlayerAddress && (
              <p className="mt-2 text-sm text-red-600" id="email-error">
                Not a valid address.
              </p>
            )}
          </div>

          <div className="md:col-span-3">
            <label htmlFor="bet" className="block text-sm font-medium leading-6 text-gray-900">
              Bet
            </label>

            <div className="mt-2">
              <input
                type="range"
                min="0.01"
                max="1.00"
                step="0.01"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                value={bet}
                onChange={(e) => setBet(e.target.value)}
              />
              {bet} ETH
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <div
          className={classNames(
            move == Move.Rock ? "border-blue-600" : "border-gray-500",
            "border-4 border-solid  flex justify-center items-center w-20 h-24 rounded cursor-pointer flex-col text-gray-800"
          )}
          onClick={() => setMove(Move.Rock)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-10 w-10" fill="currentColor">
            <path d="M408.864 79.052c-22.401-33.898-66.108-42.273-98.813-23.588-29.474-31.469-79.145-31.093-108.334-.022-47.16-27.02-108.71 5.055-110.671 60.806C44.846 105.407 0 140.001 0 187.429v56.953c0 32.741 14.28 63.954 39.18 85.634l97.71 85.081c4.252 3.702 3.11 5.573 3.11 32.903 0 17.673 14.327 32 32 32h252c17.673 0 32-14.327 32-32 0-23.513-1.015-30.745 3.982-42.37l42.835-99.656c6.094-14.177 9.183-29.172 9.183-44.568V146.963c0-52.839-54.314-88.662-103.136-67.911zM464 261.406a64.505 64.505 0 0 1-5.282 25.613l-42.835 99.655c-5.23 12.171-7.883 25.04-7.883 38.25V432H188v-10.286c0-16.37-7.14-31.977-19.59-42.817l-97.71-85.08C56.274 281.255 48 263.236 48 244.381v-56.953c0-33.208 52-33.537 52 .677v41.228a16 16 0 0 0 5.493 12.067l7 6.095A16 16 0 0 0 139 235.429V118.857c0-33.097 52-33.725 52 .677v26.751c0 8.836 7.164 16 16 16h7c8.836 0 16-7.164 16-16v-41.143c0-33.134 52-33.675 52 .677v40.466c0 8.836 7.163 16 16 16h7c8.837 0 16-7.164 16-16v-27.429c0-33.03 52-33.78 52 .677v26.751c0 8.836 7.163 16 16 16h7c8.837 0 16-7.164 16-16 0-33.146 52-33.613 52 .677v114.445z" />
          </svg>
          <span>Rock</span>
        </div>
        <div
          className={classNames(
            move == Move.Paper ? "border-blue-600" : "border-gray-500",
            "border-4 border-solid  flex justify-center items-center w-20 h-24 rounded cursor-pointer flex-col text-gray-800"
          )}
          onClick={() => setMove(Move.Paper)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-10 w-10" fill="currentColor">
            <path d="M372.57 112.641v-10.825c0-43.612-40.52-76.691-83.039-65.546-25.629-49.5-94.09-47.45-117.982.747C130.269 26.456 89.144 57.945 89.144 102v126.13c-19.953-7.427-43.308-5.068-62.083 8.871-29.355 21.796-35.794 63.333-14.55 93.153L132.48 498.569a32 32 0 0 0 26.062 13.432h222.897c14.904 0 27.835-10.289 31.182-24.813l30.184-130.958A203.637 203.637 0 0 0 448 310.564V179c0-40.62-35.523-71.992-75.43-66.359zm27.427 197.922c0 11.731-1.334 23.469-3.965 34.886L368.707 464h-201.92L51.591 302.303c-14.439-20.27 15.023-42.776 29.394-22.605l27.128 38.079c8.995 12.626 29.031 6.287 29.031-9.283V102c0-25.645 36.571-24.81 36.571.691V256c0 8.837 7.163 16 16 16h6.856c8.837 0 16-7.163 16-16V67c0-25.663 36.571-24.81 36.571.691V256c0 8.837 7.163 16 16 16h6.856c8.837 0 16-7.163 16-16V101.125c0-25.672 36.57-24.81 36.57.691V256c0 8.837 7.163 16 16 16h6.857c8.837 0 16-7.163 16-16v-76.309c0-26.242 36.57-25.64 36.57-.691v131.563z" />
          </svg>
          <span>Paper</span>
        </div>
        <div
          className={classNames(
            move == Move.Scissors ? "border-blue-600" : "border-gray-500",
            "border-4 border-solid  flex justify-center items-center w-20 h-24 rounded cursor-pointer flex-col text-gray-800"
          )}
          onClick={() => setMove(Move.Scissors)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-10 w-10" fill="currentColor">
            <path d="M256 480l70-.013c5.114 0 10.231-.583 15.203-1.729l118.999-27.427C490.56 443.835 512 417.02 512 386.277V180.575c0-23.845-13.03-45.951-34.005-57.69l-97.999-54.853c-34.409-19.261-67.263-5.824-92.218 24.733L142.85 37.008c-37.887-14.579-80.612 3.727-95.642 41.201-15.098 37.642 3.635 80.37 41.942 95.112L168 192l-94-9.141c-40.804 0-74 32.811-74 73.14 0 40.33 33.196 73.141 74 73.141h87.635c-3.675 26.245 8.692 51.297 30.341 65.006C178.657 436.737 211.044 480 256 480zm0-48.013c-25.16 0-25.12-36.567 0-36.567 8.837 0 16-7.163 16-16v-6.856c0-8.837-7.163-16-16-16h-28c-25.159 0-25.122-36.567 0-36.567h28c8.837 0 16-7.163 16-16v-6.856c0-8.837-7.163-16-16-16H74c-34.43 0-34.375-50.281 0-50.281h182c8.837 0 16-7.163 16-16v-11.632a16 16 0 0 0-10.254-14.933L106.389 128.51c-31.552-12.14-13.432-59.283 19.222-46.717l166.549 64.091a16.001 16.001 0 0 0 18.139-4.812l21.764-26.647c5.82-7.127 16.348-9.064 24.488-4.508l98 54.854c5.828 3.263 9.449 9.318 9.449 15.805v205.701c0 8.491-5.994 15.804-14.576 17.782l-119.001 27.427a19.743 19.743 0 0 1-4.423.502h-70z" />
          </svg>
          <span>Scissors</span>
        </div>
        <div
          className={classNames(
            move == Move.Lizard ? "border-blue-600" : "border-gray-500",
            "border-4 border-solid  flex justify-center items-center w-20 h-24 rounded cursor-pointer flex-col text-gray-800"
          )}
          onClick={() => setMove(Move.Lizard)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-10 w-10" fill="currentColor">
            <path d="M556.686 290.542L410.328 64.829C397.001 44.272 374.417 32 349.917 32H56C25.121 32 0 57.122 0 88v8c0 44.112 35.888 80 80 80h196.042l-18.333 48H144c-48.523 0-88 39.477-88 88 0 30.879 25.121 56 56 56h131.552c2.987 0 5.914.549 8.697 1.631L352 408.418V480h224V355.829c0-23.225-6.679-45.801-19.314-65.287zM528 432H400v-23.582c0-19.948-12.014-37.508-30.604-44.736l-99.751-38.788A71.733 71.733 0 0 0 243.552 320H112c-4.411 0-8-3.589-8-8 0-22.056 17.944-40 40-40h113.709c19.767 0 37.786-12.407 44.84-30.873l24.552-64.281c8.996-23.553-8.428-48.846-33.63-48.846H80c-17.645 0-32-14.355-32-32v-8c0-4.411 3.589-8 8-8h293.917c8.166 0 15.693 4.09 20.137 10.942l146.358 225.715A71.84 71.84 0 0 1 528 355.829V432z" />
          </svg>
          <span>Lizard</span>
        </div>
        <div
          className={classNames(
            move == Move.Spock ? "border-blue-600" : "border-gray-500",
            "border-4 border-solid  flex justify-center items-center w-20 h-24 rounded cursor-pointer flex-col text-gray-800"
          )}
          onClick={() => setMove(Move.Spock)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-10 w-10" fill="currentColor">
            <path d="M501.03053,116.17605c-19.39059-31.50779-51.24406-35.72849-66.31044-35.01756-14.11325-50.81051-62.0038-54.08-70.73816-54.08a74.03091,74.03091,0,0,0-72.23816,58.916l-4.64648,22.66014-13.68357-53.207c-9.09569-35.37107-46.412-64.05074-89.66-53.07223a73.89749,73.89749,0,0,0-55.121,78.94722,73.68273,73.68273,0,0,0-64.8495,94.42181l24.35933,82.19721c-38.24017-7.54492-62.79677,16.18358-68.11512,21.84764a73.6791,73.6791,0,0,0,3.19921,104.19329l91.36509,85.9765A154.164,154.164,0,0,0,220.62279,512h107.4549A127.30079,127.30079,0,0,0,452.3392,413.86139l57.623-241.96272A73.20274,73.20274,0,0,0,501.03053,116.17605Zm-37.7597,44.60544L405.64788,402.74812a79.46616,79.46616,0,0,1-77.57019,61.25972H220.62279a106.34052,106.34052,0,0,1-73.1366-28.998l-91.369-85.98041C31.34381,325.72669,66.61133,288.131,91.39644,311.5392l51.123,48.10739c5.42577,5.10937,13.48239.71679,13.48239-5.82617a246.79914,246.79914,0,0,0-10.17771-70.1523l-36.01362-121.539c-9.7324-32.88279,39.69916-47.27145,49.38664-14.625l31.3437,105.77923c5.59374,18.90428,33.78119,10.71288,28.9648-8.00781L177.06427,80.23662c-8.50389-33.1035,41.43157-45.64646,49.86515-12.83593l47.32609,184.035c4.42773,17.24218,29.16207,16.5039,32.71089-.80468l31.791-154.9706c6.81054-33.1074,57.51748-24.10741,50.11906,11.96288L360.32764,246.78924c-3.72265,18.10936,23.66793,24.63084,28.05659,6.21679L413.185,148.85962C421.1498,115.512,471.14,127.79713,463.27083,160.78149Z" />
          </svg>
          <span>Spock</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {!contractAddress ? (
          <ButtonComponent call={deploy} isSendingTx={isSendingTx} text="Start Game" sendingText="Deploying contract..." />
        ) : (
          <ButtonComponent call={play} isSendingTx={isSendingTx} text="Play Game" sendingText="Sending transaction..." />
        )}
        <div>Bet: {bet} ETH</div>
      </div>
    </div>
  );
}
