import {
  Layers,
  Twitter,
  Linkedin,
  Facebook,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

const coreLinks = [
  'Báscula y Trading',
  'Logística Integral',
  'Recursos Humanos',
  'CXP y Compras',
  'Dashboards Analíticos',
];

const satLinks = [
  'CFDI 4.0 & Libres',
  'Complemento Carta Porte',
  'Complementos REP',
  'Notas y Cancelaciones',
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/5 pt-16 pb-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-tech-500 flex items-center justify-center">
                <Layers className="text-white w-4 h-4" />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight">
                Eco<span className="text-brand-400">Logix</span> ERP
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">
              5 años revolucionando la industria del reciclaje, transporte y
              finanzas en México mediante tecnología de vanguardia.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Módulos Core</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {coreLinks.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="hover:text-brand-400 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Facturación SAT</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {satLinks.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="hover:text-brand-400 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Contacto Directo</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                <Mail className="w-4 h-4" /> enterprise@ecologix.mx
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                <Phone className="w-4 h-4" /> +52 (81) 1234-5678
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> San Pedro Garza García, N.L.
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            &copy; 2026 EcoLogix ERP Enterprise. Desarrollado en México con
            React, Next.js, Django & Google Cloud.
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition-colors">
              Aviso de Privacidad
            </a>
            <a href="#" className="hover:text-white transition-colors">
              SLA de Soporte y Desarrollo
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
