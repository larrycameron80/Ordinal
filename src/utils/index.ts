import axios from "axios";
import { OPENAPI_UNISAT_TOKEN, OPENAPI_UNISAT_URL } from "../config/config";
import { IRuneUtxo, IUtxo } from "../types/types";
import {
  Transaction,
  Psbt,
  address as Address,
  initEccLib,
  networks,
  Signer as BTCSigner,
} from "bitcoinjs-lib";
import { ECPairFactory, ECPairAPI } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";

// Calc Tx Fee
const calculateTxFee = (psbt: Psbt, feeRate: number) => {
  const tx = new Transaction();
  const SIGNATURE_SIZE = 126;
  for (let i = 0; i < psbt.txInputs.length; i++) {
    const txInput = psbt.txInputs[i];
    tx.addInput(txInput.hash, txInput.index, txInput.sequence);
    tx.setWitness(i, [Buffer.alloc(SIGNATURE_SIZE)]);
  }
  for (let txOutput of psbt.txOutputs) {
    tx.addOutput(txOutput.script, txOutput.value);
  }
  tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);
  tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);
  return tx.virtualSize() * feeRate;
};