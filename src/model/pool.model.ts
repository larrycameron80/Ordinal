import { default as mongoose, Schema } from "mongoose";

const PoolModel = new Schema(
    {
        token1Id: { type: String, required: true },
        token2Id: { type: String, require: true },
        token1Balance: { type: Number, required: true },
        token2Balance: { type: Number, required: true },
        nick1: { type: String, required: true },
        nick2: { type: String, required: true },
        totalLpBalance: { type: Number, required: true }
    },
);

export default mongoose.model("PoolModel", PoolModel);