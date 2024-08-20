import PoolModel from "../model/pool.model";
import TxModel from "../model/transaction.model";
import { TxType, TxStatus } from "../config/config";

export const calcLPTokenAmount = async (
  btcAmount: number,
  runeAmount: number
) => {
  return btcAmount + runeAmount;
};

export const calcEstimateAmount = async (
  baseAmount: number,
  direction: string
) => {
  return direction == "rune" ? baseAmount * 10000 : baseAmount / 10000;
};

export const calcPlatformFee = (btcAmount: number) => {
  return 2000;
}

export const getEstimatePool = async (poolId: string) => {
  try {
    let token1Balance = 0;
    let token2Balance = 0;
    let totalLpBalance = 0;
    const pool = await PoolModel.findById(poolId);
    if (pool) {
      token1Balance = pool.token1Balance;
      token2Balance = pool.token2Balance;
      totalLpBalance = pool.totalLpBalance;
      const txQueue = await TxModel.find({
        status: { $ne: TxStatus.PROCESSED }
      });
      txQueue.forEach((tx: any) => {
        if (tx.txId == TxType.LIQUIDITY_ADD) {
          totalLpBalance += Math.floor(Math.min(((tx.token1Amount / token1Balance) * totalLpBalance), ((tx.token2Amount / token2Balance) * totalLpBalance)));
          token1Balance += tx.token1Amount;
          token2Balance += tx.token2Amount;
        }
        if (tx.txId == TxType.LIQUIDITY_REMOVE) {
          const token1Amount = Math.floor((tx.token1Amount / totalLpBalance) * token1Balance);
          const token2Amount = Math.floor((tx.token1Amount / totalLpBalance) * token2Balance);
          totalLpBalance -= tx.token1Amount;
          token1Balance -= token1Amount;
          token2Balance -= token2Amount;
        }
        if (tx.txId == TxType.SWAP) {
          if (pool.token1Id == tx.token1Id) {
            let temp = token1Balance + tx.token1Amount;
            token2Balance = Math.floor(token1Balance * token2Balance / temp);
            token1Balance = temp;
          } else if (pool.token2Id == tx.token1Id) {
            let temp = token2Balance + tx.token1Amount;
            token1Balance = Math.floor(token1Balance * token2Balance / temp);
            token2Balance = temp;
          }
        }
      });
      return {
        success: true,
        token1Id: pool.token1Id,
        token1Balance,
        token2Id: pool.token2Id,
        token2Balance,
        totalLpBalance
      }
    } else {
      return {
        success: false
      }
    }
  } catch (error) {
    console.log("Get Estimate Pool =>", error);
    return {
      success: false
    }
  }
}