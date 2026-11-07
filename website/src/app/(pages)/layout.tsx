import Header from '@/components/Header';
import Footer from '@/components/Footer';

/** Публичная часть сайта: шапка и подвал. Панель Комитета (/admin) — без них. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="overflow-x-clip min-h-[60vh]">{children}</main>
      <Footer />
    </>
  );
}
