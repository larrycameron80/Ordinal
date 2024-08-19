import express, { Request, Response, Router } from "express";
import { sendBtcToUserTest, sendRuneToUserTest } from "../controller/swap.controller";

const router: Router = express.Router();


router.post("/sendBtcToUser", async (req: Request, res: Response) => {
    await sendBtcToUserTest(req, res);
})

router.post("/sendRuneToUser", async (req: Request, res: Response) => {
    await sendRuneToUserTest(req, res);
})

export default router;