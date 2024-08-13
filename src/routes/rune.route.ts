import express, { Request, Response, Router } from "express";
import { getRuneList, addRune, removeRune } from "../controller/rune.controller";


const router: Router = express.Router();

router.get("/list", async (req:Request, res:Response) => {
    try {
        await getRuneList(req, res);
    } catch (error) {
        console.log("Get All Rune list error =>", error);
    }
})

router.post("/add", async (req:Request, res:Response) => {
    try {
        await addRune(req, res);
    } catch (error) {
        console.log("Add Rune error =>", error);
    }
})

router.post("/remove", async (req:Request, res:Response) => {
    try {
        await removeRune(req, res);
    } catch (error) {
        console.log("Remove Rune error =>", error);
    }
})

export default router;