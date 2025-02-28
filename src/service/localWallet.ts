import * as bitcoin from "bitcoinjs-lib";
import { isTaprootInput } from "bitcoinjs-lib/src/psbt/bip371.js";
import ecc from "@bitcoinerlab/secp256k1";
bitcoin.initEccLib(ecc);
import { ECPairFactory } from "ecpair";
const ECPair = ECPairFactory(ecc);

export const toXOnly = (pubKey: string) =>
  pubKey.length == 32 ? pubKey : pubKey.slice(1, 33);

function tapTweakHash(pubKey: string, h: any) {
  return bitcoin.crypto.taggedHash(
    "TapTweak",
    Buffer.concat(h ? [pubKey, h] : [pubKey])
  );
}

export const tweakSigner = (signer: any, opts: any) => {
  if (opts == null) opts = {};
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  //here set tewakSinger for tapscript
};

export function toPsbtNetwork(networkType: number) {
  return bitcoin.networks.bitcoin;
}

export function publicKeyToPayment(
  publicKey: string,
  type: number,
  networkType: any
) {
  const network = toPsbtNetwork(networkType);
  if (!publicKey) return null;
  const pubkey = Buffer.from(publicKey, "hex");
  if (type == 0) {
    return bitcoin.payments.p2pkh({
      pubkey,
      network,
    });
  } else if (type == 1 || type == 4) {
    return bitcoin.payments.p2wpkh({
      pubkey,
      network,
    });
  } else if (type == 2 || type == 5) {
    return bitcoin.payments.p2tr({
      internalPubkey: pubkey.slice(1, 33),
      network,
    });
  } else if (type == 3) {
    const data = bitcoin.payments.p2wpkh({
      pubkey,
      network,
    });
    return bitcoin.payments.p2sh({
      pubkey,
      network,
      redeem: data,
    });
  }
}

export function publicKeyToAddress(
  publicKey: string,
  type: number,
  networkType: any
) {
  const payment = publicKeyToPayment(publicKey, type, networkType);
  if (payment && payment.address) {
    return payment.address;
  } else {
    return "";
  }
}

export function publicKeyToScriptPk(
  publicKey: string,
  type: number,
  networkType: any
) {
  const payment = publicKeyToPayment(publicKey, type, networkType);
  return payment?.output?.toString("hex");
}

export function randomWIF(networkType = 1) {
  const network = toPsbtNetwork(networkType);
  const keyPair = ECPair.makeRandom({ network });
  return keyPair.toWIF();
}

export class LocalWallet {
  keyPair;
  address;
  pubkey;
  network;
  constructor(wif: string, networkType = 1, addressType = 2) {
    if (typeof wif !== "string") {
      throw new Error("WIF must be a string");
    }
    const network = toPsbtNetwork(networkType);
    const keyPair = ECPair.fromWIF(wif, network);
    this.keyPair = keyPair;
    this.pubkey = keyPair.publicKey.toString("hex");
    this.address = publicKeyToAddress(this.pubkey, addressType, networkType);
    this.network = network;
  }

  async signPsbt(psbt: bitcoin.Psbt, opts?: any) {
    const _opts = opts || {
      autoFinalized: true,
    };
   // set singpsbt
  }

  getPublicKey() {
    return this.keyPair.publicKey.toString("hex");
  }
}
