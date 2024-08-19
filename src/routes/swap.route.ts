import express, { Router, Request, Response } from "express";
import { broadcastPsbt, getSendRunePsbt, swap, getSendBTCPsbt } from "../controller/swap.controller";

const router: Router = express.Router();

router.post("/swap", async (req: Request, res: Response) => {
  try {
    await swap(req, res);
  } catch (error) {
    console.log("Swap error =>", error);
  }
});

router.post("/getSendRunePsbt", async (req: Request, res: Response) => {
  try {
    await getSendRunePsbt(req, res);
  } catch (error) {
    console.log("Get Send Rune Error =>", error);
  }
})

router.post("/broadcastPsbt", async (req: Request, res: Response) => {
  try {
    await broadcastPsbt(req, res);
  } catch (error) {
    console.log("Broadcast psbt =>", error);
  }
})

router.post("/getSendBTCpsbt", async (req: Request, res: Response) => {
  try {
    await getSendBTCPsbt(req, res);
  } catch (error) {
    console.log("Get send btc psbt error =>", error);
  }
})



export default router;
