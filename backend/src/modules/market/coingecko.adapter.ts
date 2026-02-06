import { z } from "zod";
import type { CoingeckoCoin, CoingeckoMarketChart } from "./model";
import { coingeckoCoinSchema, coingeckoMarketChartSchema } from "./model";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

const coingeckoContractSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string()
});

export type CoingeckoContract = z.infer<typeof coingeckoContractSchema>;

export async function getCoinById(coinId: string): Promise<CoingeckoCoin> {
  const url = new URL(`${COINGECKO_BASE_URL}/coins/${coinId}`);
  url.searchParams.append("localization", "false");
  url.searchParams.append("tickers", "false");
  url.searchParams.append("market_data", "true");
  url.searchParams.append("community_data", "true");
  url.searchParams.append("developer_data", "true");
  url.searchParams.append("sparkline", "false");
  url.searchParams.append("status_updates", "true");

  const response = await fetch(url.toString());
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
  const url = new URL(`${COINGECKO_BASE_URL}/coins/${coinId}/market_chart`);
  url.searchParams.append("vs_currency", "usd");
  url.searchParams.append("days", days.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`CoinGecko market chart failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return coingeckoMarketChartSchema.parse(payload);
}

export async function getCoinIdByContract(
  tokenAddress: string
): Promise<string> {
  const url = new URL(
    `${COINGECKO_BASE_URL}/coins/ethereum/contract/${tokenAddress}`
  );

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `CoinGecko contract lookup failed: ${response.status} ${response.statusText}`
    );
  }

  const payload = await response.json();
  const parsed = coingeckoContractSchema.parse(payload);
  return parsed.id;
}
