import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Supabaseにユーザー情報を保存
        const { data, error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            created_at: new Date().toISOString(),
            plan: 'free',
            articles_used: 0,
            articles_limit: 3
          })
        
        if (error) {
          console.error('Supabase upsert error:', error)
          return false
        }
        
        return true
      }
      return true
    },
    async session({ session, token }) {
      // セッションにユーザーの使用状況を追加
      if (session.user?.email) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single()
        
        if (data) {
          session.user = {
            ...session.user,
            plan: data.plan,
            articlesUsed: data.articles_used,
            articlesLimit: data.articles_limit
          }
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
})

export { handler as GET, handler as POST }