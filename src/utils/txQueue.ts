import {
  get10Txs,
  moveToEnd,
  updateTxStatus,
} from "../controller/transaction.controller";
import { MEMPOOLAPI_URL } from "../config/config";
import { TxType } from "../config/config";
import axios from "axios";
import {
  directSwap,
  handleDirectSwap,
  handleSwapReqest,
} from "../controller/swap.controller";
import { handleWithdraw, updateBalance } from "../controller/wallet.controller";


const getTransactionStatus = async (txId: string) => {
  const url = `${MEMPOOLAPI_URL}/tx/${txId}/status`;
  const { data } = await axios.get(url);
  return data;
};

export const handleTransaction = async () => {

};
