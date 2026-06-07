# Synergy CG — Landing comercial (ERP a la medida + ISO 9001)

Landing page comercial de **Synergy CG · División Consultoría de Negocios**, construida con
**Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **TypeScript** y **lucide-react**.

Página de marketing para comercializar un **ERP inteligente hecho a la medida**, con flujos y
herramientas configurables que se adaptan a cualquier empresa, y módulo + acompañamiento para la
**certificación ISO 9001**.

## ✨ Características

- **Modo claro / oscuro** con toggle (oscuro por defecto).
- **Hero** animado: órbita de módulos, tarjetas KPI flotantes, prueba social y barra de anuncio.
- Sección **"ERP de nueva generación"**: flujos configurables, automatizaciones, multi-empresa, API.
- **10 módulos** con el detalle de lo que incluye cada uno.
- Sección **ISO 9001**: ruta a la certificación, garantías y opción de **consultor dedicado**.
- **IA integrada**, beneficios, proceso de trabajo y formulario de contacto.
- 100% responsiva, con animaciones por scroll y `prefers-reduced-motion`.

## 🚀 Cómo correr el proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Modo desarrollo
npm run dev

# 3. Build de producción
npm run build
npm run start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura

```
.
├── app/
│   ├── globals.css      # Tailwind + animaciones de la landing
│   ├── layout.tsx       # Layout raíz + ThemeProvider (modo oscuro por defecto)
│   └── page.tsx         # La landing completa
├── components/
│   └── SynergyLogo.tsx  # Logo vectorial Synergy CG (isotipo + wordmark)
└── lib/
    └── ThemeContext.tsx # Estado de tema claro/oscuro
```

---

© Synergy CG · División Consultoría de Negocios. _Tu visión. Nuestra experiencia. Soluciones que transforman._
