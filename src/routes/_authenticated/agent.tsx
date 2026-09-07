import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';

export const Route = createFileRoute('/_authenticated/agent')({
  component: AgentPage,
});

interface ResumenCaja {
  periodo?: string;
  total_esperado?: number;
  total_gastos_mes?: number;
  total_cobros_en_mora?: number;
  monto_total_mora?: number;
}

function AgentPage() {
  const [loading, setLoading] = useState(false);
  const [respuestaTexto, setRespuestaTexto] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [inputTexto, setInputTexto] = useState('');

  // Webhook de Producción de n8n
  const N8N_URL = 'https://rhuamant.app.n8n.cloud/webhook/cuentas-ops';

  const ejecutarAccion = async (payload: object) => {
    setLoading(true);
    setRespuestaTexto(null);
    setResumen(null);

    try {
      const res = await fetch(N8N_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.resumen_financiero) {
        setResumen(data.resumen_financiero);
      } else if (data.mensaje) {
        setRespuestaTexto(data.mensaje);
      } else if (data.error) {
        setRespuestaTexto(`Aviso: ${data.error}`);
      } else {
        setRespuestaTexto('Operación completada en Supabase.');
      }
    } catch (error) {
      setRespuestaTexto('No se pudo comunicar con n8n. Verifica que el flujo esté en estado Active.');
    } finally {
      setLoading(false);
    }
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTexto.trim() || loading) return;

    const query = inputTexto.toLowerCase();
    if (query.includes('resumen') || query.includes('balance') || query.includes('caja')) {
      ejecutarAccion({ action: 'get_summary' });
    } else if (query.includes('mora') || query.includes('auditar') || query.includes('vencid')) {
      ejecutarAccion({ action: 'audit_morosidad' });
    } else {
      // Extrae número si el usuario escribió un monto de gasto
      const match = inputTexto.match(/\d+(\.\d+)?/);
      const monto = match ? parseFloat(match[0]) : 50;
      ejecutarAccion({
        action: 'log_expense',
        amount: monto,
        category: 'Mantenimiento',
        description: inputTexto
      });
    }
    setInputTexto('');
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>⚡</span> Agente Cuentas AI
          </h1>
          <p className="text-sm text-gray-500">Automatización operativa inmobiliaria con n8n y Supabase</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          n8n Conectado
        </span>
      </div>

      {/* Botones de Acción Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => ejecutarAccion({ action: 'get_summary' })}
          disabled={loading}
          className="p-4 bg-white border rounded-xl text-left hover:border-blue-500 hover:shadow-sm transition-all"
        >
          <div className="text-sm font-bold text-blue-600">📊 1. Resumen de Caja</div>
          <div className="text-xs text-gray-500 mt-1">Ingresos esperados, gastos del mes y cuotas en mora.</div>
        </button>

        <button
          onClick={() => ejecutarAccion({ action: 'audit_morosidad' })}
          disabled={loading}
          className="p-4 bg-white border rounded-xl text-left hover:border-red-500 hover:shadow-sm transition-all"
        >
          <div className="text-sm font-bold text-red-600">⚠️ 2. Auditar Morosidad</div>
          <div className="text-xs text-gray-500 mt-1">Revisa vencimientos y actualiza estados a "overdue".</div>
        </button>

        <button
          onClick={() => ejecutarAccion({ action: 'log_expense', amount: 80, category: 'Servicios', description: 'Recibo de Agua' })}
          disabled={loading}
          className="p-4 bg-white border rounded-xl text-left hover:border-emerald-500 hover:shadow-sm transition-all"
        >
          <div className="text-sm font-bold text-emerald-600">💸 3. Gasto Rápido (Prueba)</div>
          <div className="text-xs text-gray-500 mt-1">Registra un egreso de S/ 80 sin llenar formularios.</div>
        </button>
      </div>

      {/* Visualización de Resultados */}
      <div className="bg-gray-50 border rounded-xl p-6 min-h-[160px] flex items-center justify-center">
        {loading && (
          <div className="text-gray-500 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            Procesando en n8n...
          </div>
        )}

        {!loading && !resumen && !respuestaTexto && (
          <p className="text-gray-400 text-sm text-center">
            Haz clic en uno de los botones de arriba o escribe una orden en la barra inferior.
          </p>
        )}

        {!loading && respuestaTexto && (
          <div className="bg-white p-4 rounded-lg border text-sm font-medium text-gray-800 shadow-sm w-full text-center">
            {respuestaTexto}
          </div>
        )}

        {!loading && resumen && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border text-center shadow-sm">
              <span className="text-xs text-gray-500 uppercase">Cobro Esperado</span>
              <p className="text-xl font-bold text-gray-900 mt-1">S/ {resumen.total_esperado || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center shadow-sm">
              <span className="text-xs text-gray-500 uppercase">Gastos del Mes</span>
              <p className="text-xl font-bold text-amber-600 mt-1">S/ {resumen.total_gastos_mes || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-red-200 text-center shadow-sm">
              <span className="text-xs text-red-500 uppercase">En Mora ({resumen.total_cobros_en_mora || 0})</span>
              <p className="text-xl font-bold text-red-600 mt-1">S/ {resumen.monto_total_mora || 0}</p>
            </div>
          </div>
        )}
      </div>

      {/* Barra de entrada de texto */}
      <form onSubmit={manejarEnvio} className="flex gap-2">
        <input
          type="text"
          value={inputTexto}
          onChange={(e) => setInputTexto(e.target.value)}
          placeholder="Escribe 'resumen', 'auditar mora' o 'gasté 60 en cerrajería'..."
          className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !inputTexto.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}