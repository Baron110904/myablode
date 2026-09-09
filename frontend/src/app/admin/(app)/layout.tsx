'use client';

import { useState } from 'react';
import { BarreLaterale } from '@/components/admin/BarreLaterale';
import { Garde } from '@/components/admin/Garde';

export default function LayoutApplicationAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <Garde>
      <div className="flex min-h-screen">
        <aside className="hidden w-[264px] shrink-0 lg:block">
          <div className="fixed inset-y-0 w-[264px]">
            <BarreLaterale />
          </div>
        </aside>

        {/* Tiroir de navigation sur mobile. */}
        {menuOuvert && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setMenuOuvert(false)}
              className="absolute inset-0 bg-black/40"
            />
            <div className="absolute inset-y-0 left-0 w-[264px] animate-apparition">
              <BarreLaterale onNavigation={() => setMenuOuvert(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            className="flex h-[56px] shrink-0 items-center gap-3 border-b border-admin-trait bg-white px-5 text-[0.875rem] font-semibold lg:hidden"
          >
            ☰ Menu
          </button>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </Garde>
  );
}
