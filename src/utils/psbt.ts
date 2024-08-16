import * as Bitcoin from "bitcoinjs-lib";

import ecc from "@bitcoinerlab/secp256k1";
import axios from "axios";
import {
  TEST_MODE,
  OPENAPI_UNISAT_URL,
  OPENAPI_UNISAT_TOKEN,
  SIGNATURE_SIZE,
  PAYMENT_ADDRESS,
  PAYMENT_PRIVATEKEY,
  PAYMENT_PUBKEY,
} from "../config/config";
import { IUtxo } from "../types/types";

import {
  calculateTxFee,
  getBtcUtxoByAddress,
  getRuneUtxoByAddress,
  getFeeRate,
  pushRawTx,
} from "../service/psbt.service";
import { RuneId, Runestone, none } from "runelib";
import { WIFWallet } from "./WIFWallet";
import { tweakSigner } from "../service/localWallet";
import { getSplitedRune } from "./mempool";
import { calcPlatformFee } from "./pool";
import { WalletTypes } from "../config/config";
import { delay } from "./transfer";

Bitcoin.initEccLib(ecc);
const network = TEST_MODE ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin;
const toXOnly = (pubkey: Buffer): Buffer => {
  return pubkey.subarray(1, 33);
};
const RunexWallet = new WIFWallet({
  networkType: TEST_MODE ? "testnet" : "mainnet",
  privateKey: process.env.CARDINAL_PRIVATE_KEY as string,
});

const keyPair = RunexWallet.ecPair;
const tweakedSigner = tweakSigner(keyPair, { network });

const p2pktr = Bitcoin.payments.p2tr({
  pubkey: toXOnly(tweakedSigner.publicKey),
  network,
});
// Calc fee of psbt BTC from platform to User
export const calcFeeSendBtcFromUser = async (
  amount: number,
  btcUtxos: any,
  walletType: string
) => {
  const senderAddress = PAYMENT_ADDRESS;
  const senderPubkey = PAYMENT_PUBKEY;
  const receiverAddress = PAYMENT_ADDRESS;

  const feeRate = await getFeeRate();

  let fee = 1000;
  let tempAmount = 0;
  while (1) {
    tempAmount = 0;
    const psbt = new Bitcoin.Psbt({ network: network });
    console.log("Calc exact fee =>", fee);
    for (const utxo of btcUtxos) {
      if (tempAmount < amount + fee && utxo.value > 1000) {
        tempAmount += utxo.value;
        console.log(utxo.scriptpubkey);
        console.log(keyPair.publicKey.subarray(1, 33));

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: RunexWallet.output,
          },
          tapInternalKey: Buffer.from(RunexWallet.publicKey, "hex").subarray(
            1,
            33
          ),
        });
      }
    }

    psbt.addOutput({
      address: receiverAddress,
      value: amount,
    });

    psbt.addOutput({
      address: senderAddress as string,
      value: tempAmount - amount - fee,
    });

    const tweakedChildNode = keyPair.tweak(
      Bitcoin.crypto.taggedHash("TapTweak", keyPair.publicKey.subarray(1, 33))
    );

    for (let i = 0; i < psbt.inputCount; i++) {
      psbt.signInput(i, tweakedChildNode);
      psbt.validateSignaturesOfInput(i, () => true);
      psbt.finalizeInput(i);
    }

    const tx = psbt.extractTransaction();

    const estimateFee = tx.virtualSize() * feeRate * 2;

    console.log("Calc exact estimateFee =>", estimateFee);

    if (fee == estimateFee) {
      fee = estimateFee;
      break;
    } else {
      fee = estimateFee;
      continue;
    }
  }

  return fee;
};
// Send Btc from user to platform
export const generateSendBtcFromUser = async (
  senderAddress: string,
  senderPubkey: string,
  receiverAddress: string,
  amount: number,
  walletType: string
) => {
  const psbt = new Bitcoin.Psbt({ network: network });

  await delay(15000);
  amount *= 10 ** 8;
  const btcUtxos = await getBtcUtxoByAddress(senderAddress as string);

  let fee = await calcFeeSendBtcFromUser(amount, btcUtxos, walletType);

  let tempAmount = 0;
  const signIndexes: number[] = [];
  for (const utxo of btcUtxos) {
    if (tempAmount < amount + fee && utxo.value > 1000) {
      tempAmount += utxo.value;
      signIndexes.push(psbt.inputCount);

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        tapInternalKey: Buffer.from(senderPubkey, "hex").slice(1, 33),
        witnessUtxo: {
          value: utxo.value,
          script: Buffer.from(utxo.scriptpubkey as string, "hex"),
        },
        sighashType: Bitcoin.Transaction.SIGHASH_ALL,
      });
    }
  }

  psbt.addOutput({
    address: receiverAddress,
    value: amount,
  });

  psbt.addOutput({
    address: senderAddress,
    value: tempAmount - amount - fee,
  });

  return {
    psbt,
    signIndexes,
  };
};

export const generateSendBtcToUser = async (
  receiverAddress: string,
  amount: number,
  receiverWalletType: string
) => {

};
