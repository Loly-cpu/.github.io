'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SignInPage } from '@/components/ui/sign-in'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=80'

const TESTIMONIALS = [
  {
    avatarSrc: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&q=80',
    name: 'Lena Martens',
    handle: '3de graad doorstroom',
    text: 'Mijn studieplan staat er al in en de agenda synchroniseert automatisch met Smartschool.',
  },
  {
    avatarSrc: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80',
    name: 'Remi Claes',
    handle: '2de graad, ASO',
    text: 'Documenten delen met mijn klas was nog nooit zo makkelijk.',
  },
]

export default function LoginPage() {
  const router = useRouter()

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email    = fd.get('email') as string
    const password = fd.get('password') as string
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) router.replace('/platform')
    else alert('E-mail of wachtwoord klopt niet.')
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/platform` },
    })
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SignInPage
        title={<>Welkom op het<br /><span className="text-[#ff520e]">Schoolplatform</span></>}
        description="Log in om je agenda, berichten, documenten en taalplatform te openen."
        heroImageSrc={HERO_IMAGE}
        testimonials={TESTIMONIALS}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={() => router.push('/auth/wachtwoord-reset')}
        onCreateAccount={() => router.push('/auth/register')}
      />
    </div>
  )
}
