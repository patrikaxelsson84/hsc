-- Club presence table for real-time online status
CREATE TABLE IF NOT EXISTS club_presence (
    club_id   text        PRIMARY KEY,
    last_seen timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE club_presence ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads and writes (anon key is sufficient)
CREATE POLICY "presence_all" ON club_presence
    FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE club_presence;
