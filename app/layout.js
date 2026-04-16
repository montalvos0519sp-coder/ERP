import './globals.css';

export const metadata = {
  title: 'EcoLogix ERP | El Futuro del Reciclaje, Transporte y Administración',
  description:
    'ERP integral para Reciclaje, Transporte, Finanzas y SAT. Tecnología de alto nivel con 5 años de experiencia liderando la digitalización del sector.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
