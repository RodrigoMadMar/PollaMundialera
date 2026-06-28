ALTER TABLE "matches"
  ADD COLUMN IF NOT EXISTS "phase" TEXT NOT NULL DEFAULT 'GROUP_STAGE';

ALTER TABLE "matches"
  ADD COLUMN IF NOT EXISTS "winner" TEXT;

ALTER TABLE "predictions"
  ADD COLUMN IF NOT EXISTS "predicted_winner" TEXT;

UPDATE "matches"
SET "winner" = CASE
  WHEN "home_score" > "away_score" THEN 'home'
  WHEN "away_score" > "home_score" THEN 'away'
  WHEN "home_score" = "away_score" THEN 'draw'
  ELSE "winner"
END
WHERE "finished" = TRUE
  AND "home_score" IS NOT NULL
  AND "away_score" IS NOT NULL
  AND "winner" IS NULL;
