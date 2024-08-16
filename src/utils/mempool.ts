import axios, { type AxiosError } from "axios";
import { MEMPOOLAPI_URL } from "../config/config";
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
  const url = `https://mempool.space/${networkType}/api/tx/${tx}`;
  const res = await axios.get(url);
  const output = res.data.vout.find(
    (output: any) => output.scriptpubkey_address === address
  );
  return output.scriptpubkey;
};

export const getUtxos = async (
  address: string,
  networkType: string
): Promise<IUtxo[]> => {
  const url = `https://mempool.space/${networkType}/api/address/${address}/utxo`;
  const res = await axios.get(url);
  const utxos: IUtxo[] = [];

  res.data.forEach((utxoData: any) => {
    utxos.push({
      txid: utxoData.txid,
      vout: utxoData.vout,
      value: utxoData.value,
    });
  });
  return utxos;
};

export const pushBTCpmt = async (rawtx: any, networkType: string) => {
  const txid = await postData(
    `https://mempool.space/${networkType}/api/tx`,
    rawtx
  );
  return txid;
};

export const getCurrentBlockheight = async () => {
  console.log("blockheight url =>", `${MEMPOOLAPI_URL}/blocks/tip/height`);
  const blockHeight = await axios.get(`${MEMPOOLAPI_URL}/blocks/tip/height`);
  return blockHeight.data;
};

const postData = async (
  url: string,
  json: any,
  content_type = "text/plain",
  apikey = ""
): Promise<string | undefined> => {
  while (1) {
    try {
      const headers: any = {};
      if (content_type) headers["Content-Type"] = content_type;
      if (apikey) headers["X-Api-Key"] = apikey;
      const res = await axios.post(url, json, {
        headers,
      });
      return res.data as string;
    } catch (err) {
      const axiosErr = err as AxiosError;
      console.log("axiosErr.response?.data", axiosErr.response?.data);
      if (
        !(axiosErr.response?.data as string).includes(
          'sendrawtransaction RPC error: {"code":-26,"message":"too-long-mempool-chain,'
        )
      )
        throw new Error("Got an err when push tx");
    }
  }
};

export const getSplitedRune = async (txId: string) => {
  const res = await axios.get(`${MEMPOOLAPI_URL}/tx/${txId}`);
  return res.data.vout[2]
}

export const getUtxosByTxId = async (txId: string) => {
  const res = await axios.get(`${MEMPOOLAPI_URL}/tx/${txId}`);
  const length = res.data.vout.length;
  return res.data.vout.slice(0, length - 1);
}

export const mempoolSocketInit = async () => {
  console.log("network =>", process.env.NETWORK);
  const { bitcoin: { websocket } } = mempoolJS({
    hostname: 'mempool.space',
    network: process.env.NETWORK || "testnet"
  });

  const ws = websocket.initServer({
    options: ["blocks", "stats", "mempool-blocks", "live-2h-chart"],
  });

  ws.on("message", function incoming(data: any) {
    const res = JSON.parse(data.toString());
    if (res.block) {
      handleTransaction();
    }
  });
}
