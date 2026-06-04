import NextAuth, { AuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import prisma from './db'

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || 'dummy_id',
      clientSecret: process.env.GITHUB_SECRET || 'dummy_secret',
    }),
    CredentialsProvider({
      name: 'Demo Account',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'demo@local' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() || 'demo@local'
        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: email.split('@')[0],
              role: email === 'demo@local' ? 'admin' : 'user',
            },
          })
        }
        return user as any
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: any) {
      if (session?.user && token) {
        session.user.id = token.sub
        session.user.role = token.role ?? 'user'
      }
      return session
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role ?? 'user'
      }
      return token
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev_secret_key_12345',
}

export default NextAuth(authOptions)