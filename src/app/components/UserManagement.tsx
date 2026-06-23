import { useState } from "react";
import { useAuth, Role, ROLE_LABELS, ROLE_COLORS, AppUser } from "../auth";
import { Users, PlusCircle, Pencil, X, Check, ShieldCheck, UserX, UserCheck } from "lucide-react";

interface FormState {
  name: string;
  username: string;
  role: Role;
  password: string;
  active: boolean;
}

const empty: FormState = { name: "", username: "", role: "cashier", password: "", active: true };

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function UserManagement() {
  const { users, session, addUser, updateUser, logAudit } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);

  function validate(isEdit: boolean) {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!isEdit && form.username.length < 3) e.username = "Mínimo 3 caracteres";
    if (!isEdit && !/^[a-z0-9_]+$/i.test(form.username)) e.username = "Apenas letras, números e _";
    if (!isEdit && form.password.length < 8) e.password = "Mínimo 8 caracteres";
    if (isEdit && form.password && form.password.length < 8) e.password = "Mínimo 8 caracteres";
    setErrors(e as Partial<FormState>);
    return Object.keys(e).length === 0;
  }

  function openAdd() {
    setEditId(null);
    setForm(empty);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(u: AppUser) {
    setEditId(u.id);
    setForm({ name: u.name, username: u.username, role: u.role, password: "", active: u.active });
    setErrors({});
    setShowForm(true);
  }

  async function handleSubmit() {
    const isEdit = !!editId;
    if (!validate(isEdit)) return;
    setLoading(true);
    if (isEdit) {
      await updateUser(editId!, {
        name: form.name.trim(),
        role: form.role,
        active: form.active,
        ...(form.password ? { password: form.password } : {}),
      });
    } else {
      // Check for duplicate username
      if (users.some((u) => u.username.toLowerCase() === form.username.toLowerCase())) {
        setErrors({ username: "Usuário já existe" } as Partial<FormState>);
        setLoading(false);
        return;
      }
      await addUser({ name: form.name.trim(), username: form.username.trim(), role: form.role, password: form.password });
    }
    setLoading(false);
    setShowForm(false);
    setForm(empty);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="text-primary" size={24} />
          <h1>Usuários</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          <PlusCircle size={18} />
          <span>Novo usuário</span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum usuário cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/50 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3">Nível</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Último acesso</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-accent/20 transition-colors ${i % 2 === 0 ? "" : "bg-accent/10"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.id === session?.userId && <ShieldCheck size={14} className="text-primary" title="Você" />}
                        {u.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">@{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs"><UserCheck size={13} /> Ativo</span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground text-xs"><UserX size={13} /> Inativo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(u.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(u)}
                        disabled={u.id === session?.userId && u.role !== "admin"}
                        className="text-muted-foreground hover:text-primary transition-colors p-1 rounded disabled:opacity-30"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions reference */}
      <div className="mt-6 bg-card border border-border rounded-xl p-4">
        <h3 className="mb-3 text-sm">Matriz de permissões</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-2">Permissão</th>
                <th className="text-center pb-2 px-2">Admin</th>
                <th className="text-center pb-2 px-2">Gerente</th>
                <th className="text-center pb-2 px-2">Caixa</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Registrar pedidos", perm: "process_orders" },
                { label: "Gerenciar cardápio", perm: "manage_menu" },
                { label: "Ver relatórios", perm: "view_reports" },
                { label: "Gerenciar estoque", perm: "manage_inventory" },
                { label: "Gerenciar clientes", perm: "manage_customers" },
                { label: "Outros custos", perm: "manage_costs" },
                { label: "Fechamento de caixa", perm: "close_register" },
                { label: "Auditoria", perm: "view_audit" },
                { label: "Gerenciar usuários", perm: "manage_users" },
              ].map(({ label, perm }) => {
                const has = (role: Role) => ROLE_LABELS[role] && (role === "admin" || ["manager", "cashier"].includes(role)) &&
                  (role === "admin" ? true : (role === "manager" ? !["manage_users", "view_audit"].includes(perm) : ["process_orders", "manage_customers"].includes(perm)));
                return (
                  <tr key={perm} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5">{label}</td>
                    {(["admin", "manager", "cashier"] as Role[]).map((r) => {
                      const allowed = r === "admin" ? true : r === "manager" ? !["manage_users", "view_audit"].includes(perm) : ["process_orders", "manage_customers"].includes(perm);
                      return (
                        <td key={r} className="text-center py-1.5 px-2">
                          {allowed ? <span className="text-green-500">✓</span> : <span className="text-muted-foreground/30">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2>{editId ? "Editar usuário" : "Novo usuário"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm">Nome completo</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Nome do usuário" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
              </div>
              {!editId && (
                <div>
                  <label className="block mb-1 text-sm">Nome de usuário</label>
                  <input className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: joao.silva" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
                  {errors.username && <p className="text-destructive text-xs mt-1">{errors.username}</p>}
                </div>
              )}
              <div>
                <label className="block mb-1 text-sm">Nível de acesso</label>
                <select className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  <option value="cashier">Caixa</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">{editId ? "Nova senha (deixe em branco para manter)" : "Senha"}</label>
                <input type="password" className="w-full border border-border rounded-lg px-3 py-2 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder={editId ? "••••••••" : "Mínimo 8 caracteres"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
              </div>
              {editId && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  <span className="text-sm">Usuário ativo</span>
                </label>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-lg py-2 hover:bg-accent transition-colors">Cancelar</button>
                <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Check size={16} />}
                  {editId ? "Salvar" : "Criar usuário"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
