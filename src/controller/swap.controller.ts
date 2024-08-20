import { Request, Response } from "express";
import RunexTxModel from "../model/transaction.model";
import { calcEstimateAmount, getEstimatePool } from "../utils/pool";
import walletModel from "../model/wallet.model";
// import { generateSendBTCPSBT, generateSendRunePSBT, generateSendSplitedRunePSBT, generateSplitRunePSBT } from "../utils/psbt";
import { generateSendBtcToUser, generateSendBtcFromUser, generateSendRuneFromUser, generateSendRuneToUser, sendBtc, sendRune } from "../utils/psbt";
import { MEMPOOLAPI_URL } from "../config/config";
import axios from "axios";
import { getCurrentBlockheight } from "../utils/mempool";
import { updateTxStatus } from "./transaction.controller";
import { combinePsbt } from "../service/psbt.service";
const RUNEX_RUNE_ID = "";

export const swap = async (req: Request, res: Response) => {
  const {
    paymentAddress,
    ordinalAddress,
    baseAmount,
    estimateAmount,
    direction,
  } = req.body;
  try {
    const newTx = new RunexTxModel({
      txType: "wallet-swap-" + direction,
      txId: "",
      cardinalAddress: paymentAddress,
      cardinalAddressPubkey: "",
      ordinalAddress: ordinalAddress,
      ordinalAddressPubkey: "",
      btcAmount: direction == "rune" ? baseAmount : estimateAmount,
      runeAmount: direction == "btc" ? baseAmount : estimateAmount,
      status: "unconfirmed",
      blockHeight: 0,
    });
    await newTx.save();

    res.status(200).json({
      success: true,
      msg: "Successfully requested!",
    });
  } catch (error) {
    console.log("Swap Transacrion Error =>", error);
    res.status(404).json({
      success: false,
      msg: error,
    });
  }
};

export const handleSwapReqest = async (
  paymentAddress: string,
  ordinalAddress: string,
  baseAmount: number,
  estimateAmount: number,
  direction: string
) => {
  try {
    const estimate = await calcEstimateAmount(baseAmount, direction);
    if (estimate < estimateAmount * 0.95) {
      return {
        success: false,
        msg: "Your swap request is rejected because of slipeage problem!",
      };
    }

    let btcVal = direction == "rune" ? baseAmount * -1 : estimate;
    let runeVal = direction == "rune" ? estimate : baseAmount * -1;

    const res = await walletModel.updateOne(
      {
        cardinalAddress: paymentAddress,
        ordinalAddress: ordinalAddress,
      },
      {
        $inc: {
          btcValue: btcVal,
          runeValue: runeVal,
        },
      }
    );
    return {
      success: true,
      msg: "Successfuly swaped.",
    };
  } catch (error) {
    console.log("Handle Swap Request Error ");
    return {
      success: false,
      error: error,
    };
  }
};

export const directSwap = async (
  paymentAddress: string,
  ordinalAddress: string,
  baseAmount: number,
  estimateAmount: number,
  direction: string
) => {
  try {
    console.log("direction =>", direction);
    const estimate = await calcEstimateAmount(baseAmount, direction);
    console.log("estimate =>", estimate);
    if (estimate < estimateAmount * 0.95) {
      let btcVal = direction == "rune" ? baseAmount : 0;
      let runeVal = direction == "rune" ? 0 : baseAmount;

      const res = await walletModel.updateOne(
        {
          cardinalAddress: paymentAddress,
          ordinalAddress: ordinalAddress,
        },
        {
          btcValue: btcVal,
          runeValue: runeVal,
        }
      );
      return {
        success: false,
        msg: "Your swap request is rejected because of slipeage problem! Your Btc/Rune tokens will be send to your Runex Wallet.",
      };
    }
    let txId = "";
    console.log("txId =>", txId);
    // if (direction == "rune")
    //   txId = await sendRune(ordinalAddress, estimate, RUNEX_RUNE_ID);
    // else txId = await sendBtc(paymentAddress, estimate);

    const blockHeight = await getCurrentBlockheight();
    const newTx = new RunexTxModel({
      txType: "swap-" + direction + "-process",
      txId,
      cardinalAddress: paymentAddress,
      cardinalAddressPubkey: "",
      ordinalAddress: ordinalAddress,
      ordinalAddressPubkey: "",
      btcAmount: direction == "rune" ? 0 : estimateAmount,
      runeAmount: direction == "rune" ? estimateAmount : 0,
      status: "unconfirmed",
      blockHeight: blockHeight,
    });

    newTx.save();
    console.log("new transaction", newTx);
    return {
      success: true,
      msg: "Successfuly swaped.",
    };
  } catch (error) {
    console.log("Handle Swap Request Error ", error);
    return {
      success: false,
      error: error,
    };
  }
};

export const handleDirectSwap = async (
  paymentAddress: string,
  ordinalAddress: string,
  baseAmount: number,
  estimateAmount: number,
  direction: string
) => {
  try {
    const btcVal = direction == "rune" ? baseAmount * -1 : estimateAmount;
    const runeVal = direction == "rune" ? estimateAmount : baseAmount * -1;
    const res = await walletModel.updateOne(
      {
        cardinalAddress: paymentAddress,
        ordinalAddress: ordinalAddress,
      },
      {
        $inc: {
          btcValue: btcVal,
          runeValue: runeVal,
        },
      }
    );
    return {
      success: true,
      msg: "Successfuly swaped.",
    };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
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
    walletType
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
      psbt: psbt
    })
  } catch (error) {
    console.log("Get send Rune Psbt =>", error);
    return res.status(404).json({
      success: false,
      error: error
    })
  }
}

export const broadcastPsbt = async (req: Request, res: Response) => {
  const {
    psbt, signedPsbt
  } = req.body;

  try {
    const txId = await combinePsbt(psbt, signedPsbt);
    console.log("txid =>", txId);
    return res.status(200).json({
      success: true,
      txId: txId
    })
  } catch (error) {
    console.log("Broadcast tx error =>", error);
    return res.status(404).json({
      success: false,
      error: error
    })
  }

}

export const getSendBTCPsbt = async (req: Request, res: Response) => {
  try {
    const {
      senderAddress,
      senderPubkey,
      receiverAddress,
      amount,
      walletType
    } = req.body;
    const psbt = await generateSendBtcFromUser(senderAddress, senderPubkey, receiverAddress, amount, walletType);

    return res.status(200).json({
      success: true,
      psbt: psbt
    })
  } catch (error) {
    console.log("Generate send btc error =>", error);
    return res.status(404).json({
      success: false,
      error
    })
  }
}

export const sendBtcToUser = async (receiverAddress: string, amount: number, walletType: string) => {
  try {
    const txId = await sendBtc(receiverAddress, amount, walletType);
  } catch (err) {
  }
}
export const sendRuneToUser = async (amount: number, receiverAddress: string, runeId: string, walletType: string) => {
  try {
    const txId = await sendRune(receiverAddress, amount, runeId, walletType);

  } catch (err) {


  }
}

export const sendBtcToUserTest = async (req: Request, res: Response) => {
  const {
    receiverAddress,
    amount,
    walletType
  } = req.body;
  try {
    const txId = await sendBtc(receiverAddress, amount, walletType);
    return res.status(200).json({
      success: true,
      txId
    });

  } catch (err) {
    return res.status(404).json({
      success: false,
      err
    });

  }
}

export const sendRuneToUserTest = async (req: Request, res: Response) => {
  const {
    amount,
    receiverAddress,
    runeId,
    walletType,
  } = req.body;
  try {
    const txId = await sendRune(receiverAddress, amount, runeId, walletType);

    return res.status(200).json({
      success: true,
      txId
    });

  } catch (err) {
    return res.status(404).json({
      success: false,
      err
    });

  }
}

export const getEstimateAmount = async (req: Request, res: Response) => {
  try {
    const { tokenId, amount, poolId } = req.body;
    const estimatePool = await getEstimatePool(poolId);
    if (estimatePool.success) {
      const token1Balance = estimatePool.token1Balance || 10000000;
      const token2Balance = estimatePool.token2Balance || 10000000;
      const token1Id = estimatePool.token1Id || "btc";
      const token2Id = estimatePool.token2Id || "btc";
      let estimateAmount = 0;
      if (tokenId == token1Id) {
        const temp = Math.floor((token1Balance * token2Balance) / (token1Balance + amount));
        estimateAmount = token2Balance - temp;
      } else if (tokenId != token2Id) {
        const temp = Math.floor((token1Balance * token2Balance) / (token2Balance + amount));
        estimateAmount = token2Balance - temp;
      }

      return res.status(200).json({
        success: true,
        estimateAmount
      })
    } else {
      return res.status(200).json({
        success: false,
        estimateAmount: 0
      })
    }

  } catch (error) {
    console.log("Get Estimate Amount Error =>", error);
  }
}