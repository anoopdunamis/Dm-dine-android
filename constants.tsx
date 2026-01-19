
import { Table, OrderItem, OrderStatus } from './types';

export const initialTables: Table[] = [
  { table_no: '101', status: 'occupied', guest_count: 2, tax: 15 },
  { table_no: '102', status: 'inactive', guest_count: 0, tax: 0 },
  { table_no: '103', status: 'occupied', guest_count: 4, tax: 35 },
  { table_no: '104', status: 'inactive', guest_count: 0, tax: 0 },
  { table_no: '201', status: 'occupied', guest_count: 1, tax: 10 },
  { table_no: '202', status: 'occupied', guest_count: 3, tax: 22 },
  { table_no: 'VIP-1', status: 'inactive', guest_count: 0, tax: 0 },
];

export const initialOrders: OrderItem[] = [
  {
    id: '1',
    // Added missing food_id to comply with OrderItem interface
    food_id: 'food_salmon_01',
    food_name: 'Grilled Salmon',
    food_item_price: 85,
    food_quantity: 1,
    status: OrderStatus.CART,
    sub_id: 'sub123',
    master_order_id: 'm1',
    preferences: [{ name: 'Extra Lemon', price: 0 }]
  },
  {
    id: '2',
    // Added missing food_id to comply with OrderItem interface
    food_id: 'food_beef_01',
    food_name: 'Beef Tenderloin',
    food_item_price: 145,
    food_quantity: 2,
    status: OrderStatus.CONFIRMED,
    sub_id: 'sub124',
    master_order_id: 'm1',
    preferences: [{ name: 'Medium Rare', price: 0 }],
    order_taken_by: 'Ahmed',
    note: 'Fast please'
  },
  {
    id: '3',
    // Added missing food_id to comply with OrderItem interface
    food_id: 'food_salad_01',
    food_name: 'Greek Salad',
    food_item_price: 45,
    food_quantity: 1,
    status: OrderStatus.PREPARED,
    sub_id: 'sub125',
    master_order_id: 'm1',
    preferences: [],
    order_taken_by: 'Ahmed'
  }
];
