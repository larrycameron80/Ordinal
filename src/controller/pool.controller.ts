import { Request, Response } from "express";

import PoolModel from "../model/pool.model";
import PoolBalance from "../model/poolbalance.model";
import BalanceModel from "../model/balance.model";
import WalletModel from "../model/wallet.model";

const getWalletId = async (paymentAddress: string, ordinalAddress: string) => {
    try {
        const res = await WalletModel.findOne({
            paymentAddress: paymentAddress,
            ordinalAddress: ordinalAddress
        })
        if (res) {
            return {
                success: true,
                walletId: res._id
            }
        }
    } catch (error) {
        console.log("Get Wallet Id Error =>", error);
        return {
            success: false,
            error
        };
    }
}

export const addLiquidity = async (
    paymentAddress: string,
    ordinalAddress: string,
    token1Id: string,
    token1Amount: number,
    token2Id: string,
    token2Amount: number,
    nick1: string,
    nick2: string
) => {

    try {
        const poolRes = await PoolModel.findOne({ token1Id: token1Id, token2Id: token2Id });
        let lp = 0;
        if (poolRes) {

            lp = Math.floor(Math.min((token1Amount / poolRes.token1Balance) * poolRes.totalLpBalance, (token1Amount / poolRes.token1Balance) * poolRes.totalLpBalance))

            await PoolModel.findOneAndUpdate({
                token1Id: token1Id,
                token2Id: token2Id
            }, {
                $inc: {
                    token1Balance: token1Amount,
                    token2Balance: token2Amount,
                    totalLpBalance: lp
                }
            })
        } else {
            lp = Math.floor(Math.sqrt(token1Amount * token2Amount))

            const newPool = new PoolModel({
                token1Id,
                token2Id,
                token1Balance: token1Amount,
                token2Balance: token2Amount,
                nick1,
                nick2,
                totalLpBalance: lp
            });

            await newPool.save();
        }

        const walletIdRes = await getWalletId(paymentAddress, ordinalAddress);
        if (walletIdRes?.success) {
            await PoolBalance.findOneAndUpdate({
                walletId: walletIdRes.walletId
            }, {
                $inc: {
                    lpBalance: lp
                }
            })

            await BalanceModel.findOneAndUpdate({
                walletId: walletIdRes.walletId,
                tokenId: token1Id
            }, {
                $inc: {
                    balance: token1Amount * (-1),
                }
            })

            await BalanceModel.findOneAndUpdate({
                walletId: walletIdRes.walletId,
                tokenId: token2Id
            }, {
                $inc: {
                    balance: token2Amount * (-1),
                }
            })
        }

        return {
            success: true,
            lp
        }


    } catch (error) {
        console.log("Add liquidity error=>", error);
        return {
            success: false,
            error
        }
    }
}

export const removeLiquidity = async (
    paymentAddress: string,
    ordinalAddress: string,
    token1Id: string,
    token2Id: string,
    lpTokensToBurn: number
) => {

    try {
        const poolRes = await PoolModel.findOne({ token1Id: token1Id, token2Id: token2Id });
        if (poolRes) {

            if (lpTokensToBurn <= 0 || lpTokensToBurn > poolRes.totalLpBalance) {
                return {
                    success: false,
                    msg: "Invalid lp token amount"
                };
            }

            const token1Amount = (lpTokensToBurn / poolRes.totalLpBalance) * poolRes.token1Balance;
            const token2Amount = (lpTokensToBurn / poolRes.totalLpBalance) * poolRes.token2Balance;

            await PoolModel.findOneAndUpdate({
                token1Id: token1Id,
                token2Id: token2Id
            }, {
                $inc: {
                    token1Balance: token1Amount * (-1),
                    token2Balance: token2Amount * (-1),
                    totalLpBalance: lpTokensToBurn * (-1)
                }
            })

            const walletIdRes = await getWalletId(paymentAddress, ordinalAddress);

            if (walletIdRes?.success) {
                await BalanceModel.findOneAndUpdate({
                    walletId: walletIdRes.walletId,
                    tokenId: token1Id
                }, {
                    $inc: {
                        balance: token1Amount,
                    }
                })

                await BalanceModel.findOneAndUpdate({
                    walletId: walletIdRes.walletId,
                    tokenId: token2Id
                }, {
                    $inc: {
                        balance: token2Amount,
                    }
                })

                await PoolBalance.findOneAndUpdate({
                    walletId: walletIdRes.walletId,
                    poolId: poolRes._id
                }, {
                    $inc: {
                        lpBalance: lpTokensToBurn * (-1)
                    }
                })

            }
        } else {
            return {
                success: false,
                msg: "Pool not found!"
            }
        }

        return {
            success: true,
        }

    } catch (error) {
        console.log("Add liquidity error=>", error);
        return {
            success: false,
            error
        }
    }
}


export const getBalance = async (token1Id: string, token2Id: string) => {
    try {
        const res = await PoolModel.findOne({ token1Id: token1Id, token2Id: token2Id });
        if (res) {
            return {
                success: true,
                token1Balance: res.token1Balance,
                token2Balance: res.token2Balance
            }
        }
        return {
            success: false,
            msg: "Pool is not exist"
        }

    } catch (error) {
        console.log("Get Pool Balance Error =>", error);
        return {
            success: false,
            error
        }
    }
}