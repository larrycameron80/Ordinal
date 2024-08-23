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
import { addLiquidity, removeLiquidity } from "../controller/pool.controller";

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
        if (txFlag && runexTx.status == TxStatus.UNCONFIRMED) {
          const status = await getTransactionStatus(runexTx.txId);
          if (status.confirmed == true) {
            runexTx.status = TxStatus.CONFIRMED;
            await runexTx.save();
          } else {
            txFlag = false;
          }
        }
      }

      for (const runexTx of runexTxList) {
        const txType = runexTx.txType;
        if (txType == TxType.SWAP) {
          if (runexTx.status == TxStatus.UNCONFIRMED) {
            txFlag = false;
          }
          if (txFlag) {
            const res = await handleSwap(
              runexTx.cardinalAddress,
              runexTx.ordinalAddress,
              runexTx.token1Id,
              runexTx.token1Amount,
              runexTx.token2Id,
              txType,
              runexTx.txId
            );
            if (res) {
              runexTx.status = TxStatus.PROCESSED;
              await runexTx.save();
            }
          }
        } else if (txType == TxType.DEPOSIT) {
          console.log("step 0", runexTx, txFlag);
          if (runexTx.status == TxStatus.UNCONFIRMED) {
            txFlag = false;
          }
          if (txFlag) {
            const res = await handleDepositWithdraw(
              runexTx.cardinalAddress,
              runexTx.ordinalAddress,
              runexTx.token1Id,
              runexTx.token1Amount,
              "deposit",
              runexTx.txId
            );
            if (res) {
              runexTx.status = TxStatus.PROCESSED;
              await runexTx.save();
            }
          }
        } else if (txType == TxType.WITHDRAW) {
          const res = await handleDepositWithdraw(
            runexTx.cardinalAddress,
            runexTx.ordinalAddress,
            runexTx.token1Id,
            runexTx.token1Amount,
            "withdraw",
            runexTx.txId
          );
          if (res) {
            runexTx.status = TxStatus.PROCESSED;
            await runexTx.save();
          }
        } else if (txType == TxType.INSTANT_SWAP) {
          const res = await handleSwap(
            runexTx.cardinalAddress,
            runexTx.ordinalAddress,
            runexTx.token1Id,
            runexTx.token1Amount,
            runexTx.token2Id,
            txType,
            runexTx.txId
          );
          if (res) {
            runexTx.status = TxStatus.PROCESSED;
            await runexTx.save();
          }
        } else if (txType == TxType.LIQUIDITY_ADD) {
          const res = await addLiquidity(runexTx.cardinalAddress, runexTx.ordinalAddress, runexTx.token1Id, runexTx.token1Amount, runexTx.token2Id, runexTx.token2Amount);
          if (res) {
            runexTx.status = TxStatus.PROCESSED;
            await runexTx.save();
          }
        } else if (txType == TxType.LIQUIDITY_REMOVE) {
          const res = await removeLiquidity(runexTx.cardinalAddress, runexTx.ordinalAddress, runexTx.token1Id, runexTx.token2Id, runexTx.token1Amount);
          console.log("Res =>", res);
          if (res) {
            runexTx.status = TxStatus.PROCESSED;
            await runexTx.save();
          }
        }
      }
    }
  } catch (error) {
    console.log("Handle Trnasaction Error =>", error);
  }
};
