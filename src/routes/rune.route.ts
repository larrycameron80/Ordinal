import express, { Request, Response, Router } from "express";
import { getRuneList, addRune, removeRune } from "../controller/rune.controller";


const router: Router = express.Router();

router.get("/list", async (req: Request, res: Response) => {
    await getRuneList(req, res);
})

router.post("/add", async (req: Request, res: Response) => {
    await addRune(req, res);
})

router.post("/remove", async (req: Request, res: Response) => {
    await removeRune(req, res);
})

export default router;