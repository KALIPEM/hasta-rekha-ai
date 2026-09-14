import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  let razorpayClient: Razorpay | null = null;
  
  function getRazorpay(): Razorpay {
    if (!razorpayClient) {
      const keyId = process.env.VITE_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new Error('VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required');
      }
      razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return razorpayClient;
  }

  app.use(express.json());

  // API Route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Create order
  app.post("/api/create-order", async (req, res) => {
    try {
      const { plan, userId, currency = "INR" } = req.body;
      const razorpay = getRazorpay();

      let amount = 0; // in smallest currency unit
      let finalCurrency = currency;
      
      const baseUsdAmounts: Record<string, number> = {
        mystic: 0.99,
        deepdive: 0.29
      };

      if (!baseUsdAmounts[plan]) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      if (currency === "INR") {
        amount = plan === "mystic" ? 6000 : 2000;
      } else {
        try {
          const ratesRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          const ratesData = await ratesRes.json();
          const rate = ratesData.rates[currency];
          
          if (rate) {
             const convertedValue = baseUsdAmounts[plan] * rate;
             amount = Math.round(convertedValue * 100); 
          } else {
             // Fallback to USD if currency not found
             finalCurrency = "USD";
             amount = Math.round(baseUsdAmounts[plan] * 100);
          }
        } catch(err) {
          finalCurrency = "USD";
          amount = Math.round(baseUsdAmounts[plan] * 100);
        }
      }

      const options = {
        amount: amount,
        currency: finalCurrency,
        receipt: `rcpt_${userId.substring(0, 10)}_${Date.now()}`
      };

      const order = await razorpay.orders.create(options);
      res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (e: any) {
      console.error("Order creation error:", e);
      const errorMessage = e?.error?.description || e?.description || e?.message || JSON.stringify(e);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Verify payment
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET is required');

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', keySecret)
                                      .update(body.toString())
                                      .digest('hex');
                                      
      if (expectedSignature === razorpay_signature) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
