-- Enable RLS on all tables
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone (public)
CREATE POLICY "Allow public read access to sectors" ON sectors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public read access to report_vehicles" ON report_vehicles FOR SELECT USING (true);
CREATE POLICY "Allow public read access to vehicles" ON vehicles FOR SELECT USING (true);

-- Allow insert/update access to reports and report_vehicles (for sensor nodes)
CREATE POLICY "Allow public insert to reports" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to reports" ON reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert to report_vehicles" ON report_vehicles FOR INSERT WITH CHECK (true);

-- Allow insert/update access to vehicles
CREATE POLICY "Allow public insert to vehicles" ON vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to vehicles" ON vehicles FOR UPDATE USING (true) WITH CHECK (true);

-- No policies for DELETE (effectively blocks public deletes)

-- Enable Realtime for the reports table so the dashboard gets instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
