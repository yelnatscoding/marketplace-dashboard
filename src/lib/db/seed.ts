import { getDb, schema } from "./index";

const SKU_SEED_DATA = [
  { mpn: "4WWA3LW/A", cost: 244, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum" },
  { mpn: "4WWF3LW/A", cost: 244, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum" },
  { mpn: "4WWJ3LW/A", cost: 244, size: "42mm", connectivity: "GPS", description: "42mm GPS Aluminum" },
  { mpn: "4WXA3LW/A", cost: 274, size: "42mm", connectivity: "Cell", description: "42mm Cell Aluminum" },
  { mpn: "4WY03LW/A", cost: 290, size: "46mm", connectivity: "Cell", description: "46mm Cell Aluminum" },
  { mpn: "4WY33LW/A", cost: 290, size: "46mm", connectivity: "Cell", description: "46mm Cell Aluminum" },
];

export async function seedSkuCosts() {
  const db = getDb();

  for (const sku of SKU_SEED_DATA) {
    const existing = db
      .select()
      .from(schema.skuCostTable)
      .where(
        require("drizzle-orm").eq(schema.skuCostTable.mpn, sku.mpn)
      )
      .get();

    if (!existing) {
      db.insert(schema.skuCostTable).values(sku).run();
    }
  }

  return SKU_SEED_DATA.length;
}
