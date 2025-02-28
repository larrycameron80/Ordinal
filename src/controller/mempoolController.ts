import { Request, Response } from 'express';
import Transaction from '../model/transactionModel';
import { getTxStatus } from '../service/mempoolSocket';

export const checkConfirmedTxStatuses = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find();

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found.' });
        }

        const statusChecks = transactions.map(async (transaction) => {
            const txStatus = await getTxStatus(transaction.transactionId);
            return {
                transactionId: transaction.transactionId,
                confirmed: txStatus.confirmed,
                blockHeight: txStatus.blockHeight,
                receiverAddress: transaction.receiverAddress, 
                receiverChainId: transaction.receiverChainId, 
            };
        });

        const results = await Promise.all(statusChecks);

        const confirmedTransactions = results.filter(tx => tx.confirmed);

        return res.json(confirmedTransactions);
        
    } catch (error) {
        console.error("Error checking transaction statuses:", error);
        return res.status(500).json({ error: 'Error checking transaction statuses.' });
    }
};