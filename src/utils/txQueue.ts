import {
  getTxs,
  moveToEnd,
  updateTxStatus,
} from "../controller/transaction.controller";
import { MEMPOOLAPI_URL, TxStatus } from "../config/config";
import { TxType } from "../config/config";
import axios from "axios";
import { handleSwap } from "../controller/swap.controller";
import { handleWithdraw, updateBalance } from "../controller/wallet.controller";
import { getRecentTransactions } from "./mempool";
import { handleDepositWithdraw } from "../controller/wallet.controller";

const getTransactionStatus = async (txId: string) => {
  const url = `${MEMPOOLAPI_URL}/tx/${txId}/status`;
  const { data } = await axios.get(url);
  return data;
};

export const handleTransaction = async () => {
  try {
    let runexTxList = await getTxs();
    if (runexTxList.length != 0) {
      const txList: any = await getRecentTransactions();
      let txFlag = true;

      // Check the tx confirm status
      for (let runexTx of runexTxList) {
        if (runexTx.status == TxStatus.UNCONFIRMED) {
          for (const tx of txList) {
            if (tx.id == runexTx.txId) {
              if (tx.status.confirmed == true) {
                await updateTxStatus(runexTx.txId, TxStatus.CONFIRMED);
                runexTx.status = TxStatus.CONFIRMED;
              } else {
                txFlag = false;
              }
            }
          }
        }
      }

      for (const runexTx of runexTxList) {
        const txType = runexTx.txType;
        if (txType == TxType.SWAP) {
          if (txFlag) {
            await handleSwap(
              runexTx.cardinalAddress,
              runexTx.ordinalAddress,
              runexTx.token1Id,
              runexTx.token1Amount,
              runexTx.token2Id,
              txType,
              runexTx.txId
            );
          }
        } else if (txType == TxType.DEPOSIT) {
          if (!txFlag) {
          }
        } else if (txType == TxType.WITHDRAW) {
          if (!txFlag) {
          }
        } else if (txType == TxType.INSTANT_SWAP) {
          await handleSwap(
            runexTx.cardinalAddress,
            runexTx.ordinalAddress,
            runexTx.token1Id,
            runexTx.token1Amount,
            runexTx.token2Id,
            txType,
            runexTx.txId
          );
        } else if (txType == TxType.LIQUIDITY_ADD) {
          await handleDepositWithdraw(runexTx.cardinalAddress, runexTx.ordinalAddress, runexTx.token1Id, runexTx.token1Amount, "deposit", runexTx.txId);
        } else if (txType == TxType.LIQUIDITY_REMOVE) {
          await handleDepositWithdraw(runexTx.cardinalAddress, runexTx.ordinalAddress, runexTx.token1Id, runexTx.token1Amount, "withdraw", runexTx.txId);
        }
      }
    }
  } catch (error) {
    console.log("Handle Trnasaction Error =>", error);
  }
};
