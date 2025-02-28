import axios, { type AxiosError } from "axios";
import { MEMPOOLAPI_URL, PAYMENT_ADDRESS, TEST_MODE } from "../config/config";
import mempoolJS from "@mempool/mempool.js";
import { handleTransaction } from "./txQueue";

interface IUtxo {
  txid: string;
  vout: number;
  value: number;
}

export const getScriptPubkey = async (
  tx: string,
  address: string,
  networkType: string
): Promise<string> => {
 
};

export const getRecentTransactions = async () => {
  try {
   
  }
};

export const getUtxos = async (
  address: string,
  networkType: string
): Promise<IUtxo[]> => {
 
};

export const pushBTCpmt = async (rawtx: any, networkType: string) => {
 
};

export const getCurrentBlockheight = async () => {
  
};

const postData = async (
  url: string,
  json: any,
  content_type = "text/plain",
  apikey = ""
): Promise<string | undefined> => {
  
};

export const getSplitedRune = async (txId: string) => {
  const res = await axios.get(`${MEMPOOLAPI_URL}/tx/${txId}`);
  return res.data.vout[2];
};

export const getUtxosByTxId = async (txId: string) => {
  const res = await axios.get(`${MEMPOOLAPI_URL}/tx/${txId}`);
  const length = res.data.vout.length;
  return res.data.vout.slice(0, length - 1);
};

export const mempoolSocketInit = async () => {
  


};
