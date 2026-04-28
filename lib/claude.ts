import Anthropic from "@anthropic-ai/sdk";
import { RankingSchema, type VariantId, type VariantResult } from "./types";

const WEB_SEARCH_TOOL_TYPE = "web_search_20250305";
const SAVE_RANKING_TOOL_NAME = "save_ranking";

const SAVE_RANKING_TOOL = {
  name: SAVE_RANKING_TOOL_NAME,
  description:
    "Save the ranked list of products. Call this exactly once with the complete list ordered from best (rank 1) to worst.",
  input_schema: {
    type: "object",
    properties: {
      products: {
        type: "array",
        items: {
          type: "object",
          properties: {
            rank: { type: "integer", minimum: 1, description: "Position in the ranking, starting at 1." },
            name: { type: "string", description: "Product or library name." },
            company: { type: "string", description: "Company or organization that maintains it." },
            url: { type: "string", description: "Official product URL if known." },
            justification: { type: "string", description: "Brief reasoning for this position." },
          },
          required: ["rank", "name", "justification"],
        },
      },
    },
    required: ["products"],
  },
} as const;

const WEB_SEARCH_TOOL = {
  type: WEB_SEARCH_TOOL_TYPE,
  name: "web_search",
  max_uses: 5,
} as const;

const SYSTEM_WITH_WEB =
  "You are a research assistant. Search the web first to gather current, accurate information about the topic in the user message. Once you have enough sources, call the save_ranking tool exactly once with the complete ranked list ordered from best to worst. Always end your response with the save_ranking tool call.";

const SYSTEM_WITHOUT_WEB =
  "You are an expert evaluator of JavaScript libraries. Based on your existing knowledge (no web access), call the save_ranking tool exactly once with a complete ranked list answering the user's question, from best (rank 1) to worst.";

export async function runRanking(prompt: string): Promise<{
  with_web_search: VariantResult;
  without_web_search: VariantResult;
}> {
  const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
  const client = new Anthropic();

  const [withWeb, withoutWeb] = await Promise.all([
    runVariant(client, model, prompt, "with_web_search"),
    runVariant(client, model, prompt, "without_web_search"),
  ]);

  return { with_web_search: withWeb, without_web_search: withoutWeb };
}

async function runVariant(
  client: Anthropic,
  model: string,
  prompt: string,
  variant: VariantId,
): Promise<VariantResult> {
  const startedAt = Date.now();

  const tools =
    variant === "with_web_search"
      ? ([WEB_SEARCH_TOOL, SAVE_RANKING_TOOL] as unknown as Anthropic.Tool[])
      : ([SAVE_RANKING_TOOL] as unknown as Anthropic.Tool[]);

  const tool_choice =
    variant === "with_web_search"
      ? ({ type: "auto" } as const)
      : ({ type: "tool", name: SAVE_RANKING_TOOL_NAME } as const);

  const system = variant === "with_web_search" ? SYSTEM_WITH_WEB : SYSTEM_WITHOUT_WEB;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 8192,
      system,
      tools,
      tool_choice,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      variant,
      model,
      rawResponse: { error: message },
      parsed: null,
      parseError: message,
      usage: { inputTokens: 0, outputTokens: 0 },
      durationMs: Date.now() - startedAt,
    };
  }

  const durationMs = Date.now() - startedAt;
  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  const saveBlock = response.content.find(
    (block) => block.type === "tool_use" && block.name === SAVE_RANKING_TOOL_NAME,
  );

  if (!saveBlock || saveBlock.type !== "tool_use") {
    return {
      variant,
      model,
      rawResponse: response.content,
      parsed: null,
      parseError: "No save_ranking tool_use block found in response.",
      usage,
      durationMs,
    };
  }

  const parsed = RankingSchema.safeParse(saveBlock.input);
  if (!parsed.success) {
    return {
      variant,
      model,
      rawResponse: response.content,
      parsed: null,
      parseError: parsed.error.message,
      usage,
      durationMs,
    };
  }

  parsed.data.products.sort((a, b) => a.rank - b.rank);

  return {
    variant,
    model,
    rawResponse: response.content,
    parsed: parsed.data,
    usage,
    durationMs,
  };
}
