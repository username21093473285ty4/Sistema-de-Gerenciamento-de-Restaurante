import { useState } from "react";
import { useStore, Customer } from "../store";
import { useAuth } from "../auth";
import { Users2, PlusCircle, Pencil, X, Check, Search, ChevronDown, ChevronUp } from "lucide-react";

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface FormState {
  name: string; phone: string; email: string; cpf: string; notes: string;
}
const empty: FormState = { name: "", phone: "", email: "", cpf: "", notes: "" };

export default function Customers() {
  const { customers, orders, addCustomer, updateCustomer } = useStore();
  const { logAudit } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = customers.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search) ||
    (c.cpf ?? "").includes(search)
  );

  function validate() {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function openAdd() {
    setEditId(null);
    setForm(empty);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditId(c.id);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", cpf: c.cpf ?? "", notes: c.notes ?? "" });
    setErrors({});
    setShowForm(true);
  }

  function handleSubmit() {
    if (!validate()) return;
    const data = { name: form.name.trim(), phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, cpf: form.cpf.trim() || undefined, notes: form.notes.trim() || undefined };
    if (editId) {
      updateCustomer(editId, data);
      logAudit("Cliente atualizado", form.name, "customer");
    } else {
      const c = addCustomer(data);
      logAudit("Cliente cadastrado", form.name, "customer");
    }
    setShowForm(false);
    setForm(empty);
    setEditId(null);
  }

  function getCustomerOrders(customerId: string) {
    return orders.filter((o) => o.customerId === customerId && o.status === "open").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users2 className="text-primary" size={24} />
          <h1>Clientes</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          <PlusCircle size={18} />
          <span>Novo cliente</span>
        </button>
      </div>

      {/* Stats */}
      {customers.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total de clientes</p>
            <p className="text-xl text-primary">{customers.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total em compras</p>
            <p className="text-xl text-green-600">{fmt(customers.reduce((s, c) => s + c.totalSpent, 0))}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Ticket médio</p>
            <p className="text-xl text-primary">
              {(() => {
                const total = customers.reduce((s, c) => s + c.totalOrders, 0);
                const spent = customers.reduce((s, c) => s + c.totalSpent, 0);
                return total > 0 ? fmt(spent / total) : "—";
              })()}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
        <input
          className="w-full sm:w-80 border border-border rounded-lg pl-9 pr-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Buscar por nome, telefone ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users2 size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum cliente cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const customerOrders = getCustomerOrders(c.id);
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone ?? c.email ?? "—"}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm text-green-600">{fmt(c.totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">{c.totalOrders} pedido(s)</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded">
                      {expandedId === c.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {expandedId === c.id && (
                  <div className="border-t border-border p-4 bg-accent/10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
                      {c.email && <div><p className="text-xs text-muted-foreground">Email</p><p className="truncate">{c.email}</p></div>}
                      {c.cpf && <div><p className="text-xs text-muted-foreground">CPF</p><p>{c.cpf}</p></div>}
                      {c.notes && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground">Obs.</p><p className="text-sm">{c.notes}</p></div>}
                      <div><p className="text-xs text-muted-foreground">Cliente desde</p><p>{new Date(c.createdAt).toLocaleDateString("pt-BR")}</p></div>
                    </div>
                    {customerOrders.length > 0 && (
                      <>
                        <h4 className="text-sm mb-2 text-muted-foreground">Últimos pedidos</h4>
                        <div className="space-y-1.5">
                          {customerOrders.slice(0, 5).map((o) => (
                            <div key={o.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 text-sm border border-border">
                              <span className="text-muted-foreground">{fmtDate(o.createdAt)}</span>
                              <span>{o.items.map((i) => i.name).join(", ").slice(0, 30)}{o.items.length > 1 ? "..." : ""}</span>
                              <span className="text-green-600">{fmt(o.totalSale)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2>{editId ? "Editar cliente" : "Novo cliente"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm">Nome completo *</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Nome do cliente" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm">Telefone</label>
                  <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block mb-1 text-sm">CPF</label>
                  <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm">Email</label>
                <input type="email" className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block mb-1 text-sm">Observações</label>
                <textarea className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={2} placeholder="Preferências, alergias..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-lg py-2 hover:bg-accent transition-colors">Cancelar</button>
                <button onClick={handleSubmit} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 hover:opacity-90 flex items-center justify-center gap-2">
                  <Check size={16} />{editId ? "Salvar" : "Cadastrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
