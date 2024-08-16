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
import { IUtxo, IRuneUtxo } from "../types/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Bitcoin.initEccLib(ecc);
const network = TEST_MODE ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin;

const RBF_INPUT_SEQUENCE = 0xfffffffd;
const RBF_INPUT_SEQUENCE2 = 0xfffffffe;

// Get Inscription UTXO
const getInscriptionWithUtxo = async (inscriptionId: string) => {
  try {
    const url = `${OPENAPI_UNISAT_URL}/v1/indexer/inscription/info/${inscriptionId}`;

    const config = {
      headers: {
        Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
      },
    };

    const res = await axios.get(url, config);

    if (res.data.code === -1) throw "Invalid inscription id";

    return {
      address: res.data.data.address,
      contentType: res.data.data.contentType,
      inscriptionId: inscriptionId,
      inscriptionNumber: res.data.data.inscriptionNumber,
      txid: res.data.data.utxo.txid,
      value: res.data.data.utxo.satoshi,
      vout: res.data.data.utxo.vout,
      scriptpubkey: res.data.data.utxo.scriptPk,
    };
  } catch (error) {
    console.log(
      `Ordinal api is not working now, please try again later Or invalid inscription id ${inscriptionId}`
    );
    throw "Invalid inscription id";
  }
};

// Get BTC UTXO
export const getBtcUtxoByAddress = async (address: string) => {
  const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${address}/utxo-data`;
  console.log(url);
  const config = {
    headers: {
      Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
    },
  };

  let cursor = 0;
  const size = 5000;
  const utxos: IUtxo[] = [];

  // while (1) {
  const res = await axios.get(url, { ...config, params: { cursor, size } });

  if (res.data.code === -1) throw "Invalid Address";

  utxos.push(
    ...(res.data.data.utxo as any[]).map((utxo) => {
      return {
        scriptpubkey: utxo.scriptPk,
        txid: utxo.txid,
        value: utxo.satoshi,
        vout: utxo.vout,
      };
    })
  );

  console.log(utxos)
  return utxos;
};

// Get Rune UTXO
export const getRuneUtxoByAddress = async (address: string, runeId: string) => {
  const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${address}/runes/${runeId}/utxo`;

  console.log("url===========>", url);

  const config = {
    headers: {
      Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
    },
  };
  let tokenSum = 0;
  let start = 0;
  let divisibility = 0;
  const limit = 500;
  const utxos: IRuneUtxo[] = [];
  while (1) {
    const res = await axios.get(url, { ...config, params: { start, limit } });
    if (res.data.data.utxo.length === 0) break;
    if (res.data.code === -1) throw "Invalid Address";
    utxos.push(
      ...(res.data.data.utxo as any[]).map((utxo) => {
        tokenSum += Number(utxo.runes[0].amount);
        return {
          scriptpubkey: utxo.scriptPk,
          txid: utxo.txid,
          value: utxo.satoshi,
          vout: utxo.vout,
          amount: Number(utxo.runes[0].amount),
          divisibility: utxo.runes[0].divisibility,
        };
      })
    );
    start += res.data.data.utxo.length;
    if (start === res.data.data.total) break;
  }
  return { runeUtxos: utxos, tokenSum, divisibility };
};


// Get Current Network Fee
export const getFeeRate = async () => {
  try {
    const url = `https://mempool.space/${TEST_MODE ? "testnet/" : ""
      }api/v1/fees/recommended`;

    const res = await axios.get(url);

    return res.data.fastestFee;
  } catch (error) {
    console.log("Ordinal api is not working now. Try again later");
    return 40 * 3;
  }
};

// Get Current Network Fee
const getUTXObyId = async (txId: string) => {
  try {
    console.log("delay start ==> ");
    await delay(1000);
    console.log("delay end ==> ");

    const url = `https://mempool.space/${TEST_MODE ? "testnet/" : ""
      }api/tx/${txId}`;

    console.log("url ==> ", url);

    const res = await axios.get(url);

    console.log("res ==> ", res.data);

    return {
      success: true,
      payload: res.data,
    };
  } catch (error) {
    console.log("Ordinal api is not working now. Try again later");
    return {
      success: false,
      payload: null,
    };
  }
};

// Calc Tx Fee
export const calculateTxFee = (psbt: Bitcoin.Psbt, feeRate: number) => {
  const tx = new Bitcoin.Transaction();

  for (let i = 0; i < psbt.txInputs.length; i++) {
    const txInput = psbt.txInputs[i];
    tx.addInput(txInput.hash, txInput.index, txInput.sequence);
    tx.setWitness(i, [Buffer.alloc(SIGNATURE_SIZE)]);
  }

  for (let txOutput of psbt.txOutputs) {
    tx.addOutput(txOutput.script, txOutput.value);
  }
  tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);
  tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);

  return Math.floor((tx.virtualSize() * feeRate) / 1.4);
};

const getTxHexById = async (txId: string) => {
  try {
    const { data } = await axios.get(
      `https://mempool.space/${TEST_MODE ? "testnet/" : ""}api/tx/${txId}/hex`
    );

    return data as string;
  } catch (error) {
    console.log("Mempool api error. Can not get transaction hex");

    throw "Mempool api is not working now. Try again later";
  }
};

// Generate Send BTC PSBT
export const generateSendBTCPSBT = async (
  walletType: WalletTypes,
  buyerPaymentPubkey: string,
  buyerOrdinalAddress: string,
  buyerOrdinalPubkey: string,
  sellerPaymentAddress: string,
  price: number
) => {
  const psbt = new Bitcoin.Psbt({ network: network });

  // Add Inscription Input
  let paymentAddress, paymentoutput;

  if (walletType === WalletTypes.XVERSE) {
    const hexedPaymentPubkey = Buffer.from(buyerPaymentPubkey, "hex");
    const p2wpkh = Bitcoin.payments.p2wpkh({
      pubkey: hexedPaymentPubkey,
      network: network,
    });

    const { address, redeem } = Bitcoin.payments.p2sh({
      redeem: p2wpkh,
      network: network,
    });

    paymentAddress = address;
    paymentoutput = redeem?.output;
  } else if (
    walletType === WalletTypes.UNISAT ||
    walletType === WalletTypes.OKX
  ) {
    paymentAddress = buyerOrdinalAddress;
  } else if (walletType === WalletTypes.HIRO) {
    const hexedPaymentPubkey = Buffer.from(buyerPaymentPubkey, "hex");
    const { address, output } = Bitcoin.payments.p2wpkh({
      pubkey: hexedPaymentPubkey,
      network: network,
    });
    paymentAddress = address;
  }

  console.log(paymentAddress);
  const btcUtxos = await getBtcUtxoByAddress(paymentAddress as string);
  // const feeRate = await getFeeRate();

  const feeRate = 250;

  let amount = 0;

  const buyerPaymentsignIndexes: number[] = [];

  for (const utxo of btcUtxos) {
    if (amount < price && utxo.value > 10000) {
      amount += utxo.value;

      buyerPaymentsignIndexes.push(psbt.inputCount);

      if (walletType === WalletTypes.UNISAT || walletType === WalletTypes.OKX) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: Buffer.from(utxo.scriptpubkey as string, "hex"),
          },
          tapInternalKey:
            walletType === WalletTypes.OKX
              ? Buffer.from(buyerOrdinalPubkey, "hex")
              : Buffer.from(buyerOrdinalPubkey, "hex").slice(1, 33),
          sighashType: Bitcoin.Transaction.SIGHASH_ALL,
          sequence: RBF_INPUT_SEQUENCE,
        });
      } else if (walletType === WalletTypes.HIRO) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: Buffer.from(utxo.scriptpubkey as string, "hex"),
          },
          sequence: RBF_INPUT_SEQUENCE,
        });
      } else if (walletType === WalletTypes.XVERSE) {
        const txHex = await getTxHexById(utxo.txid);

        console.log("paymentoutput ==> ", paymentoutput);

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          redeemScript: paymentoutput,
          nonWitnessUtxo: Buffer.from(txHex, "hex"),
          sighashType: Bitcoin.Transaction.SIGHASH_ALL,
          sequence: RBF_INPUT_SEQUENCE,
        });
      }
    }
  }

  console.log("Get Utxo from addresses.");

  if (price > 0) {
    psbt.addOutput({
      address: sellerPaymentAddress,
      value: parseInt((((price * (100 - 0)) / 100) * 10 ** 8).toString()),
    });
    // psbt.addOutput({
    //   address: ADMIN_PAYMENT_ADDRESS,
    //   value: parseInt(
    //     (((price * SERVICE_FEE_PERCENT) / 100) * 10 ** 8).toString()
    //   ),
    // });
  }

  console.log("price");

  const fee = calculateTxFee(psbt, feeRate);

  console.log("fee ==> ", fee);

  if (amount < price + fee)
    throw "You do not have enough bitcoin in your wallet";

  psbt.addOutput({
    address: paymentAddress as string,
    value: amount - parseInt((price * 10 ** 8).toString()) - fee,
  });

  console.log(psbt.toBase64());

  return {
    psbt: psbt,
    buyerPaymentsignIndexes,
  };
};

// Generate Send BTC PSBT
export const generateRBF_PSBT = async (
  txId: string,
  walletType: WalletTypes,
  feeRate: number
) => {
  const psbt = new Bitcoin.Psbt({ network: network });

  const utxo = [];

  while (1) {
    const tempUtxo = await getUTXObyId(txId);
    if (tempUtxo.success == true) {
      console.log("tempUtxo ==> ", tempUtxo);
      utxo.push(tempUtxo.payload);
      break;
    } else
      console.log("Network is not working well, try again to fetch UTXO data");
  }

  console.log("result ==> ", utxo[0]);
  console.log("vin ==> ", utxo[0].vin);
  console.log("vout ==> ", utxo[0].vout);

  const { vin, vout } = utxo[0];

  const buyerPaymentsignIndexes: number[] = [];

  const senderAddress = vin[0].prevout.scriptpubkey_address;
  const totalAmount = vin[0].prevout.value;

  for (const oneUtxo of vin) {
    buyerPaymentsignIndexes.push(psbt.inputCount);

    if (walletType === WalletTypes.UNISAT || walletType === WalletTypes.OKX) {
      psbt.addInput({
        hash: oneUtxo.txid,
        index: oneUtxo.vout,
        witnessUtxo: {
          value: oneUtxo.prevout.value,
          script: Buffer.from(oneUtxo.prevout.scriptpubkey as string, "hex"),
        },
        // tapInternalKey:
        //   walletType === WalletTypes.OKX
        //     ? Buffer.from(buyerOrdinalPubkey, "hex")
        //     : Buffer.from(buyerOrdinalPubkey, "hex").slice(1, 33),
        sighashType: Bitcoin.Transaction.SIGHASH_ALL,
        sequence: RBF_INPUT_SEQUENCE2,
      });
    }
    // else if (walletType === WalletTypes.HIRO) {
    //   psbt.addInput({
    //     hash: oneUtxo.txid,
    //     index: oneUtxo.vout,
    //     witnessUtxo: {
    //       value: oneUtxo.value,
    //       script: Buffer.from(oneUtxo.scriptpubkey as string, "hex"),
    //     },
    //     sequence: RBF_INPUT_SEQUENCE
    //   });
    // } else if (walletType === WalletTypes.XVERSE) {
    //   const txHex = await getTxHexById(oneUtxo.txid);

    //   psbt.addInput({
    //     hash: oneUtxo.txid,
    //     index: oneUtxo.vout,
    //     redeemScript: paymentoutput,
    //     nonWitnessUtxo: Buffer.from(txHex, "hex"),
    //     sighashType: Bitcoin.Transaction.SIGHASH_ALL,
    //     sequence: RBF_INPUT_SEQUENCE
    //   });
    // }
  }

  for (const oneUtxo of vout) {
    if (oneUtxo.scriptpubkey_address != senderAddress)
      psbt.addOutput({
        address: oneUtxo.scriptpubkey_address,
        value: oneUtxo.value,
      });
  }

  const fee = calculateTxFee(psbt, feeRate);

  // console.log('fee ==> ', fee);

  psbt.addOutput({
    address: senderAddress,
    value: totalAmount - fee,
  });

  console.log(psbt.toBase64());

  return {
    psbt: psbt,
    buyerPaymentsignIndexes,
  };
};

// Generate Send BTC PSBT
export const cancel_Tx = async (
  txId: string,
  walletType: WalletTypes,
  feeRate: number
) => {
  const psbt = new Bitcoin.Psbt({ network: network });

  const utxo = [];

  while (1) {
    const tempUtxo = await getUTXObyId(txId);
    if (tempUtxo.success == true) {
      console.log("tempUtxo ==> ", tempUtxo);
      utxo.push(tempUtxo.payload);
      break;
    } else
      console.log("Network is not working well, try again to fetch UTXO data");
  }

  console.log("result ==> ", utxo[0]);
  console.log("vin ==> ", utxo[0].vin);
  console.log("vout ==> ", utxo[0].vout);

  const { vin, vout } = utxo[0];

  const buyerPaymentsignIndexes: number[] = [];

  const senderAddress = vin[0].prevout.scriptpubkey_address;
  const totalAmount = vin[0].prevout.value;

  for (const oneUtxo of vin) {
    buyerPaymentsignIndexes.push(psbt.inputCount);

    if (walletType === WalletTypes.UNISAT || walletType === WalletTypes.OKX) {
      psbt.addInput({
        hash: oneUtxo.txid,
        index: oneUtxo.vout,
        witnessUtxo: {
          value: oneUtxo.prevout.value,
          script: Buffer.from(oneUtxo.prevout.scriptpubkey as string, "hex"),
        },
        // tapInternalKey:
        //   walletType === WalletTypes.OKX
        //     ? Buffer.from(buyerOrdinalPubkey, "hex")
        //     : Buffer.from(buyerOrdinalPubkey, "hex").slice(1, 33),
        sighashType: Bitcoin.Transaction.SIGHASH_ALL,
        sequence: RBF_INPUT_SEQUENCE2,
      });
    }
    // else if (walletType === WalletTypes.HIRO) {
    //   psbt.addInput({
    //     hash: oneUtxo.txid,
    //     index: oneUtxo.vout,
    //     witnessUtxo: {
    //       value: oneUtxo.value,
    //       script: Buffer.from(oneUtxo.scriptpubkey as string, "hex"),
    //     },
    //     sequence: RBF_INPUT_SEQUENCE
    //   });
    // } else if (walletType === WalletTypes.XVERSE) {
    //   const txHex = await getTxHexById(oneUtxo.txid);

    //   psbt.addInput({
    //     hash: oneUtxo.txid,
    //     index: oneUtxo.vout,
    //     redeemScript: paymentoutput,
    //     nonWitnessUtxo: Buffer.from(txHex, "hex"),
    //     sighashType: Bitcoin.Transaction.SIGHASH_ALL,
    //     sequence: RBF_INPUT_SEQUENCE
    //   });
    // }
  }

  for (const oneUtxo of vout) {
    if (oneUtxo.scriptpubkey_address != senderAddress)
      psbt.addOutput({
        address:
          "tb1p9f7vuvrvvw505g9nqrqaw707tdcngxn79w5mwr5395n2mvx4g38ssjeh4y",
        value: oneUtxo.value,
      });
  }

  const fee = calculateTxFee(psbt, feeRate);

  // console.log('fee ==> ', fee);

  psbt.addOutput({
    address: senderAddress,
    value: totalAmount - fee,
  });

  console.log(psbt.toBase64());

  return {
    psbt: psbt,
    buyerPaymentsignIndexes,
  };
};

export const combinePsbt = async (
  hexedPsbt: string,
  signedHexedPsbt1: string,
  signedHexedPsbt2?: string
) => {
  try {
    console.log("combinePsbt ==> ");
    console.log("hexedPsbt ==> ", hexedPsbt);
    console.log("signedHexedPsbt1 ==> ", signedHexedPsbt1);

    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    const signedPsbt1 = Bitcoin.Psbt.fromHex(signedHexedPsbt1);
    if (signedHexedPsbt2) {
      const signedPsbt2 = Bitcoin.Psbt.fromHex(signedHexedPsbt2);
      psbt.combine(signedPsbt1, signedPsbt2);
    } else {
      psbt.combine(signedPsbt1);
    }

    console.log("combine is finished!!");

    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();

    console.log("txHex =======> ", txHex);

    const txId = await pushRawTx(txHex);
    // const txId = "";
    console.log("txId ==> ", txId);

    return {
      success: true,
      payload: txId,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      payload: error,
    };
  }
};

export const pushRawTx = async (rawTx: string) => {
  const txid = await postData(
    `https://mempool.space/${TEST_MODE ? "testnet/" : ""}api/tx`,
    rawTx
  );
  console.log("pushed txid", txid);
  return txid;
};

const postData = async (
  url: string,
  json: any,
  content_type = "text/plain",
  apikey = ""
) => {
  while (1) {
    try {
      const headers: any = {};

      if (content_type) headers["Content-Type"] = content_type;

      if (apikey) headers["X-Api-Key"] = apikey;
      const res = await axios.post(url, json, {
        headers,
      });

      return res.data;
    } catch (err: any) {
      const axiosErr = err;
      console.log("push tx error", axiosErr.response?.data);

      if (
        !(axiosErr.response?.data).includes(
          'sendrawtransaction RPC error: {"code":-26,"message":"too-long-mempool-chain,'
        )
      )
        throw new Error("Got an err when push tx");
    }
  }
};

export const finalizePsbtInput = (hexedPsbt: string, inputs: number[]) => {
  const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
  inputs.forEach((input) => psbt.finalizeInput(input));
  return psbt.toHex();
};
