import { useState } from "react";
import { useStore } from "../store";
import { Landmark, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  card: "Cartão",
  pix: "PIX",
  other: "Outro",
  "não informado": "Não informado",
};

export default function CashRegister() {
  const { orders, dailyCloses, closeDailyRegister } = useStore();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [lastClosed, setLastClosed] = useState<string | null>(null);

  const todayOrders = orders.filter((o) => o.createdAt.startsWith(selectedDate));
  const alreadyClosed = dailyCloses.find((c) => c.date === selectedDate);

  const previewSale = todayOrders.reduce((s, o) => s + o.totalSale, 0);
  const previewCost = todayOrders.reduce((s, o) => s + o.totalCost, 0);
  const previewProfit = previewSale - previewCost;
  const paymentMap: Record<string, number> = {};
  todayOrders.forEach((o) => {
    if (o.payments?.length) {
      o.payments.forEach((p) => {
        const k = p.method || "não informado";
        paymentMap[k] = (paymentMap[k] || 0) + p.amount;
      });
    } else {
      const pm = o.paymentMethod || "não informado";
      paymentMap[pm] = (paymentMap[pm] || 0) + o.totalSale;
    }
  });

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      const result = closeDailyRegister(selectedDate);
      setClosing(false);
      if (result) setLastClosed(selectedDate);
    }, 800);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Landmark className="text-primary" size={24} />
        <h1>Fechamento de Caixa</h1>
      </div>

      {/* Date selector and preview */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-4 flex-wrap mb-5">
          <div>
            <label className="block text-sm mb-1 text-muted-foreground">Selecionar data</label>
            <input
              type="date"
              className="border border-border rounded-lg px-3 py-2 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground mt-4">
            {todayOrders.length} pedido(s) no dia
          </div>
        </div>

        {todayOrders.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <AlertCircle size={18} />
            <span className="text-sm">Nenhum pedido registrado nesta data.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <p className="text-xs text-green-700 mb-1">Total vendido</p>
                <p className="text-green-700">{fmt(previewSale)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <p className="text-xs text-red-600 mb-1">Total de custos</p>
                <p className="text-red-600">{fmt(previewCost)}</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <p className="text-xs text-primary mb-1">Lucro do dia</p>
                <p className="text-primary">{fmt(previewProfit)}</p>
              </div>
              <div className="bg-accent rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
                <p>{todayOrders.length}</p>
              </div>
            </div>

            {/* Payment breakdown */}
            {Object.keys(paymentMap).length > 0 && (
              <div className="mb-5">
                <h4 className="mb-3 text-sm text-muted-foreground">Breakdown por pagamento</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(paymentMap).map(([pm, value]) => (
                    <div key={pm} className="bg-accent/40 rounded-lg px-3 py-2 flex justify-between items-center text-sm">
                      <span>{PAYMENT_LABELS[pm] || pm}</span>
                      <span className="text-green-600">{fmt(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alreadyClosed ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <CheckCircle size={18} />
                <span className="text-sm">Caixa já fechado em {new Date(alreadyClosed.closedAt).toLocaleString("pt-BR")}</span>
              </div>
            ) : (
              <button
                onClick={handleClose}
                disabled={closing}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
              >
                {closing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Fechando...
                  </>
                ) : (
                  <>
                    <Landmark size={16} />
                    Fechar caixa do dia
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* History */}
      <div>
        <h2 className="mb-4">Histórico de fechamentos</h2>
        {dailyCloses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Landmark size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhum fechamento registrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dailyCloses.map((c) => (
              <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/20 transition-colors"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p>{format(new Date(c.date + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="text-green-600">{fmt(c.totalSale)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lucro</p>
                      <p className="text-primary">{fmt(c.profit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p>{c.orderCount}</p>
                    </div>
                  </div>
                  {expandedId === c.id ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
                </button>

                {expandedId === c.id && (
                  <div className="border-t border-border p-4 bg-accent/10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
                      <div className="bg-card rounded-lg p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Custo total</p>
                        <p className="text-red-500">{fmt(c.totalCost)}</p>
                      </div>
                      <div className="bg-card rounded-lg p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Margem</p>
                        <p>{c.totalSale > 0 ? ((c.profit / c.totalSale) * 100).toFixed(1) : 0}%</p>
                      </div>
                      <div className="bg-card rounded-lg p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Fechado às</p>
                        <p>{new Date(c.closedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    {Object.keys(c.paymentBreakdown).length > 0 && (
                      <>
                        <h4 className="text-sm mb-2 text-muted-foreground">Formas de pagamento</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(c.paymentBreakdown).map(([pm, value]) => (
                            <div key={pm} className="bg-accent/40 rounded-lg px-3 py-2 flex justify-between text-sm">
                              <span>{PAYMENT_LABELS[pm] || pm}</span>
                              <span className="text-green-600">{fmt(value)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
