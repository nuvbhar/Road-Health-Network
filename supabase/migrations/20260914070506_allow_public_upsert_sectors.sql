-- Allow the debug menu to insert and update sectors
CREATE POLICY "Allow public insert to sectors" ON sectors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to sectors" ON sectors FOR UPDATE USING (true) WITH CHECK (true);
