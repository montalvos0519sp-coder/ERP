import {
  PieChart,
  BarChart2,
  Activity,
  LineChart,
  Users2,
  Building2,
} from 'lucide-react';

export default function Dashboards() {
  return (
    <section
      id="dashboards"
      className="py-24 relative z-10 border-t border-white/5 overflow-hidden"
    >
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-tech-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tech-500/10 text-tech-400 text-xs font-bold mb-4 border border-tech-500/20 uppercase tracking-widest">
            <PieChart className="w-4 h-4" /> Data Analytics en Tiempo Real
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Business Intelligence Integrado
          </h2>
          <p className="text-slate-400 max-w-3xl mx-auto text-lg">
            Un ERP no está completo si no te dice qué está pasando. Gracias a
            nuestro backend en PostgreSQL, generamos{' '}
            <strong>Dashboards visuales instantáneos</strong> de cada rincón de
            tu empresa.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Col 1 */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-brand-400 reveal glass-card-hover group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-white font-bold text-lg flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-brand-400" /> Reportes de
                    Báscula y Patios
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">
                    Conoce tu inventario real y el flujo de materiales.
                  </p>
                </div>
              </div>
              <ul className="text-sm text-slate-300 space-y-2 mb-4">
                <li>• Kilos procesados vs. Porcentaje de Merma (Diario/Mensual).</li>
                <li>• Histórico de precios de compra/venta (PET, Cartón, Fierro).</li>
                <li>• Dashboard de Entradas de Maquila y Rendimiento.</li>
              </ul>
              <div className="space-y-2">
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-brand-400 h-1.5 rounded-full progress-bar"
                    style={{ '--target-width': '85%' }}
                  ></div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-brand-500 h-1.5 rounded-full progress-bar"
                    style={{ '--target-width': '65%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div
              className="glass-panel p-6 rounded-2xl border-l-4 border-l-tech-400 reveal glass-card-hover group"
              style={{ transitionDelay: '100ms' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-white font-bold text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-tech-400" /> Monitor de
                    Flotilla y Logística
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">
                    Rentabilidad exacta por viaje y por unidad.
                  </p>
                </div>
              </div>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>• Análisis de rendimiento de diésel (Km/Litro esperado vs real).</li>
                <li>• Reporte de utilidad neta por Flete (Ingreso vs. Gastos y Liquidación).</li>
                <li>• Tiempos muertos de operadores en ruta o patio.</li>
              </ul>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-6">
            <div
              className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-400 reveal glass-card-hover group"
              style={{ transitionDelay: '200ms' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-white font-bold text-lg flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-emerald-400" /> Cashflow
                    y Cuentas por Pagar
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">
                    La salud financiera de tu empresa a un clic.
                  </p>
                </div>
              </div>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>• Antigüedad de Saldos (CXP y CXC a 30, 60, 90 días).</li>
                <li>• Presupuesto vs Gasto Real por sucursal.</li>
                <li>• Reporte vivo de Órdenes de Compra pendientes.</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="glass-panel p-5 rounded-2xl border-l-4 border-l-purple-400 reveal glass-card-hover"
                style={{ transitionDelay: '300ms' }}
              >
                <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
                  <Users2 className="w-4 h-4 text-purple-400" /> RH y Personal
                </h4>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li>• Reporte de ausentismos e incidencias.</li>
                  <li>• Acumulado de horas extra.</li>
                </ul>
              </div>
              <div
                className="glass-panel p-5 rounded-2xl border-l-4 border-l-red-400 reveal glass-card-hover"
                style={{ transitionDelay: '400ms' }}
              >
                <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-red-400" /> Fiscal y SAT
                </h4>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li>• IVA Trasladado vs Acreditable.</li>
                  <li>• Facturas vs. REP pendientes.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
