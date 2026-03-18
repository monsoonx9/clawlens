export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidEthAddress(addr: string): boolean {
  if (!addr) return false;
  return ETH_ADDRESS_REGEX.test(addr);
}

export function isValidSolanaAddress(addr: string): boolean {
  if (!addr) return false;
  return SOLANA_ADDRESS_REGEX.test(addr);
}

export function isValidAddress(addr: string, chain: string): boolean {
  if (chain === "SOL" || chain === "SOLANA") {
    return isValidSolanaAddress(addr);
  }
  return isValidEthAddress(addr);
}

export function normalizeEthAddress(addr: string): string {
  return addr.toLowerCase();
}
