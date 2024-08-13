import express, { Router, Request, Response } from "express";
import { broadcastPsbt, getSplitRunePsbt, getSendSplitedRunePsbt, getSendRunePsbt, swap, getSendBTCPsbt } from "../controller/swap.controller";

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

router.post("/getSplitRunePsbt", async (req: Request, res: Response) => {
  try {
    await getSplitRunePsbt(req, res);
  } catch (error) {
    console.log("getSplitRunePsbt psbt =>", error);
  }
})

router.post("/getSendSplitedRunePsbt", async (req: Request, res: Response) => {
  try {
    await getSendSplitedRunePsbt(req, res);
  } catch (error) {
    console.log("getSendSplitedRunePsbt psbt =>", error);
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
