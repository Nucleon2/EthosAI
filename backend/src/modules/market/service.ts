import type {
  TokenMarketSnapshot,
  TechnicalPattern,
  TokenNewsEvent,
  TokenSentiment,
  TokenSentimentSource,
  CoingeckoCoin
} from "./types";
import {
  getCoinById,
  getCoinMarketChart,
  getCoinIdByContract
} from "./coingecko.adapter";

// Private helper functions (file-scoped, not exported)

function calculateReturns(series: Array<[number, number]>): number[] {
  const returns: number[] = [];
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1]?.[1] ?? 0;
    const current = series[i]?.[1] ?? 0;
    if (prev === 0) {
      returns.push(0);
    } else {
      returns.push((current - prev) / prev);
    }
  }
  return returns;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = average(values);
  const variance = average(
    values.map((value) => Math.pow(value - avg, 2))
  );
  return Math.sqrt(variance);
}

function analyzeTechnicalPatterns(
  prices: Array<[number, number]>,
  priceChange24h: number | null
): TechnicalPattern[] {
  if (prices.length < 5) {
    return [
      {
        label: "Limited price history",
        significance: "Not enough recent data to confidently describe trends.",
        confidence: 0.2
      }
    ];
  }

  const patterns: TechnicalPattern[] = [];
  const recent = prices.slice(-14);
  const returns = calculateReturns(recent);
  const avgReturn = average(returns);
  const volatility = standardDeviation(returns);
  const startPrice = recent[0]?.[1] ?? 0;
  const endPrice = recent[recent.length - 1]?.[1] ?? 0;
  const trendChange = startPrice > 0 ? (endPrice - startPrice) / startPrice : 0;
  const high = Math.max(...recent.map((point) => point[1]));
  const low = Math.min(...recent.map((point) => point[1]));
  const rangePercent = low > 0 ? (high - low) / low : 0;

  if (trendChange > 0.06 || avgReturn > 0.01) {
    patterns.push({
      label: "Short-term uptrend",
      significance:
        "Recent prices have been rising steadily, which often reflects stronger buying interest.",
      confidence: Math.min(0.85, 0.5 + Math.max(avgReturn, trendChange) * 5)
    });
  } else if (trendChange < -0.06 || avgReturn < -0.01) {
    patterns.push({
      label: "Short-term downtrend",
      significance:
        "Recent prices have been drifting lower, which can signal weakening demand.",
      confidence: Math.min(
        0.85,
        0.5 + Math.max(Math.abs(avgReturn), Math.abs(trendChange)) * 5
      )
    });
  } else {
    patterns.push({
      label: "Sideways movement",
      significance:
        "Prices are moving in a narrow range, suggesting the market is waiting for new catalysts.",
      confidence: 0.55
    });
  }

  if (rangePercent > 0.2) {
    patterns.push({
      label: "Wide trading range",
      significance:
        "Prices have swung through a wide range recently, suggesting reactive trading and mixed conviction.",
      confidence: Math.min(0.85, 0.45 + rangePercent)
    });
  }

  if (volatility > 0.04) {
    patterns.push({
      label: "Volatility spike",
      significance:
        "Price swings are larger than usual, which can reflect uncertainty or fast-moving news.",
      confidence: Math.min(0.8, 0.4 + volatility * 5)
    });
  }

  if (priceChange24h !== null) {
    if (priceChange24h >= 10) {
      patterns.push({
        label: "Sharp 24h move",
        significance:
          "The last 24 hours saw an outsized move, which often brings heightened attention and faster reactions.",
        confidence: Math.min(0.8, 0.5 + priceChange24h / 50)
      });
    } else if (priceChange24h <= -10) {
      patterns.push({
        label: "Sharp 24h pullback",
        significance:
          "The last 24 hours saw a steep pullback, which can amplify uncertainty and quick decision-making.",
        confidence: Math.min(0.8, 0.5 + Math.abs(priceChange24h) / 50)
      });
    }
  }

  const latest = recent[recent.length - 1]?.[1] ?? 0;

  if (latest === high) {
    patterns.push({
      label: "Testing recent highs",
      significance:
        "The price is near its recent peak, which can bring both optimism and caution.",
      confidence: 0.6
    });
  } else if (latest === low) {
    patterns.push({
      label: "Testing recent lows",
      significance:
        "The price is near its recent low, which can signal a stress test for holders.",
      confidence: 0.6
    });
  }

  return patterns.slice(0, 5);
}

function buildNewsFromStatusUpdates(coin: CoingeckoCoin): TokenNewsEvent[] {
  if (!coin.status_updates || coin.status_updates.length === 0) {
    return [
      {
        title: "No recent official updates",
        summary:
          "CoinGecko did not report recent project updates. Consider checking official channels.",
        category: "update",
        source: "coingecko"
      }
    ];
  }

  return coin.status_updates.slice(0, 5).map((update) => ({
    title: update.title || "Project update",
    summary: update.description || "No summary available.",
    category: update.category || "update",
    source: update.project?.name || update.user || "project",
    url: update.url,
    date: update.created_at
  }));
}

function buildSentimentFromCoinData(coin: CoingeckoCoin): TokenSentiment {
  const sources: TokenSentimentSource[] = [];

  const up = coin.market_data?.sentiment_votes_up_percentage ?? null;
  const down = coin.market_data?.sentiment_votes_down_percentage ?? null;
  if (up !== null || down !== null) {
    const upValue = up ?? 0;
    const downValue = down ?? 0;
    const score = (upValue - downValue) / 100;
    sources.push({
      source: "coingecko-sentiment",
      signal: score > 0.1 ? "positive" : score < -0.1 ? "negative" : "neutral",
      detail: `Community votes up ${upValue}% / down ${downValue}%`,
      score: Math.max(-1, Math.min(1, score))
    });
  }

  const communityScore =
    (coin.community_data?.twitter_followers || 0) +
    (coin.community_data?.reddit_subscribers || 0);
  if (communityScore > 0) {
    sources.push({
      source: "community-size",
      signal: "neutral",
      detail: "Community size indicates steady attention, not sentiment direction.",
      score: 0
    });
  }

  const developerScore = coin.developer_data?.developer_score ?? null;
  if (developerScore !== null) {
    sources.push({
      source: "developer-activity",
      signal: developerScore > 60
        ? "positive"
        : developerScore < 30
          ? "negative"
          : "neutral",
      detail: "Developer activity hints at project momentum.",
      score: Math.max(-1, Math.min(1, (developerScore - 50) / 50))
    });
  }

  const interest = coin.public_interest_score ?? null;
  if (interest !== null) {
    sources.push({
      source: "public-interest",
      signal: interest > 50 ? "positive" : interest < 20 ? "negative" : "neutral",
      detail: "Public interest measures broader awareness.",
      score: Math.max(-1, Math.min(1, (interest - 35) / 35))
    });
  }

  if (sources.length === 0) {
    sources.push({
      source: "coingecko",
      signal: "unknown",
      detail: "Sentiment sources unavailable from CoinGecko.",
      score: 0
    });
  }

  const aggregate = average(sources.map((entry) => entry.score));
  const overall = aggregate > 0.15
    ? "positive"
    : aggregate < -0.15
      ? "negative"
      : sources.some((entry) => entry.signal === "positive") &&
        sources.some((entry) => entry.signal === "negative")
        ? "mixed"
        : sources.some((entry) => entry.signal === "unknown")
          ? "unknown"
          : "neutral";

  return { overall, sources };
}

// Public API (exported)

export const marketService = {
  async buildTokenMarketSnapshot(
    tokenAddress: string,
    days: number = 30
  ): Promise<TokenMarketSnapshot> {
    const coinId = await getCoinIdByContract(tokenAddress);

    const [coin, chart] = await Promise.all([
      getCoinById(coinId),
      getCoinMarketChart(coinId, days)
    ]);

    const prices = chart.prices;
    const technicalPatterns = analyzeTechnicalPatterns(
      prices,
      coin.market_data?.price_change_percentage_24h ?? null
    );

    const marketData = {
      currentPriceUsd: coin.market_data?.current_price?.usd ?? null,
      priceChange24h: coin.market_data?.price_change_percentage_24h ?? null,
      marketCapUsd: coin.market_data?.market_cap?.usd ?? null,
      volume24hUsd: coin.market_data?.total_volume?.usd ?? null,
      lastUpdated: coin.market_data?.last_updated ?? null
    };

    return {
      token: {
        id: coin.id,
        address: tokenAddress,
        symbol: coin.symbol,
        name: coin.name
      },
      marketData,
      technicalPatterns,
      news: buildNewsFromStatusUpdates(coin),
      sentiment: buildSentimentFromCoinData(coin),
      priceSeries: prices.map((entry) => ({
        timestampMs: entry[0],
        priceUsd: entry[1]
      }))
    };
  }
};
