CREATE TABLE IF NOT EXISTS guestbook_entries (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    message    text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guestbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guestbook_read_all"   ON guestbook_entries FOR SELECT USING (true);
CREATE POLICY "guestbook_insert_all" ON guestbook_entries FOR INSERT WITH CHECK (true);
