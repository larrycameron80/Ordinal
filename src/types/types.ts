export interface IUtxo {
  txid: string;
  vout: number;
  value: number;
  scriptpubkey?: string;
}

export interface IInscriptionInfo {
  inscriptionId: string;
  amount: number;
  ownerPaymentAddress: string;
  ownerOrdinalAddress: string;
}

export interface IRuneUtxo {
  txid: string;
  vout: number;
  value: number;
  scriptpubkey: string;
  amount: number;
  divisibility: number;
}

export enum AddressType {
  P2WPKH = "p2wpkh",
  P2SH = "p2sh",
  P2TR = "p2tr",
  LEGACY = "legacy",
}

export type CardinalAddress = {
  address: string;
  public_key: string;
};

export type OrdinalAddress = {
  address: string;
  public_key: string;
};

export type RuneUtxo = {
  txid: string;
  vout: string;
  value: string;
  amount: number;
};

export type IRune = {
  runeId: string,
  name: string,
  nick: string,
  symbol: string,
  divisibility: number
}
