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
   
  } catch (error) {
    console.log(
      `Ordinal api is not working now, please try again later Or invalid inscription id ${inscriptionId}`
    );
    throw "Invalid inscription id";
  }
};

// Get BTC UTXO
export const getBtcUtxoByAddress = async (address: string) => {
  console.log(url);
  

  // while (1) {
  

  return utxos;
};

// Get Rune UTXO
export const getRuneUtxoByAddress = async (address: string, runeId: string) => {
  const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${address}/runes/${runeId}/utxo`;

  console.log("url===========>", url);

  return { runeUtxos: utxos, tokenSum, divisibility: utxos[0].divisibility };
};


// Get Current Network Fee
export const getFeeRate = async () => {
  try {
    
  } catch (error) {
    console.log("Ordinal api is not working now. Try again later");
    return 40 * 3;
  }
};

// Get Current Network Fee
const getUTXObyId = async (txId: string) => {
  try {
    
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
  

  return Math.floor((tx.virtualSize() * feeRate) / 1.4);
};

const getTxHexById = async (txId: string) => {
  try {
    
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
  

  
  }

 

 

// Generate Send BTC PSBT
export const generateRBF_PSBT = async (
  txId: string,
  walletType: WalletTypes,
  feeRate: number
) => {
  

};

// Generate Send BTC PSBT
export const cancel_Tx = async (
  txId: string,
  walletType: WalletTypes,
  feeRate: number
) => {
};

export const combinePsbt = async (
  hexedPsbt: string,
  signedHexedPsbt1: string,
  signedHexedPsbt2?: string
) => {
  try {
  
  } catch (error) {
    console.log(error);
    return {
      success: false,
      payload: error,
    };
  }
};

export const pushRawTx = async (rawTx: string) => {
  
};

const postData = async (
  url: string,
  json: any,
  content_type = "text/plain",
  apikey = ""
) => {

};

export const finalizePsbtInput = (hexedPsbt: string, inputs: number[]) => {
 
};
