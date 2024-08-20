import express, { Request, Response, Router } from "express";
import { addLiquidity, addLiquidityRequest, createPool, getEstimateLpAmount, getPoolBalanceList, getPoolList, removeLiquidity, removeLiquidityRequest } from "../controller/pool.controller";

const router: Router = express.Router();

router.get("/list", async (req: Request, res: Response) => {
    await getPoolList(req, res);
});

router.post("/create", async (req: Request, res: Response) => {
    await createPool(req, res);
});

router.post("/estimateLp", async (req: Request, res: Response) => {
    await getEstimateLpAmount(req, res);
});

router.post("/addRequest", async (req: Request, res: Response) => {
    await addLiquidityRequest(req, res);
});

router.post("/removeRequest", async (req: Request, res: Response) => {
    await removeLiquidityRequest(req, res);
});

router.post("/poolBalanceList", async (req: Request, res: Response) => {
    await getPoolBalanceList(req, res);
})

export default router;
