import { redirect } from 'next/navigation'
export default async function GroepRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/platform/berichten/${id}`)
}
