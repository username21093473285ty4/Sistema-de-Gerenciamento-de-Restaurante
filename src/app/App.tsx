import { Component, lazy, memo, Suspense, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { AuthProvider, useAuth, ROLE_LABELS, ROLE_COLORS } from "./auth";
import { StoreProvider } from "./store";
import LoginPage from "./LoginPage";
import { ChefHat, Clock, LogOut, Menu, Moon, Shield, Sun, X } from "lucide-react";
import { GROUP_LABELS, getVisibleNav, type Page } from "./navigation";
import { useDarkMode } from "./useDarkMode";

const MenuManager = lazy(() => import("./components/MenuManager"));
const OrderPDV = lazy(() => import("./components/OrderPDV"));
const OrderHistory = lazy(() => import("./components/OrderHistory"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const CashRegister = lazy(() => import("./components/CashRegister"));
const ExtraCosts = lazy(() => import("./components/ExtraCosts"));
const Inventory = lazy(() => import("./components/Inventory"));
const Customers = lazy(() => import("./components/Customers"));
const AuditLog = lazy(() => import("./components/AuditLog"));
const UserManagement = lazy(() => import("./components/UserManagement"));

function PageLoader() {
  return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
}

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro ao carregar a tela", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-3 px-6 text-center text-muted-foreground">
          <Shield size={40} className="opacity-30" />
          <p>Não foi possível carregar esta tela neste momento.</p>
          <p className="text-sm">Recarregue a página e tente novamente.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Permission guard ──────────────────────────────────────────────────────

function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-3 text-muted-foreground">
      <Shield size={48} className="opacity-30" />
      <p>Acesso não permitido para seu nível.</p>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────

const Sidebar = memo(function Sidebar({ current, onChange, open, onClose, dark, onToggleDark }: {
  current: Page; onChange: (p: Page) => void;
  open: boolean; onClose: () => void;
  dark: boolean; onToggleDark: () => void;
}) {
  const { session, can, logout } = useAuth();
  const visibleNav = useMemo(() => getVisibleNav(can), [can]);
  const groups = useMemo(() => Array.from(new Set(visibleNav.map((n) => n.group))), [visibleNav]);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-40 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:relative lg:z-auto`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <ChefHat size={17} className="text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-tight">RestaurantOS</p>
            <p className="text-xs text-sidebar-accent-foreground truncate">Sistema de gestão</p>
          </div>
          <button className="lg:hidden text-sidebar-accent-foreground" onClick={onClose}><X size={17} /></button>
        </div>

        {/* Session info */}
        {session && (
          <div className="px-4 py-3 border-b border-sidebar-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs shrink-0">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{session.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded ${ROLE_COLORS[session.role]}`}>{ROLE_LABELS[session.role]}</span>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 overflow-y-auto space-y-3">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 py-1 text-xs text-sidebar-accent-foreground uppercase tracking-wider">{GROUP_LABELS[group]}</p>
              {visibleNav.filter((n) => n.group === group).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { onChange(id); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${current === id ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="px-2 py-3 border-t border-sidebar-border space-y-1 shrink-0">
          <button onClick={onToggleDark} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground text-sm">
            {dark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            <span>{dark ? "Modo claro" : "Modo escuro"}</span>
            <div className={`ml-auto w-8 h-4 rounded-full transition-colors relative ${dark ? "bg-primary" : "bg-sidebar-accent border border-sidebar-border"}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${dark ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-sidebar-foreground text-sm">
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
});

// ── Page router ───────────────────────────────────────────────────────────

function PageContent({ page }: { page: Page }) {
  const { can } = useAuth();
  const item = useMemo(() => getVisibleNav(can).find((n) => n.id === page), [can, page]);
  if (item && !can(item.permission)) return <Forbidden />;

  const pageContent = (() => {
    switch (page) {
      case "orders": return <OrderPDV />;
      case "menu": return <MenuManager />;
      case "history": return <OrderHistory />;
      case "dashboard": return <Dashboard />;
      case "cashregister": return <CashRegister />;
      case "extracosts": return <ExtraCosts />;
      case "inventory": return <Inventory />;
      case "customers": return <Customers />;
      case "audit": return <AuditLog />;
      case "users": return <UserManagement />;
      default: return null;
    }
  })();

  return (
    <PageErrorBoundary>
      <Suspense fallback={<PageLoader />}>{pageContent}</Suspense>
    </PageErrorBoundary>
  );
}

// ── Inactivity countdown ──────────────────────────────────────────────────

function InactivityBadge() {
  return (
    <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
      <Clock size={12} /> Sessão: 30 min inatividade
    </div>
  );
}

// ── Authenticated shell ───────────────────────────────────────────────────

function AppShell() {
  const { session, can } = useAuth();
  const [page, setPage] = useState<Page>(() => can("process_orders") ? "orders" : "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useDarkMode();

  const visibleNav = useMemo(() => getVisibleNav(can), [can]);
  const mobileNav = useMemo(() => visibleNav.slice(0, 5), [visibleNav]);

  if (!session) return <LoginPage />;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        current={page} onChange={setPage}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        dark={dark} onToggleDark={() => setDark((d) => !d)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground"><Menu size={22} /></button>
          <ChefHat size={18} className="text-primary" />
          <span className="text-sm">RestaurantOS</span>
          <div className="ml-auto flex items-center gap-2">
            <InactivityBadge />
            <button onClick={() => setDark((d) => !d)} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
              {dark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <PageContent page={page} />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex border-t border-border bg-card shrink-0">
          {mobileNav.map(({ id, shortLabel, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${page === id ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon size={19} />
              <span className="text-[10px]">{shortLabel}</span>
            </button>
          ))}
          {visibleNav.length > 5 && (
            <button onClick={() => setSidebarOpen(true)} className="flex-1 flex flex-col items-center gap-1 py-2 text-muted-foreground">
              <Menu size={19} />
              <span className="text-[10px]">Mais</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AuthGate />
      </StoreProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const { session, isFirstRun } = useAuth();
  if (isFirstRun || !session) return <LoginPage />;
  return <AppShell />;
}
