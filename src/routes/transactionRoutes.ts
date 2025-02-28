import { Router } from 'express';
import { saveTransaction } from '../controller/transactionController';

const router = Router();

router.post('/transactions', saveTransaction);

export default router;

