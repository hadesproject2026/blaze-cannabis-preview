import type { Metadata } from 'next';
import { RequireOwner } from '@/components/admin/RequireOwner';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Admin (Demo) — Blaze Cannabis',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireOwner>
      <AdminShell>{children}</AdminShell>
    </RequireOwner>
  );
}
