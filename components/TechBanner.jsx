import { Cpu, Server, Atom, Triangle, Database, CloudCog } from 'lucide-react';

const stack = [
  { Icon: Server, label: 'Django', color: 'text-emerald-400', hover: 'hover:border-brand-400/50' },
  { Icon: Atom, label: 'React + Next.js', color: 'text-blue-400', hover: 'hover:border-tech-400/50' },
  { Icon: Triangle, label: 'Vercel', color: 'text-white', hover: 'hover:border-white/50' },
  { Icon: Database, label: 'PostgreSQL', color: 'text-blue-500', hover: 'hover:border-blue-500/50' },
  { Icon: CloudCog, label: 'S3 + Google Cloud', color: 'text-orange-400', hover: 'hover:border-orange-400/50' },
];

export default function TechBanner() {
  return (
    <section className="border-y border-white/5 bg-slate-900/80 py-16 relative z-10 overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-tech-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 relative flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="text-center lg:text-left max-w-2xl">
          <p className="text-sm text-brand-400 font-bold uppercase tracking-widest mb-3 flex items-center justify-center lg:justify-start gap-2">
            <Cpu className="w-4 h-4" /> Infraestructura de Alto Rendimiento
          </p>
          <h3 className="text-3xl font-bold text-white mb-4 font-heading">
            La Tecnología detrás de los Líderes
          </h3>
          <p className="text-slate-400 text-lg">
            A diferencia de los sistemas legacy, nosotros no utilizamos plantillas
            ni software de escritorio obsoleto. Hemos invertido nuestros{' '}
            <strong>5 años de experiencia corporativa</strong> en orquestar el
            stack tecnológico más robusto del mercado global. Escalabilidad
            elástica, tiempos de respuesta en milisegundos y seguridad
            inquebrantable.
          </p>
        </div>

        <div className="flex flex-wrap justify-center lg:justify-end gap-4 items-center opacity-90 w-full lg:w-auto">
          {stack.map(({ Icon, label, color, hover }) => (
            <div
              key={label}
              className={`glass-panel px-5 py-3 rounded-xl border border-slate-700/50 flex items-center gap-3 transition-colors ${hover}`}
            >
              <Icon className={`w-6 h-6 ${color}`} />
              <span className="font-heading font-bold text-white">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
