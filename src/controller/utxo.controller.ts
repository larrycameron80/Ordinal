import { Request, Response } from "express";
import UtxoModel from "../model/utxo.model";

export const getUnconfirmedRuneUtxos = async (runeId: string) => {
    try {
        const res = await UtxoModel.find({
            runedId: runeId,
            status: false,
        })

        return res;
    } catch (err) {
        return [];
    }
}

// export const insertUnconfirmedRuneUtxos = async ()

export const updateUtxoState = async (runeId: string, txId: string, vout: number) {
    
}