import { redirect } from 'next/navigation';

// Reservations was renamed to Orders (see app/admin/orders/page.tsx) to match
// the client's requested information architecture. This route stays only as
// a redirect so any bookmarked or shared link to the old path still works —
// /admin/orders is the one canonical route.
export default function AdminReservationsRedirect() {
  redirect('/admin/orders');
}
