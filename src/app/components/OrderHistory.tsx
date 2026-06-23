import { useState } from "react";
import { useStore } from "../store";
import { ClipboardList, ChevronDown, ChevronUp, Filter } from "lucide-react";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  card: "Cartão",
  pix: "PIX",
  other: "Outro",
  "": "—",
};

export default function OrderHistory() {
  const { orders } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const filtered = orders.filter((o) => {
    if (filterDate && !o.createdAt.startsWith(filterDate)) return false;
    if (filterEmployee && !o.employee.toLowerCase().includes(filterEmployee.toLowerCase())) return false;
    if (filterPayment && o.paymentMethod !== filterPayment) return false;
    return true;
  });

  const total = filtered.length;
  const pages = Math.ceil(total / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalSale = filtered.reduce((s, o) => s + o.totalSale, 0);
  const totalProfit = filtered.reduce((s, o) => s + o.profit, 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-primary" size={24} />
          <h1>Histórico de Pedidos</h1>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm"
        >
          <Filter size={15} />
          Filtros
        </button>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1 text-muted-foreground">Data</label>
            <input
              type="date"
              className="w-full border border-border rounded-lg px-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-muted-foreground">Funcionário</label>
            <input
              className="w-full border border-border rounded-lg px-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Buscar por nome"
              value={filterEmployee}
              onChange={(e) => { setFilterEmployee(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-muted-foreground">Pagamento</label>
            <select
              className="w-full border border-border rounded-lg px-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterPayment}
              onChange={(e) => { setFilterPayment(e.target.value); setPage(1); }}
            >
              <option value="">Todos</option>
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão</option>
              <option value="pix">PIX</option>
              <option value="other">Outro</option>
            </select>
          </div>
        </div>
      )}

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
            <p className="text-lg text-primary">{filtered.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Receita</p>
            <p className="text-lg text-green-600">{fmt(totalSale)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Lucro</p>
            <p className="text-lg text-primary">{fmt(totalProfit)}</p>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((order) => (
            <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/20 transition-colors"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Data/Hora</p>
                    <p>{fmtDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Funcionário</p>
                    <p>{order.employee || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pagamento</p>
                    <p>{PAYMENT_LABELS[order.paymentMethod] || "—"}</p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-green-600">{fmt(order.totalSale)}</p>
                  </div>
                </div>
                {expandedId === order.id ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
              </button>

              {expandedId === order.id && (
                <div className="border-t border-border p-4 bg-accent/10">
                  <h4 className="mb-3 text-sm">Itens do pedido</h4>
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left pb-2">Produto</th>
                        <th className="text-center pb-2">Qtd</th>
                        <th className="text-right pb-2">Preço unit.</th>
                        <th className="text-right pb-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-border/50">
                          <td className="py-1.5">{item.name}</td>
                          <td className="py-1.5 text-center">{item.quantity}</td>
                          <td className="py-1.5 text-right">{fmt(item.salePrice)}</td>
                          <td className="py-1.5 text-right text-green-600">{fmt(item.salePrice * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="grid grid-cols-3 gap-2 text-sm bg-card rounded-lg p-3 border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Venda total</p>
                      <p className="text-green-600">{fmt(order.totalSale)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Custo total</p>
                      <p className="text-red-500">{fmt(order.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lucro</p>
                      <p className="text-primary">{fmt(order.profit)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-accent disabled:opacity-40">
            Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {pages}
          </span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-accent disabled:opacity-40">
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
