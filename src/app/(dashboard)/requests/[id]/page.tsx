import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Redirect old detail URLs to new 2-panel layout.
 * /requests/[id] → /requests?id=[id]
 */
export default async function RequestDetailRedirect({ params }: PageProps) {
  const { id } = await params;

  // Safe params validation - redirect to list if invalid ID
  if (!id || typeof id !== 'string') {
    redirect('/requests');
  }

  redirect(`/requests?id=${id}`);
}
