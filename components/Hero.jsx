import {
  Award,
  Zap,
  MonitorPlay,
  DollarSign,
  Truck,
  Receipt,
  FileCheck,
  Users,
  BarChart3,
} from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text Content */}
          <div className="reveal active text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border-brand-500/30 text-brand-400 text-sm font-bold mb-6 tracking-wide">
              <Award className="w-4 h-4" />
              5 Años Liderando la Digitalización del Sector
            </div>
            <h1 className="font-heading text-5xl lg:text-7xl font-extrabold leading-[1.1] mb-6">
              El Cerebro de tu <br />
              <span className="gradient-text">Empresa Integral</span>
            </h1>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto lg:mx-0">
              Somos una firma tecnológica especializada. Tras 5 años
              perfeccionando operativas complejas, creamos el único ERP que
              domina Reciclaje, Transporte, Finanzas y SAT en una arquitectura
              de alto nivel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="#planes"
                className="px-8 py-4 rounded-full bg-brand-500 text-white font-semibold text-lg hover:bg-brand-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Descubrir Plan Único <Zap className="w-5 h-5" />
              </a>
              <button className="px-8 py-4 rounded-full glass-panel text-white font-semibold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 border-slate-600">
                <MonitorPlay className="w-5 h-5 text-tech-400" /> Ver Demo
              </button>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative lg:h-[600px] flex items-center justify-center reveal active animate-float lg:ml-10">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-500 to-tech-500 rounded-[2rem] blur-2xl opacity-20"></div>

              <div className="relative glass-panel rounded-2xl p-5 shadow-2xl border-t border-l border-white/10">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <div className="flex gap-4 text-xs font-medium text-slate-400">
                    <span className="text-brand-400 border-b border-brand-400 pb-1">
                      BI Live
                    </span>
                    <span>Finanzas</span>
                    <span>Logística</span>
                    <span>RH</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <DollarSign className="w-4 h-4 text-brand-400" />
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                        +14%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Cuentas por Cobrar</p>
                    <p className="font-bold text-lg">$1.2M MXN</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <Truck className="w-4 h-4 text-tech-400" />
                      <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">
                        Activos
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Fletes en Ruta</p>
                    <p className="font-bold text-lg">24 Viajes</p>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 mb-4">
                  <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                    Flujo Financiero (Hoy)
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                          <Receipt className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-xs text-white">
                            Liquidación Operador
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Viaje MTY-CDMX (Juan P.)
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-red-400">
                        -$4,500.00
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                          <FileCheck className="w-4 h-4 text-brand-400" />
                        </div>
                        <div>
                          <p className="text-xs text-white">
                            Complemento de Pago
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Factura #F-8492 (REP)
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-brand-400">
                        +$124,000.00
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute -right-8 top-16 glass-panel p-3 rounded-xl shadow-xl flex items-center gap-3 animate-float"
                style={{ animationDelay: '1s' }}
              >
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Módulo RH
                  </p>
                  <p className="text-sm font-bold">Nómina Lista</p>
                </div>
              </div>

              <div
                className="absolute -left-10 bottom-24 glass-panel p-3 rounded-xl shadow-xl flex items-center gap-3 animate-float"
                style={{ animationDelay: '2s' }}
              >
                <div className="w-8 h-8 rounded-full bg-tech-500/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-tech-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Mantenimiento
                  </p>
                  <p className="text-sm font-bold">Dashboard OK ✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
