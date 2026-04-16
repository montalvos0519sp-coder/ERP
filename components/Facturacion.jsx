import {
  ShieldCheck,
  FileText,
  Copy,
  CheckSquare,
  XCircle,
  Check,
  Send,
} from 'lucide-react';

const features = [
  {
    Icon: FileText,
    title: 'Facturación de Viajes',
    description: (
      <>
        Genera la factura y el{' '}
        <strong className="text-white">Complemento Carta Porte</strong> con 1
        clic desde logística.
      </>
    ),
  },
  {
    Icon: Copy,
    title: 'Facturas Libres',
    description:
      'Crea facturas de servicios o conceptos abiertos sin depender de un ticket de báscula o viaje.',
  },
  {
    Icon: CheckSquare,
    title: 'Complementos (REP)',
    description:
      'Genera Complementos de Pago automáticamente al conciliar depósitos.',
  },
  {
    Icon: XCircle,
    title: 'Notas y Cancelaciones',
    description: (
      <>
        Emite Notas de Crédito y gestiona{' '}
        <strong>Tipos de Cancelación (01 al 04)</strong> automáticamente.
      </>
    ),
  },
];

export default function Facturacion() {
  return (
    <section
      id="facturacion"
      className="py-24 relative z-10 border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden group reveal border-t border-l border-white/10 shadow-2xl">
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-700"></div>

          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold mb-6 border border-red-500/20">
                <ShieldCheck className="w-4 h-4" /> PAC Certificado - SAT CFDI 4.0
              </div>
              <h3 className="text-3xl md:text-4xl font-bold font-heading mb-6">
                Masterización Fiscal <br />
                <span className="text-white">
                  Todo el rigor del SAT, automatizado.
                </span>
              </h3>
              <p className="text-slate-400 mb-8">
                Olvídate del portal del SAT y de sistemas contables externos
                lentos. Hemos incrustado toda la lógica fiscal directamente en
                la operación para automatizar tus ingresos.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((f) => (
                  <div
                    key={f.title}
                    className="bg-slate-900/50 p-4 rounded-xl border border-white/5"
                  >
                    <h5 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                      <f.Icon className="w-4 h-4 text-tech-400" /> {f.title}
                    </h5>
                    <p className="text-xs text-slate-400">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0f172a] rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h4 className="text-white font-mono text-sm">
                    Visor CFDI Inteligente
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Timbrado asíncrono en 0.8s con backend en Django.
                  </p>
                </div>
                <div className="w-8 h-8 rounded bg-brand-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-brand-400" />
                </div>
              </div>

              <div className="space-y-3 font-mono text-[10px] text-slate-500">
                <p className="text-slate-600">
                  &lt;cfdi:Comprobante Version=&quot;4.0&quot;
                  Fecha=&quot;2026-04-15...&quot;&gt;
                </p>
                <p className="pl-4">
                  &lt;cfdi:Emisor Rfc=&quot;ECO200101XYZ&quot;
                  RegimenFiscal=&quot;601&quot;/&gt;
                </p>
                <p className="pl-4 text-tech-400">
                  &lt;cfdi:Receptor Rfc=&quot;CTE991231ABC&quot;
                  UsoCFDI=&quot;G03&quot;/&gt;
                </p>
                <p className="pl-4">&lt;cfdi:Conceptos&gt;</p>
                <p className="pl-8 text-white">
                  &lt;cfdi:Concepto ClaveProdServ=&quot;78101800&quot;
                  Descripcion=&quot;Flete MTY-MEX&quot;...&gt;
                </p>
                <p className="pl-4">&lt;/cfdi:Conceptos&gt;</p>
                <div className="pl-4 py-2 my-2 border-l-2 border-purple-500/50 bg-purple-500/5">
                  <p className="text-purple-400 pl-2">
                    &lt;cartaporte30:CartaPorte IdCCP=&quot;CCC...&quot;&gt;
                  </p>
                  <p className="text-slate-400 pl-6">
                    &lt;cartaporte30:Ubicaciones&gt;...&lt;/cartaporte30:Ubicaciones&gt;
                  </p>
                  <p className="text-purple-400 pl-2">
                    &lt;/cartaporte30:CartaPorte&gt;
                  </p>
                </div>
                <p className="text-slate-600">&lt;/cfdi:Comprobante&gt;</p>
              </div>

              <div className="absolute -right-6 -bottom-6 bg-slate-800 p-4 rounded-xl border border-slate-600 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                  <Send className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-white font-bold">
                    Timbrado Exitoso
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Enviado vía SendGrid al cliente
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
