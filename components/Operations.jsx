import { Scale, Truck, CheckCircle2 } from 'lucide-react';

const cards = [
  {
    Icon: Scale,
    title: 'Trading & Báscula',
    description:
      'Captura de pesos en tiempo real vinculada a tu hardware. Gestión de compra/venta de PET, Metales y Cartón. Manejo de mermas, sucursales e inventarios multi-almacén al instante.',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
    iconColor: 'text-brand-400',
    bullets: [
      'Cero errores de digitación en pesos',
      'Reportes de Destrucción Generados Automáticamente',
      'Bóveda de evidencias fotográficas en S3',
    ],
    delay: '0ms',
    checkColor: 'text-brand-400',
  },
  {
    Icon: Truck,
    title: 'Logística y Liquidaciones',
    description: (
      <>
        Administración de flotillas. Asigna viajes, monitorea estatus y realiza{' '}
        <strong>liquidaciones exactas a operadores</strong> descontando
        anticipos, diésel y gastos de ruta automáticamente.
      </>
    ),
    bg: 'bg-tech-500/10',
    border: 'border-tech-500/20',
    iconColor: 'text-tech-400',
    bullets: [
      'Liquidaciones de viaje sin Excel',
      'Emisión de Manifiestos (Ej. Control TRANE)',
      'Trazabilidad de origen a destino',
    ],
    delay: '100ms',
    checkColor: 'text-tech-400',
  },
];

export default function Operations() {
  return (
    <section id="operacion" className="py-24 relative z-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 reveal">
          <h2 className="font-heading text-sm text-brand-400 font-bold tracking-widest uppercase mb-2">
            Fase 1
          </h2>
          <h3 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            Operación{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-tech-400">
              Imparable
            </span>
          </h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Control total desde la báscula hasta la entrega final. Especializado
            en las necesidades únicas del reciclaje y transporte.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {cards.map((c) => (
            <div
              key={c.title}
              className="glass-panel glass-card-hover rounded-3xl p-8 reveal"
              style={{ transitionDelay: c.delay }}
            >
              <div
                className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center mb-6 border ${c.border}`}
              >
                <c.Icon className={`w-7 h-7 ${c.iconColor}`} />
              </div>
              <h4 className="text-2xl font-bold font-heading mb-3">{c.title}</h4>
              <p className="text-slate-400 mb-6">{c.description}</p>
              <ul className="space-y-2">
                {c.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${c.checkColor}`} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
