import { useState, useMemo } from "react";
import { useStore, Order } from "../store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { BarChart2, TrendingUp, DollarSign, Package, Calendar, TrendingDown, AlertTriangle, Receipt, Users2 } from "lucide-react";
import { subDays, format, startOfWeek, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Range = "day" | "week" | "month" | "all";

function filterOrders(orders: Order[], range: Range): Order[] {
  const now = new Date();
  if (range === "all") return orders;
  if (range === "day") return orders.filter((o) => o.createdAt.startsWith(format(now, "yyyy-MM-dd")));
  if (range === "week") {
    const start = startOfWeek(now, { weekStartsOn: 0 });
    return orders.filter((o) => parseISO(o.createdAt) >= start);
  }
  const start = startOfMonth(now);
  return orders.filter((o) => parseISO(o.createdAt) >= start);
}

const CHART_COLORS = ["#6366f1", "#2ecc71", "#f59e0b", "#e74c3c", "#8b5cf6", "#14b8a6", "#f97316"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { orders, extraCosts, inventory, customers } = useStore();
  const [range, setRange] = useState<Range>("week");

  const filtered = useMemo(() => filterOrders(orders.filter((o) => o.status !== "cancelled"), range), [orders, range]);

  const totalSale = filtered.reduce((s, o) => s + o.totalSale, 0);
  const totalCost = filtered.reduce((s, o) => s + o.totalCost, 0);
  const totalProfit = filtered.reduce((s, o) => s + o.profit, 0);
  const margin = totalSale > 0 ? (totalProfit / totalSale) * 100 : 0;
  const avgTicket = filtered.length > 0 ? totalSale / filtered.length : 0;

  const includedExtraCosts = extraCosts.filter((c) => c.includeInReports);
  const totalExtraCosts = includedExtraCosts.reduce((s, c) => s + c.value, 0);
  const operationalProfit = totalProfit - totalExtraCosts;

  const lowStockCount = inventory.filter((p) => p.active && p.currentStock <= p.minimumStock).length;

  // Today's orders for the top bar
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayKey) && o.status !== "cancelled");
  const todaySale = todayOrders.reduce((s, o) => s + o.totalSale, 0);

  // 1. Daily sales (last 7 days) — bar/line
  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, "yyyy-MM-dd");
      const dayOrders = orders.filter((o) => o.createdAt.startsWith(key));
      const extraDay = includedExtraCosts.filter((c) => c.date === key);
      return {
        label: format(d, "EEE dd/MM", { locale: ptBR }),
        receita: parseFloat(dayOrders.reduce((s, o) => s + o.totalSale, 0).toFixed(2)),
        custo: parseFloat(dayOrders.reduce((s, o) => s + o.totalCost, 0).toFixed(2)),
        lucro: parseFloat(dayOrders.reduce((s, o) => s + o.profit, 0).toFixed(2)),
        outrosCustos: parseFloat(extraDay.reduce((s, c) => s + c.value, 0).toFixed(2)),
      };
    });
  }, [orders, includedExtraCosts]);

  // 2. Cost distribution pie (order costs vs extra costs)
  const costDistPie = useMemo(() => {
    const orderCostTotal = filtered.reduce((s, o) => s + o.totalCost, 0);
    return [
      { name: "Custos de pedidos", value: parseFloat(orderCostTotal.toFixed(2)) },
      { name: "Outros custos", value: parseFloat(totalExtraCosts.toFixed(2)) },
    ].filter((d) => d.value > 0);
  }, [filtered, totalExtraCosts]);

  // 3. Payment breakdown
  const paymentData = useMemo(() => {
    const labels: Record<string, string> = { cash: "Dinheiro", card: "Cartão", pix: "PIX", other: "Outro", "": "N/A" };
    const map: Record<string, number> = {};
    filtered.forEach((o) => {
      const pm = o.paymentMethod || "";
      map[pm] = (map[pm] || 0) + o.totalSale;
    });
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] || k, value: parseFloat(v.toFixed(2)) }));
  }, [filtered]);

  // 4. Top products by quantity
  const productStats = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};
    filtered.forEach((o) => {
      o.items.forEach((item) => {
        if (!map[item.name]) map[item.name] = { name: item.name, quantity: 0, revenue: 0, profit: 0 };
        map[item.name].quantity += item.quantity;
        map[item.name].revenue += item.salePrice * item.quantity;
        map[item.name].profit += (item.salePrice - item.productionCost) * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 6);
  }, [filtered]);

  // 5. Extra costs over time (last 7 days)
  const extraCostTimeline = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, "yyyy-MM-dd");
      return {
        label: format(d, "dd/MM", { locale: ptBR }),
        valor: parseFloat(includedExtraCosts.filter((c) => c.date === key).reduce((s, c) => s + c.value, 0).toFixed(2)),
      };
    });
  }, [includedExtraCosts]);

  const rangeLabels: Record<Range, string> = { day: "Hoje", week: "Esta semana", month: "Este mês", all: "Todo período" };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 className="text-primary" size={24} />
          <h1>Dashboard</h1>
        </div>
        <div className="flex gap-1 bg-accent rounded-lg p-1">
          {(["day", "week", "month", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${range === r ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Today strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Vendas hoje", value: fmt(todaySale), sub: `${todayOrders.length} pedido(s)` },
          { label: "Ticket médio", value: avgTicket > 0 ? fmt(avgTicket) : "—", sub: "no período" },
          { label: "Total clientes", value: String(customers.length), sub: "cadastrados" },
          { label: "Alertas estoque", value: String(lowStockCount), sub: lowStockCount > 0 ? "produto(s) abaixo" : "tudo OK", alert: lowStockCount > 0 },
        ].map(({ label, value, sub, alert }) => (
          <div key={label} className={`rounded-xl border p-3 ${alert ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50" : "bg-card border-border"}`}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg mt-0.5 ${alert ? "text-amber-600" : "text-foreground"}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* KPI cards — sales only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Receita (vendas)", value: fmt(totalSale), icon: DollarSign, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/30" },
          { label: "Custo de pedidos", value: fmt(totalCost), icon: Package, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/30" },
          { label: "Lucro de vendas", value: fmt(totalProfit), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          { label: "Margem de vendas", value: `${margin.toFixed(1)}%`, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`${bg} ${color} p-2 rounded-lg`}><Icon size={16} /></div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className={`text-xl ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} pedidos</p>
          </div>
        ))}
      </div>

      {/* Operational profit card (only when extra costs exist) */}
      {totalExtraCosts > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 p-2 rounded-lg"><TrendingDown size={16} /></div>
            <div>
              <p className="text-xs text-muted-foreground">Outros custos (incluídos)</p>
              <p className="text-orange-500">{fmt(totalExtraCosts)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${operationalProfit >= 0 ? "bg-primary/10 text-primary" : "bg-red-100 dark:bg-red-900/30 text-red-500"}`}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro operacional</p>
              <p className={operationalProfit >= 0 ? "text-primary" : "text-red-500"}>{fmt(operationalProfit)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground ml-auto">Lucro operacional = lucro de vendas − outros custos incluídos</p>
        </div>
      )}

      {/* Chart 1: Faturamento ao longo do tempo */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="mb-1">Faturamento ao longo do tempo</h3>
        <p className="text-xs text-muted-foreground mb-4">Baseado apenas em pedidos — últimos 7 dias</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyData} margin={{ top: 0, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `R$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar key="bar-receita" dataKey="receita" name="Receita" fill="#2ecc71" radius={[4, 4, 0, 0]} />
            <Bar key="bar-lucro" dataKey="lucro" name="Lucro" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar key="bar-custo" dataKey="custo" name="Custo pedidos" fill="#e74c3c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts row: cost dist + payment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 2: Distribuição de custos */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="mb-1">Distribuição de custos</h3>
          <p className="text-xs text-muted-foreground mb-4">Pedidos vs outros custos incluídos nos relatórios</p>
          {costDistPie.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={costDistPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {costDistPie.map((_, i) => <Cell key={`cell-costdist-${i}`} fill={[CHART_COLORS[3], CHART_COLORS[2]][i % 2]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 3: Formas de pagamento */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="mb-1">Formas de pagamento</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuição da receita por forma de pagamento</p>
          {paymentData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {paymentData.map((entry, i) => <Cell key={`cell-payment-${entry.name}-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 4: Produtos mais vendidos */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="mb-1">Produtos mais vendidos</h3>
        <p className="text-xs text-muted-foreground mb-4">Por quantidade no período selecionado</p>
        {productStats.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Sem dados para o período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productStats} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={100} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 text-sm shadow-lg">
                      <p className="mb-1">{d.name}</p>
                      <p className="text-primary">Qtd: {d.quantity}</p>
                      <p className="text-green-600">Receita: {fmt(d.revenue)}</p>
                      <p className="text-muted-foreground">Lucro: {fmt(d.profit)}</p>
                    </div>
                  );
                }}
              />
              <Bar key="bar-qty" dataKey="quantity" name="Quantidade" fill="#6366f1" radius={[0, 4, 4, 0]}>
                {productStats.map((_, i) => <Cell key={`cell-prod-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 5: Outros custos ao longo do tempo */}
      {includedExtraCosts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="mb-1">Outros custos ao longo do tempo</h3>
          <p className="text-xs text-muted-foreground mb-4">Apenas custos marcados como "incluídos nos relatórios" — últimos 7 dias</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={extraCostTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line key="line-extras" type="monotone" dataKey="valor" name="Outros custos" stroke="#e74c3c" strokeWidth={2} dot={{ r: 4, fill: "#e74c3c" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Profit trend line */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="mb-1">Tendência de lucro</h3>
        <p className="text-xs text-muted-foreground mb-4">Lucro de vendas vs receita — últimos 7 dias</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `R$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line key="line-lucro" type="monotone" dataKey="lucro" name="Lucro" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            <Line key="line-receita" type="monotone" dataKey="receita" name="Receita" stroke="#2ecc71" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
