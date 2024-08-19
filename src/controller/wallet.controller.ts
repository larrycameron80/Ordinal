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
import { sendRune } from "../utils/transfer";
import RunexTxModel from "../model/transaction.model";

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
};

export const getRuneBalance = async (req: Request, res: Response) => {
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
};

export const getUserInventory = async (req: Request, res: Response) => {
  const { paymentAddress, ordinalAddress } = req.body;
  console.log("Get user Inventory =>", paymentAddress, ordinalAddress);
  try {
    const userData = await WalletModel.findOne({
      paymentAddress,
      ordinalAddress
    });
    console.log("user data", userData)
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
  const { paymentAddress, ordinalAddress, btcBalance, runeBalance } = req.body;
  try {
    const userWallet = await WalletModel.findOne({
      paymentAddress,
      ordinalAddress,
    });

    // const btcVal = userWallet?.btcValue;
    // const runeVal = userWallet?.runeValue;
    const btcVal = 0;
    const runeVal = 0;
    if (Number(btcVal) < btcBalance || Number(runeVal) < runeBalance) {
      const errMsg = "Your wallet has not enough balance";
      return res.status(404).json({
        success: false,
        error: errMsg,
      });
    }
    const btcTxId = "";
    // const btcTxId = await sendBtc(paymentAddress, btcBalance);
    const blockHeight = await axios.get(`${MEMPOOLAPI_URL}/blocks/tip/height`);
    const newBtcTx = new RunexTxModel({
      txType: TxType.WITHDRAW,
      txId: btcTxId,
      cardinalAddress: paymentAddress,
      cardinalAddressPubkey: "",
      ordinalAddress: ordinalAddress,
      ordinalAddressPubkey: "",
      btcAmount: btcBalance,
      runeAmount: 0,
      status: "unconfirmed",
      blockHeight: blockHeight,
    });
    await newBtcTx.save();

    const runeTxId = await sendRune(ordinalAddress, runeBalance, RUNEX_RUNE_ID);
    const newRuneTx = new RunexTxModel({
      txType: TxType.WITHDRAW,
      txId: runeTxId,
      cardinalAddress: paymentAddress,
      cardinalAddressPubkey: "",
      ordinalAddress: ordinalAddress,
      ordinalAddressPubkey: "",
      btcAmount: 0,
      runeAmount: runeBalance,
      status: "unconfirmed",
      blockHeight: blockHeight,
    });
    await newRuneTx.save();

    return res.status(200).json({
      success: true,
      msg: "Successfully requested, please wait until transaction is confirmed.",
    });
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
