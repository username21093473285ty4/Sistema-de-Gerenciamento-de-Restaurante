import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type Role = "admin" | "manager" | "cashier";

export type Permission =
  | "manage_menu"
  | "manage_users"
  | "view_reports"
  | "process_orders"
  | "manage_inventory"
  | "manage_customers"
  | "view_audit"
  | "close_register"
  | "manage_costs";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ["manage_menu", "manage_users", "view_reports", "process_orders", "manage_inventory", "manage_customers", "view_audit", "close_register", "manage_costs"],
  manager: ["manage_menu", "view_reports", "process_orders", "manage_inventory", "manage_customers", "close_register", "manage_costs"],
  cashier: ["process_orders", "manage_customers"],
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  manager: "Gerente",
  cashier: "Caixa",
};

export const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  cashier: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export type UserStatus = "pending" | "approved" | "blocked";

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  passwordHash: string;
  active: boolean;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  isMaster?: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  category: "auth" | "order" | "menu" | "inventory" | "customer" | "register" | "user" | "cost" | "system";
}

interface LoginAttempt {
  count: number;
  lockedUntil?: string;
}

interface AuthStoreData {
  users: AppUser[];
  auditLog: AuditEntry[];
  loginAttempts: Record<string, LoginAttempt>;
}

export interface Session {
  userId: string;
  username: string;
  name: string;
  role: Role;
  permissions: Permission[];
  loginAt: string;
}

// ── PBKDF2 Password hashing (browser built-in) ────────────────────────────

const PBKDF2_ITERATIONS = 150_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256
  );
  const s = btoa(String.fromCharCode(...salt));
  const h = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `pbkdf2:${s}:${h}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [, saltB64, hashB64] = stored.split(":");
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256
    );
    return btoa(String.fromCharCode(...new Uint8Array(bits))) === hashB64;
  } catch {
    return false;
  }
}

// ── Storage ───────────────────────────────────────────────────────────────

const AUTH_KEY = "restaurant_auth_v1";
const SESSION_KEY = "restaurant_session_v1";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const INACTIVITY_MS = 30 * 60 * 1000;

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function normalizeUser(user: Partial<AppUser> & { id: string; username: string; name: string; role: Role; passwordHash: string; createdAt: string }): AppUser {
  const active = user.active ?? false;
  const status = user.status ?? (active ? "approved" : "blocked");
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    passwordHash: user.passwordHash,
    active,
    status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    createdBy: user.createdBy,
    approvedBy: user.approvedBy,
    approvedAt: user.approvedAt,
    isMaster: user.isMaster ?? false,
  };
}

function loadAuthData(): AuthStoreData {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuthStoreData>;
      return {
        users: (parsed.users ?? []).map((u: any) => normalizeUser(u)),
        auditLog: parsed.auditLog ?? [],
        loginAttempts: parsed.loginAttempts ?? {},
      };
    }
  } catch {}
  return { users: [], auditLog: [], loginAttempts: {} };
}

function saveAuthData(d: AuthStoreData) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(d));
}

// ── Context ───────────────────────────────────────────────────────────────

interface AuthContextType {
  session: Session | null;
  users: AppUser[];
  auditLog: AuditEntry[];
  isFirstRun: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  can: (p: Permission) => boolean;
  logAudit: (action: string, details: string, category: AuditEntry["category"]) => void;
  setupAdmin: (username: string, password: string, name: string) => Promise<void>;
  addUser: (u: { username: string; name: string; role: Role; password: string }) => Promise<void>;
  updateUser: (id: string, data: { name?: string; role?: Role; active?: boolean; password?: string }) => Promise<void>;
  approveUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  blockUser: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  reactivateUser: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AuthStoreData>(loadAuthData);
  const [session, setSession] = useState<Session | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null"); }
    catch { return null; }
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { saveAuthData(data); }, [data]);

  function saveSession(s: Session | null) {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
    setSession(s);
  }

  // Auto-logout on inactivity
  function resetTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (session) {
      timerRef.current = setTimeout(() => {
        setData((d) => ({
          ...d,
          auditLog: [{
            id: uid(), timestamp: new Date().toISOString(),
            userId: session.userId, username: session.username,
            action: "Sessão encerrada por inatividade", details: `Após ${INACTIVITY_MS / 60000} min`, category: "auth",
          }, ...d.auditLog],
        }));
        saveSession(null);
      }, INACTIVITY_MS);
    }
  }

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "wheel"];
    const h = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, h, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, h));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const currentUser = data.users.find((u) => u.id === session.userId);
    if (!currentUser || !currentUser.active || currentUser.status === "pending" || currentUser.status === "blocked") {
      setData((d) => ({
        ...d,
        auditLog: [makeAuditEntry(session.userId, session.username, "Sessão encerrada", "Conta não autorizada ou bloqueada", "auth"), ...d.auditLog],
      }));
      saveSession(null);
    }
  }, [data.users, session]);

  function makeAuditEntry(userId: string, username: string, action: string, details: string, category: AuditEntry["category"]): AuditEntry {
    return { id: uid(), timestamp: new Date().toISOString(), userId, username, action, details, category };
  }

  function logAudit(action: string, details: string, category: AuditEntry["category"]) {
    if (!session) return;
    setData((d) => ({
      ...d,
      auditLog: [makeAuditEntry(session.userId, session.username, action, details, category), ...d.auditLog],
    }));
  }

  async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const attempts = data.loginAttempts[username.toLowerCase()];
    if (attempts?.lockedUntil && new Date(attempts.lockedUntil) > new Date()) {
      const min = Math.ceil((+new Date(attempts.lockedUntil) - Date.now()) / 60000);
      return { success: false, error: `Conta bloqueada. Tente em ${min} min.` };
    }

    const user = data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return { success: false, error: "Usuário ou senha incorretos." };
    }

    if (user.status === "pending") {
      return { success: false, error: "Conta pendente de aprovação." };
    }
    if (user.status === "blocked" || !user.active) {
      return { success: false, error: "Conta bloqueada. Contate um administrador." };
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const prev = data.loginAttempts[username.toLowerCase()] ?? { count: 0 };
      const count = prev.count + 1;
      const lockedUntil = count >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : undefined;
      setData((d) => ({
        ...d,
        loginAttempts: { ...d.loginAttempts, [username.toLowerCase()]: { count, lockedUntil } },
        auditLog: [makeAuditEntry(user.id, username, "Login falhou",
          lockedUntil ? "Conta bloqueada" : `Tentativa ${count}/${MAX_ATTEMPTS}`, "auth"), ...d.auditLog],
      }));
      if (lockedUntil) return { success: false, error: `Conta bloqueada por ${LOCKOUT_MS / 60000} min.` };
      return { success: false, error: `Usuário ou senha incorretos. (${count}/${MAX_ATTEMPTS})` };
    }

    const sess: Session = {
      userId: user.id, username: user.username, name: user.name,
      role: user.role, permissions: ROLE_PERMISSIONS[user.role],
      loginAt: new Date().toISOString(),
    };
    setData((d) => ({
      ...d,
      loginAttempts: { ...d.loginAttempts, [username.toLowerCase()]: { count: 0 } },
      users: d.users.map((u) => u.id === user.id ? { ...u, lastLoginAt: new Date().toISOString() } : u),
      auditLog: [makeAuditEntry(user.id, user.username, "Login realizado", `Nível: ${ROLE_LABELS[user.role]}`, "auth"), ...d.auditLog],
    }));
    saveSession(sess);
    return { success: true };
  }

  function logout() {
    if (session) {
      setData((d) => ({
        ...d,
        auditLog: [makeAuditEntry(session.userId, session.username, "Logout", "", "auth"), ...d.auditLog],
      }));
    }
    saveSession(null);
  }

  function can(p: Permission) {
    return session?.permissions.includes(p) ?? false;
  }

  async function setupAdmin(username: string, password: string, name: string) {
    const hash = await hashPassword(password);
    const admin: AppUser = {
      id: uid(), username, name, role: "admin", passwordHash: hash,
      active: true, status: "approved", createdAt: new Date().toISOString(),
      isMaster: true,
    };
    setData((d) => ({
      ...d,
      users: [admin],
      auditLog: [makeAuditEntry(admin.id, username, "Sistema configurado", "Administrador Master criado na configuração inicial", "system"), ...d.auditLog],
    }));
  }

  async function addUser(u: { username: string; name: string; role: Role; password: string }) {
    const hash = await hashPassword(u.password);
    const user: AppUser = {
      id: uid(), username: u.username, name: u.name, role: u.role, passwordHash: hash,
      active: false, status: "pending", createdAt: new Date().toISOString(),
      createdBy: session?.userId ?? "system",
    };
    setData((d) => ({
      ...d, users: [...d.users, user],
      auditLog: [makeAuditEntry(session?.userId ?? "?", session?.username ?? "?", "Usuário criado",
        `${u.name} (${u.username}) — ${ROLE_LABELS[u.role]} aguardando aprovação`, "user"), ...d.auditLog],
    }));
  }

  async function updateUser(id: string, data_: { name?: string; role?: Role; active?: boolean; password?: string }) {
    const patch: Partial<AppUser> = {};
    if (data_.name !== undefined) patch.name = data_.name;
    if (data_.role !== undefined) patch.role = data_.role;
    if (data_.active !== undefined) patch.active = data_.active;
    if (data_.password) patch.passwordHash = await hashPassword(data_.password);
    setData((d) => ({
      ...d, users: d.users.map((u) => u.id === id ? { ...u, ...patch } : u),
      auditLog: [makeAuditEntry(session?.userId ?? "?", session?.username ?? "?", "Usuário atualizado",
        `ID: ${id}`, "user"), ...d.auditLog],
    }));
  }

  async function approveUser(id: string): Promise<{ success: boolean; error?: string }> {
    const current = data.users.find((u) => u.id === id);
    if (!current) return { success: false, error: "Usuário não encontrado." };
    if (current.id === session?.userId) return { success: false, error: "Você não pode aprovar sua própria conta." };
    if (current.status === "approved" && current.active) return { success: true };
    setData((d) => ({
      ...d,
      users: d.users.map((u) => u.id === id ? { ...u, active: true, status: "approved", approvedBy: session?.userId, approvedAt: new Date().toISOString() } : u),
      auditLog: [makeAuditEntry(session?.userId ?? "?", session?.username ?? "?", "Usuário aprovado",
        `${current.name} (${current.username})`, "user"), ...d.auditLog],
    }));
    return { success: true };
  }

  async function blockUser(id: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const current = data.users.find((u) => u.id === id);
    if (!current) return { success: false, error: "Usuário não encontrado." };
    if (current.id === session?.userId) return { success: false, error: "Você não pode bloquear sua própria conta." };
    setData((d) => ({
      ...d,
      users: d.users.map((u) => u.id === id ? { ...u, active: false, status: "blocked" } : u),
      auditLog: [makeAuditEntry(session?.userId ?? "?", session?.username ?? "?", "Usuário bloqueado",
        `${current.name} (${current.username})${reason ? ` — ${reason}` : ""}`, "user"), ...d.auditLog],
    }));
    return { success: true };
  }

  async function reactivateUser(id: string): Promise<{ success: boolean; error?: string }> {
    const current = data.users.find((u) => u.id === id);
    if (!current) return { success: false, error: "Usuário não encontrado." };
    if (current.id === session?.userId) return { success: false, error: "Você não pode reativar sua própria conta." };
    setData((d) => ({
      ...d,
      users: d.users.map((u) => u.id === id ? { ...u, active: true, status: "approved", approvedBy: session?.userId, approvedAt: new Date().toISOString() } : u),
      auditLog: [makeAuditEntry(session?.userId ?? "?", session?.username ?? "?", "Usuário reativado",
        `${current.name} (${current.username})`, "user"), ...d.auditLog],
    }));
    return { success: true };
  }

  return (
    <AuthContext.Provider value={{ session, users: data.users, auditLog: data.auditLog, isFirstRun: data.users.length === 0, login, logout, can, logAudit, setupAdmin, addUser, updateUser, approveUser, blockUser, reactivateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
