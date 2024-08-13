import { default as mongoose, Schema } from "mongoose";

const BalanceModel = new Schema(
    {
        walletId: { type: String, required: true },
        tokenId: { type: String, required: true },
        balance: { type: String, required: true }
    },
);

export default mongoose.model("BalanceModel", BalanceModel);