import { Router, Request, Response } from "express";
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

    // extraer info del pago verificado por el middleware x402
    // FIXME: la forma exacta del header depende de la versión de @x402/express
    const paymentHeader = Array.isArray(req.headers["x-payment-response"])
      ? req.headers["x-payment-response"][0]
      : req.headers["x-payment-response"];
    let x402TxSignature = "bypass_" + Date.now();
    let buyerWallet = req.body.buyer as string;
    let amountUsdc = 100_000; // $0.10 default

    if (!bypassPayment && paymentHeader) {
      const payment = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
      x402TxSignature = payment.signature ?? x402TxSignature;
      buyerWallet = payment.payer ?? buyerWallet;
      amountUsdc = payment.amount ?? amountUsdc;
    }

    const { creator, content, category } = req.body;
    if (!buyerWallet || !creator || !content || !category) {
      res.status(400).json({ error: "Missing required fields: buyer, creator, content, category" });
      return;
    }

    const result = await recordSaleOnChain({
      templateId,
      buyerWallet,
      creatorWallet: creator,
      amountUsdc,
      x402TxSignature,
      content,
      category,
    });

    console.info("[buy] txSig=%s payer=%s amount=%d ts=%d", x402TxSignature, buyerWallet, amountUsdc, Date.now());

    // recalcular reputación del creator post-venta
    try {
      await updateReputationOnChain(creator);
    } catch {
      // no bloquear la respuesta si falla el recálculo
    }

    res.json({ receipt: result.paymentPDA, template: result.templatePDA });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
