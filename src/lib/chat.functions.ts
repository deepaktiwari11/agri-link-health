import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const chatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

const SYSTEM_PROMPT = `You are "KrishiSetu Sahayak", the friendly AI assistant of KrishiSetu — a marketplace where farmers list crops at their own fixed price and merchants contact them to buy, plus an AI leaf-scan tool for plant disease and nutrition advice.

You help with:
- How to use the site (register as farmer/merchant, list a crop, send a purchase request, use Leaf Scan on the /scan page, manage listings in the dashboard).
- Farming guidance: crops, seasons, pests, diseases, fertilizer/NPK and micronutrient dosages, irrigation, storage.
- Market guidance: fair pricing, units (kg/quintal), negotiation tips.

Rules: answer in the same language the user writes in (Hindi, Hinglish or English). Be short, practical and use simple words a farmer understands. Use markdown bullet points when listing steps. Never invent prices of specific listings — tell them to check the Marketplace page.`;

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => chatInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI service is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      }),
    });

    if (res.status === 429) throw new Error("Too many messages right now. Please try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace credits.");
    if (!res.ok) throw new Error(`Assistant failed (${res.status})`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Assistant gave an empty reply");
    return { reply };
  });
