import {
  Star,
  Layers,
  Check,
  Code2,
  Clock,
  Headset,
  Cloud,
  Shield,
} from 'lucide-react';

const erpFeatures = [
  'Operación Core: Compra/Venta, Báscula, Inventarios.',
  'Logística Integral: Viajes, Liquidaciones, Combustible.',
  'Administración: CXP, Compras, RH, Mantenimiento.',
  'Dashboards: Reportes analíticos en vivo y exportables.',
  'SAT Master: Facturación, REP, Cancelaciones, Carta Porte.',
];

const serviceFeatures = [
  {
    Icon: Clock,
    bg: 'bg-tech-500/20',
    border: 'border-tech-500/30',
    iconColor: 'text-tech-400',
    title: '40 Horas de Desarrollo a Medida / Mes',
    description:
      'El ERP evoluciona contigo. Pídenos pantallas nuevas, reportes o reglas de negocio exclusivas para tu empresa.',
  },
  {
    Icon: Headset,
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    title: 'Soporte Prioritario de Ingeniería',
    description:
      'Contacto directo con los desarrolladores que construyeron el sistema, resolviendo retos fiscales y operativos al instante.',
  },
  {
    Icon: Cloud,
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    title: 'Infraestructura Google Cloud + S3',
    description:
      'Alojamiento de clase mundial. Evidencia pesada (fotos/PDF) en Amazon S3, encriptación AES-256 y respaldos diarios.',
  },
];

export default function Pricing() {
  return (
    <section
      id="planes"
      className="py-24 relative z-10 bg-slate-900/50 border-y border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 reveal">
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            Inversión Transparente, <br />
            <span className="gradient-text-gold">Crecimiento Ilimitado</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Nos negamos a cobrarte por módulos ocultos o licencias por usuario.
            Hemos condensado 5 años de experiencia en un{' '}
            <strong>Único Paquete All-In-One</strong>.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl p-1 animate-glow reveal bg-gradient-to-br from-brand-400 via-tech-500 to-purple-600">
            <div className="bg-slate-950 rounded-[22px] p-8 md:p-12 h-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-8 border-b border-white/10 gap-6">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest border border-amber-500/30 mb-4">
                    <Star className="w-3 h-3" /> Software as a Service + Factory
                  </span>
                  <h3 className="font-heading text-4xl font-extrabold text-white">
                    Plan Único Empresarial
                  </h3>
                  <p className="text-slate-400 mt-2 max-w-md">
                    Todo el ecosistema EcoLogix ERP liberado + Nuestro equipo de
                    desarrolladores a tu disposición mensual.
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-5xl md:text-6xl font-extrabold text-white">
                    $28,000
                  </p>
                  <p className="text-sm text-slate-400 uppercase tracking-widest mt-1 font-bold">
                    MXN + IVA / Mensual
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Col 1: ERP Features */}
                <div>
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-brand-400" /> Acceso Total
                    (Usuarios Ilimitados)
                  </h4>
                  <ul className="space-y-3">
                    {erpFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-brand-400 shrink-0" />
                        <span className="text-slate-300 text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Col 2: Tech & Service Value */}
                <div className="bg-slate-900/80 rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-tech-500/10 rounded-full blur-2xl"></div>
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-tech-400" /> Desarrollo
                    Continuo & VIP
                  </h4>
                  <ul className="space-y-4">
                    {serviceFeatures.map((s) => (
                      <li key={s.title} className="flex items-start gap-3">
                        <div
                          className={`${s.bg} p-1.5 rounded-lg border ${s.border} shrink-0`}
                        >
                          <s.Icon className={`w-4 h-4 ${s.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold">
                            {s.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {s.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 text-center">
                <button className="w-full md:w-auto px-12 py-5 rounded-full bg-gradient-to-r from-brand-500 to-tech-500 text-white font-bold text-lg hover:shadow-[0_0_40px_rgba(52,211,153,0.5)] hover:scale-105 transition-all">
                  Solicitar Contratación y Onboarding
                </button>
                <p className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3 inline" /> Contrato a 12 meses.
                  Incluye migración de catálogos inicial.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
