export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired';
export type InventoryCategory =
  | 'medicine'
  | 'reagent'
  | 'supply'
  | 'equipment'
  | 'consumable'
  | 'other';

export interface InventoryItem {
  id: string;
  date_created: string;
  date_updated: string | null;
  item_code: string;
  name: string;
  description: string | null;
  category: InventoryCategory;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number | null;
  unit_cost: number | null;
  status: InventoryStatus;
  expiry_date: string | null;
  supplier: string | null;
  location: string | null;
  branch: string | null;
  last_restocked: string | null;
}

export interface CatalogService {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  duration_minutes: number | null;
  department: string | null;
  is_active: boolean;
  code: string | null;
}
