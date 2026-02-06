import type { z } from "zod";

import type {
  coingeckoCoinSchema,
  coingeckoMarketChartSchema,
  technicalPatternSchema,
  tokenNewsEventSchema,
  tokenSentimentSchema,
  tokenSentimentSourceSchema,
  tokenMarketDataSchema,
  tokenMarketSnapshotSchema
} from "./schemas";

export type CoingeckoCoin = z.infer<typeof coingeckoCoinSchema>;
export type CoingeckoMarketChart = z.infer<typeof coingeckoMarketChartSchema>;
export type TechnicalPattern = z.infer<typeof technicalPatternSchema>;
export type TokenNewsEvent = z.infer<typeof tokenNewsEventSchema>;
export type TokenSentimentSource = z.infer<typeof tokenSentimentSourceSchema>;
export type TokenSentiment = z.infer<typeof tokenSentimentSchema>;
export type TokenMarketData = z.infer<typeof tokenMarketDataSchema>;
export type TokenMarketSnapshot = z.infer<typeof tokenMarketSnapshotSchema>;
