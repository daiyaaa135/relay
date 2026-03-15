import { type } from '@/lib/typography';
import { PageHeader } from '@/app/components/PageHeader';
import { AboutAccordion } from './AboutAccordion';

export default function AboutPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader className="bg-transparent border-b-0">
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>About</h1>
      </PageHeader>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-12 pb-20 space-y-16">
        <section className="text-center">
          <h2 className="text-[28px] font-serif text-relay-text dark:text-relay-text-dark mb-6 tracking-tighter">The Rotation</h2>
          <p className="text-relay-muted dark:text-relay-muted-light text-base leading-relaxed font-light  opacity-80 max-w-[320px] mx-auto">
            Rellaey was born from a simple observation: great technology shouldn&apos;t gather dust. We created a circular economy for tech enthusiasts who value quality, authenticity, and the thrill of the new.
          </p>
        </section>

        <AboutAccordion />

      </div>
      </div>
    </div>
  );
}
