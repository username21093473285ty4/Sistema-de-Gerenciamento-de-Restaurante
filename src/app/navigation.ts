import { BarChart2, ClipboardList, Landmark, Package, Shield, ShoppingCart, UtensilsCrossed, Users, Users2, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "./auth";

export type Page =
  | "orders"
  | "menu"
  | "history"
  | "dashboard"
  | "extracosts"
  | "cashregister"
  | "inventory"
  | "customers"
  | "audit"
  | "users";

export interface NavItem {
  id: Page;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  permission: Permission;
  group: "pos" | "manage" | "reports" | "admin";
}

export const NAV: NavItem[] = [
  { id: "orders", label: "Frente de Caixa", shortLabel: "Caixa", icon: ShoppingCart, permission: "process_orders", group: "pos" },
  { id: "menu", label: "Cardápio", shortLabel: "Cardápio", icon: UtensilsCrossed, permission: "manage_menu", group: "manage" },
  { id: "inventory", label: "Estoque", shortLabel: "Estoque", icon: Package, permission: "manage_inventory", group: "manage" },
  { id: "customers", label: "Clientes", shortLabel: "Clientes", icon: Users2, permission: "manage_customers", group: "manage" },
  { id: "history", label: "Histórico", shortLabel: "Histórico", icon: ClipboardList, permission: "view_reports", group: "reports" },
  { id: "dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: BarChart2, permission: "view_reports", group: "reports" },
  { id: "extracosts", label: "Outros Custos", shortLabel: "Custos", icon: Wallet, permission: "manage_costs", group: "reports" },
  { id: "cashregister", label: "Fechamento", shortLabel: "Caixa", icon: Landmark, permission: "close_register", group: "reports" },
  { id: "audit", label: "Auditoria", shortLabel: "Audit", icon: Shield, permission: "view_audit", group: "admin" },
  { id: "users", label: "Usuários", shortLabel: "Usuários", icon: Users, permission: "manage_users", group: "admin" },
];

export const GROUP_LABELS: Record<NavItem["group"], string> = {
  pos: "Operação",
  manage: "Gerenciamento",
  reports: "Relatórios",
  admin: "Administração",
};

export function getVisibleNav(can: (permission: Permission) => boolean) {
  return NAV.filter((item) => can(item.permission));
}
