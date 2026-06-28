CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS "matches" (
  "id" SERIAL PRIMARY KEY,
  "external_id" INTEGER UNIQUE,
  "phase" TEXT NOT NULL DEFAULT 'GROUP_STAGE',
  "home_team" TEXT NOT NULL,
  "away_team" TEXT NOT NULL,
  "kickoff" TIMESTAMP NOT NULL,
  "home_score" INTEGER,
  "away_score" INTEGER,
  "winner" TEXT,
  "status" TEXT DEFAULT 'SCHEDULED',
  "finished" BOOLEAN DEFAULT FALSE,
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "predictions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id"),
  "match_id" INTEGER REFERENCES "matches"("id"),
  "predicted_home" INTEGER,
  "predicted_away" INTEGER,
  "predicted_winner" TEXT,
  "updated_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("user_id", "match_id")
);
