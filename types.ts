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

export interface ItemPreference {
  id: string;
  name: string;
}

export interface OrderItem {
  id: string;
  food_id: string; // The database ID of the actual food item
  food_name: string;
  food_item_price: number;
  food_quantity: number;
  preferences: Preference[];
  status: OrderStatus;
  sub_id: string;
  master_order_id: string;
  order_taken_by?: string;
  note?: string;
  food_id_type?: string;
  food_image?: string;
}

export interface Category {
  cat_id: string;
  category_name: string;
  parent_id: string;
  sort_order: string;
}

export interface MenuItem {
  id: string;
  food_name: string;
  Price: string;
  Currency: string;
  CategoryID: string;
  food_type: 'Veg' | 'Non';
  Image_Large: string;
  Image_Thumb: string;
  sort_order: string;
  // Promotion fields
  Promotion?: string;
  offer_start_date?: string;
  offer_end_date?: string;
  offer_available_weekdays?: string;
  offer_price?: string;
  offer_title?: string;
}

export interface OrderInfo {
  master_order_id: string;
  table_no: string;
  status: string;
  placed_time: string;
  total: string;
  order_type: string;
  payment_status: string;
  note: string;
  order_taken_by: string;
  tax: string;
}

export interface WaiterCall {
  order_waiter_call_id: string;
  table_no: string;
  timestamp: string;
  call_info: string;
}

export interface Table {
  table_no: string;
  status: 'inactive' | 'occupied' | 'dirty';
  guest_count: number;
  tax: number;
  master_order_id?: string | null;
}

export interface UserInfo {
  id: string | null;
  name: string | null;
  role: string | null;
  restaurantName?: string | null;
}

export type AppView = 'splash' | 'login' | 'main';

export interface AppState {
  view: AppView;
  isAuthenticated: boolean;
  user: UserInfo;
  rsId: string | null;
  currentTable: string | null;
  tables: Table[];
  orders: OrderItem[];
  orderInfo: OrderInfo | null;
  waiterCalls: WaiterCall[];
}