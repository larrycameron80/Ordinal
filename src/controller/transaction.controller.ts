import { Request, Response } from "express";
import RunexTXModel from "../model/transaction.model";
import { getCurrentBlockheight } from "../utils/mempool";
import axios from "axios";
import { TxStatus } from "../config/config";

export const insert = async (req: Request, res: Response) => {
  try {
    const {
      txType,
      txId,
      cardinalAddress,
      cardinalPubkey,
      ordinalAddress,
      ordinalPubkey,
      token1Id,
      token1Amount,
      token2Id,
      token2Amount
    } = req.body;

    if (txId) {
      const blockHeight = await getCurrentBlockheight();
      const newTx = new RunexTXModel({
        txType,
        txId,
        cardinalAddress,
        cardinalPubkey,
        ordinalAddress,
        ordinalPubkey,
        token1Id,
        token1Amount,
        token2Id,
        token2Amount,
        status: TxStatus.UNCONFIRMED,
        blockHeight: blockHeight,
      });

      newTx.save();

      res.status(200).json({
        success: true,
        msg: "Successfully requested!",
      });
    }

  } catch (e: any) {
    console.log("Save Transacrion Error =>", e);
    res.status(404).json({
      success: false,
      msg: "Error occured!",
    });
  }
};

export const moveToEnd = async (txId: string) => {
  try {
    const tx = await RunexTXModel.findOneAndDelete({ txId });
    const newTx = new RunexTXModel(tx);
    await newTx.save();
    return true;
  } catch (error) {
    console.log("Move tx to end error =>", error);
    return false;
  }
};

// Status: ["unconfirmed", "confirmed", "processed"]
export const updateTxStatus = async (txId: string, status: string) => {
  try {
    const res = await RunexTXModel.updateOne(
      {
        txId,
      },
      {
        status: status,
      }
    );
    return {
      success: true,
      msg: "Successfully updated",
    };
  } catch (error) {
    console.log("Update tx status error =>", error);
    return {
      success: false,
      error: error,
    };
  }
};

export const remove = async (txId: string) => {
  try {
    const res = await RunexTXModel.deleteOne({ txId });
    return {
      success: true,
      msg: "Successfully deleted",
    };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
  }
};

export const get10Txs = async () => {
  try {
    const res = await RunexTXModel.find({
      status: { $ne: TxStatus.PROCESSED },
    }).limit(10);
    return {
      success: true,
      txList: res,
    };
  } catch (error) {
    console.log("Get 10 transactions error =>", error);
    return {
      success: false,
      error: error,
    };
  }
};

export const estimateTotalBalance = async (token1Id: string, token2Id: string) => {
  try {
    const txlist1 = await RunexTXModel.find({
      token1Id: token1Id,
      token2Id: token2Id
    })

    const txlist2 = await RunexTXModel.find({
      token1Id: token2Id,
      token2Id: token1Id
    })
  } catch (error) {

  }
}