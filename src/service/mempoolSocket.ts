import axios from "axios";
import mempoolJS from "@mempool/mempool.js";
import { MEMPOOLAPI_URL } from "../config/config";

interface BlockMessage {
    block?: {
        txid: string; 
    };
}

export const getTxStatus = async (tx: string) => {
    
};

export const initMempoolSocket = async () => {
    
};
