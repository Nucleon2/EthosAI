import { z } from "zod";
import type { CoingeckoCoin, CoingeckoMarketChart } from "./types";
import { coingeckoCoinSchema, coingeckoMarketChartSchema } from "./schemas";

const COINGECKO_API_KEY = Bun.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = Bun.env.COINGECKO_BASE_URL;
const COINGECKO_API_KEY_TYPE = Bun.env.COINGECKO_API_KEY_TYPE;
const COINGECKO_PUBLIC_BASE_URL = "https://api.coingecko.com/api/v3";
const COINGECKO_PRO_BASE_URL = "https://pro-api.coingecko.com/api/v3";

const coingeckoContractSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string()
});

export type CoingeckoContract = z.infer<typeof coingeckoContractSchema>;

export async function getCoinById(coinId: string): Promise<CoingeckoCoin> {
  const response = await fetchCoingecko(
    `/coins/${coinId}`,
    {
      localization: "false",
      tickers: "false",
      market_data: "true",
      community_data: "true",
      developer_data: "true",
      sparkline: "false",
      status_updates: "true"
    }
  );
  if (!response.ok) {
    throw new Error(`CoinGecko coin lookup failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return coingeckoCoinSchema.parse(payload);
}

export async function getCoinMarketChart(
  coinId: string,
  days: number = 30
): Promise<CoingeckoMarketChart> {
  const query: Record<string, string> = {
    vs_currency: "usd",
    days: days.toString()
  };

  if (days >= 90) {
    query.interval = "daily";
  }

  const response = await fetchCoingecko(`/coins/${coinId}/market_chart`, query);
  if (!response.ok) {
    throw new Error(`CoinGecko market chart failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return coingeckoMarketChartSchema.parse(payload);
}

const ethPriceResponseSchema = z.object({
  ethereum: z.object({
    usd: z.number()
  })
});

/**
 * In-memory cache for ETH price with 60-second TTL
 */
let ethPriceCache: { price: number; timestamp: number } | null = null;
const ETH_PRICE_CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Fetch the current ETH price in USD via CoinGecko simple/price endpoint.
 *
 * Returns null if the request fails so callers can degrade gracefully.
 * Caches the result for 60 seconds to reduce API calls and latency.
 */
export async function getEthPriceUsd(): Promise<number | null> {
  const now = Date.now();
  
  // Return cached price if still valid
  if (ethPriceCache && now - ethPriceCache.timestamp < ETH_PRICE_CACHE_TTL_MS) {
    return ethPriceCache.price;
  }

  try {
    const response = await fetchCoingecko("/simple/price", {
      ids: "ethereum",
      vs_currencies: "usd"
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const parsed = ethPriceResponseSchema.parse(payload);
    const price = parsed.ethereum.usd;
    
    // Update cache
    ethPriceCache = { price, timestamp: now };
    
    return price;
  } catch {
    return null;
  }
}

export async function getCoinIdByContract(
  tokenAddress: string
): Promise<string> {
  const normalizedAddress = tokenAddress.toLowerCase();
  const response = await fetchCoingecko(
    `/coins/ethereum/contract/${normalizedAddress}`,
    undefined
  );
  if (!response.ok) {
    throw new Error(
      `CoinGecko contract lookup failed: ${response.status} ${response.statusText}`
    );
  }

  const payload = await response.json();
  const parsed = coingeckoContractSchema.parse(payload);
  return parsed.id;
}

type CoingeckoRequestConfig = {
  baseUrl: string;
  headers?: Record<string, string>;
};

function fetchCoingecko(
  path: string,
  query?: Record<string, string>
): Promise<Response> {
  const configs = buildRequestConfigs();
  return attemptFetch(configs, path, query, 0);
}

async function attemptFetch(
  configs: CoingeckoRequestConfig[],
  path: string,
  query: Record<string, string> | undefined,
  index: number
): Promise<Response> {
  const current = configs[index];
  if (!current) {
    throw new Error("CoinGecko request failed across all configurations");
  }

  const url = new URL(`${current.baseUrl}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: current.headers
  });

  if (response.ok) {
    return response;
  }

  if (index < configs.length - 1 && (response.status === 400 || response.status === 401)) {
    return attemptFetch(configs, path, query, index + 1);
  }

  return response;
}

function buildRequestConfigs(): CoingeckoRequestConfig[] {
  if (COINGECKO_BASE_URL) {
    return [
      {
        baseUrl: COINGECKO_BASE_URL,
        headers: buildHeaders(COINGECKO_API_KEY_TYPE)
      }
    ];
  }

  if (!COINGECKO_API_KEY) {
    return [{ baseUrl: COINGECKO_PUBLIC_BASE_URL }];
  }

  if (COINGECKO_API_KEY_TYPE === "demo") {
    return [
      {
        baseUrl: COINGECKO_PUBLIC_BASE_URL,
        headers: buildHeaders("demo")
      }
    ];
  }

  if (COINGECKO_API_KEY_TYPE === "pro") {
    return [
      {
        baseUrl: COINGECKO_PRO_BASE_URL,
        headers: buildHeaders("pro")
      }
    ];
  }

  return [
    {
      baseUrl: COINGECKO_PUBLIC_BASE_URL,
      headers: buildHeaders("demo")
    },
    {
      baseUrl: COINGECKO_PRO_BASE_URL,
      headers: buildHeaders("pro")
    }
  ];
}

function buildHeaders(
  keyType?: string
): Record<string, string> | undefined {
  if (!COINGECKO_API_KEY) return undefined;
  if (keyType === "demo") {
    return { "x-cg-demo-api-key": COINGECKO_API_KEY };
  }
  return { "x-cg-pro-api-key": COINGECKO_API_KEY };
}
