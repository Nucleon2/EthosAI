import { z } from "zod";

export const coingeckoCoinSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  platforms: z.record(z.string(), z.string().nullable()).optional(),
  market_data: z
    .object({
      current_price: z
        .object({
          usd: z.number().optional()
        })
        .optional(),
      price_change_percentage_24h: z.number().nullable().optional(),
      market_cap: z
        .object({
          usd: z.number().optional()
        })
        .optional(),
      total_volume: z
        .object({
          usd: z.number().optional()
        })
        .optional(),
      last_updated: z.string().optional(),
      sentiment_votes_up_percentage: z.number().nullable().optional(),
      sentiment_votes_down_percentage: z.number().nullable().optional()
    })
    .optional(),
  community_data: z
    .object({
      twitter_followers: z.number().nullable().optional(),
      reddit_subscribers: z.number().nullable().optional()
    })
    .optional(),
  developer_data: z
    .object({
      developer_score: z.number().nullable().optional(),
      commit_count_4_weeks: z.number().nullable().optional()
    })
    .optional(),
  public_interest_score: z.number().nullable().optional(),
  status_updates: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        created_at: z.string().optional(),
        user: z.string().optional(),
        project: z
          .object({
            name: z.string().optional()
          })
          .optional(),
        url: z.string().optional()
      })
    )
    .optional()
});

export const coingeckoMarketChartSchema = z.object({
  prices: z.array(z.tuple([z.number(), z.number()])),
  market_caps: z.array(z.tuple([z.number(), z.number()])).optional(),
  total_volumes: z.array(z.tuple([z.number(), z.number()])).optional()
});

export const technicalPatternSchema = z.object({
  label: z.string(),
  significance: z.string(),
  confidence: z.number().min(0).max(1)
});

export const tokenNewsEventSchema = z.object({
  title: z.string(),
  summary: z.string(),
  category: z.string().optional(),
  source: z.string().optional(),
  url: z.string().optional(),
  date: z.string().optional()
});

export const tokenSentimentSourceSchema = z.object({
  source: z.string(),
  signal: z.enum(["positive", "neutral", "negative", "unknown"]),
  detail: z.string(),
  score: z.number().min(-1).max(1)
});

export const tokenSentimentSchema = z.object({
  overall: z.enum(["positive", "neutral", "negative", "mixed", "unknown"]),
  sources: z.array(tokenSentimentSourceSchema)
});

export const tokenMarketDataSchema = z.object({
  currentPriceUsd: z.number().nullable(),
  priceChange24h: z.number().nullable(),
  marketCapUsd: z.number().nullable(),
  volume24hUsd: z.number().nullable(),
  lastUpdated: z.string().nullable()
});

export const tokenMarketSnapshotSchema = z.object({
  token: z.object({
    id: z.string(),
    address: z.string(),
    symbol: z.string(),
    name: z.string()
  }),
  marketData: tokenMarketDataSchema,
  technicalPatterns: z.array(technicalPatternSchema),
  news: z.array(tokenNewsEventSchema),
  sentiment: tokenSentimentSchema,
  priceSeries: z.array(
    z.object({
      timestampMs: z.number(),
      priceUsd: z.number()
    })
  )
});
