import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  externalId: integer("external_id").unique(),
  phase: text("phase").default("GROUP_STAGE").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  kickoff: timestamp("kickoff").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  winner: text("winner"),
  status: text("status").default("SCHEDULED"),
  finished: boolean("finished").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    matchId: integer("match_id").references(() => matches.id),
    predictedHome: integer("predicted_home"),
    predictedAway: integer("predicted_away"),
    predictedWinner: text("predicted_winner"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.userId, t.matchId)]
);

export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
