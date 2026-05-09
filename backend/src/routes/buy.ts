import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";

const router = Router();

// POST /buy/:templateId
// Cuando llega aquí, @x402/express ya verificó y settleó el pago.
// Retorna el receipt (x402 signature) para que el frontend firme record_template_sale on-chain.
router.post("/:templateId", async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(String(req.params.templateId), 10);
    if (isNaN(templateId) || templateId < 0 || templateId > 0xFFFFFFFF || !Number.isInteger(templateId)) {
      res.status(400).json({ error: "Invalid templateId: must be a non-negative 32-bit integer" });
      return;
    }

    const bypassPayment = process.env.NODE_ENV === "development" && req.headers["x-bypass-payment"] === "true";

    const rawHeader = req.headers["x-payment"] ?? req.headers["x-payment-response"];
    const paymentHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    let x402TxSignature = "bypass_" + Date.now();
    let buyerWallet = req.body.buyer as string;
    let amountUsdc = 100_000; // $0.10 default

    if (!bypassPayment) {
      if (!paymentHeader) {
        res.status(402).json({ error: "Payment required: missing X-Payment header" });
        return;
      }
      try {
        const payment = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
        const p = payment?.payload ?? payment;
        x402TxSignature = p?.signature ?? p?.transaction ?? x402TxSignature;
        buyerWallet = p?.from ?? p?.payer ?? payment?.accepted?.from ?? buyerWallet;
        const parsedAmount = parseInt(payment?.accepted?.amount ?? payment?.amount ?? String(amountUsdc), 10);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          res.status(402).json({ error: "Invalid payment amount in header" });
          return;
        }
        amountUsdc = parsedAmount;
      } catch {
        res.status(402).json({ error: "Malformed payment header" });
        return;
      }
    }

    if (x402TxSignature.length > 128) {
      res.status(400).json({ error: "Payment signature exceeds maximum length" });
      return;
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

    // Validate creator is a valid Solana pubkey
    try {
      new PublicKey(creator);
    } catch {
      res.status(400).json({ error: "Invalid creator wallet address" });
      return;
    }

    if (typeof content !== "string" || content.length > 256) {
      res.status(400).json({ error: "content must be a string of at most 256 characters" });
      return;
    }

    if (typeof category !== "string" || category.length > 32) {
      res.status(400).json({ error: "category must be a string of at most 32 characters" });
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
    console.error("[buy] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
