import { default as mongoose, Schema } from "mongoose";

const UtxoModel = new Schema(
    {
        rundId: { type: String, required: true },
        txid: { type: String, required: true },
        value: { type: Number, required: true },
        vout: { type: Number, required: true },
        status: { type: String, required: true }
    },
);

export default mongoose.model("UtxoModel", UtxoModel);