import { default as mongoose, Schema } from "mongoose";

const PoolBalanceModel = new Schema(
    {
        walletId: { type: String, required: true },
        poolId: { type: String, required: true },
        lpBalance: { type: String, required: true }
    },
);

export default mongoose.model("PoolBalanceModel", PoolBalanceModel);