DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'guestbook_entries'
      AND policyname = 'guestbook_delete_all'
  ) THEN
    CREATE POLICY "guestbook_delete_all" ON guestbook_entries FOR DELETE USING (true);
  END IF;
END$$;
