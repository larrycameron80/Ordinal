import { Request, Response } from "express";
import RunexTxModel from "../model/transaction.model";
import { calcEstimateAmount, getEstimatePool } from "../utils/pool";
import UtxoModel from "../model/utxo.model";
import walletModel from "../model/wallet.model";
// import { generateSendBTCPSBT, generateSendRunePSBT, generateSendSplitedRunePSBT, generateSplitRunePSBT } from "../utils/psbt";
import {
  generateSendBtcToUser,
  generateSendBtcFromUser,
  generateSendRuneFromUser,
  generateSendRuneToUser,
  sendBtc,
  sendRune,
} from "../utils/psbt";
import {
  MEMPOOLAPI_URL,
  PLATFORM_FEE,
  TxStatus,
  TxType,
  WalletTypes,
} from "../config/config";
import axios from "axios";
import { getCurrentBlockheight, getSplitedRune } from "../utils/mempool";
import { combinePsbt } from "../service/psbt.service";
import PoolModel from "../model/pool.model";
import BalanceModel from "../model/balance.model";
import WalletModel from "../model/wallet.model";
import { updateAdminBalance } from "./wallet.controller";
const RUNEX_RUNE_ID = "";

export const swap = async (req: Request, res: Response) => {
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
  try {
    const newTx = new RunexTxModel({
      txType: TxType.INSTANT_SWAP,
      txId: "swap",
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

    res.status(200).json({
      success: true,
      msg: "Successfully requested Swap!",
    });
  } catch (error) {
    console.log("Swap Transacrion Error =>", error);
    res.status(404).json({
      success: false,
      msg: error,
    });
  }
};

export const handleSwap = async (
  cardinalAddress: string,
  ordinalAddress: string,
  token1Id: string,
  token1Amount: number,
  token2Id: string,
  txType: string,
  txId: string
) => {
  try {
    let pool;
    if (token1Id == "btc")
      pool = await PoolModel.findOne({ token1Id, token2Id });
    else
      pool = await PoolModel.findOne({
        token1Id: token2Id,
        token2Id: token1Id,
      });
    if (pool) {
      let swapAmount = 0,
        newToken1Balance = 0,
        newToken2Balance = 0,
        receiveAmount = 0,
        fee = 0;
      if (token1Id == "btc") {
        fee = Math.floor((token1Amount * PLATFORM_FEE) / 100);
        swapAmount = token1Amount - fee;
        newToken1Balance = pool.token1Balance + swapAmount;
        newToken2Balance = Math.floor(
          (pool.token1Balance * pool.token2Balance) / newToken1Balance
        );
        receiveAmount = pool.token2Balance - newToken2Balance;
      } else {
        swapAmount = token1Amount;
        newToken2Balance = pool.token2Balance + swapAmount;
        newToken1Balance = Math.floor(
          (pool.token1Balance * pool.token2Balance) / newToken2Balance
        );
        let receiveAmountTemp = pool.token1Balance - newToken1Balance;
        fee = Math.floor((receiveAmountTemp * PLATFORM_FEE) / 100);
        receiveAmount = receiveAmountTemp - fee;
      }
      console.log("step 1");
      await updateAdminBalance(fee);
      console.log("step 2");
      pool.token1Balance = newToken1Balance;
      pool.token2Balance = newToken2Balance;

      await pool.save();
      console.log("step 3", token1Amount, swapAmount, fee, receiveAmount);

      if (txType == TxType.SWAP) {
        
        if (token1Id == "btc") {
          console.log("step 4");
          const res = await sendRuneToUser(
            ordinalAddress,
            receiveAmount,
            token2Id,
            WalletTypes.UNISAT
          );
          if (res && res.tempUtxo.amount != 0) {
            const utxo = await getSplitedRune(res.txId);
            const newUtxo = new UtxoModel({
              runedId: token2Id,
              txId: res.txId,
              value: 546,
              vout: 2,
              scriptpubkey: utxo.scriptpubkey,
              divisibility: res.tempUtxo.divisibility,
              amount: res.tempUtxo.amount,
              status: true
            })
            await newUtxo.save();
            console.log("step 6 - 1", newUtxo);
          }
        } else {
          console.log("step 5");
          await sendBtcToUser(
            cardinalAddress,
            receiveAmount,
            WalletTypes.UNISAT
          );
        }
      } else if (txType == TxType.INSTANT_SWAP) {
        const wallet = await WalletModel.findOne({
          paymentAddress: cardinalAddress,
          ordinalAddress: ordinalAddress,
        });
        console.log("step 6");
        await BalanceModel.findOneAndUpdate(
          {
            walletId: wallet?._id,
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
            walletId: wallet?._id,
            tokenId: token2Id,
          },
          {
            $inc: {
              balance: receiveAmount,
            },
          }
        );
        console.log("step 7");
      }
      return true;
    }
  } catch (error) {
    console.log("Handle Swap Request Error ", error);
  }
};

export const getSendRunePsbt = async (req: Request, res: Response) => {
  const {
    senderPaymentAddress,
    senderPaymentPubkey,
    senderOrdinalAddress,
    senderOrdinalPubkey,
    amount,
    receiverOrdinalAddress,
    runeId,
    walletType,
  } = req.body;
  try {
    console.log("Rune Id =>", req.body);
    const psbt = await generateSendRuneFromUser(
      senderPaymentAddress,
      senderPaymentPubkey,
      senderOrdinalAddress,
      senderOrdinalPubkey,
      amount,
      receiverOrdinalAddress,
      runeId,
      walletType
    );
    return res.status(200).json({
      success: true,
      psbt: psbt,
    });
  } catch (error) {
    console.log("Get send Rune Psbt =>", error);
    return res.status(404).json({
      success: false,
      error: error,
    });
  }
};

export const broadcastPsbt = async (req: Request, res: Response) => {
  const { psbt, signedPsbt } = req.body;

  try {
    const txId = await combinePsbt(psbt, signedPsbt);
    console.log("txid =>", txId);
    return res.status(200).json({
      success: true,
      txId: txId,
    });
  } catch (error) {
    console.log("Broadcast tx error =>", error);
    return res.status(404).json({
      success: false,
      error: error,
    });
  }
};

export const getSendBTCPsbt = async (req: Request, res: Response) => {
  try {
    const { senderAddress, senderPubkey, receiverAddress, amount, walletType } =
      req.body;
    const psbt = await generateSendBtcFromUser(
      senderAddress,
      senderPubkey,
      receiverAddress,
      amount,
      walletType
    );

    return res.status(200).json({
      success: true,
      psbt: psbt,
    });
  } catch (error) {
    console.log("Generate send btc error =>", error);
    return res.status(404).json({
      success: false,
      error,
    });
  }
};

export const sendBtcToUser = async (
  receiverAddress: string,
  amount: number,
  walletType: string
) => {
  try {
    const txId = await sendBtc(receiverAddress, amount, walletType);
    return txId;
  } catch (error) {
    console.log("Send Btc to User Error =>", error);
  }
};

export const sendRuneToUser = async (
  receiverAddress: string,
  amount: number,
  runeId: string,
  walletType: string
) => {
  try {
    const res = await sendRune(receiverAddress, amount, runeId, walletType);
    return res;
  } catch (error) {
    console.log("Send Rune To User Error =>", error);
  }
};

export const sendBtcToUserTest = async (req: Request, res: Response) => {
  const { receiverAddress, amount, walletType } = req.body;
  try {
    const txId = await sendBtc(receiverAddress, amount, walletType);
    return res.status(200).json({
      success: true,
      txId,
    });
  } catch (err) {
    return res.status(404).json({
      success: false,
      err,
    });
  }
};

export const sendRuneToUserTest = async (req: Request, res: Response) => {
  const { amount, receiverAddress, runeId, walletType } = req.body;
  try {
    const txId = await sendRune(receiverAddress, amount, runeId, walletType);

    return res.status(200).json({
      success: true,
      txId,
    });
  } catch (err) {
    return res.status(404).json({
      success: false,
      err,
    });
  }
};

export const getEstimateAmount = async (req: Request, res: Response) => {
  try {
    const { tokenId, amount, poolId } = req.body;
    console.log(tokenId, amount, poolId);
    const estimatePool = await getEstimatePool(poolId);
    console.log(estimatePool);
    if (estimatePool.success) {
      const token1Balance = estimatePool.token1Balance || 10000000;
      const token2Balance = estimatePool.token2Balance || 10000000;
      const token1Id = estimatePool.token1Id || "btc";
      const token2Id = estimatePool.token2Id || "btc";
      let estimateAmount = 0;
      if (tokenId == token1Id) {
        const temp = Math.floor(
          (token1Balance * token2Balance) / (token1Balance + amount * 1)
        );
        estimateAmount = token2Balance - temp;
      } else if (tokenId == token2Id) {
        const temp = Math.floor(
          (token1Balance * token2Balance) / (token2Balance + amount * 1)
        );
        estimateAmount = token1Balance - temp;
      }
      


      return res.status(200).json({
        success: true,
        estimateAmount: Math.floor(estimateAmount),
      });
    } else {
      return res.status(200).json({
        success: false,
        estimateAmount: 0,
      });
    }
  } catch (error) {
    console.log("Get Estimate Amount Error =>", error);
  }
};
