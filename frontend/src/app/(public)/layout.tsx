import { EnTete } from '@/components/public/EnTete';
import { PiedDePageConditionnel } from '@/components/public/PiedDePageConditionnel';

export default function LayoutPublic({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ablode-nuit focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu
      </a>
      <EnTete />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <PiedDePageConditionnel />
    </div>
  );
}
