CREATE TABLE IF NOT EXISTS dataset_versions (
  version TEXT PRIMARY KEY,
  detail_file_name TEXT NOT NULL,
  summary_file_name TEXT NOT NULL,
  source_date DATE NOT NULL,
  poi_count INTEGER NOT NULL CHECK (poi_count >= 0),
  summary_row_count INTEGER NOT NULL CHECK (summary_row_count >= 0),
  summary_poi_count INTEGER NOT NULL CHECK (summary_poi_count >= 0),
  status TEXT NOT NULL CHECK (status IN ('importing', 'ready')),
  active BOOLEAN NOT NULL DEFAULT FALSE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_dataset_version
  ON dataset_versions (active)
  WHERE active;

CREATE TABLE IF NOT EXISTS regional_pois (
  dataset_version TEXT NOT NULL REFERENCES dataset_versions(version) ON DELETE CASCADE,
  osm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  locality TEXT NOT NULL,
  lga_name TEXT NOT NULL,
  abs_lga_code TEXT NOT NULL,
  vicmap_lga_code TEXT NOT NULL,
  regional_group TEXT NOT NULL,
  area_type TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  display_name TEXT NOT NULL,
  osm_tag_type TEXT NOT NULL,
  osm_tag_value TEXT NOT NULL,
  address_house_number TEXT NOT NULL,
  address_street TEXT NOT NULL,
  osm_address_suburb TEXT NOT NULL,
  address_postcode TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT NOT NULL,
  opening_hours TEXT NOT NULL,
  wheelchair TEXT NOT NULL,
  PRIMARY KEY (dataset_version, osm_id)
);

CREATE INDEX IF NOT EXISTS regional_pois_coordinate_lookup
  ON regional_pois (dataset_version, latitude, longitude);

CREATE INDEX IF NOT EXISTS regional_pois_category_lookup
  ON regional_pois (dataset_version, subcategory);

CREATE INDEX IF NOT EXISTS regional_pois_locality_lookup
  ON regional_pois (dataset_version, locality);

CREATE TABLE IF NOT EXISTS locality_poi_summaries (
  dataset_version TEXT NOT NULL REFERENCES dataset_versions(version) ON DELETE CASCADE,
  locality TEXT NOT NULL,
  lga_name TEXT NOT NULL,
  abs_lga_code TEXT NOT NULL,
  regional_group TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  display_name TEXT NOT NULL,
  poi_count INTEGER NOT NULL CHECK (poi_count >= 0),
  PRIMARY KEY (
    dataset_version,
    locality,
    lga_name,
    regional_group,
    category,
    subcategory
  )
);

CREATE INDEX IF NOT EXISTS locality_summaries_search
  ON locality_poi_summaries (dataset_version, locality, lga_name, regional_group);

CREATE TABLE IF NOT EXISTS ai_review_cache (
  cache_key TEXT PRIMARY KEY,
  model_version TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0)
);

CREATE INDEX IF NOT EXISTS ai_review_cache_last_accessed
  ON ai_review_cache (last_accessed_at);
