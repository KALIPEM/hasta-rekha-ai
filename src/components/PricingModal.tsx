import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Sparkles, CreditCard } from 'lucide-react';

interface PricingModalProps {
  onClose: () => void;
  onSuccess: (plan: string) => void;
  userId: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({ onClose, onSuccess, userId }) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currency, setCurrency] = useState("INR");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loadingPricing, setLoadingPricing] = useState(true);

  useEffect(() => {
    async function loadCurrencyAndRates() {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        const userCurr = ipData.currency || "USD";
        setCurrency(userCurr);

        if (userCurr !== "INR") {
          const ratesRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          const ratesData = await ratesRes.json();
          setExchangeRate(ratesData.rates[userCurr] || 1);
        }
      } catch (e) {
        console.error("Failed to fetch location/rates", e);
        setCurrency("USD");
      } finally {
        setLoadingPricing(false);
      }
    }
    loadCurrencyAndRates();
  }, []);

  const getPrice = (plan: 'mystic' | 'deepdive') => {
    if (currency === 'INR') {
      return plan === 'mystic' ? 60 : 20;
    } else {
      const usdPrice = plan === 'mystic' ? 0.99 : 0.29;
      return usdPrice * exchangeRate;
    }
  }

  const getOriginalPrice = (plan: 'mystic' | 'deepdive') => {
    if (currency === 'INR') {
      return plan === 'mystic' ? 100 : 40;
    } else {
      const usdPrice = plan === 'mystic' ? 1.99 : 0.99;
      return usdPrice * exchangeRate;
    }
  }
  
  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(amount);
    } catch (e) {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (plan: string) => {
    try {
      setLoadingPlan(plan);
      const res = await loadRazorpayScript();
      
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setLoadingPlan(null);
        return;
      }

      const result = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan, userId, currency }),
      });
      const data = await result.json();

      if (!data.orderId) {
        console.error("Order creation failed:", data);
        alert(`Failed to create order: ${data.error || 'Ensure Razorpay keys are configured.'}`);
        setLoadingPlan(null);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "Vedic Palmistry",
        description: plan === 'mystic' ? "Family Pack (5 Readings)" : "Individual Pack (1 Reading)",
        order_id: data.orderId,
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            onSuccess(plan);
            onClose();
          } else {
             alert('Payment verification failed');
          }
        },
        prefill: {
          name: "User",
        },
        theme: {
          color: "#7C5CFF",
        },
        modal: {
          ondismiss: function() {
            setLoadingPlan(null);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (e) {
      console.error(e);
      setLoadingPlan(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 pt-safe pb-safe"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--color-surface)] border border-white/10 rounded-3xl p-6 md:p-8 max-w-4xl w-full relative overflow-y-auto hide-scrollbar max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-10 mt-2">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-3 tracking-wide">How Serious Are You About Progress?</h2>
          <p className="text-[var(--color-ink-light)] italic opacity-90">Choose the depth of your spiritual analysis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* 5 Readings Plan */}
          <div className="bg-[var(--color-brand)]/10 border border-[var(--color-brand)] shadow-[0_0_20px_rgba(124,92,255,0.15)] rounded-2xl p-6 flex flex-col relative transform md:-translate-y-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-brand)] text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full whitespace-nowrap">
              Most Popular
            </div>
            <div className="mb-4 pt-2">
              <h3 className="text-xl font-serif text-white mb-1">Family Pack</h3>
              <div className="flex items-baseline gap-2">
                {loadingPricing ? (
                   <span className="text-4xl font-semibold text-white/50 animate-pulse bg-white/10 w-24 h-10 rounded"></span>
                ) : (
                  <>
                    <span className="text-4xl font-semibold text-white">{formatPrice(getPrice('mystic'))}</span>
                    <span className="text-lg text-white/40 line-through">{formatPrice(getOriginalPrice('mystic'))}</span>
                  </>
                )}
              </div>
              <p className="text-[var(--color-brand-light)] text-sm mt-1">5 Detailed Readings</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-[var(--color-ink-light)]">
              <li className="flex items-start gap-2">
                <Sparkles size={16} className="text-[var(--color-brand-light)] shrink-0 mt-0.5"/> 
                <span className="leading-relaxed">Full cosmic intelligence profile</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles size={16} className="text-[var(--color-brand-light)] shrink-0 mt-0.5"/> 
                <span className="leading-relaxed">Deep pattern & trajectory decoding</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles size={16} className="text-[var(--color-brand-light)] shrink-0 mt-0.5"/> 
                <span className="leading-relaxed">Save reading histories permanently</span>
              </li>
            </ul>
            <button 
              onClick={() => handleCheckout('mystic')} 
              disabled={loadingPlan !== null || loadingPricing}
              className="w-full py-3 rounded-xl bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-light)] transition-colors font-medium shadow-lg drop-shadow-[0_4px_10px_rgba(124,92,255,0.3)] disabled:opacity-50"
            >
              {loadingPlan === 'mystic' ? 'Loading checkout...' : 'Get 5 Readings'}
            </button>
          </div>

          {/* 1 Reading Plan */}
          <div className="bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col hover:border-[var(--color-brand)]/30 transition-colors">
            <div className="mb-4">
              <h3 className="text-xl font-serif text-white mb-1">Individual Pack</h3>
              <div className="flex items-baseline gap-1">
                {loadingPricing ? (
                   <span className="text-4xl font-semibold text-white/50 animate-pulse bg-white/10 w-24 h-10 rounded"></span>
                ) : (
                  <span className="text-4xl font-semibold text-white">{formatPrice(getPrice('deepdive'))}</span>
                )}
              </div>
              <p className="text-[var(--color-ink-light)] text-sm mt-1">1 Detailed Reading</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-[var(--color-ink-light)]">
              <li className="flex items-start gap-2">
                <CreditCard size={16} className="text-[var(--color-brand)] shrink-0 mt-0.5"/> 
                <span className="leading-relaxed">One full detailed analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <CreditCard size={16} className="text-[var(--color-brand)] shrink-0 mt-0.5"/> 
                <span className="leading-relaxed">Comprehensive topographic report</span>
              </li>
            </ul>
            <button 
              onClick={() => handleCheckout('deepdive')} 
              disabled={loadingPlan !== null || loadingPricing}
              className="w-full py-3 rounded-xl border border-white/20 text-white hover:bg-white hover:text-black transition-colors font-medium disabled:opacity-50"
            >
              {loadingPlan === 'deepdive' ? 'Loading checkout...' : 'Get 1 Reading'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
