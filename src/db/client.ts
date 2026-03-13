import { Client } from "pg";
import type { Env } from "../env";

export function createDbClient(env: Env): Client {
  return new Client({
    connectionString: env.HYPERDRIVE.connectionString,
  });
}