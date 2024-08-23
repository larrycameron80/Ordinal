import express, { Request, Response, Router } from "express";
import {
  sendBtcToUserTest,
  sendRuneToUserTest,
} from "../controller/swap.controller";
import { updateWalletBalance } from "../controller/wallet.controller";
import { addLiquidity, removeLiquidity } from "../controller/pool.controller";

const router: Router = express.Router();

router.post("/sendBtcToUser", async (req: Request, res: Response) => {
  await sendBtcToUserTest(req, res);
});

router.post("/sendRuneToUser", async (req: Request, res: Response) => {
  await sendRuneToUserTest(req, res);
});

router.post("/updateWalletBalance", async (req: Request, res: Response) => {
  await updateWalletBalance(req, res);
});

router.post("/addLiquidity", async (req: Request, res: Response) => {
  const result = await addLiquidity(
    "tb1pv4960duelry9awucr7hzrq8h6l2dsn29fyaslmpe227vmvv7lrdq7ufn9v",
    "tb1pv4960duelry9awucr7hzrq8h6l2dsn29fyaslmpe227vmvv7lrdq7ufn9v",
    "btc",
    100000,
    "2821452:123",
    500
  );
  res.json({result});
});
router.post("/removeLiquidity", async (req: Request, res: Response) => {
  const result = await removeLiquidity(
    "tb1pv4960duelry9awucr7hzrq8h6l2dsn29fyaslmpe227vmvv7lrdq7ufn9v",
    "tb1pv4960duelry9awucr7hzrq8h6l2dsn29fyaslmpe227vmvv7lrdq7ufn9v",
    "btc",
    "2821452:123",
    1000
  );
  res.json({result});
});

export default router;
