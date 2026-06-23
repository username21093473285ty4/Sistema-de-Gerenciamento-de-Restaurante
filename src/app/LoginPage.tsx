import { useState, FormEvent } from "react";
import { useAuth } from "./auth";
import { ChefHat, Eye, EyeOff, Lock, User, AlertCircle, CheckCircle, Shield } from "lucide-react";

// ── First-run Setup ──────────────────────────────────────────────────────

function SetupScreen() {
  const { setupAdmin } = useAuth();
  const [form, setForm] = useState({ name: "", username: "", password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (form.username.length < 3) e.username = "Mínimo 3 caracteres";
    if (!/^[a-z0-9_]+$/i.test(form.username)) e.username = "Apenas letras, números e _";
    if (form.password.length < 8) e.password = "Mínimo 8 caracteres";
    if (form.password !== form.confirm) e.confirm = "Senhas não coincidem";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await setupAdmin(form.username.trim(), form.password, form.name.trim());
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChefHat size={32} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl mb-1">Configuração inicial</h1>
          <p className="text-muted-foreground text-sm">Crie a conta de administrador para começar a usar o RestaurantOS.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 mb-5 text-sm text-primary">
            <Shield size={15} />
            Esta conta terá acesso total ao sistema.
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm">Nome completo</label>
              <input
                className="w-full border border-border rounded-lg px-3 py-2.5 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: João Silva"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block mb-1 text-sm">Nome de usuário</label>
              <input
                className="w-full border border-border rounded-lg px-3 py-2.5 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: admin"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                autoComplete="username"
              />
              {errors.username && <p className="text-destructive text-xs mt-1">{errors.username}</p>}
            </div>
            <div>
              <label className="block mb-1 text-sm">Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className="w-full border border-border rounded-lg px-3 py-2.5 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-muted-foreground">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block mb-1 text-sm">Confirmar senha</label>
              <input
                type="password"
                className="w-full border border-border rounded-lg px-3 py-2.5 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Repita a senha"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                autoComplete="new-password"
              />
              {errors.confirm && <p className="text-destructive text-xs mt-1">{errors.confirm}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <CheckCircle size={18} />
              )}
              {loading ? "Configurando..." : "Criar conta e entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, isFirstRun } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isFirstRun) return <SetupScreen />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) {
      setError("Preencha usuário e senha.");
      return;
    }
    setLoading(true);
    const result = await login(form.username, form.password);
    setLoading(false);
    if (!result.success) setError(result.error ?? "Erro desconhecido.");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ChefHat size={32} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl mb-1">RestaurantOS</h1>
          <p className="text-muted-foreground text-sm">Sistema de gestão profissional</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg mb-5">Entrar</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-sm">Usuário</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nome de usuário"
                  value={form.username}
                  onChange={(e) => { setForm({ ...form, username: e.target.value }); setError(""); }}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type={showPwd ? "text" : "password"}
                  className="w-full border border-border rounded-lg pl-9 pr-10 py-2.5 bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-muted-foreground">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-sm text-destructive">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Lock size={18} />
              )}
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Sessão encerra após 30 min de inatividade
        </p>
      </div>
    </div>
  );
}
