import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { recordSaleOnChain } from "../handlers/recordSale";
import { updateReputationOnChain } from "../handlers/updateReputation";

const router = Router();

// POST /buy/:templateId
// Cuando llega aquí, @x402/express ya verificó y settleó el pago.
// req.headers["x-payment-response"] contiene la info del pago.
router.post("/:templateId", async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(String(req.params.templateId), 10);
    if (isNaN(templateId)) {
      res.status(400).json({ error: "Invalid templateId" });
      return;
    }

    // en dev se puede bypassear el pago
    const bypassPayment = process.env.NODE_ENV === "development" && req.headers["x-bypass-payment"] === "true";

    // extraer info del pago del header X-PAYMENT enviado por el cliente
    // el middleware x402 ya verificó que el pago es válido antes de llegar aquí
    const rawHeader = req.headers["x-payment"] ?? req.headers["x-payment-response"];
    const paymentHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    let x402TxSignature = "bypass_" + Date.now();
    let buyerWallet = req.body.buyer as string;
    let amountUsdc = 100_000; // $0.10 default

    if (!bypassPayment && paymentHeader) {
      try {
        const payment = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
        // x402 v2: { x402Version: 2, accepted: { amount }, payload: { from/payer, signature } }
        // x402 v1: { signature, payer, amount }
        const p = payment?.payload ?? payment;
        x402TxSignature = p?.signature ?? p?.transaction ?? x402TxSignature;
        buyerWallet = p?.from ?? p?.payer ?? payment?.accepted?.from ?? buyerWallet;
        amountUsdc = parseInt(payment?.accepted?.amount ?? payment?.amount ?? String(amountUsdc), 10);
      } catch {
        res.status(402).json({ error: "Malformed payment header" });
        return;
      }
    }

    // validar que buyerWallet sea una pubkey válida
    try {
      new PublicKey(buyerWallet);
    } catch {
      res.status(400).json({ error: "Invalid buyer wallet address" });
      return;
    }

    const { creator, content, category, price } = req.body;
    if (!buyerWallet || !creator || !content || !category) {
      res.status(400).json({ error: "Missing required fields: buyer, creator, content, category" });
      return;
    }
    // precio listado del template; si no viene, usar lo que se pagó (demo fallback)
    const priceLamports: number = typeof price === "number" ? price : amountUsdc;

    const result = await recordSaleOnChain({
      templateId,
      buyerWallet,
      creatorWallet: creator,
      amountUsdc,
      priceLamports,
      x402TxSignature,
      content,
      category,
    });

    console.info("[buy] txSig=%s payer=%s amount=%d ts=%d", x402TxSignature, buyerWallet, amountUsdc, Date.now());

    // recalcular reputación del creator post-venta
    try {
      await updateReputationOnChain(creator);
    } catch (err: any) {
      console.error("[buy] reputation update failed for %s: %s", creator, err.message);
    }

    res.json({ receipt: result.paymentPDA, template: result.templatePDA });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
