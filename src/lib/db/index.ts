import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _instance: DrizzleDb | null = null;

function getInstance(): DrizzleDb {
  if (!_instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _instance = drizzle(neon(url), { schema });
  }
  return _instance;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    const instance = getInstance();
    const value = instance[prop as keyof DrizzleDb];
    return typeof value === "function"
      ? (value as Function).bind(instance)
      : value;
  },
});
