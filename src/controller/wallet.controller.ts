import { Request, Response } from "express";
import WalletModel from "../model/wallet.model";
import Joi, { Err } from "joi";
import mongoose from "mongoose";
import axios from "axios";
import {
  OPENAPI_UNISAT_TOKEN,
  OPENAPI_UNISAT_URL,
  MEMPOOLAPI_URL,
  TEST_MODE,
  TxType,
  TxStatus,
} from "../config/config";
const RUNEX_RUNE_ID = "";
import {
  address as Address,
  initEccLib,
  networks,
  Signer as BTCSigner,
} from "bitcoinjs-lib";
import { ECPairFactory, ECPairAPI } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";
import { sendBtc, sendRune } from "../utils/psbt";
import RunexTxModel from "../model/transaction.model";
import BalanceModel from "../model/balance.model";
import { getCurrentBlockheight } from "../utils/mempool";
import { updateTxStatus } from "./transaction.controller";

initEccLib(ecc as any);
declare const window: any;
const ECPair: ECPairAPI = ECPairFactory(ecc);
// const network = networks.testnet;
const network = TEST_MODE ? networks.testnet : networks.bitcoin;

const walletSchema = Joi.object({
  paymentAddress: Joi.string().required(),
  paymentPublicKey: Joi.string().required(),
  ordinalAddress: Joi.string().required(),
  ordinalPublicKey: Joi.string().required(),
  walletType: Joi.string().required(),
  hash: Joi.string().required(),
});

export const walletConnect = async (req: Request, res: Response) => {
  const { error, value } = walletSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ success: false, error: error.details[0].message });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      paymentAddress,
      paymentPublicKey,
      ordinalAddress,
      ordinalPublicKey,
      walletType,
      hash,
    } = value;

    const walletExist = await WalletModel.findOne({
      paymentAddress,
      paymentPublicKey,
      ordinalAddress,
      ordinalPublicKey,
      walletType,
    });

    if (walletExist) {
      const message =
        walletExist.hash === hash ? "Signed successfully." : "Hash mismatch.";
      const status = walletExist.hash === hash ? 200 : 422;
      return res.status(status).json({
        success: walletExist.hash === hash,
        payload: walletExist,
        message,
      });
    }

    const newWallet = new WalletModel(value);
    await newWallet.save({ session });
    await session.commitTransaction();
    return res.status(201).json({
      success: true,
      payload: newWallet,
      message: "New user is stored successfully!",
    });
  } catch (error) {
    console.error("Wallet Connect Error: ", error);
    await session.abortTransaction();
    return res.status(500).json({ success: false });
  } finally {
    session.endSession();
  }
};

export const getBTCBalance = async (req: Request, res: Response) => {
  try {
    const { paymentAddress } = req.body;

    const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${paymentAddress}/balance`;
    const config = {
      headers: {
        Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
      },
    };
    const response = await axios.get(url, config);
    console.log("response.data.data ==> ", response.data.data);
    const { satoshi, btcSatoshi } = response.data.data;

    return res.status(200).json({
      success: true,
      payload: {
        satoshi,
        btcSatoshi,
      },
    });
  } catch (error) {
    console.log("Get BTC Balance Error =>", error);
  }
};

export const getRuneBalance = async (req: Request, res: Response) => {
  try {
    const { ordinalAddress, runeId } = req.body;
    const config = {
      headers: {
        Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
      },
    };

    const url = `${OPENAPI_UNISAT_URL}/v1/indexer/address/${ordinalAddress}/runes/${runeId}/balance`;
    const response = await axios.get(url, config);
    console.log("response ==> ", response.data.data);
    return res.status(201).json({
      success: true,
      payload: response.data.data,
      message: "Fetching successfully!",
    });
  } catch (error) {
    console.log("Get Rune Balance Error =>", error);
  }
};

export const getUserInventory = async (req: Request, res: Response) => {
  const { paymentAddress, ordinalAddress } = req.body;
  console.log("Get user Inventory =>", paymentAddress, ordinalAddress);
  try {
    const userData = await WalletModel.findOne({
      paymentAddress,
      ordinalAddress,
    });
    console.log("user data", userData);
    res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (err) {
    console.log("Get user inventory error =>", err);
  }
};

export const updateBalance = async (
  paymentAddress: string,
  ordinalAddress: string,
  btcBalance: number,
  runeBalance: number,
  direct: boolean
) => {
  try {
    const btcVal = direct == true ? btcBalance : -1 * btcBalance;
    const runeVal = direct == true ? runeBalance : -1 * runeBalance;
    const res = await WalletModel.updateOne(
      { paymentAddress, ordinalAddress },
      { $inc: { btcValue: btcVal, runeValue: runeVal } }
    );
    if (res)
      return {
        success: true,
        msg: "Successfully transfered",
      };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
};

export const withdraw = async (req: Request, res: Response) => {
  const { walletId, tokenId, balance } = req.body;
  try {
    const wallet = await WalletModel.findById(walletId);
    const walletBalance = await BalanceModel.findOne({
      walletId: walletId,
      tokenId: tokenId,
    });

    if (wallet && walletBalance && walletBalance.balance > balance) {
      let txId = "";
      if (tokenId == "btc") {
        txId = await sendBtc(wallet.paymentAddress, balance, wallet.walletType);
      } else {
        txId = await sendRune(
          wallet.ordinalAddress,
          balance,
          tokenId,
          wallet.walletType
        );
      }
      const blockHeight = await getCurrentBlockheight();
      const newTx = new RunexTxModel({
        txType: TxType.WITHDRAW,
        txId,
        cardinalAddress: wallet.paymentAddress,
        cardinalPubkey: wallet.paymentPublicKey,
        ordinalAddress: wallet.ordinalAddress,
        ordinalPubkey: wallet.ordinalPublicKey,
        token1Id: tokenId,
        token1Amount: balance,
        token2Id: "",
        token2Amount: 0,
        status: TxStatus.UNCONFIRMED,
        blockHeight: blockHeight,
      });

      await newTx.save();

      return res.status(200).json({
        success: true,
        txId,
      });
    } else {
      return res.status(404).json({
        success: false,
        msg: "You don't have enough balance!",
      });
    }
  } catch (error) {
    return res.status(404).json({
      success: false,
      error,
    });
  }
};

export const handleWithdraw = async (
  paymentAddress: string,
  ordinalAddress: string,
  btcBalance: number,
  runeBalance: number
) => {
  try {
    const res = await WalletModel.updateOne(
      { paymentAddress, ordinalAddress },
      { $inc: { btcValue: btcBalance, runeValue: runeBalance } }
    );
    if (res)
      return {
        success: true,
        msg: "Successfully transfered",
      };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
};

export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.body;
    const balanceList = await BalanceModel.find({ walletId });
    return res.status(200).json({
      success: true,
      balanceList,
    });
  } catch (err) {
    console.log("Get Wallet Balance Error =>", err);
    return res.status(404).json({
      success: false,
      err,
    });
  }
};

export const updateWalletBalance = async (req: Request, res: Response) => {
  try {
    const { walletId, tokenId, balance, direct } = req.body;

    const balanceExist = await BalanceModel.findOne({
      walletId: walletId,
      tokenId: tokenId,
    });
    if (balanceExist) {
      if (direct == "withdraw" && balanceExist.balance < balance) {
        return res.status(200).json({
          success: false,
          msg: "Your balance is not too enough!",
        });
      }
      const updateBalance = direct == "deposit" ? balance : -1 * balance;
      await BalanceModel.findOneAndUpdate(
        {
          walletId: walletId,
          tokenId: tokenId,
        },
        {
          $inc: {
            balance: updateBalance,
          },
        }
      );
    } else {
      const newBalance = new BalanceModel({
        walletId: walletId,
        tokenId: tokenId,
        balance: balance,
      });
      await newBalance.save();
    }

    return res.status(200).json({
      success: true,
      msg: "Successfully updated",
    });
  } catch (err) {
    console.log("Insert Wallet Balance Error =>", err);
    return res.status(404).json({ err });
  }
};
export const handleDepositWithdraw = async (cardinalAddress: string, ordinalAddress: string, tokenId: string, balance: number, direct: string, txId: string) => {
  try {
    const wallet = await WalletModel.findOne({paymentAddress: cardinalAddress, ordinalAddress: ordinalAddress});

    if (wallet) {
      const walletId = wallet._id;
      const balanceExist = await BalanceModel.findOne({
        walletId: walletId,
        tokenId: tokenId,
      });
      if (balanceExist) {
        if (direct == "withdraw" && balanceExist.balance < balance) {
          return;
        }
        const updateBalance = direct == "deposit" ? balance : -1 * balance;
        await BalanceModel.findOneAndUpdate(
          {
            walletId: walletId,
            tokenId: tokenId,
          },
          {
            $inc: {
              balance: updateBalance,
            },
          }
        );
      } else {
        const newBalance = new BalanceModel({
          walletId: walletId,
          tokenId: tokenId,
          balance: balance,
        });
        await newBalance.save();
      }
      await updateTxStatus(txId,TxStatus.PROCESSED);
    }
  } catch (error) {
    console.log("Deposit Withdraw Error =>", error);
  }
};

export const updateAdminBalance = async (fee: number) => {
  try {
    await BalanceModel.findOneAndUpdate(
      { walletId: "admin" },
      {
        $inc: {
          balance: fee,
        },
      }
    );
  } catch (error) {
    console.log("Add fee error =>", error);
  }
};
