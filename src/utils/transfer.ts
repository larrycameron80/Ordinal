import * as Bitcoin from "bitcoinjs-lib";

import ecc from "@bitcoinerlab/secp256k1";
import axios from "axios";
import {
  TEST_MODE,
  OPENAPI_UNISAT_URL,
  OPENAPI_UNISAT_TOKEN,
  SIGNATURE_SIZE,
} from "../config/config";
import { WalletTypes } from "../config/config";
import { IUtxo } from "../types/types";
import {
  PAYMENT_ADDRESS,
  PAYMENT_PRIVATEKEY,
  PAYMENT_PUBKEY,
} from "../config/config";
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
import { getSplitedRune, getUtxosByTxId } from "./mempool";
import { calcPlatformFee } from "./pool";
const RUNEX_RUNE_ID = "";

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
export const calcSendBTCFee = async (amount: number, btcUtxos: any) => {
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
        console.log(utxo.scriptpubkey)
        console.log(keyPair.publicKey.subarray(1, 33))

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: RunexWallet.output,
          },
          tapInternalKey: Buffer.from(RunexWallet.publicKey, "hex").subarray(1, 33),
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
}

export const signAndSend = async (
  keyPair: Bitcoin.Signer,
  psbt: Bitcoin.Psbt
) => {
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();
  const tx = psbt.extractTransaction();
  const txId = await pushRawTx(tx.toHex());
  return txId;
};

export const sendBtc = async (address: string, amount: number) => {
  // const psbt = await generateSendBTCPSBT(
  //   PAYMENT_ADDRESS,
  //   PAYMENT_PUBKEY,
  //   address,
  //   amount
  // );

  // const txId = await signAndSend(tweakedSigner, psbt);
  // return txId;
};

export const sendRune = async (
  address: string,
  amount: number,
  runeId: string
) => {
  // const psbt = await generateSendRunePSBT(
  //   PAYMENT_ADDRESS,
  //   PAYMENT_PUBKEY,
  //   amount,
  //   address,
  //   runeId
  // );

  // const txId = await signAndSend(tweakedSigner, psbt.psbt);

  // return txId;
};

// // Send BTC from Platform to User
// export const generateSendBTCPSBT = async (
//   senderAddress: string,
//   senderPubkey: string,
//   receiverAddress: string,
//   amount: number
// ) => {
//   await delay(15000);

//   amount *= 10 ** 8;
//   const psbt = new Bitcoin.Psbt({ network: network });
//   const btcUtxos = await getBtcUtxoByAddress(senderAddress as string);

//   let fee = await calcSendBTCFee(amount, btcUtxos);

//   let tempAmount = 0;

//   for (const utxo of btcUtxos) {
//     if (tempAmount < amount + fee && utxo.value > 1000) {
//       tempAmount += utxo.value;

//       psbt.addInput({
//         hash: utxo.txid,
//         index: utxo.vout,
//         witnessUtxo: {
//           value: utxo.value,
//           script: Buffer.from(utxo.scriptpubkey as string, "hex"),
//         },
//         tapInternalKey: Buffer.from(senderPubkey, "hex").slice(1, 33),
//         sighashType: Bitcoin.Transaction.SIGHASH_ALL,
//       });
//     }
//   }
//   psbt.addOutput({
//     address: receiverAddress,
//     value: amount,
//   });

//   psbt.addOutput({
//     address: senderAddress as string,
//     value: tempAmount - amount - fee,
//   });

//   return psbt;
// };

// export const generateSendRunePSBT = async (
//   senderPaymentAddress: string,
//   senderPaymnetPubKey: string,
//   senderOrdinalAddress: string,
//   senderOrdinalPubkey: string,
//   amount: number,
//   receiverOrdinalAddress: string,
//   runeId: string
// ) => {
//   await delay(15000);

//   console.log("log sender =>", senderPaymentAddress, senderPaymnetPubKey, senderOrdinalAddress, senderOrdinalPubkey, amount, receiverOrdinalAddress, runeId);
//   const btcUtxos = await getBtcUtxoByAddress(senderPaymentAddress);
//   const runeUtxos = await getRuneUtxoByAddress(senderOrdinalAddress, runeId);

//   const senderSignIndexes: number[] = [];

//   if (runeUtxos.tokenSum < amount) {
//     throw "Invalid Amount";
//   }

//   const runeBlockNumber = parseInt(runeId.split(":")[0]);
//   const runeTxout = parseInt(runeId.split(":")[1]);

//   const psbt = new Bitcoin.Psbt({ network: network });

//   const edicts: any = [];

//   let tokenSum = 0;

//   for (const runeutxo of runeUtxos.runeUtxos) {
//     if (tokenSum < amount) {

//       senderSignIndexes.push(psbt.inputCount);
//       psbt.addInput({
//         hash: runeutxo.txid,
//         index: runeutxo.vout,
//         tapInternalKey: Buffer.from(senderPaymnetPubKey as string, "hex").slice(1, 33),
//         witnessUtxo: {
//           value: runeutxo.value,
//           script: Buffer.from(runeutxo.scriptpubkey as string, "hex"),
//         },
//       });
//       tokenSum += runeutxo.amount;
//     }
//   }
//   edicts.push({
//     id: new RuneId(runeBlockNumber, runeTxout),
//     amount: amount,
//     output: 2,
//   });
//   edicts.push({
//     id: new RuneId(runeBlockNumber, runeTxout),
//     amount: tokenSum - amount,
//     output: 1,
//   });
//   const mintstone = new Runestone(edicts, none(), none(), none());

//   psbt.addOutput({
//     script: mintstone.encipher(),
//     value: 0,
//   });

//   psbt.addOutput({
//     address: senderOrdinalAddress,
//     value: 546,
//   });

//   psbt.addOutput({
//     address: receiverOrdinalAddress,
//     value: 546,
//   });

//   let totalBtcAmount = 0;

//   const feeRate = await getFeeRate();
//   for (const btcutxo of btcUtxos) {
//     const fee = calculateTxFee(psbt, feeRate);
//     if (totalBtcAmount < fee && btcutxo.value > 1000) {
//       totalBtcAmount += btcutxo.value;
//       senderSignIndexes.push(psbt.inputCount);
//       psbt.addInput({
//         hash: btcutxo.txid,
//         index: btcutxo.vout,
//         tapInternalKey: Buffer.from(senderPaymnetPubKey, "hex").slice(1, 33),
//         witnessUtxo: {
//           script: Buffer.from(btcutxo.scriptpubkey as string, "hex"),
//           value: btcutxo.value,
//         },
//       });
//     }
//   }

//   const fee = calculateTxFee(psbt, feeRate);

//   if (totalBtcAmount < fee) throw "Btc balance is not enough";

//   psbt.addOutput({
//     address: senderPaymentAddress,
//     value: totalBtcAmount - fee,
//   });

//   return psbt;
// };

// export const generateSplitRunePSBT = async (
//   senderAddress: string,
//   senderPubKey: string,
//   amount: number,
//   runeId: string
// ) => {
//   await delay(15000);
//   console.log("log split rune ", senderAddress, senderPubKey, amount, runeId);
//   const btcUtxos = await getBtcUtxoByAddress(senderAddress);

//   console.log('before Splitting => ', btcUtxos);

//   const runeUtxos = await getRuneUtxoByAddress(senderAddress, runeId);

//   const senderSignIndexes: number[] = [];

//   if (runeUtxos.tokenSum < amount) {
//     throw "Invalid Amount";
//   }

//   const runeBlockNumber = parseInt(runeId.split(":")[0]);
//   const runeTxout = parseInt(runeId.split(":")[1]);

//   const psbt = new Bitcoin.Psbt({ network: network });

//   const edicts: any = [];

//   let tokenSum = 0;

//   for (const runeutxo of runeUtxos.runeUtxos) {
//     if (tokenSum < amount) {

//       senderSignIndexes.push(psbt.inputCount);
//       psbt.addInput({
//         hash: runeutxo.txid,
//         index: runeutxo.vout,
//         tapInternalKey: Buffer.from(senderPubKey as string, "hex").slice(1, 33),
//         witnessUtxo: {
//           value: runeutxo.value,
//           script: Buffer.from(runeutxo.scriptpubkey as string, "hex"),
//         },
//       });
//       tokenSum += runeutxo.amount;
//     }
//   }
//   edicts.push({
//     id: new RuneId(runeBlockNumber, runeTxout),
//     amount: amount,
//     output: 2,
//   });
//   edicts.push({
//     id: new RuneId(runeBlockNumber, runeTxout),
//     amount: tokenSum - amount,
//     output: 1,
//   });
//   const mintstone = new Runestone(edicts, none(), none(), none());

//   psbt.addOutput({
//     script: mintstone.encipher(),
//     value: 0,
//   });

//   psbt.addOutput({
//     address: senderAddress,
//     value: 546,
//   });

//   psbt.addOutput({
//     address: senderAddress,
//     value: 546,
//   });

//   let totalBtcAmount = 0;

//   const feeRate = Math.max(await getFeeRate(), 150);
//   for (const btcutxo of btcUtxos) {
//     const fee = calculateTxFee(psbt, feeRate);
//     if (totalBtcAmount < fee && btcutxo.value > 10000) {
//       totalBtcAmount += btcutxo.value;
//       senderSignIndexes.push(psbt.inputCount);
//       psbt.addInput({
//         hash: btcutxo.txid,
//         index: btcutxo.vout,
//         tapInternalKey: Buffer.from(senderPubKey, "hex").slice(1, 33),
//         witnessUtxo: {
//           script: Buffer.from(btcutxo.scriptpubkey as string, "hex"),
//           value: btcutxo.value,
//         },
//       });
//     }
//   }

//   const fee = calculateTxFee(psbt, feeRate);

//   if (totalBtcAmount < fee) throw "Btc balance is not enough";

//   psbt.addOutput({
//     address: senderAddress,
//     value: totalBtcAmount - fee,
//   });

//   return {
//     psbt: psbt,
//     senderSignIndexes,
//   };
// };

// export const generateSendSplitedRunePSBT = async (
//   senderAddress: string,
//   senderPubKey: string,
//   amount: number,
//   txId: string,
//   receiverAddress: string,
// ) => {
//   await delay(15000);
//   const btcUtxos = await getBtcUtxoByAddress(senderAddress);

//   console.log("after Splitting => ", btcUtxos)

//   const senderSignIndexes: number[] = [];
//   const spliedRune = await getSplitedRune(txId);

//   const psbt = new Bitcoin.Psbt({ network: network });

//   senderSignIndexes.push(psbt.inputCount);


//   psbt.addInput({
//     hash: txId,
//     index: 2,
//     tapInternalKey: Buffer.from(senderPubKey as string, "hex").slice(1, 33),
//     witnessUtxo: {
//       value: 546,
//       script: Buffer.from(spliedRune.scriptpubkey as string, "hex"),
//     },
//   });

//   psbt.addOutput({
//     address: receiverAddress,
//     value: 546,
//   });

//   let totalBtcAmount = 0;

//   const feeRate = Math.max(await getFeeRate(), 150);
//   for (const btcutxo of btcUtxos) {
//     const fee = calculateTxFee(psbt, feeRate);
//     if (totalBtcAmount < fee && btcutxo.value > 10000) {
//       totalBtcAmount += btcutxo.value;
//       senderSignIndexes.push(psbt.inputCount);
//       psbt.addInput({
//         hash: btcutxo.txid,
//         index: btcutxo.vout,
//         tapInternalKey: Buffer.from(senderPubKey, "hex").slice(1, 33),
//         witnessUtxo: {
//           script: Buffer.from(btcutxo.scriptpubkey as string, "hex"),
//           value: btcutxo.value,
//         },
//       });
//     }
//   }

//   const fee = calculateTxFee(psbt, feeRate);

//   if (totalBtcAmount < fee) throw "Btc balance is not enough";

//   psbt.addOutput({
//     address: senderAddress,
//     value: totalBtcAmount - fee,
//   });

//   return {
//     psbt: psbt,
//     senderSignIndexes,
//   };
// }

