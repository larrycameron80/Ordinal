import { default as mongoose, Schema } from "mongoose";
import { ITransaction } from "../types/types";

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  chainId: { type: String, required: true },
  receiverAddress: { type: String, required: true },
  receiverChainId: { type: String, required: true }
}, { timestamps: true });

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;