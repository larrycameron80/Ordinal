import { Request, Response } from "express";

import PoolModel from "../model/pool.model";
import PoolBalance from "../model/poolbalance.model";
import BalanceModel from "../model/balance.model";
import WalletModel from "../model/wallet.model";
import RunexTxModel from "../model/transaction.model";
import { TxStatus, TxType } from "../config/config";
import { getEstimatePool } from "../utils/pool";
import { getCurrentBlockheight } from "../utils/mempool";

export const getWalletId = async (
  paymentAddress: string,
  ordinalAddress: string
) => {
  try {
    const res = await WalletModel.findOne({
      paymentAddress: paymentAddress,
      ordinalAddress: ordinalAddress,
    });
    if (res) {
      return {
        success: true,
        walletId: res._id,
      };
    }
  } catch (error) {
    console.log("Get Wallet Id Error =>", error);
    return {
      success: false,
      error,
    };
  }
};

export const addLiquidity = async (
  paymentAddress: string,
  ordinalAddress: string,
  token1Id: string,
  token1Amount: number,
  token2Id: string,
  token2Amount: number,
) => {
  try {
    let poolRes = await PoolModel.findOne({
      token1Id: token1Id,
      token2Id: token2Id,
    });
    let lp = 0;
    if (poolRes) {
      lp = Math.floor(
        Math.min(
          (token1Amount / poolRes.token1Balance) * poolRes.totalLpBalance,
          (token1Amount / poolRes.token1Balance) * poolRes.totalLpBalance
        )
      );

      await PoolModel.findOneAndUpdate(
        {
          token1Id: token1Id,
          token2Id: token2Id,
        },
        {
          $inc: {
            token1Balance: token1Amount,
            token2Balance: token2Amount,
            totalLpBalance: lp,
          },
        }
      );
    } else {
      lp = Math.floor(Math.sqrt(token1Amount * token2Amount));

      poolRes = new PoolModel({
        token1Id,
        token2Id,
        token1Balance: token1Amount,
        token2Balance: token2Amount,
        totalLpBalance: lp,
      });

      await poolRes.save();
    }

    const wallet = await WalletModel.findOne({
      paymentAddress: paymentAddress,
      ordinalAddress: ordinalAddress,
    });
    if (wallet) {
      await PoolBalance.findOneAndUpdate(
        {
          walletId: wallet._id,
          poolId: poolRes._id,
        },
        {
          $inc: {
            lpBalance: lp,
          },
        }
      );

      await BalanceModel.findOneAndUpdate(
        {
          walletId: wallet._id,
          tokenId: token1Id,
        },
        {
          $inc: {
            balance: token1Amount * -1,
          },
        }
      );

      await BalanceModel.findOneAndUpdate(
        {
          walletId: wallet._id,
          tokenId: token2Id,
        },
        {
          $inc: {
            balance: token2Amount * -1,
          },
        }
      );
    }

    return true;
  } catch (error) {
    console.log("Add liquidity error=>", error);
  }
};

export const removeLiquidity = async (
  paymentAddress: string,
  ordinalAddress: string,
  token1Id: string,
  token2Id: string,
  lpTokensToBurn: number
) => {
  try {
    const poolRes = await PoolModel.findOne({
      token1Id: token1Id,
      token2Id: token2Id,
    });
    if (poolRes) {
      if (lpTokensToBurn <= 0 || lpTokensToBurn > poolRes.totalLpBalance) {
        return false;
      }

      const token1Amount =
        (lpTokensToBurn / poolRes.totalLpBalance) * poolRes.token1Balance;
      const token2Amount =
        (lpTokensToBurn / poolRes.totalLpBalance) * poolRes.token2Balance;

      await PoolModel.findOneAndUpdate(
        {
          token1Id: token1Id,
          token2Id: token2Id,
        },
        {
          $inc: {
            token1Balance: token1Amount * -1,
            token2Balance: token2Amount * -1,
            totalLpBalance: lpTokensToBurn * -1,
          },
        }
      );

      const wallet = await WalletModel.findOne({
        paymentAddress: paymentAddress,
        ordinalAddress: ordinalAddress
      })

      if (wallet) {
        await BalanceModel.findOneAndUpdate(
          {
            walletId: wallet._id,
            tokenId: token1Id,
          },
          {
            $inc: {
              balance: token1Amount,
            },
          }
        );

        await BalanceModel.findOneAndUpdate(
          {
            walletId: wallet._id,
            tokenId: token2Id,
          },
          {
            $inc: {
              balance: token2Amount,
            },
          }
        );

        await PoolBalance.findOneAndUpdate(
          {
            walletId: wallet._id,
            poolId: poolRes._id,
          },
          {
            $inc: {
              lpBalance: lpTokensToBurn * -1,
            },
          }
        );
      }
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Add liquidity error=>", error);
    return false;
  }
};

export const getBalance = async (token1Id: string, token2Id: string) => {
  try {
    const res = await PoolModel.findOne({
      token1Id: token1Id,
      token2Id: token2Id,
    });
    if (res) {
      return {
        success: true,
        token1Balance: res.token1Balance,
        token2Balance: res.token2Balance,
      };
    }
    return {
      success: false,
      msg: "Pool is not exist",
    };
  } catch (error) {
    console.log("Get Pool Balance Error =>", error);
    return {
      success: false,
      error,
    };
  }
};

export const getPoolList = async (req: Request, res: Response) => {
  try {
    const poolList = await PoolModel.find();
    console.log("Pool List =>", poolList);
    return res.status(200).json({
      success: true,
      poolList,
    });
  } catch (error) {
    console.log("Get Pool List error =>", error);
    return res.status(404).json({
      success: false,
      error,
    });
  }
};

export const getPoolBalanceList = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.body;
    const list = await PoolBalance.find({
      walletId: walletId,
    });
    return res.status(200).json({
      success: true,
      poolBalanceList: list,
    });
  } catch (error) {
    console.log("Get Pool Balance List Error =>", error);
  }
};

export const createPool = async (req: Request, res: Response) => {
  try {
    const newPool = new PoolModel(req.body);
    const pool = await newPool.save();
    return res.status(200).json({
      success: true,
      pool,
    });
  } catch (error) {
    console.log("Create Pool Error =>", error);
    return res.status(404).json({
      success: false,
      error,
    });
  }
};

export const getEstimateLpAmount = async (req: Request, res: Response) => {
  try {
    const { amount1, amount2, poolId } = req.body;
    console.log(amount1, amount2, poolId);
    const estimatePool = await getEstimatePool(poolId);
    console.log("estimate pool=>", estimatePool, req.body);
    if (estimatePool.success) {
      const token1Balance = estimatePool.token1Balance || 100000;
      const token2Balance = estimatePool.token2Balance || 100000;
      const totalLpBalance = estimatePool.totalLpBalance || 100000;
      console.log("value1", (amount1 / token1Balance) * totalLpBalance);
      console.log("value2", (amount2 / token2Balance) * totalLpBalance);
      const lp = Math.floor(
        Math.min(
          (amount1 / token1Balance) * totalLpBalance,
          (amount2 / token2Balance) * totalLpBalance
        )
      );
      console.log("lp", lp);
      return res.status(200).json({
        success: true,
        lp,
      });
    } else {
      return res.status(200).json({
        success: false,
        lp: 0,
      });
    }
  } catch (error) {
    console.log("Get Estimate Lp Amount Error =>", error);
  }
};

export const addLiquidityRequest = async (req: Request, res: Response) => {
  try {
    const {
      cardinalAddress,
      cardinalPubkey,
      ordinalAddress,
      ordinalPubkey,
      token1Id,
      token1Amount,
      token2Id,
      token2Amount,
    } = req.body;

    const newTx = new RunexTxModel({
      txType: TxType.LIQUIDITY_ADD,
      txId: "Add Liquidity",
      cardinalAddress,
      cardinalPubkey,
      ordinalAddress,
      ordinalPubkey,
      token1Id,
      token1Amount,
      token2Id,
      token2Amount,
      status: TxStatus.CONFIRMED,
      blockHeight: 0,
    });

    await newTx.save();

    return res.status(200).json({
      success: true,
      msg: "Successfully requested!",
    });
  } catch (error) {
    console.log("Add liquidity request=>", error);
  }
};

export const removeLiquidityRequest = async (req: Request, res: Response) => {
  try {
    const {
      cardinalAddress,
      cardinalPubkey,
      ordinalAddress,
      ordinalPubkey,
      token1Id,
      token1Amount,
      token2Id,
    } = req.body;

    const newTx = new RunexTxModel({
      txType: TxType.LIQUIDITY_REMOVE,
      txId: "Remove Liquidity",
      cardinalAddress,
      cardinalPubkey,
      ordinalAddress,
      ordinalPubkey,
      token1Id,
      token1Amount,
      token2Id,
      token2Amount: 0,
      status: TxStatus.CONFIRMED,
      blockHeight: 0,
    });

    await newTx.save();

    return res.status(200).json({
      success: true,
      msg: "Successfully requested!",
    });
  } catch (error) {
    console.log("Remove liquidity request=>", error);
  }
};
