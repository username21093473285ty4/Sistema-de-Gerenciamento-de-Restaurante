import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { useStore, OrderItem, PaymentMethod, PaymentEntry } from "../store";
import { useAuth } from "../auth";
import { Plus, Minus, X, ShoppingCart, CheckCircle, ChefHat, Search, UserCircle, Banknote, CreditCard, QrCode, DollarSign, Trash2, AlertCircle } from "lucide-react";

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

const PM_CONFIG: { method: PaymentMethod; label: string; icon: typeof DollarSign }[] = [
  { method: "cash", label: "Dinheiro", icon: Banknote },
  { method: "card", label: "Cartão", icon: CreditCard },
  { method: "pix", label: "PIX", icon: QrCode },
  { method: "other", label: "Outro", icon: DollarSign },
];

export default function OrderPDV() {
  const { menuItems, customers, addOrder, updateCustomer } = useStore();
  const { session, logAudit } = useAuth();

  const [cart, setCart] = useState<OrderItem[]>([]);
  const [employee] = useState(session?.name ?? "");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod>("cash");
  const [pendingAmount, setPendingAmount] = useState("");
  const [tendered, setTendered] = useState(""); // cash tendered for change
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const totalSale = cart.reduce((s, i) => s + i.salePrice * i.quantity, 0);
  const totalCost = cart.reduce((s, i) => s + i.productionCost * i.quantity, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, totalSale - totalPaid);
  const cashPayment = payments.find((p) => p.method === "cash");
  const change = cashPayment ? Math.max(0, cashPayment.amount - (remaining + cashPayment.amount > totalSale ? 0 : remaining)) : 0;

  const filteredMenu = menuItems.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.sku ?? "").toLowerCase().includes(q);
  });

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch) return false;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
  });

  // Keyboard shortcut: F2 focuses search
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setSearch(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function addToCart(menuItemId: string) {
    const m = menuItems.find((x) => x.id === menuItemId);
    if (!m) return;
    setCart((prev) => {
      const ex = prev.find((i) => i.menuItemId === menuItemId);
      if (ex) return prev.map((i) => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId: m.id, name: m.name, quantity: 1, salePrice: m.salePrice, productionCost: m.productionCost }];
    });
  }

  function changeQty(menuItemId: string, delta: number) {
    setCart((prev) => prev.flatMap((i) => {
      if (i.menuItemId !== menuItemId) return [i];
      const q = i.quantity + delta;
      return q <= 0 ? [] : [{ ...i, quantity: q }];
    }));
  }

  function addPayment() {
    const amt = parseFloat(pendingAmount.replace(",", "."));
    if (isNaN(amt) || amt <= 0) return;
    setPayments((prev) => [...prev, { method: pendingMethod, amount: amt }]);
    setPendingAmount("");
  }

  function removePayment(idx: number) {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  }

  function quickFillRemaining() {
    setPendingAmount(remaining.toFixed(2).replace(".", ","));
  }

  function handleSubmit() {
    if (cart.length === 0) return;
    const effectivePayments = payments.length > 0 ? payments : [{ method: pendingMethod, amount: totalSale }];
    const primaryMethod = effectivePayments[0]?.method ?? "";
    const cashAmt = effectivePayments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
    const changeAmt = cashAmt > 0 ? Math.max(0, cashAmt - totalSale + (totalPaid - cashAmt)) : 0;

    const order = addOrder({
      items: cart,
      employee,
      paymentMethod: primaryMethod,
      payments: effectivePayments,
      change: changeAmt,
      ...(customerId ? { customerId, customerName: customers.find((c) => c.id === customerId)?.name } : {}),
    });

    // Update customer stats
    if (customerId) {
      const c = customers.find((x) => x.id === customerId);
      if (c) updateCustomer(customerId, { totalOrders: c.totalOrders + 1, totalSpent: c.totalSpent + totalSale });
    }

    logAudit("Pedido registrado", `ID: ${order.id} — ${fmt(totalSale)}`, "order");

    setCart([]);
    setPayments([]);
    setPendingAmount("");
    setPendingMethod("cash");
    setCustomerId("");
    setCustomerSearch("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <CheckCircle size={64} className="text-green-500" />
        <h2 className="text-green-600">Pedido registrado!</h2>
        {change > 0 && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 rounded-xl px-8 py-4 text-center">
            <p className="text-sm text-muted-foreground">Troco para o cliente</p>
            <p className="text-3xl text-green-600">{fmt(change)}</p>
          </div>
        )}
        <button onClick={() => setSuccess(false)} className="mt-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90">
          Novo pedido
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0">
      {/* Left panel: menu */}
      <div className="flex-1 p-4 md:p-5 overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <ChefHat className="text-primary" size={22} />
          <h1>Frente de Caixa</h1>
          <span className="ml-auto text-xs text-muted-foreground hidden sm:block">F2 = busca · ESC = limpa</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            ref={searchRef}
            className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar produto por nome ou SKU... (F2)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {menuItems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>Nenhum item no cardápio.</p>
            <p className="text-sm">Adicione itens primeiro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filteredMenu.map((item) => {
              const inCart = cart.find((c) => c.menuItemId === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item.id)}
                  className={`relative p-3 rounded-xl border text-left transition-all active:scale-95 ${inCart ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"}`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">{inCart.quantity}</span>
                  )}
                  <p className="text-sm pr-6 leading-tight mb-1.5">{item.name}</p>
                  {item.sku && <p className="text-xs text-muted-foreground mb-1">{item.sku}</p>}
                  <p className="text-green-600 text-sm">{fmt(item.salePrice)}</p>
                </button>
              );
            })}
            {filteredMenu.length === 0 && (
              <div className="col-span-4 text-center py-10 text-muted-foreground text-sm">
                <Search size={32} className="mx-auto mb-2 opacity-30" />
                Nenhum resultado para "{search}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right panel: cart + payment */}
      <div className="lg:w-84 xl:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col" style={{ minWidth: 320 }}>
        {/* Cart header */}
        <div className="p-4 border-b border-border flex items-center gap-2">
          <ShoppingCart size={18} />
          <h2 className="flex-1">Carrinho</h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
              <Trash2 size={12} /> Limpar
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingCart size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Clique nos produtos para adicionar</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.menuItemId} className="flex items-center gap-2 bg-accent/30 rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.name}</p>
                  <p className="text-xs text-green-600">{fmt(item.salePrice * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => changeQty(item.menuItemId, -1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-border"><Minus size={11} /></button>
                  <span className="w-5 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => changeQty(item.menuItemId, 1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-border"><Plus size={11} /></button>
                  <button onClick={() => setCart((p) => p.filter((c) => c.menuItemId !== item.menuItemId))} className="w-6 h-6 text-muted-foreground hover:text-destructive ml-1"><X size={13} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border space-y-3">
          {/* Customer */}
          <div className="relative">
            <label className="block text-xs text-muted-foreground mb-1">Cliente (opcional)</label>
            <div className="relative">
              <UserCircle size={15} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                className="w-full border border-border rounded-lg pl-8 pr-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Buscar cliente..."
                value={customerId ? (customers.find((c) => c.id === customerId)?.name ?? customerSearch) : customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerId("");
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
              />
              {customerId && (
                <button onClick={() => { setCustomerId(""); setCustomerSearch(""); }} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
              )}
            </div>
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onMouseDown={() => { setCustomerId(c.id); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}>
                    <p>{c.name}</p>
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          {cart.length > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground">Pagamento</label>
                  {remaining > 0 && payments.length > 0 && (
                    <span className="text-xs text-amber-600">Falta: {fmt(remaining)}</span>
                  )}
                </div>

                {/* Payment method selector */}
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {PM_CONFIG.map(({ method, label, icon: Icon }) => (
                    <button key={method} onClick={() => setPendingMethod(method)} className={`flex flex-col items-center py-1.5 rounded-lg text-xs border transition-colors ${pendingMethod === method ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                      <Icon size={14} className="mb-0.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Amount + add */}
                <div className="flex gap-1.5">
                  <input
                    className="flex-1 border border-border rounded-lg px-2.5 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={fmt(remaining || totalSale)}
                    value={pendingAmount}
                    onChange={(e) => setPendingAmount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addPayment(); }}
                  />
                  <button onClick={quickFillRemaining} className="px-2 py-2 border border-border rounded-lg hover:bg-accent text-xs text-muted-foreground" title="Preencher valor restante">↵</button>
                  <button onClick={addPayment} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm">+</button>
                </div>

                {/* Added payments */}
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-accent/30 rounded-lg px-2.5 py-1.5 mt-1.5 text-sm">
                    <span className="text-muted-foreground">{PM_CONFIG.find((c) => c.method === p.method)?.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">{fmt(p.amount)}</span>
                      <button onClick={() => removePayment(i)} className="text-muted-foreground hover:text-destructive"><X size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-accent/30 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-green-600">{fmt(totalSale)}</span>
                </div>
                {payments.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pago</span>
                      <span>{fmt(totalPaid)}</span>
                    </div>
                    {totalPaid >= totalSale && payments.some((p) => p.method === "cash") && (
                      <div className="flex justify-between border-t border-border pt-1 mt-1">
                        <span>Troco</span>
                        <span className="text-primary">{fmt(Math.max(0, totalPaid - totalSale))}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          <button
            onClick={handleSubmit}
            disabled={cart.length === 0}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            Finalizar Pedido
          </button>
        </div>
      </div>
    </div>
  );
}
