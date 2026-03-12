import { type } from '@/lib/typography';
import { PageHeader } from '@/app/components/PageHeader';
import { AboutAccordion } from './AboutAccordion';

export default function AboutPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader className="bg-transparent border-b-0">
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>About.</h1>
      </PageHeader>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-12 pb-20 space-y-16">
        <section className="text-center">
          <div className="aspect-video rounded-[48px] overflow-hidden mb-12 shadow-2xl border border-relay-border dark:border-relay-border-dark bg-white dark:bg-relay-bg-dark flex items-center justify-center">
            <img
              src="/about-hero.svg"
              alt="Rellaey rotation illustration"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-5xl font-serif  text-relay-text dark:text-relay-text-dark mb-6 tracking-tighter">The Rotation.</h2>
          <p className="text-relay-muted dark:text-relay-muted-light text-base leading-relaxed font-light  opacity-80 max-w-[320px] mx-auto">
            Rellaey was born from a simple observation: great technology shouldn&apos;t gather dust. We created a circular economy for tech enthusiasts who value quality, authenticity, and the thrill of the new.
          </p>
        </section>

        <AboutAccordion />

        <section className="py-12 border-t border-relay-border dark:border-relay-border-dark text-center">
          <p className="text-[10px] font-bold tracking-[0.5em] text-primary mb-12">Version 2.4 Gold</p>
          <p className="text-relay-muted dark:text-relay-muted-light text-[9px] font-bold tracking-[0.3em] px-12 leading-loose">
            Curated in Brooklyn. <br />
            Engineered for the World. <br />
            © 2024 Rellaey Marketplace Inc.
          </p>
        </section>
      </div>
      </div>
    </div>
  );
}
