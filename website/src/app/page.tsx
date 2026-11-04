import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Statistics from '@/components/Statistics';
import HowItWorks from '@/components/HowItWorks';
import CallToAction from '@/components/CallToAction';
import FAQ from '@/components/FAQ';

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Statistics />
      <FAQ />
      <CallToAction />
    </>
  );
}
