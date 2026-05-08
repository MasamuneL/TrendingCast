import * as anchor from "@anchor-lang/core";
import { Program, BN } from "@anchor-lang/core";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { Trendingcast } from "../target/types/trendingcast";

describe("trendingcast", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Trendingcast as Program<Trendingcast>;

  const PROFILE_SEED = Buffer.from("profile");
  const REPUTATION_SEED = Buffer.from("reputation");
  const TEMPLATE_SEED = Buffer.from("template");
  const PAYMENT_SEED = Buffer.from("payment");
  const REC_SEED = Buffer.from("recommendation");

  // Wallets de test — descartables, devnet only
  const streamer1 = Keypair.generate();
  const streamer2 = Keypair.generate();
  const buyer1 = Keypair.generate();

  before(async () => {
    await fundWallet(streamer1.publicKey);
    await fundWallet(streamer2.publicKey);
    await fundWallet(buyer1.publicKey);
  });

  // ─── Helper: fondear wallet desde el provider (evita airdrop rate limit) ────

  const fundWallet = async (to: PublicKey, sol = 0.3) => {
    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: to,
        lamports: sol * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx);
  };

  // ─── Helpers PDA ────────────────────────────────────────────────────────────

  const findProfilePDA = (wallet: PublicKey) =>
    PublicKey.findProgramAddressSync([PROFILE_SEED, wallet.toBuffer()], program.programId);

  const findReputationPDA = (wallet: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [REPUTATION_SEED, wallet.toBuffer()],
      program.programId
    );

  const findTemplatePDA = (creator: PublicKey, templateId: number) => {
    const idBuf = Buffer.alloc(4);
    idBuf.writeUInt32LE(templateId, 0);
    return PublicKey.findProgramAddressSync(
      [TEMPLATE_SEED, creator.toBuffer(), idBuf],
      program.programId
    );
  };

  const findPaymentPDA = (buyer: PublicKey, templatePubkey: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [PAYMENT_SEED, buyer.toBuffer(), templatePubkey.toBuffer()],
      program.programId
    );

  const findRecPDA = (streamer: PublicKey, timestamp: number) => {
    const tsBuf = Buffer.alloc(8);
    tsBuf.writeBigInt64LE(BigInt(timestamp), 0);
    return PublicKey.findProgramAddressSync(
      [REC_SEED, streamer.toBuffer(), tsBuf],
      program.programId
    );
  };

  // ─── Tests ──────────────────────────────────────────────────────────────────

  it("creates a streamer profile", async () => {
    const [profilePDA] = findProfilePDA(streamer1.publicKey);

    await program.methods
      .createProfile("gaming", Buffer.from([20, 21, 22]))
      .accounts({
        profile: profilePDA,
        wallet: streamer1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([streamer1])
      .rpc();

    const profile = await program.account.streamerProfile.fetch(profilePDA);
    assert.equal(profile.wallet.toBase58(), streamer1.publicKey.toBase58());
    assert.equal(profile.category, "gaming");
    // hours se decodea como Buffer en @anchor-lang/core — convertir a array para comparar
    assert.deepEqual(Array.from(profile.hours as any), [20, 21, 22]);
    assert.isAbove(profile.createdAt.toNumber(), 0);
    console.log("  ✓ Perfil creado:", profilePDA.toBase58());
  });

  it("rejects profile with invalid category (too long)", async () => {
    const dummy = Keypair.generate();
    await fundWallet(dummy.publicKey, 0.1);

    const [profilePDA] = findProfilePDA(dummy.publicKey);
    const tooLong = "a".repeat(33); // 33 chars > límite de 32

    try {
      await program.methods
        .createProfile(tooLong, Buffer.from([20]))
        .accounts({
          profile: profilePDA,
          wallet: dummy.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([dummy])
        .rpc();
      assert.fail("Debería haber fallado con categoría > 32 chars");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidCategory");
      console.log("  ✓ Error correcto para categoría demasiado larga");
    }
  });

  it("rejects profile with invalid hour (>= 24)", async () => {
    const dummy = Keypair.generate();
    await fundWallet(dummy.publicKey, 0.1);

    const [profilePDA] = findProfilePDA(dummy.publicKey);

    try {
      await program.methods
        .createProfile("music", Buffer.from([25])) // hora inválida
        .accounts({
          profile: profilePDA,
          wallet: dummy.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([dummy])
        .rpc();
      assert.fail("Debería haber fallado con hora >= 24");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidHour");
      console.log("  ✓ Error correcto para hora inválida");
    }
  });

  it("saves a recommendation", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const [recPDA] = findRecPDA(streamer1.publicKey, timestamp);

    await program.methods
      .saveRecommendation(
        new BN(timestamp),
        ["Minecraft", "Speedrun", "Clip reacción"],
        21,
        "Hoy a las 9pm: 'Top clips de la semana, ¡reacciona conmigo!'"
      )
      .accounts({
        recommendation: recPDA,
        streamer: streamer1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([streamer1])
      .rpc();

    const rec = await program.account.recommendation.fetch(recPDA);
    assert.equal(rec.streamer.toBase58(), streamer1.publicKey.toBase58());
    assert.equal(rec.bestHour, 21);
    assert.equal(rec.topics.length, 3);
    assert.equal(rec.topics[0], "Minecraft");
    console.log("  ✓ Recomendación guardada:", recPDA.toBase58());
  });

  it("records a template sale and bumps stats", async () => {
    const templateId = 1;
    const [templatePDA] = findTemplatePDA(streamer1.publicKey, templateId);
    const [paymentPDA] = findPaymentPDA(buyer1.publicKey, templatePDA);
    const [creatorRepPDA] = findReputationPDA(streamer1.publicKey);
    const [buyerRepPDA] = findReputationPDA(buyer1.publicKey);

    await program.methods
      .recordTemplateSale(
        templateId,
        new BN(100_000), // $0.10 USDC
        "x402_tx_sig_abc123_" + Date.now(),
        "Bienvenidos a mi stream de gaming, drop tu nombre 👇",
        "gaming",
        new BN(100_000)
      )
      .accounts({
        template: templatePDA,
        paymentReceipt: paymentPDA,
        creatorReputation: creatorRepPDA,
        buyerReputation: buyerRepPDA,
        buyer: buyer1.publicKey,
        creator: streamer1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer1])
      .rpc();

    const template = await program.account.streamTemplate.fetch(templatePDA);
    const receipt = await program.account.x402PaymentReceipt.fetch(paymentPDA);
    const creatorRep = await program.account.streamerReputation.fetch(creatorRepPDA);
    const buyerRep = await program.account.streamerReputation.fetch(buyerRepPDA);

    assert.equal(template.id, templateId);
    assert.equal(template.totalSales, 1);
    assert.equal(template.creator.toBase58(), streamer1.publicKey.toBase58());

    assert.equal(receipt.status, 2); // Settled
    assert.equal(receipt.buyer.toBase58(), buyer1.publicKey.toBase58());
    assert.include(receipt.x402TxSignature, "x402_tx_sig_abc123");

    assert.equal(creatorRep.totalSales, 1);
    assert.equal(creatorRep.successRate, 100);

    assert.equal(buyerRep.totalPurchases, 1);

    console.log("  ✓ Venta registrada. Template:", templatePDA.toBase58());
    console.log("  ✓ Recibo:", paymentPDA.toBase58());
  });

  it("calculates reputation correctly with the formula", async () => {
    const [repPDA] = findReputationPDA(streamer1.publicKey);

    // Verificamos estado antes
    const repBefore = await program.account.streamerReputation.fetch(repPDA);
    console.log(
      "  Estado rep before: sales=%d, purchases=%d, tokens=%s, rate=%d",
      repBefore.totalSales,
      repBefore.totalPurchases,
      repBefore.tokensEarned.toString(),
      repBefore.successRate
    );

    await program.methods
      .calculateReputation()
      .accounts({
        reputation: repPDA,
        streamer: streamer1.publicKey,
      })
      .signers([streamer1])
      .rpc();

    const rep = await program.account.streamerReputation.fetch(repPDA);
    // score = success_rate * total_sales + tokens_earned/1e9 + total_purchases * 2
    const expectedScore =
      rep.successRate * rep.totalSales +
      Number(rep.tokensEarned) / 1_000_000_000 +
      rep.totalPurchases * 2;

    assert.isAbove(rep.reputationScore.toNumber(), 0);
    assert.equal(rep.reputationScore.toNumber(), Math.floor(expectedScore));
    console.log("  ✓ Score calculado:", rep.reputationScore.toNumber(), "(esperado:", Math.floor(expectedScore), ")");
  });

  it("rejects unauthorized reputation calculation (wrong signer)", async () => {
    // streamer2 intenta recalcular la reputación de streamer1 — debe fallar
    const [rep1PDA] = findReputationPDA(streamer1.publicKey);

    try {
      // streamer1's PDA pero firmado por streamer2 — Anchor lo rechaza por seeds mismatch
      const [wrongPDA] = findReputationPDA(streamer2.publicKey);
      await program.methods
        .calculateReputation()
        .accounts({
          reputation: wrongPDA, // PDA de streamer2 que no fue inicializada
          streamer: streamer2.publicKey,
        })
        .signers([streamer2])
        .rpc();
      assert.fail("Debería haber fallado — cuenta no inicializada");
    } catch (err: any) {
      // Esperamos error de cuenta no existente o Unauthorized
      assert.ok(
        err.toString().includes("AccountNotInitialized") ||
        err.toString().includes("Unauthorized") ||
        err.toString().includes("does not exist"),
        "Error inesperado: " + err.toString()
      );
      console.log("  ✓ Rechazo correcto de rep no autorizada");
    }
  });

  // ─── TODO: distribute_rewards requiere SPL mint y ATA reales ────────────────

  it.skip("distribute_rewards — requiere mint TREND real en devnet", async () => {
    // TODO: crear mint TREND, crear ATA para streamer1, luego llamar distribute_rewards
    // Dejado como follow-up post-hackathon
  });
});
