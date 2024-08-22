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
  ORDINAL_ADDRESS,
  ORDINAL_PUBKEY,
} from "../config/config";
import { IUtxo } from "../types/types";

import {
  getBtcUtxoByAddress,
  getRuneUtxoByAddress,
  getFeeRate,
  pushRawTx,
} from "../service/psbt.service";
import { RuneId, Runestone, none } from "runelib";
import { WIFWallet } from "./WIFWallet";
import { tweakSigner } from "../service/localWallet";
import { getUtxosByTxId } from "./mempool";
import { WalletTypes } from "../config/config";

import {
  getUnconfirmedRuneUtxos,
} from "../controller/utxo.controller";

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

  const feeRate = (await getFeeRate() + 20);

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

    const estimateFee = tx.virtualSize() * feeRate;

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
    psbt: psbt.toHex(),
    signIndexes,
  };
};

export const calcFeeSendBtcToUser = async (
  amount: number,
  btcUtxos: any,
  walletType: string
) => {
  const senderAddress = PAYMENT_ADDRESS;
  const senderPubkey = PAYMENT_PUBKEY;
  const receiverAddress = PAYMENT_ADDRESS;

  const feeRate = (await getFeeRate() + 20);

  let fee = 1000;
  let tempAmount = 0;
  while (1) {
    tempAmount = 0;
    const psbt = new Bitcoin.Psbt({ network: network });

    for (const utxo of btcUtxos) {
      if (tempAmount < amount && utxo.value > 1000) {
        tempAmount += utxo.value;

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
      value: amount - fee,
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

export const generateSendBtcToUser = async (
  receiverAddress: string,
  amount: number,
  receiverWalletType: string
) => {
  delay(1500);
  const senderAddress = PAYMENT_ADDRESS;
  const senderPubkey = PAYMENT_PUBKEY;
  const psbt = new Bitcoin.Psbt({ network: network });
  const btcUtxos = await getBtcUtxoByAddress(senderAddress);

  let tempAmount = 0;
  let fee = await calcFeeSendBtcToUser(amount, btcUtxos, receiverWalletType);
  console.log("fee =>", fee, tempAmount, amount);

  const signIndexes: number[] = [];
  for (const utxo of btcUtxos) {
    if (tempAmount < amount && utxo.value > 1000) {
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
        // sighashType: Bitcoin.Transaction.SIGHASH_ALL,
      });
    }
  }
  console.log("fee =>", fee, tempAmount, amount);

  console.log("psbt =>", psbt, receiverAddress);

  psbt.addOutput({
    address: receiverAddress,
    value: amount - fee,
  });

  psbt.addOutput({
    address: senderAddress,
    value: tempAmount - amount,
  });

  console.log("psbt =>", psbt);

  return {
    psbt,
    signIndexes,
  };
};

export const calcFeeSendRuneFromUser = async (
  amount: number,
  runeId: string,
  walletType: string,
  btcUtxos: any,
  runeUtxos: any
) => {
  const senderPaymentAddress = PAYMENT_ADDRESS;
  const senderPaymnetPubKey = PAYMENT_PUBKEY;
  const senderOrdinalAddress = ORDINAL_ADDRESS;
  const senderOrdinalPubkey = ORDINAL_PUBKEY;
  const receiverOrdinalAddress = ORDINAL_ADDRESS;

  const runeAmount = amount;
  if (runeUtxos.tokenSum < amount) {
    throw "Invalid Amount";
  }

  const runeBlockNumber = parseInt(runeId.split(":")[0]);
  const runeTxout = parseInt(runeId.split(":")[1]);
  let fee = 1000;

  while (1) {
    const psbt = new Bitcoin.Psbt({ network: network });

    const edicts: any = [];

    let tokenSum = 0;

    console.log("Calc fee", runeId, runeAmount, tokenSum);

    for (const runeutxo of runeUtxos.runeUtxos) {
      if (tokenSum < runeAmount) {
        psbt.addInput({
          hash: runeutxo.txid,
          index: runeutxo.vout,
          tapInternalKey: Buffer.from(
            senderOrdinalPubkey as string,
            "hex"
          ).slice(1, 33),
          witnessUtxo: {
            value: runeutxo.value,
            script: RunexWallet.output,
          },
        });
        tokenSum += runeutxo.amount;
      }
    }

    edicts.push({
      id: new RuneId(runeBlockNumber, runeTxout),
      amount: runeAmount,
      output: 2,
    });

    edicts.push({
      id: new RuneId(runeBlockNumber, runeTxout),
      amount: tokenSum - runeAmount,
      output: 1,
    });

    console.log("Calc fee", runeAmount, tokenSum, edicts);

    const mintstone = new Runestone(edicts, none(), none(), none());

    psbt.addOutput({
      script: mintstone.encipher(),
      value: 0,
    });

    psbt.addOutput({
      address: senderOrdinalAddress,
      value: 546,
    });

    psbt.addOutput({
      address: receiverOrdinalAddress,
      value: 546,
    });

    let totalBtcAmount = 0;

    const feeRate = await getFeeRate();
    console.log("Calc fee", feeRate, runeAmount, tokenSum, edicts);

    totalBtcAmount = 0;
    for (const btcutxo of btcUtxos) {
      if (totalBtcAmount < fee && btcutxo.value > 1000) {
        totalBtcAmount += btcutxo.value;
        psbt.addInput({
          hash: btcutxo.txid,
          index: btcutxo.vout,
          tapInternalKey: Buffer.from(senderPaymnetPubKey, "hex").slice(1, 33),
          witnessUtxo: {
            script: RunexWallet.output,
            value: btcutxo.value,
          },
        });
      }
    }

    psbt.addOutput({
      address: senderPaymentAddress,
      value: totalBtcAmount - fee,
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

    const estimateFee = tx.virtualSize() * (feeRate + 30);

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
export const generateSendRuneFromUser = async (
  senderPaymentAddress: string,
  senderPaymnetPubKey: string,
  senderOrdinalAddress: string,
  senderOrdinalPubkey: string,
  amount: number,
  receiverOrdinalAddress: string,
  runeId: string,
  walletType: string
) => {
  await delay(1500);

  console.log(
    senderPaymentAddress,
    senderPaymnetPubKey,
    senderOrdinalAddress,
    senderOrdinalPubkey,
    amount,
    receiverOrdinalAddress,
    runeId,
    walletType
  );

  const btcUtxos = await getBtcUtxoByAddress(senderPaymentAddress);
  const runeUtxos = await getRuneUtxoByAddress(senderOrdinalAddress, runeId);

  const paymentSignIndexs: number[] = [];
  const ordinalSignIndexs: number[] = [];

  const runeAmount = amount;

  if (runeUtxos.tokenSum < runeAmount) {
    throw "Invalid Amount";
  }

  const runeBlockNumber = parseInt(runeId.split(":")[0]);
  const runeTxout = parseInt(runeId.split(":")[1]);

  const psbt = new Bitcoin.Psbt({ network: network });

  const edicts: any = [];

  let tokenSum = 0;

  for (const runeutxo of runeUtxos.runeUtxos) {
    if (tokenSum < runeAmount) {
      ordinalSignIndexs.push(psbt.inputCount);
      psbt.addInput({
        hash: runeutxo.txid,
        index: runeutxo.vout,
        tapInternalKey: Buffer.from(senderOrdinalPubkey as string, "hex").slice(
          1,
          33
        ),
        witnessUtxo: {
          value: runeutxo.value,
          script: Buffer.from(runeutxo.scriptpubkey as string, "hex"),
        },
      });
      tokenSum += runeutxo.amount;
    }
  }

  edicts.push({
    id: new RuneId(runeBlockNumber, runeTxout),
    amount: runeAmount,
    output: 2,
  });

  edicts.push({
    id: new RuneId(runeBlockNumber, runeTxout),
    amount: tokenSum - runeAmount,
    output: 1,
  });

  const mintstone = new Runestone(edicts, none(), none(), none());

  psbt.addOutput({
    script: mintstone.encipher(),
    value: 0,
  });

  psbt.addOutput({
    address: senderOrdinalAddress,
    value: 546,
  });

  psbt.addOutput({
    address: receiverOrdinalAddress,
    value: 546,
  });

  const fee = await calcFeeSendRuneFromUser(
    amount,
    runeId,
    walletType,
    btcUtxos,
    runeUtxos
  );

  let totalBtcAmount = 0;

  console.log("senderPayment pubkey =>", senderPaymnetPubKey);

  for (const btcutxo of btcUtxos) {
    if (totalBtcAmount < fee && btcutxo.value > 10000) {
      totalBtcAmount += btcutxo.value;
      paymentSignIndexs.push(psbt.inputCount);
      psbt.addInput({
        hash: btcutxo.txid,
        index: btcutxo.vout,
        tapInternalKey: Buffer.from(senderPaymnetPubKey, "hex").slice(1, 33),
        witnessUtxo: {
          script: Buffer.from(btcutxo.scriptpubkey as string, "hex"),
          value: btcutxo.value,
        },
      });
    }
  }

  if (totalBtcAmount < fee) throw "Btc balance is not enough";

  psbt.addOutput({
    address: senderPaymentAddress,
    value: totalBtcAmount - fee,
  });

  return {
    psbt: psbt.toHex(),
    paymentSignIndexs,
    ordinalSignIndexs,
  };
};

export const calcFeeSendRuneToUser = async (
  amount: number,
  runeId: string,
  btcUtxos: any,
  runeUtxos: any,
  unconfirmedRuneUtxos: any
) => {

  const senderPaymentAddress = PAYMENT_ADDRESS;
  const senderPaymnetPubKey = PAYMENT_PUBKEY;
  const senderOrdinalAddress = ORDINAL_ADDRESS;
  const senderOrdinalPubkey = ORDINAL_PUBKEY;
  const receiverOrdinalAddress = ORDINAL_ADDRESS;
  const runeAmount = amount;

  const runeBlockNumber = parseInt(runeId.split(":")[0]);
  const runeTxout = parseInt(runeId.split(":")[1]);

  let fee = 1000;

  while (1) {
    const psbt = new Bitcoin.Psbt({ network: network });

    console.log("fee", psbt)

    let tokenSum = 0;
    const edicts: any = [];
    for (const runeutxo of unconfirmedRuneUtxos) {
      if (tokenSum < runeAmount) {
        psbt.addInput({
          hash: runeutxo.txid,
          index: runeutxo.vout,
          tapInternalKey: Buffer.from(
            senderOrdinalPubkey as string,
            "hex"
          ).slice(1, 33),
          witnessUtxo: {
            value: runeutxo.value,
            script: Buffer.from(runeutxo.scriptpubkey as string, "hex"),
          },
        });
        tokenSum += runeutxo.amount;
      }
    }

    if (tokenSum < runeAmount) {
      for (const runeutxo of runeUtxos) {
        if (tokenSum < runeAmount) {
          psbt.addInput({
            hash: runeutxo.txid,
            index: runeutxo.vout,
            tapInternalKey: Buffer.from(
              senderOrdinalPubkey as string,
              "hex"
            ).slice(1, 33),
            witnessUtxo: {
              value: runeutxo.value,
              script: Buffer.from(runeutxo.scriptpubkey as string, "hex"),
            },
          });
          tokenSum += runeutxo.amount;
        }
      }
    }

    edicts.push({
      id: new RuneId(runeBlockNumber, runeTxout),
      amount: runeAmount,
      output: 2,
    });
    edicts.push({
      id: new RuneId(runeBlockNumber, runeTxout),
      amount: tokenSum - runeAmount,
      output: 1,
    });
    const mintstone = new Runestone(edicts, none(), none(), none());

    psbt.addOutput({
      script: mintstone.encipher(),
      value: 0,
    });

    psbt.addOutput({
      address: receiverOrdinalAddress,
      value: 546,
    });

    psbt.addOutput({
      address: senderOrdinalAddress,
      value: 546,
    });

    let totalBtcAmount = 0;
    const feeRate = (await getFeeRate() + 20);

    for (const btcutxo of btcUtxos) {
      if (totalBtcAmount < fee && btcutxo.value > 1000) {
        totalBtcAmount += btcutxo.value;
        psbt.addInput({
          hash: btcutxo.txid,
          index: btcutxo.vout,
          tapInternalKey: Buffer.from(senderPaymnetPubKey, "hex").slice(1, 33),
          witnessUtxo: {
            script: RunexWallet.output,
            value: btcutxo.value,
          },
        });
      }
    }

    psbt.addOutput({
      address: senderPaymentAddress,
      value: totalBtcAmount - fee,
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

export const generateSendRuneToUser = async (
  receiverOrdinalAddress: string,
  amount: number,
  runeId: string,
  receiverWalletType: string
) => {
  const senderPaymentAddress = PAYMENT_ADDRESS;
  const senderPaymnetPubKey = PAYMENT_PUBKEY;
  const senderOrdinalAddress = ORDINAL_ADDRESS;
  const senderOrdinalPubkey = ORDINAL_PUBKEY;

  await delay(1500);

  const btcUtxos = await getBtcUtxoByAddress(senderPaymentAddress);

  let unconfirmedRuneUtxos: any = await getUnconfirmedRuneUtxos(runeId);
  let { runeUtxos, divisibility } = await getRuneUtxoByAddress(
    senderOrdinalAddress,
    runeId
  );

  const runeAmount = amount;
  if (unconfirmedRuneUtxos.length != 0) {
    runeUtxos = runeUtxos.filter((utxo: any) => {
      let temp = unconfirmedRuneUtxos.filter((x: any) => {
        return x.txId == utxo.txId && x.vout == utxo.vout;
      });
      return temp.length;
    });
  }

  const runeBlockNumber = parseInt(runeId.split(":")[0]);
  const runeTxout = parseInt(runeId.split(":")[1]);

  const psbt = new Bitcoin.Psbt({ network: network });

  let tokenSum = 0;
  const edicts: any = [];

  for (const runeutxo of unconfirmedRuneUtxos) {
    if (tokenSum < runeAmount) {
      psbt.addInput({
        hash: runeutxo.txid,
        index: runeutxo.vout,
        tapInternalKey: Buffer.from(senderOrdinalPubkey as string, "hex").slice(
          1,
          33
        ),
        witnessUtxo: {
          value: runeutxo.value,
          script: Buffer.from(runeutxo.scriptpubkey as string, "hex"),
        },
      });

      tokenSum += runeutxo.amount;
      runeutxo.status = true;
      await runeutxo.save();
    }
  }

  if (tokenSum < runeAmount) {
    for (const runeutxo of runeUtxos) {
      if (tokenSum < runeAmount) {
        psbt.addInput({
          hash: runeutxo.txid,
          index: runeutxo.vout,
          tapInternalKey: Buffer.from(
            senderOrdinalPubkey as string,
            "hex"
          ).slice(1, 33),
          witnessUtxo: {
            value: runeutxo.value,
            script: Buffer.from(runeutxo.scriptpubkey as string, "hex"),
          },
        });
        tokenSum += runeutxo.amount;
        console.log("Add Input ==> ", runeutxo.value);
      }
    }
  }

  edicts.push({
    id: new RuneId(runeBlockNumber, runeTxout),
    amount: runeAmount,
    output: 2,
  });
  edicts.push({
    id: new RuneId(runeBlockNumber, runeTxout),
    amount: tokenSum - runeAmount,
    output: 1,
  });
  const mintstone = new Runestone(edicts, none(), none(), none());

  psbt.addOutput({
    script: mintstone.encipher(),
    value: 0,
  });

  psbt.addOutput({
    address: receiverOrdinalAddress,
    value: 546,
  });

  const tempUtxo = {
    divisibility: divisibility,
    amount: tokenSum - runeAmount
  };

  console.log("temp utxo =>", tokenSum, runeAmount, tempUtxo);

  psbt.addOutput({
    address: senderOrdinalAddress,
    value: 546,
  });

  let fee = await calcFeeSendRuneToUser(
    amount,
    runeId,
    btcUtxos,
    runeUtxos,
    unconfirmedRuneUtxos
  );

  console.log("psbt =>", fee);

  let totalBtcAmount = 0;

  for (const btcutxo of btcUtxos) {
    if (totalBtcAmount < fee && btcutxo.value > 1000) {
      totalBtcAmount += btcutxo.value;
      psbt.addInput({
        hash: btcutxo.txid,
        index: btcutxo.vout,
        tapInternalKey: Buffer.from(senderPaymnetPubKey, "hex").slice(1, 33),
        witnessUtxo: {
          script: Buffer.from(btcutxo.scriptpubkey as string, "hex"),
          value: btcutxo.value,
        },
      });
      console.log("Add Input ==> ", btcutxo.value);
    }
  }

  if (totalBtcAmount < fee) throw "Btc balance is not enough";

  psbt.addOutput({
    address: senderPaymentAddress,
    value: totalBtcAmount - fee,
  });
  console.log("totalBtcAmount ==> ", totalBtcAmount);
  console.log("fee ==> ", fee);
  console.log("AddOutput ==> ", totalBtcAmount - fee)

  return { psbt, tempUtxo };
};

export const sendBtc = async (
  receiverAddress: string,
  amount: number,
  receiverWalletType: string
) => {
  try {
    const psbt = await generateSendBtcToUser(
      receiverAddress,
      amount,
      receiverWalletType
    );
    console.log("psbt =>", psbt);
    const txId = await signAndSend(tweakedSigner, psbt.psbt);
    return txId;
  } catch (error) {
    console.log("error in sendBtc ==> ", error);
    return error;
  }
};

export const sendRune = async (
  receiverAddress: string,
  amount: number,
  runeId: string,
  receiverWalletType: string
) => {
  // try {
  console.log("rune Id", runeId);

  const {psbt, tempUtxo} = await generateSendRuneToUser(
    receiverAddress,
    amount,
    runeId,
    receiverWalletType
  );
  console.log("psbt =>", psbt);
  const txId = await signAndSend(tweakedSigner, psbt);
  return { txId, tempUtxo };
  // } catch (error) {
  //   console.log("error in sendBtc ==> ", error);
  //   return error;
  // }
};

export const signAndSend = async (
  keyPair: Bitcoin.Signer,
  psbt: Bitcoin.Psbt
) => {
  try {
    console.log("key pair=>", keyPair);
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const txId = await pushRawTx(tx.toHex());
    return txId;
  } catch (err) {
    console.log("sing and send", err);
    return "";
  }
};
