import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Menu ────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  name: string;
  sku?: string;
  salePrice: number;
  productionCost: number;
  createdAt: string;
}

// ── Orders ───────────────────────────────────────────────────────────────

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  salePrice: number;
  productionCost: number;
}

export type PaymentMethod = "cash" | "card" | "pix" | "other" | "";

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  employee: string;
  paymentMethod: PaymentMethod;
  payments: PaymentEntry[];
  change: number;
  customerId?: string;
  customerName?: string;
  totalSale: number;
  totalCost: number;
  profit: number;
  status: "open" | "cancelled";
  cancelReason?: string;
  createdAt: string;
}

// ── Daily Close ──────────────────────────────────────────────────────────

export interface DailyClose {
  id: string;
  date: string;
  totalSale: number;
  totalCost: number;
  profit: number;
  orderCount: number;
  paymentBreakdown: Record<string, number>;
  closedAt: string;
}

// ── Extra Costs ──────────────────────────────────────────────────────────

export type CostCategory = "aluguel" | "energia" | "salario" | "compras" | "manutencao" | "outro";

export interface ExtraCost {
  id: string;
  name: string;
  value: number;
  date: string;
  category: CostCategory | "";
  includeInReports: boolean;
  createdAt: string;
}

// ── Inventory ────────────────────────────────────────────────────────────

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
  menuItemId?: string;
  active: boolean;
  createdAt: string;
}

export type MovementType = "entrada" | "saida" | "ajuste" | "inventario";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

// ── Customers ────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cpf?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

// ── State ────────────────────────────────────────────────────────────────

interface StoreState {
  menuItems: MenuItem[];
  orders: Order[];
  dailyCloses: DailyClose[];
  extraCosts: ExtraCost[];
  inventory: InventoryProduct[];
  stockMovements: StockMovement[];
  customers: Customer[];
}

type OrderInput = Omit<Order, "id" | "createdAt" | "totalSale" | "totalCost" | "profit" | "status">;

interface StoreContextType extends StoreState {
  // Menu
  addMenuItem: (item: Omit<MenuItem, "id" | "createdAt">) => void;
  updateMenuItem: (id: string, item: Omit<MenuItem, "id" | "createdAt">) => void;
  deleteMenuItem: (id: string) => void;
  // Orders
  addOrder: (order: OrderInput) => Order;
  cancelOrder: (id: string, reason: string) => void;
  // Daily close
  closeDailyRegister: (date: string) => DailyClose | null;
  // Extra costs
  addExtraCost: (cost: Omit<ExtraCost, "id" | "createdAt">) => void;
  updateExtraCost: (id: string, cost: Omit<ExtraCost, "id" | "createdAt">) => void;
  deleteExtraCost: (id: string) => void;
  // Inventory
  addInventoryProduct: (p: Omit<InventoryProduct, "id" | "createdAt">) => void;
  updateInventoryProduct: (id: string, p: Partial<Omit<InventoryProduct, "id" | "createdAt">>) => void;
  addStockMovement: (m: Omit<StockMovement, "id" | "createdAt" | "previousStock" | "newStock">) => void;
  // Customers
  addCustomer: (c: Omit<Customer, "id" | "createdAt" | "totalOrders" | "totalSpent">) => Customer;
  updateCustomer: (id: string, c: Partial<Omit<Customer, "id" | "createdAt">>) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

const STORAGE_KEY = "restaurant_data_v3";

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function migrate(raw: any): StoreState {
  // Migrate from v2: add new fields with defaults
  return {
    menuItems: (raw.menuItems ?? []).map((m: any) => ({ sku: "", ...m })),
    orders: (raw.orders ?? []).map((o: any) => ({
      payments: o.paymentMethod ? [{ method: o.paymentMethod, amount: o.totalSale }] : [],
      change: 0,
      status: "open",
      ...o,
    })),
    dailyCloses: raw.dailyCloses ?? [],
    extraCosts: raw.extraCosts ?? [],
    inventory: raw.inventory ?? [],
    stockMovements: raw.stockMovements ?? [],
    customers: raw.customers ?? [],
  };
}

function loadState(): StoreState {
  try {
    const v3 = localStorage.getItem(STORAGE_KEY);
    if (v3) return migrate(JSON.parse(v3));
    // Migrate from v2
    const v2 = localStorage.getItem("restaurant_data_v2");
    if (v2) return migrate(JSON.parse(v2));
  } catch {}
  return { menuItems: [], orders: [], dailyCloses: [], extraCosts: [], inventory: [], stockMovements: [], customers: [] };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // ── Menu ────────────────────────────────────────────────────────────────

  const addMenuItem = (item: Omit<MenuItem, "id" | "createdAt">) =>
    setState((s) => ({ ...s, menuItems: [...s.menuItems, { sku: "", ...item, id: uid(), createdAt: new Date().toISOString() }] }));

  const updateMenuItem = (id: string, item: Omit<MenuItem, "id" | "createdAt">) =>
    setState((s) => ({ ...s, menuItems: s.menuItems.map((m) => m.id === id ? { ...m, ...item } : m) }));

  const deleteMenuItem = (id: string) =>
    setState((s) => ({ ...s, menuItems: s.menuItems.filter((m) => m.id !== id) }));

  // ── Orders ───────────────────────────────────────────────────────────────

  const addOrder = (order: OrderInput): Order => {
    const totalSale = order.items.reduce((s, it) => s + it.salePrice * it.quantity, 0);
    const totalCost = order.items.reduce((s, it) => s + it.productionCost * it.quantity, 0);
    const newOrder: Order = {
      ...order,
      id: uid(),
      createdAt: new Date().toISOString(),
      totalSale,
      totalCost,
      profit: totalSale - totalCost,
      status: "open",
    };
    setState((s) => ({ ...s, orders: [newOrder, ...s.orders] }));
    return newOrder;
  };

  const cancelOrder = (id: string, reason: string) =>
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => o.id === id ? { ...o, status: "cancelled", cancelReason: reason } : o),
    }));

  // ── Daily close ──────────────────────────────────────────────────────────

  const closeDailyRegister = (date: string): DailyClose | null => {
    const dayOrders = state.orders.filter((o) => o.createdAt.startsWith(date) && o.status === "open");
    if (dayOrders.length === 0) return null;
    const totalSale = dayOrders.reduce((s, o) => s + o.totalSale, 0);
    const totalCost = dayOrders.reduce((s, o) => s + o.totalCost, 0);
    const paymentBreakdown: Record<string, number> = {};
    dayOrders.forEach((o) => {
      o.payments.forEach((p) => {
        const k = p.method || "não informado";
        paymentBreakdown[k] = (paymentBreakdown[k] || 0) + p.amount;
      });
      if (!o.payments.length) {
        const k = o.paymentMethod || "não informado";
        paymentBreakdown[k] = (paymentBreakdown[k] || 0) + o.totalSale;
      }
    });
    const close: DailyClose = { id: uid(), date, totalSale, totalCost, profit: totalSale - totalCost, orderCount: dayOrders.length, paymentBreakdown, closedAt: new Date().toISOString() };
    setState((s) => ({ ...s, dailyCloses: [close, ...s.dailyCloses.filter((c) => c.date !== date)] }));
    return close;
  };

  // ── Extra Costs ──────────────────────────────────────────────────────────

  const addExtraCost = (cost: Omit<ExtraCost, "id" | "createdAt">) =>
    setState((s) => ({ ...s, extraCosts: [{ ...cost, id: uid(), createdAt: new Date().toISOString() }, ...s.extraCosts] }));

  const updateExtraCost = (id: string, cost: Omit<ExtraCost, "id" | "createdAt">) =>
    setState((s) => ({ ...s, extraCosts: s.extraCosts.map((c) => c.id === id ? { ...c, ...cost } : c) }));

  const deleteExtraCost = (id: string) =>
    setState((s) => ({ ...s, extraCosts: s.extraCosts.filter((c) => c.id !== id) }));

  // ── Inventory ────────────────────────────────────────────────────────────

  const addInventoryProduct = (p: Omit<InventoryProduct, "id" | "createdAt">) =>
    setState((s) => ({ ...s, inventory: [...s.inventory, { ...p, id: uid(), createdAt: new Date().toISOString() }] }));

  const updateInventoryProduct = (id: string, p: Partial<Omit<InventoryProduct, "id" | "createdAt">>) =>
    setState((s) => ({ ...s, inventory: s.inventory.map((i) => i.id === id ? { ...i, ...p } : i) }));

  const addStockMovement = (m: Omit<StockMovement, "id" | "createdAt" | "previousStock" | "newStock">) => {
    setState((s) => {
      const product = s.inventory.find((p) => p.id === m.productId);
      if (!product) return s;
      const previousStock = product.currentStock;
      const newStock = Math.max(0, previousStock + m.quantity);
      const movement: StockMovement = { ...m, id: uid(), createdAt: new Date().toISOString(), previousStock, newStock };
      return {
        ...s,
        inventory: s.inventory.map((p) => p.id === m.productId ? { ...p, currentStock: newStock } : p),
        stockMovements: [movement, ...s.stockMovements],
      };
    });
  };

  // ── Customers ────────────────────────────────────────────────────────────

  const addCustomer = (c: Omit<Customer, "id" | "createdAt" | "totalOrders" | "totalSpent">): Customer => {
    const customer: Customer = { ...c, id: uid(), createdAt: new Date().toISOString(), totalOrders: 0, totalSpent: 0 };
    setState((s) => ({ ...s, customers: [...s.customers, customer] }));
    return customer;
  };

  const updateCustomer = (id: string, c: Partial<Omit<Customer, "id" | "createdAt">>) =>
    setState((s) => ({ ...s, customers: s.customers.map((cu) => cu.id === id ? { ...cu, ...c } : cu) }));

  return (
    <StoreContext.Provider value={{
      ...state,
      addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, cancelOrder,
      closeDailyRegister,
      addExtraCost, updateExtraCost, deleteExtraCost,
      addInventoryProduct, updateInventoryProduct, addStockMovement,
      addCustomer, updateCustomer,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
