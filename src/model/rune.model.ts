import { default as mongoose, Schema } from "mongoose";

const RuneModel = new Schema(
    {
        runeId: { type: String, required: true },
        name: { type: String, required: true },
        nick: { type: String, required: true },
        symbol: { type: String, required: true },
        divisibility: { type: Number, required: true },
    }
);

export default mongoose.model("RuneModel", RuneModel);
