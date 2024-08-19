import { Request, Response } from "express";
import RuneModel from "../model/rune.model";

export const getRuneList = async (req?: Request, res?: Response) => {

    try {
        const runeList = await RuneModel.find();
        console.log("runeList =>", runeList);
        if (req) {
            return res?.status(200).json({
                success: true,
                runeList
            })
        } else {
            return {
                success: true,
                runeList
            }
        }
    } catch (error) {
        console.log("Get Rune List Error =>", error);
        if (req) return res?.status(404).json({
            success: false,
            error
        })
    }
}

export const addRune = async (req: Request, res: Response) => {
    try {
        const {
            runeId, name, nick, symbol, divisibility
        } = req.body;
        const newRune = new RuneModel({
            runeId, name, nick, symbol, divisibility
        })
        await newRune.save();
        return res.status(200).json({
            success: true,
            msg: "Successfully added"
        })
    } catch (error) {
        console.log("Add Rune Error =>", error);
        return res.status(404).json({
            success: false,
            error
        })
    }
}

export const removeRune = async (req: Request, res: Response) => {
    try {
        const { runeId } = req.body;
        await RuneModel.deleteOne({ runeId: runeId });
        return res.status(200).json({
            success: true,
            msg: "Successfully removed."
        })
    } catch (error) {
        console.log("Remove Rune Error =>", error);
        return res.status(404).json({
            success: false,
            error
        })
    }
}
