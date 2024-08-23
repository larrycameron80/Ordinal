import dotenv from "dotenv";
import { IRune } from "../types/types";

dotenv.config();

export const TEST_MODE = process.env.NETWORK == "testnet" ? true : false;
export const OPENAPI_UNISAT_URL = TEST_MODE
  ? "https://open-api-testnet.unisat.io"
  : "https://open-api.unisat.io";

export const OPENAPI_URL = TEST_MODE
  ? "https://api-testnet.unisat.io/wallet-v4"
  : "https://api.unisat.io/wallet-v4";

export const MEMPOOLAPI_URL = TEST_MODE
  ? "https://mempool.space/testnet/api"
  : "https://mempool.space/api/";

export const OPENAPI_UNISAT_TOKEN = process.env.UNISAT_TOKEN;
export const SIGNATURE_SIZE = 126;
// export const SERVICE_FEE_PERCENT = 3;
export const PAYMENT_ADDRESS: string = process.env.CARDINAL_ADDRESS as string;
export const PAYMENT_PUBKEY: string = process.env
  .CARDINAL_PUBLIC_KEY as string;
export const PAYMENT_PRIVATEKEY: string = process.env
  .CARDINAL_PRIVATE_KEY as string;
export const ORDINAL_ADDRESS: string = process.env.ORDINAL_ADDRESS as string;
export const ORDINAL_PUBKEY: string = process.env
  .ORDINAL_PUBLIC_KEY as string;
export const ORDINAL_PRIVATEKEY: string = process.env
  .ORDINAL_PRIVATE_KEY as string;

export const PLATFORM_FEE = (Number(process.env.FEE) || 0);

export enum WalletTypes {
  UNISAT = "Unisat",
  XVERSE = "Xverse",
  HIRO = "Hiro",
  OKX = "Okx",
}

export enum AddressType {
  P2WPKH = "p2wpkh",
  P2SH = "p2sh",
  P2TR = "p2tr",
  LEGACY = "legacy",
}

export enum TxType {
  SWAP = "swap",
  INSTANT_SWAP = "instant-swap",
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
  LIQUIDITY_ADD = "add-liquidity",
  LIQUIDITY_REMOVE = "remove-liquidity",
}

export enum TxStatus {
  CONFIRMED = "confirmed",
  UNCONFIRMED = "unconfirmed",
  PROCESSED = "processed",
}
