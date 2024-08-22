import { default as mongoose, Schema } from "mongoose";

const UtxoModel = new Schema(
    {
        runedId: { type: String, required: true },
        txId: { type: String, required: true },
        value: { type: Number, required: true },
        vout: { type: Number, required: true },
        scriptpubkey: {type: String, required: true},
        divisibility: { type: Number, required: true},
        amount: {type: Number, required: true},
        status: { type: Boolean, required: true }
    },
);

export default mongoose.model("UtxoModel", UtxoModel);