import { useState } from "react";
import { useAuth, AuditEntry } from "../auth";
import { Shield, Filter, Download } from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const CATEGORY_LABELS: Record<AuditEntry["category"], string> = {
  auth: "Autenticação", order: "Pedido", menu: "Cardápio",
  inventory: "Estoque", customer: "Cliente", register: "Caixa",
  user: "Usuário", cost: "Custos", system: "Sistema",
};

const CATEGORY_COLORS: Record<AuditEntry["category"], string> = {
  auth: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  order: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  menu: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  inventory: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  customer: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  register: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  user: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  cost: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function AuditLog() {
  const { auditLog } = useAuth();
  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterCat, setFilterCat] = useState<AuditEntry["category"] | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  const filtered = auditLog.filter((e) => {
    if (filterDate && !e.timestamp.startsWith(filterDate)) return false;
    if (filterUser && !e.username.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterCat && e.category !== filterCat) return false;
    return true;
  });

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function exportCSV() {
    const headers = ["Timestamp", "Usuário", "Categoria", "Ação", "Detalhes"];
    const rows = filtered.map((e) => [e.timestamp, e.username, CATEGORY_LABELS[e.category], e.action, e.details].map((v) => `"${v}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="text-primary" size={24} />
          <h1>Auditoria</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg hover:bg-accent text-sm">
            <Filter size={14} /> Filtros
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg hover:bg-accent text-sm">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
        <Shield size={15} />
        Registros imutáveis — nenhum log pode ser excluído. {auditLog.length} registro(s) total.
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1 text-muted-foreground">Data</label>
            <input type="date" className="w-full border border-border rounded-lg px-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-muted-foreground">Usuário</label>
            <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Filtrar por usuário" value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-muted-foreground">Categoria</label>
            <select className="w-full border border-border rounded-lg px-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={filterCat} onChange={(e) => { setFilterCat(e.target.value as AuditEntry["category"] | ""); setPage(1); }}>
              <option value="">Todas</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Shield size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3">Data / Hora</th>
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-accent/10"}`}>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(entry.timestamp)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">@{entry.username}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[entry.category]}`}>{CATEGORY_LABELS[entry.category]}</span>
                    </td>
                    <td className="px-4 py-2.5">{entry.action}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">{entry.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-accent/10 flex items-center justify-between text-sm text-muted-foreground">
            <span>{filtered.length} registro(s)</span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border border-border rounded hover:bg-accent disabled:opacity-40">‹</button>
                <span>{page} / {pages}</span>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-2 py-1 border border-border rounded hover:bg-accent disabled:opacity-40">›</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
