"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { bulkImportCrossListedInventory } from "../../../lib/actions/server";

const REQUIRED_COLUMNS = ["sku", "item_name", "platforms"] as const;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parsePlatforms(value: string) {
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseCsv(text: string) {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    return { ok: false as const, message: "CSV needs a header row and at least one cross-listed row." };
  }

  const header = parseCsvLine(rows[0]).map((column) => column.toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    return {
      ok: false as const,
      message: `CSV is missing these columns: ${missingColumns.join(", ")}.`,
    };
  }

  const headerIndex = new Map(header.map((column, index) => [column, index]));
  const items = rows.slice(1).map((row, rowIndex) => {
    const values = parseCsvLine(row);
    const sku = values[headerIndex.get("sku") ?? -1] ?? "";
    const itemName = values[headerIndex.get("item_name") ?? -1] ?? "";
    const platformsValue = values[headerIndex.get("platforms") ?? -1] ?? "";
    const platforms = parsePlatforms(platformsValue);

    if (!sku.trim()) {
      throw new Error(`Row ${rowIndex + 2} is missing a SKU.`);
    }

    if (!itemName.trim()) {
      throw new Error(`Row ${rowIndex + 2} is missing an item name.`);
    }

    if (platforms.length === 0) {
      throw new Error(`Row ${rowIndex + 2} must include at least one platform.`);
    }

    return {
      sku,
      itemName,
      platforms,
    };
  });

  return { ok: true as const, items };
}

export async function bulkImportCrossListedInventoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const file = formData.get("crossListedCsv");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a CSV file to import." };
  }

  const csvText = await file.text();

  try {
    const parsed = parseCsv(csvText);
    if (!parsed.ok) {
      return parsed;
    }

    return bulkImportCrossListedInventory(parsed.items);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not read that CSV file.",
    };
  }
}
