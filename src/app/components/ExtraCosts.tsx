import { useState } from "react";
import { useStore, ExtraCost, CostCategory } from "../store";
import { PlusCircle, Pencil, Trash2, X, Check, Wallet, TrendingDown, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { subDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORIES: { value: CostCategory | ""; label: string; color: string }[] = [
  { value: "", label: "Sem categoria", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
  { value: "aluguel", label: "Aluguel", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  { value: "energia", label: "Energia", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" },
  { value: "salario", label: "Salários", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  { value: "compras", label: "Compras", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  { value: "manutencao", label: "Manutenção", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  { value: "outro", label: "Outro", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
];

function categoryLabel(val: string) {
  return CATEGORIES.find((c) => c.value === val)?.label ?? "—";
}
function categoryColor(val: string) {
  return CATEGORIES.find((c) => c.value === val)?.color ?? CATEGORIES[0].color;
}

interface FormState {
  name: string;
  value: string;
  date: string;
  category: CostCategory | "";
  includeInReports: boolean;
}

const empty: FormState = {
  name: "",
  value: "",
  date: format(new Date(), "yyyy-MM-dd"),
  category: "",
  includeInReports: false,
};

export default function ExtraCosts() {
  const { extraCosts, addExtraCost, updateExtraCost, deleteExtraCost } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [filterCat, setFilterCat] = useState<string>("all");

  const includedCosts = extraCosts.filter((c) => c.includeInReports);
  const totalIncluded = includedCosts.reduce((s, c) => s + c.value, 0);
  const totalAll = extraCosts.reduce((s, c) => s + c.value, 0);

  // Last 7 days chart data (included costs only)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, "yyyy-MM-dd");
    const sum = includedCosts.filter((c) => c.date === key).reduce((s, c) => s + c.value, 0);
    return { label: format(d, "dd/MM", { locale: ptBR }), valor: parseFloat(sum.toFixed(2)) };
  });

  // Category breakdown (included)
  const catBreakdown: Record<string, number> = {};
  includedCosts.forEach((c) => {
    const cat = c.category || "outro";
    catBreakdown[cat] = (catBreakdown[cat] || 0) + c.value;
  });

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    const v = parseFloat(form.value.replace(",", "."));
    if (isNaN(v) || v <= 0) e.value = "Valor inválido";
    if (!form.date) e.date = "Data obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function openAdd() {
    setEditId(null);
    setForm(empty);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(c: ExtraCost) {
    setEditId(c.id);
    setForm({
      name: c.name,
      value: c.value.toFixed(2).replace(".", ","),
      date: c.date,
      category: c.category,
      includeInReports: c.includeInReports,
    });
    setErrors({});
    setShowForm(true);
  }

  function handleSubmit() {
    if (!validate()) return;
    const data = {
      name: form.name.trim(),
      value: parseFloat(form.value.replace(",", ".")),
      date: form.date,
      category: form.category,
      includeInReports: form.includeInReports,
    };
    if (editId) updateExtraCost(editId, data);
    else addExtraCost(data);
    setShowForm(false);
    setEditId(null);
    setForm(empty);
  }

  const filtered = filterCat === "all"
    ? extraCosts
    : filterCat === "included"
    ? extraCosts.filter((c) => c.includeInReports)
    : extraCosts.filter((c) => (c.category || "outro") === filterCat);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="text-primary" size={24} />
          <h1>Outros Custos</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <PlusCircle size={18} />
          <span>Adicionar Custo</span>
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5 text-sm">
        <Info size={16} className="text-primary mt-0.5 shrink-0" />
        <p className="text-muted-foreground">
          Custos registrados aqui são <strong className="text-foreground">separados</strong> dos pedidos e não afetam o faturamento ou lucro de vendas.
          Marque "Incluir nos relatórios" para considerá-los no módulo financeiro desta aba.
        </p>
      </div>

      {/* Summary cards */}
      {extraCosts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total registrado</p>
            <p className="text-red-500">{fmt(totalAll)}</p>
            <p className="text-xs text-muted-foreground mt-1">{extraCosts.length} lançamento(s)</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Incluídos nos relatórios</p>
            <p className="text-orange-500">{fmt(totalIncluded)}</p>
            <p className="text-xs text-muted-foreground mt-1">{includedCosts.length} lançamento(s)</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground mb-1">Apenas anotações</p>
            <p className="text-muted-foreground">{fmt(totalAll - totalIncluded)}</p>
            <p className="text-xs text-muted-foreground mt-1">{extraCosts.length - includedCosts.length} lançamento(s)</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {includedCosts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <h3 className="mb-4">Custos reportados — últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar key="bar-valor" dataKey="valor" name="Custo" fill="#e74c3c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category breakdown (included) */}
      {Object.keys(catBreakdown).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <h3 className="mb-3">Por categoria (incluídos nos relatórios)</h3>
          <div className="space-y-2">
            {Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor(cat)}`}>{categoryLabel(cat)}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-red-400 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (val / totalIncluded) * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-24 text-right">{fmt(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: "all", label: "Todos" },
          { value: "included", label: "Incluídos" },
          ...CATEGORIES.filter((c) => c.value).map((c) => ({ value: c.value, label: c.label })),
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterCat(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filterCat === f.value ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-muted"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingDown size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum custo registrado.</p>
          <p className="text-sm">Clique em "Adicionar Custo" para começar.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/50 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3">Descrição</th>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-right px-4 py-3">Valor</th>
                  <th className="text-center px-4 py-3">Relatório</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cost, i) => (
                  <tr key={cost.id} className={`border-b border-border last:border-0 hover:bg-accent/20 transition-colors ${i % 2 === 0 ? "" : "bg-accent/10"}`}>
                    <td className="px-4 py-3">{cost.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(parseISO(cost.date + "T12:00:00"), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor(cost.category)}`}>
                        {categoryLabel(cost.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(cost.value)}</td>
                    <td className="px-4 py-3 text-center">
                      {cost.includeInReports ? (
                        <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center">✓</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(cost)} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => { if (confirm("Excluir este custo?")) deleteExtraCost(cost.id); }} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2>{editId ? "Editar Custo" : "Novo Custo"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-1">Descrição</label>
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: Aluguel do mês"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Valor (R$)</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0,00"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                  {errors.value && <p className="text-destructive text-sm mt-1">{errors.value}</p>}
                </div>
                <div>
                  <label className="block mb-1">Data</label>
                  <input
                    type="date"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                  {errors.date && <p className="text-destructive text-sm mt-1">{errors.date}</p>}
                </div>
              </div>
              <div>
                <label className="block mb-1">Categoria (opcional)</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as CostCategory | "" })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-primary"
                  checked={form.includeInReports}
                  onChange={(e) => setForm({ ...form, includeInReports: e.target.checked })}
                />
                <div>
                  <p className="text-sm">Incluir nos relatórios financeiros</p>
                  <p className="text-xs text-muted-foreground">Será contabilizado como custo operacional nesta aba. Não afeta pedidos.</p>
                </div>
              </label>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-lg py-2 hover:bg-accent transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSubmit} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 hover:opacity-90 flex items-center justify-center gap-2">
                  <Check size={16} />
                  {editId ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
