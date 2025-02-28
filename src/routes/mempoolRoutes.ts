import express from 'express';
import {checkConfirmedTxStatuses } from '../controller/mempoolController'

const router = express.Router();

router.get("/tx/status/confirmed", checkConfirmedTxStatuses);

export default router;
