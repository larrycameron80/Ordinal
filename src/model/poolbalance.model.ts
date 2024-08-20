import { default as mongoose, Schema } from "mongoose";

const PoolBalanceModel = new Schema(
    {
        walletId: { type: String, required: true },
        poolId: { type: String, required: true },
        lpBalance: { type: Number, required: true }
    },
);

export default mongoose.model("PoolBalanceModel", PoolBalanceModel);