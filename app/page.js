import BackgroundEffects from '@/components/BackgroundEffects';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import TechBanner from '@/components/TechBanner';
import Operations from '@/components/Operations';
import Administration from '@/components/Administration';
import Dashboards from '@/components/Dashboards';
import Facturacion from '@/components/Facturacion';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';

export default function HomePage() {
  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <main>
        <Hero />
        <TechBanner />
        <Operations />
        <Administration />
        <Dashboards />
        <Facturacion />
        <Pricing />
      </main>
      <Footer />
      <ScrollReveal />
    </>
  );
}
