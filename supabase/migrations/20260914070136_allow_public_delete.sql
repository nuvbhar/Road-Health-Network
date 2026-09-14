-- WARNING: These policies allow ANYONE with the public anon key to delete data.
-- This is highly insecure for production but enables the "Clear Database" debug button.

CREATE POLICY "Allow public delete to reports" ON reports FOR DELETE USING (true);
CREATE POLICY "Allow public delete to report_vehicles" ON report_vehicles FOR DELETE USING (true);
CREATE POLICY "Allow public delete to vehicles" ON vehicles FOR DELETE USING (true);
CREATE POLICY "Allow public delete to sectors" ON sectors FOR DELETE USING (true);
