import { number } from "joi";
import { default as mongoose, Schema } from "mongoose";

const TransactionModel = new Schema(
  {
    txType: { type: String, required: true },
    txId: { type: String, required: true },
    cardinalAddress: { type: String, required: true },
    cardinalAddressPubkey: { type: String, require: true },
    ordinalAddress: { type: String, required: true },
    ordinalAddressPubkey: { type: String, require: true },
    token1Id: { type: String, required: true },
    token1Amount: { type: Number, required: true },
    token2Id: { type: String, required: true },
    token2Amount: { type: Number, required: true },
    status: { type: String, required: true },
    blockHeight: { type: Number, required: true },
  }
);

export default mongoose.model("TransactionModel", TransactionModel);
