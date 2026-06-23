import { useState } from "react";
import { useStore, InventoryProduct, MovementType } from "../store";
import { useAuth } from "../auth";
import { Package, PlusCircle, AlertTriangle, Pencil, X, Check, TrendingUp, TrendingDown, ArrowUpDown, History } from "lucide-react";

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: "Entrada", saida: "Saída", ajuste: "Ajuste", inventario: "Inventário",
};
const MOVEMENT_COLORS: Record<MovementType, string> = {
  entrada: "text-green-600", saida: "text-red-500", ajuste: "text-amber-600", inventario: "text-primary",
};

type View = "list" | "movements";

interface ProductForm {
  name: string; sku: string; barcode: string; unit: string;
  currentStock: string; minimumStock: string; costPerUnit: string;
}
const emptyProduct: ProductForm = { name: "", sku: "", barcode: "", unit: "un", currentStock: "0", minimumStock: "0", costPerUnit: "0" };

interface MovementForm {
  productId: string; type: MovementType; quantity: string; reason: string;
}

export default function Inventory() {
  const { inventory, stockMovements, addInventoryProduct, updateInventoryProduct, addStockMovement } = useStore();
  const { session, logAudit } = useAuth();
  const [view, setView] = useState<View>("list");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [mvForm, setMvForm] = useState<MovementForm>({ productId: "", type: "entrada", quantity: "", reason: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filterSearch, setFilterSearch] = useState("");

  const lowStock = inventory.filter((p) => p.active && p.currentStock <= p.minimumStock);
  const activeInventory = inventory.filter((p) => p.active && (
    !filterSearch || p.name.toLowerCase().includes(filterSearch.toLowerCase()) || p.sku.toLowerCase().includes(filterSearch.toLowerCase())
  ));

  function validateProduct() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!form.unit.trim()) e.unit = "Unidade obrigatória";
    if (isNaN(Number(form.minimumStock)) || Number(form.minimumStock) < 0) e.minimumStock = "Valor inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleProductSubmit() {
    if (!validateProduct()) return;
    const data = {
      name: form.name.trim(), sku: form.sku.trim(), barcode: form.barcode.trim(), unit: form.unit.trim(),
      currentStock: Number(form.currentStock) || 0,
      minimumStock: Number(form.minimumStock) || 0,
      costPerUnit: Number(form.costPerUnit) || 0,
      active: true,
    };
    if (editId) {
      updateInventoryProduct(editId, data);
      logAudit("Produto editado", `${data.name}`, "inventory");
    } else {
      addInventoryProduct(data);
      logAudit("Produto cadastrado", `${data.name} (SKU: ${data.sku || "—"})`, "inventory");
    }
    setShowProductForm(false);
    setEditId(null);
    setForm(emptyProduct);
  }

  function openEdit(p: InventoryProduct) {
    setEditId(p.id);
    setForm({ name: p.name, sku: p.sku, barcode: p.barcode ?? "", unit: p.unit, currentStock: String(p.currentStock), minimumStock: String(p.minimumStock), costPerUnit: String(p.costPerUnit) });
    setErrors({});
    setShowProductForm(true);
  }

  function handleMovementSubmit() {
    const qty = Number(mvForm.quantity);
    if (!mvForm.productId) { setErrors({ productId: "Selecione um produto" }); return; }
    if (!qty || qty <= 0) { setErrors({ quantity: "Quantidade inválida" }); return; }
    setErrors({});
    const product = inventory.find((p) => p.id === mvForm.productId)!;
    const actualQty = mvForm.type === "saida" ? -qty : qty;
    addStockMovement({
      productId: product.id, productName: product.name, type: mvForm.type,
      quantity: actualQty, reason: mvForm.reason, userId: session?.userId ?? "", userName: session?.name ?? "",
    });
    logAudit(`Movimentação: ${MOVEMENT_LABELS[mvForm.type]}`, `${product.name} — ${qty} ${product.unit}`, "inventory");
    setShowMovementForm(false);
    setMvForm({ productId: "", type: "entrada", quantity: "", reason: "" });
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Package className="text-primary" size={24} />
          <h1>Estoque</h1>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-accent rounded-lg p-1">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded text-sm transition-colors ${view === "list" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>Produtos</button>
            <button onClick={() => setView("movements")} className={`px-3 py-1.5 rounded text-sm transition-colors ${view === "movements" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>Movimentações</button>
          </div>
          <button onClick={() => { setShowMovementForm(true); setErrors({}); }} className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg hover:bg-accent text-sm">
            <ArrowUpDown size={14} /> Movimentar
          </button>
          <button onClick={() => { setEditId(null); setForm(emptyProduct); setErrors({}); setShowProductForm(true); }} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:opacity-90 text-sm">
            <PlusCircle size={14} /> Produto
          </button>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm">{lowStock.length} produto(s) com estoque baixo ou zerado</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <span key={p.id} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                {p.name}: {p.currentStock} {p.unit} (mín: {p.minimumStock})
              </span>
            ))}
          </div>
        </div>
      )}

      {view === "list" ? (
        <>
          <div className="mb-4">
            <input
              className="w-full sm:w-80 border border-border rounded-lg px-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Buscar por nome ou SKU..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>
          {activeInventory.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nenhum produto cadastrado.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-accent/50 text-xs text-muted-foreground">
                      <th className="text-left px-4 py-3">Produto</th>
                      <th className="text-left px-4 py-3">SKU</th>
                      <th className="text-right px-4 py-3">Estoque</th>
                      <th className="text-right px-4 py-3">Mínimo</th>
                      <th className="text-right px-4 py-3">Custo/un</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInventory.map((p, i) => {
                      const isLow = p.currentStock <= p.minimumStock;
                      return (
                        <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-accent/20 transition-colors ${i % 2 === 0 ? "" : "bg-accent/10"}`}>
                          <td className="px-4 py-3">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.sku || "—"}</td>
                          <td className={`px-4 py-3 text-right ${isLow ? "text-amber-600" : "text-green-600"}`}>{p.currentStock} {p.unit}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{p.minimumStock} {p.unit}</td>
                          <td className="px-4 py-3 text-right">{fmt(p.costPerUnit)}</td>
                          <td className="px-4 py-3 text-center">
                            {isLow
                              ? <span className="flex items-center justify-center gap-1 text-amber-600 text-xs"><AlertTriangle size={12} /> Baixo</span>
                              : <span className="text-green-600 text-xs">OK</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded">
                              <Pencil size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {stockMovements.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <History size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nenhuma movimentação registrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/50 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Produto</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-right px-4 py-3">Qtd</th>
                    <th className="text-right px-4 py-3">Estoque anterior</th>
                    <th className="text-right px-4 py-3">Estoque atual</th>
                    <th className="text-left px-4 py-3">Motivo</th>
                    <th className="text-left px-4 py-3">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map((m, i) => (
                    <tr key={m.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-accent/10"}`}>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(m.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-2.5">{m.productName}</td>
                      <td className={`px-4 py-2.5 ${MOVEMENT_COLORS[m.type]}`}>{MOVEMENT_LABELS[m.type]}</td>
                      <td className={`px-4 py-2.5 text-right ${m.quantity > 0 ? "text-green-600" : "text-red-500"}`}>{m.quantity > 0 ? "+" : ""}{m.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{m.previousStock}</td>
                      <td className="px-4 py-2.5 text-right">{m.newStock}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.reason || "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.userName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Product form modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2>{editId ? "Editar produto" : "Novo produto"}</h2>
              <button onClick={() => setShowProductForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block mb-1 text-sm">Nome do produto</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Farinha de trigo" />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block mb-1 text-sm">SKU</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex: FAR-001" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Código de barras</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="EAN/GTIN" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Unidade</label>
                <select className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {["un", "kg", "g", "lt", "ml", "cx", "pct", "fd"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">Custo por unidade (R$)</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} placeholder="0,00" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Estoque inicial</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Estoque mínimo</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} placeholder="0" />
                {errors.minimumStock && <p className="text-destructive text-xs mt-1">{errors.minimumStock}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowProductForm(false)} className="flex-1 border border-border rounded-lg py-2 hover:bg-accent transition-colors">Cancelar</button>
              <button onClick={handleProductSubmit} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 hover:opacity-90 flex items-center justify-center gap-2">
                <Check size={16} />{editId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement form modal */}
      {showMovementForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2>Movimentar estoque</h2>
              <button onClick={() => setShowMovementForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm">Produto</label>
                <select className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={mvForm.productId} onChange={(e) => setMvForm({ ...mvForm, productId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {inventory.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} (estoque: {p.currentStock} {p.unit})</option>)}
                </select>
                {errors.productId && <p className="text-destructive text-xs mt-1">{errors.productId}</p>}
              </div>
              <div>
                <label className="block mb-1 text-sm">Tipo</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["entrada", "saida", "ajuste", "inventario"] as MovementType[]).map((t) => (
                    <button key={t} onClick={() => setMvForm({ ...mvForm, type: t })} className={`py-2 rounded-lg text-xs border transition-colors ${mvForm.type === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                      {MOVEMENT_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm">Quantidade</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={mvForm.quantity} onChange={(e) => setMvForm({ ...mvForm, quantity: e.target.value })} placeholder="Ex: 10" />
                {errors.quantity && <p className="text-destructive text-xs mt-1">{errors.quantity}</p>}
              </div>
              <div>
                <label className="block mb-1 text-sm">Motivo (opcional)</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={mvForm.reason} onChange={(e) => setMvForm({ ...mvForm, reason: e.target.value })} placeholder="Ex: Compra do fornecedor" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowMovementForm(false)} className="flex-1 border border-border rounded-lg py-2 hover:bg-accent transition-colors">Cancelar</button>
                <button onClick={handleMovementSubmit} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 hover:opacity-90 flex items-center justify-center gap-2">
                  <Check size={16} /> Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
