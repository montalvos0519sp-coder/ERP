import { Calculator, Users, Wrench } from 'lucide-react';

const cards = [
  {
    Icon: Calculator,
    title: 'Cuentas por Pagar (CXP) & Compras',
    description: (
      <>
        Flujo de autorización profesional. Desde la requisición y{' '}
        <strong>Orden de Compra</strong>, hasta la validación de la factura del
        proveedor y su programación de pago.
      </>
    ),
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    tags: ['Flujos de Aprobación', 'Antigüedad de Saldos'],
    delay: '0ms',
  },
  {
    Icon: Users,
    title: 'Recursos Humanos (RH)',
    description:
      'Gestiona a tu equipo de planta, administrativos y choferes. Control de expedientes, incidencias, préstamos a empleados y pre-nómina integrada al costo operativo.',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    iconColor: 'text-purple-400',
    tags: ['Expedientes Digitales', 'Control de Incidencias'],
    delay: '100ms',
  },
  {
    Icon: Wrench,
    title: 'Mantenimiento de Flotilla y Planta',
    description:
      'Programa mantenimientos preventivos y correctivos. Lleva el inventario de refacciones, llantas y asigna costos directos a cada unidad de transporte o máquina.',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    iconColor: 'text-amber-400',
    tags: ['Órdenes de Trabajo', 'Gestión de Llantas'],
    delay: '200ms',
  },
];

export default function Administration() {
  return (
    <section
      id="administracion"
      className="py-24 relative z-10 bg-slate-900/30 border-y border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 reveal">
          <h2 className="font-heading text-sm text-purple-400 font-bold tracking-widest uppercase mb-2">
            Fase 2
          </h2>
          <h3 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            El Motor de tu{' '}
            <span className="text-purple-400">Administración</span>
          </h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Una empresa profesional requiere controles estrictos. Centraliza
            finanzas, compras, personal y activos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div
              key={c.title}
              className="glass-panel glass-card-hover rounded-3xl p-6 reveal"
              style={{ transitionDelay: c.delay }}
            >
              <div
                className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-4 border ${c.border}`}
              >
                <c.Icon className={`w-6 h-6 ${c.iconColor}`} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">{c.title}</h4>
              <p className="text-sm text-slate-400 mb-4">{c.description}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
