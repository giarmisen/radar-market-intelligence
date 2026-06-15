-- Worth Watching: product-team signals from outside tracked actors
ALTER TABLE signals ADD COLUMN IF NOT EXISTS worth_watching boolean DEFAULT false;
