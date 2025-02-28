import * as Bitcoin from "bitcoinjs-lib";
import randomstring from "randomstring";
import fetch from "node-fetch";
import { Request } from "node-fetch";
import { createSendOrd } from "@unisat/ord-utils";
import { LocalWallet } from "./localWallet";
import { OPENAPI_URL, TEST_MODE } from "../config/config";
import { pushRawTx } from "./psbt.service";

const key = process.env.ADMIN_PRIVATE_KEY;

if (typeof key !== "string" || key === "") {
  throw new Error(
    "Environment variable PRIVATE_KEY must be set and be a valid string."
  );
}

const network = TEST_MODE ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin;

const wallet = new LocalWallet(key, TEST_MODE ? 1 : 0);

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function httpGet(route: string, params: any) {
 ;
}

async function getInscriptionUtxo(inscriptionId: string) {
 
}

async function getAddressUtxo(address: string) {
 
}

export async function sendInscription(
  targetAddress: string,
  inscriptionId: string,
  feeRate: number,
  oridnalSize: number
) {
  
};

  

