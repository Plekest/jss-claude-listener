import { z } from "zod";

export const ProductSchema = z.object({
  rank: z.number().int().positive(),
  name: z.string().min(1),
  company: z.string().optional(),
  url: z.string().optional(),
  justification: z.string(),
});

export const RankingSchema = z.object({
  products: z.array(ProductSchema),
});

export type Product = z.infer<typeof ProductSchema>;
export type Ranking = z.infer<typeof RankingSchema>;

export type VariantId = "with_web_search" | "without_web_search";

export type VariantResult = {
  variant: VariantId;
  model: string;
  rawResponse: unknown;
  parsed: Ranking | null;
  parseError?: string;
  usage: { inputTokens: number; outputTokens: number };
  durationMs: number;
};

export type RunRecord = {
  id: string;
  runAt: string;
  weekIso: string;
  prompt: string;
  trigger: "cron" | "manual";
  variants: {
    with_web_search: VariantResult;
    without_web_search: VariantResult;
  };
};
