import { SquareClient, SquareEnvironment } from "square";

let cached: SquareClient | null = null;

export function getSquareClient(): SquareClient {
  if (cached) return cached;

  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("SQUARE_ACCESS_TOKEN is not set");
  }

  const env = (process.env.SQUARE_ENVIRONMENT ?? "sandbox").toLowerCase();
  const environment =
    env === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox;

  cached = new SquareClient({ token, environment });
  return cached;
}

export function getSquareLocationId(): string {
  const id = process.env.SQUARE_LOCATION_ID;
  if (!id) {
    throw new Error("SQUARE_LOCATION_ID is not set");
  }
  return id;
}
