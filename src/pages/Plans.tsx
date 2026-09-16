import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPlans } from "../lib/api";
import type { SubscriptionPlan } from "../lib/types";

function formatPrice(plan: SubscriptionPlan, yearly: boolean): string {
  if (plan.monthlyPrice === 0) return `${plan.currency}0`;
  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
  return `${plan.currency}${price.toLocaleString()}`;
}

export function Plans() {
  const [yearly, setYearly] = useState(false);
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: getPlans });
  const plans = plansQuery.data ?? [];

  return (
    <div className="r-page" style={{ maxWidth: 820 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Radar is free to use.</h1>
        <p className="r-page-sub" style={{ maxWidth: "52ch" }}>
          Your weekly brief, the full feed, your Growth Roadmap and saved resources stay free permanently. Pro adds depth for people pushing hard at a goal.
        </p>
      </div>

      <div style={{ display: "flex", background: "#f0f2f4", borderRadius: 99, padding: 3, gap: 2, width: "fit-content", marginBottom: 22 }}>
        <button
          style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 99, border: "none", cursor: "pointer", background: !yearly ? "var(--cyan)" : "transparent", color: !yearly ? "#fff" : "var(--text-dim)" }}
          onClick={() => setYearly(false)}
        >
          Monthly
        </button>
        <button
          style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 99, border: "none", cursor: "pointer", background: yearly ? "var(--cyan)" : "transparent", color: yearly ? "#fff" : "var(--text-dim)" }}
          onClick={() => setYearly(true)}
        >
          Yearly · save 30%
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
        {plans.map((plan) =>
          plan.isPro ? (
            <div key={plan.id} style={{ background: "var(--navy)", borderRadius: 18, padding: "24px 22px", color: "#fff", position: "relative" }}>
              {plan.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: "#0d2b2d",
                    background: "var(--cyan-bright)",
                    borderRadius: 99,
                    padding: "5px 11px",
                  }}
                >
                  {plan.badge}
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)", marginBottom: 10 }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2.1rem", lineHeight: 1 }}>{formatPrice(plan, yearly)}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.55)", fontWeight: 600 }}>{yearly ? "/ year" : "/ month"}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--cyan-bright)", fontWeight: 600, marginBottom: 18 }}>
                {yearly ? `Two months free — ${plan.currency}${Math.round(plan.yearlyPrice / 10).toLocaleString()} a month` : "Switch to yearly and save 30%"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                {plan.features.map((feature) => (
                  <div key={feature} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.55 }}>
                    <span style={{ color: "var(--cyan-bright)", fontWeight: 800, flex: "none" }}>✓</span>
                    <span style={{ color: "rgba(255,255,255,.85)" }}>{feature}</span>
                  </div>
                ))}
              </div>
              <button className="btn" style={{ width: "100%", background: "var(--cyan-bright)", color: "#0d2b2d", borderColor: "transparent", padding: 14, fontSize: 14 }}>
                Start 14-day free trial
              </button>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", textAlign: "center", marginTop: 10 }}>No card required to start</div>
            </div>
          ) : (
            <div key={plan.id} style={{ background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 18, padding: "24px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
                Free · {plan.note}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 18 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2.1rem", lineHeight: 1 }}>{plan.currency}0</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>forever</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                {plan.features.map((feature) => (
                  <div key={feature} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.55 }}>
                    <span style={{ color: "var(--cyan)", fontWeight: 800, flex: "none" }}>✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <button className="btn" style={{ width: "100%", background: "#f0f2f4", color: "var(--text-muted)", borderColor: "transparent", cursor: "default" }}>
                Current plan
              </button>
            </div>
          ),
        )}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.7 }}>
        Pricing shown in Nigerian Naira, adjusted to your region. Cancel anytime — your saved resources, notes and roadmap progress stay yours on the free plan.
      </div>
    </div>
  );
}
