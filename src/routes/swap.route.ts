import express, { Router, Request, Response } from "express";
import { broadcastPsbt, getSendRunePsbt, swap, getSendBTCPsbt, getEstimateAmount } from "../controller/swap.controller";

const router: Router = express.Router();

router.post("/swap", async (req: Request, res: Response) => {
  await swap(req, res);
});

router.post("/getSendRunePsbt", async (req: Request, res: Response) => {
  await getSendRunePsbt(req, res);
})

router.post("/broadcastPsbt", async (req: Request, res: Response) => {
  await broadcastPsbt(req, res);
});

router.post("/getSendBTCpsbt", async (req: Request, res: Response) => {
  await getSendBTCPsbt(req, res);
});

router.post("/estimateAmount", async (req: Request, res: Response) => {
  await getEstimateAmount(req, res);
})



export default router;
