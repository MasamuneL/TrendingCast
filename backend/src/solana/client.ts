import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

// importar JSON para evitar el conflicto de rootDir con target/types/*.ts
// FIXME: usar el tipo Trendingcast cuando anchor-lang exporte tipos sin restricción de rootDir
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>;

let _program: AnyProgram | null = null;

export const getProgram = (): AnyProgram => {
  if (_program) return _program;

  const keypairPath = process.env.WALLET_KEYPAIR_PATH ?? path.join(os.homedir(), ".config", "solana", "id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const connection = new Connection(
    process.env.RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed"
  );

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Primero intenta el IDL generado por anchor build; si no existe usa la copia del frontend
  const idlPrimary = path.resolve(__dirname, "../../../target/idl/trendsurge.json");
  const idlFallback = path.resolve(__dirname, "../../../web/src/lib/trendsurge.json");
  const idlPath = fs.existsSync(idlPrimary) ? idlPrimary : idlFallback;
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  // target IDL may have the old program ID — override with the one from env
  if (!process.env.TRENDSURGE_PROGRAM_ID) {
    throw new Error("TRENDSURGE_PROGRAM_ID env var not set — refusing to start with wrong program");
  }
  idl.address = process.env.TRENDSURGE_PROGRAM_ID;

  _program = new Program(idl, provider);
  return _program;
};

export const getConnection = () => getProgram().provider.connection;
export const getWallet = () => (getProgram().provider as anchor.AnchorProvider).wallet;
