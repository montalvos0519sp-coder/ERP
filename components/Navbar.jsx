import { Layers, ArrowRight, Menu } from 'lucide-react';

export default function Navbar() {
  return (
    <nav
      id="navbar"
      className="fixed w-full z-50 glass-nav transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-tech-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Layers className="text-white w-6 h-6" />
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight">
              Eco<span className="text-brand-400">Logix</span>{' '}
              <span className="text-xs text-tech-400 align-top">ERP</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center space-x-8">
            <a
              href="#operacion"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Operativa
            </a>
            <a
              href="#administracion"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Administración & RH
            </a>
            <a
              href="#dashboards"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              BI & Analytics
            </a>
            <a
              href="#planes"
              className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
            >
              Plan Único
            </a>
          </div>

          <div className="hidden md:flex items-center">
            <a
              href="#planes"
              className="px-6 py-2.5 rounded-full bg-white text-slate-900 font-semibold text-sm hover:bg-brand-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(52,211,153,0.4)] hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              Cotizar Ahora <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="lg:hidden flex items-center">
            <button className="text-slate-300 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
