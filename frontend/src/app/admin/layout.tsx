import type { Metadata } from 'next';
import { FournisseurAuth } from '@/components/admin/ContexteAuth';

export const metadata: Metadata = {
  title: {
    default: 'Espace administration',
    template: '%s · MyABLODE Admin',
  },
  // Le back-office ne doit jamais apparaître dans les moteurs de recherche.
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-admin-fond text-admin-encre">
      <FournisseurAuth>{children}</FournisseurAuth>
    </div>
  );
}
