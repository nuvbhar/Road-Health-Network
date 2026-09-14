import { createClient } from "@supabase/supabase-js";
import {
  mockSectors,
  mockReports,
  mockVehicles,
} from "../src/services/mockData";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Seed data if empty
async function seedData() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_KEY. Skipping data seeding.");
    return;
  }
  try {
    const { count, error } = await supabase
      .from("sectors")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error checking sectors count:", error);
      return;
    }

    if (count === 0) {
      console.log("Seeding initial data to Supabase...");

      const sectorsToInsert = mockSectors.map((s) => {
        const sector = {
          ...s,
          startLat: s.bounds.startLat,
          startLng: s.bounds.startLng,
          endLat: s.bounds.endLat,
          endLng: s.bounds.endLng,
        };
        delete (sector as any).bounds;
        return sector;
      });

      await supabase.from("sectors").insert(sectorsToInsert);

      const reportsToInsert = mockReports.map((r) => {
        const data = { ...r, rawDataShared: r.rawDataShared ? 1 : 0 };
        delete (data as any).reportingVehicles;
        return data;
      });

      await supabase.from("reports").insert(reportsToInsert);

      const reportVehiclesToInsert: any[] = [];
      mockReports.forEach((r) => {
        r.reportingVehicles.forEach((v) => {
          reportVehiclesToInsert.push({ reportId: r.id, vehicleRef: v });
        });
      });

      await supabase.from("report_vehicles").insert(reportVehiclesToInsert);
      await supabase.from("vehicles").insert(mockVehicles);

      console.log("Seeding complete.");
    }
  } catch (err) {
    console.error("Failed to seed data:", err);
  }
}

seedData();
