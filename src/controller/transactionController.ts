import { Request, Response } from 'express';
import Transaction from '../model/transactionModel';

export const saveTransaction = async (req: Request, res: Response) => {
    console.log("Save Transaction is called!! ==========>>> ", req.body);
    const { transactionId, chainId, receiverAddress,receiverChainId } = req.body;

    if (!transactionId || !chainId || !receiverAddress || !receiverChainId) {
        return res.status(400).json({ error: 'Transaction ID and Chain ID are required.' });
    }
    try {
        const transaction = new Transaction({ transactionId, chainId,receiverAddress,receiverChainId });
        const response=await transaction.save();
        console.log("save response===>",response);
        console.log("transaction ==>", transaction);
        return res.status(201).json(transaction);
    } catch (error) {
        console.error("Error saving transaction:", error);
        return res.status(500).json({ error: 'Error saving transaction.' });
    }
};


