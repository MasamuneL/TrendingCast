import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";

const router = Router();

// POST /buy/:templateId
// Cuando llega aquí, @x402/express ya verificó y settleó el pago.
// Retorna el receipt (x402 signature) para que el frontend firme record_template_sale on-chain.
router.post("/:templateId", async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(String(req.params.templateId), 10);
    if (isNaN(templateId)) {
      res.status(400).json({ error: "Invalid templateId" });
      return;
    }

    const bypassPayment = process.env.NODE_ENV === "development" && req.headers["x-bypass-payment"] === "true";

    const rawHeader = req.headers["x-payment"] ?? req.headers["x-payment-response"];
    const paymentHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    let x402TxSignature = "bypass_" + Date.now();
    let buyerWallet = req.body.buyer as string;
    let amountUsdc = 100_000; // $0.10 default

    if (!bypassPayment && paymentHeader) {
      try {
        const payment = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
        const p = payment?.payload ?? payment;
        x402TxSignature = p?.signature ?? p?.transaction ?? x402TxSignature;
        buyerWallet = p?.from ?? p?.payer ?? payment?.accepted?.from ?? buyerWallet;
        amountUsdc = parseInt(payment?.accepted?.amount ?? payment?.amount ?? String(amountUsdc), 10);
      } catch {
        res.status(402).json({ error: "Malformed payment header" });
        return;
      }
    }

    try {
      new PublicKey(buyerWallet);
    } catch {
      res.status(400).json({ error: "Invalid buyer wallet address" });
      return;
    }

    const { creator, content, category } = req.body;
    if (!buyerWallet || !creator || !content || !category) {
      res.status(400).json({ error: "Missing required fields: buyer, creator, content, category" });
      return;
    }

    console.info("[buy] txSig=%s payer=%s amount=%d templateId=%d ts=%d",
      x402TxSignature, buyerWallet, amountUsdc, templateId, Date.now());

    // El frontend recibe estos datos y firma record_template_sale on-chain con el wallet del buyer.
    res.json({
      receipt: x402TxSignature,
      templateId,
      buyer: buyerWallet,
      creator,
      amountUsdc,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
