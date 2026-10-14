"use client";

// Sends the learner's badge claim from their own wallet. The server signs a
// voucher (what they've earned); the wallet sends claim() with it to the
// LearningBadges contract and pays its own gas. Works with a WalletConnect
// connection (via wagmi) or a browser-extension wallet (window.ethereum).
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  type Chain,
  type EIP1193Provider,
  type Hex,
} from "viem";
import { base, baseSepolia, sepolia } from "viem/chains";
import type { ClaimVoucher } from "@/lib/api";

const CHAINS: Record<number, Chain> = { [base.id]: base, [sepolia.id]: sepolia, [baseSepolia.id]: baseSepolia };

const CLAIM_ABI = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "moduleIds", type: "uint256[]" },
      { name: "capstone", type: "bool" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  // the contract's errors, so a failed claim names its reason
  { type: "error", name: "VoucherExpired", inputs: [] },
  { type: "error", name: "InvalidVoucher", inputs: [] },
  { type: "error", name: "NothingToClaim", inputs: [] },
  { type: "error", name: "InvalidModule", inputs: [] },
  { type: "error", name: "EnforcedPause", inputs: [] },
] as const;

type InjectedProvider = EIP1193Provider & { providers?: InjectedProvider[] };

/** Thrown with a message that's safe to show the learner. */
export class ClaimError extends Error {}

async function accountsOf(provider: EIP1193Provider, ask: boolean): Promise<string[]> {
  const list = (await provider.request({ method: ask ? "eth_requestAccounts" : "eth_accounts" })) as string[];
  return (list ?? []).map((a) => a.toLowerCase());
}

/**
 * The wallet provider holding the learner's linked address: the wagmi
 * connector's when it's connected to that address, otherwise whichever
 * browser-extension provider has it.
 */
export async function findLearnerProvider(
  learner: string,
  wagmi?: { address?: string; getProvider?: () => Promise<unknown> }
): Promise<EIP1193Provider> {
  const want = learner.toLowerCase();
  if (wagmi?.address?.toLowerCase() === want && wagmi.getProvider) {
    return (await wagmi.getProvider()) as EIP1193Provider;
  }
  const eth = (typeof window !== "undefined" ? (window as { ethereum?: InjectedProvider }).ethereum : undefined) ?? null;
  const candidates = eth ? (eth.providers?.length ? eth.providers : [eth]) : [];
  for (const p of candidates) {
    try {
      if ((await accountsOf(p, false)).includes(want)) return p;
    } catch {
      // a provider that doesn't answer: try the next
    }
  }
  if (candidates[0]) return candidates[0];
  throw new ClaimError("Open the wallet you linked to Si Her DeFi to claim your badges.");
}

/** Moves the wallet to the contract's network, adding the network first if the wallet doesn't know it. */
async function ensureChain(provider: EIP1193Provider, chain: Chain) {
  const current = Number(await provider.request({ method: "eth_chainId" }));
  if (current === chain.id) return;
  const hexId = `0x${chain.id.toString(16)}` as Hex;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (e) {
    if ((e as { code?: number })?.code !== 4902) throw e;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.default.http as unknown as string[],
          blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
        },
      ],
    });
  }
}

/** A message the learner can act on, from a wallet / RPC error. */
export function claimErrorMessage(e: unknown): string {
  if (e instanceof ClaimError) return e.message;
  const err = e as { code?: number; shortMessage?: string; message?: string; cause?: { code?: number } };
  const code = err?.code ?? err?.cause?.code;
  // the contract's own error name (VoucherExpired, …), decoded by viem from the revert
  const reverted =
    e instanceof BaseError ? (e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null) : null;
  const text = `${reverted?.data?.errorName ?? ""} ${err?.shortMessage ?? ""} ${err?.message ?? ""}`;
  if (code === 4001 || /user rejected|denied/i.test(text)) return "You declined the request in your wallet. Nothing was claimed.";
  if (/insufficient funds/i.test(text)) return "Your wallet doesn't have enough ETH to pay the network fee for this claim.";
  if (/InvalidVoucher|VoucherExpired/i.test(text)) return "The claim expired. Please try again.";
  if (/NothingToClaim/i.test(text)) return "Everything you've earned is already in your wallet.";
  if (/EnforcedPause/i.test(text)) return "Badge claiming is paused right now. Please try again later.";
  // reverted, but the node didn't say why: the voucher is most likely stale
  if (reverted) return "The claim was rejected by the contract. Please start the claim again.";
  return err?.shortMessage || "Your wallet couldn't send the claim. Please try again.";
}

/**
 * Sends claim() from the learner's wallet and returns the transaction hash as
 * soon as the wallet has sent it (confirmation is checked by the server).
 */
export async function sendClaim(provider: EIP1193Provider, voucher: ClaimVoucher): Promise<Hex> {
  const chain = CHAINS[voucher.chainId];
  if (!chain) throw new ClaimError("This network isn't supported for claiming yet.");
  const learner = getAddress(voucher.learner);

  const accounts = await accountsOf(provider, true);
  if (!accounts.includes(learner.toLowerCase())) {
    throw new ClaimError(
      `Switch your wallet to the account you linked (${learner.slice(0, 6)}…${learner.slice(-4)}). Badges can only be claimed to it.`
    );
  }
  await ensureChain(provider, chain);

  const call = {
    address: getAddress(voucher.contract),
    abi: CLAIM_ABI,
    functionName: "claim" as const,
    args: [voucher.moduleIds.map(BigInt), voucher.capstone, BigInt(voucher.deadline), voucher.signature as Hex] as const,
    account: learner,
  };
  // Estimate first: a bad voucher fails here with a clear reason, before the
  // wallet prompt, and the gas limit never depends on the wallet's own default
  const reader = createPublicClient({ chain, transport: custom(provider) });
  const gas = await reader.estimateContractGas(call);
  const wallet = createWalletClient({ account: learner, chain, transport: custom(provider) });
  return wallet.writeContract({ ...call, chain, gas: (gas * BigInt(12)) / BigInt(10) });
}
