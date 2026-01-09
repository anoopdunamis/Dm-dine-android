
export enum OrderStatus {
  CART = 'initial',
  OCCUPIED = 'Placed',
  CONFIRMED = 'Confirmed',
  PREPARED = 'Delivered'
}

export interface Preference {
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  food_name: string;
  food_item_price: number;
  food_quantity: number;
  preferences: Preference[];
  status: OrderStatus;
  sub_id: string;
  master_order_id: string;
  order_taken_by?: string;
  note?: string;
}

export interface Table {
  table_no: string;
  status: 'inactive' | 'occupied' | 'dirty';
  guest_count: number;
  tax: number;
}

export type AppView = 'splash' | 'login' | 'main';

export interface AppState {
  view: AppView;
  isAuthenticated: boolean;
  userName: string | null;
  currentTable: string | null;
  tables: Table[];
  orders: OrderItem[];
}
