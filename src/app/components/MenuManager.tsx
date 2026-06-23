import { useState } from "react";
import { useStore, MenuItem } from "../store";
import { PlusCircle, Pencil, Trash2, X, Check, UtensilsCrossed } from "lucide-react";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface FormState {
  name: string;
  salePrice: string;
  productionCost: string;
}

const empty: FormState = { name: "", salePrice: "", productionCost: "" };

export default function MenuManager() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    const sp = parseFloat(form.salePrice.replace(",", "."));
    if (isNaN(sp) || sp <= 0) e.salePrice = "Preço inválido";
    const pc = parseFloat(form.productionCost.replace(",", "."));
    if (isNaN(pc) || pc < 0) e.productionCost = "Custo inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function openAdd() {
    setEditId(null);
    setForm(empty);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(item: MenuItem) {
    setEditId(item.id);
    setForm({ name: item.name, salePrice: item.salePrice.toFixed(2).replace(".", ","), productionCost: item.productionCost.toFixed(2).replace(".", ",") });
    setErrors({});
    setShowForm(true);
  }

  function handleSubmit() {
    if (!validate()) return;
    const data = {
      name: form.name.trim(),
      salePrice: parseFloat(form.salePrice.replace(",", ".")),
      productionCost: parseFloat(form.productionCost.replace(",", ".")),
    };
    if (editId) updateMenuItem(editId, data);
    else addMenuItem(data);
    setShowForm(false);
    setForm(empty);
    setEditId(null);
  }

  function handleDelete(id: string) {
    if (confirm("Excluir este item do cardápio?")) deleteMenuItem(id);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="text-primary" size={24} />
          <h1>Cardápio</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <PlusCircle size={18} />
          <span>Adicionar Item</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2>{editId ? "Editar Item" : "Novo Item"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-1">Nome do produto</label>
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: X-Burguer"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Preço de venda (R$)</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0,00"
                    value={form.salePrice}
                    onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  />
                  {errors.salePrice && <p className="text-destructive text-sm mt-1">{errors.salePrice}</p>}
                </div>
                <div>
                  <label className="block mb-1">Custo de produção (R$)</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0,00"
                    value={form.productionCost}
                    onChange={(e) => setForm({ ...form, productionCost: e.target.value })}
                  />
                  {errors.productionCost && <p className="text-destructive text-sm mt-1">{errors.productionCost}</p>}
                </div>
              </div>
              {form.salePrice && form.productionCost && (
                <div className="bg-accent rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">Margem estimada: </span>
                  <span className="text-foreground">
                    {(() => {
                      const sp = parseFloat(form.salePrice.replace(",", "."));
                      const pc = parseFloat(form.productionCost.replace(",", "."));
                      if (!sp || isNaN(pc)) return "—";
                      return `${(((sp - pc) / sp) * 100).toFixed(1)}%`;
                    })()}
                  </span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-border rounded-lg py-2 hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  {editId ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {menuItems.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum item no cardápio.</p>
          <p className="text-sm">Clique em "Adicionar Item" para começar.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="text-left px-4 py-3 text-sm text-muted-foreground">Produto</th>
                  <th className="text-right px-4 py-3 text-sm text-muted-foreground">Preço de venda</th>
                  <th className="text-right px-4 py-3 text-sm text-muted-foreground">Custo</th>
                  <th className="text-right px-4 py-3 text-sm text-muted-foreground">Margem</th>
                  <th className="text-right px-4 py-3 text-sm text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item, i) => {
                  const margin = item.salePrice > 0 ? ((item.salePrice - item.productionCost) / item.salePrice) * 100 : 0;
                  return (
                    <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-accent/10"}`}>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 text-right text-green-600">{fmt(item.salePrice)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{fmt(item.productionCost)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${margin >= 50 ? "bg-green-100 text-green-700" : margin >= 30 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(item)} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-accent/20 text-sm text-muted-foreground">
            {menuItems.length} {menuItems.length === 1 ? "item" : "itens"} no cardápio
          </div>
        </div>
      )}
    </div>
  );
}
