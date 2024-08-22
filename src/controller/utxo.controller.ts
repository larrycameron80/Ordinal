import { Request, Response } from "express";
import UtxoModel from "../model/utxo.model";
import { IRuneUtxo } from "../types/types";

export const getUnconfirmedRuneUtxos = async (runeId: string) => {
    try {
        const res = await UtxoModel.find({
            runedId: runeId,
            status: true,
        })

        return res;
    } catch (err) {
        return [];
    }
}

// export const insertUnconfirmedRuneUtxos = async ()
