export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  status: InventoryStatus;
}

export interface CatalogService {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  department: string | null;
  status: 'available' | 'unavailable';
  is_active: boolean;
  linked_collection: string | null;
  lab_results: string[];
}
