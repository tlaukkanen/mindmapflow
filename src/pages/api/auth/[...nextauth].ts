import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

import { logger } from "@/services/logger";
export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
    // ...add more providers here
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      logger.info(
        `Sign in attempt: user=${user.email}, provider=${account?.provider}`,
      );

      const allowedUsersEnv = process.env.ALLOWED_USERS || "";
      const allowedUsers = allowedUsersEnv
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0);

      const userEmail = user.email?.toLowerCase() || "";

      if (userEmail.length > 0 && allowedUsers.includes(userEmail)) {
        logger.info(`User ${user.email} allowed to sign in`);

        return true;
      }
      logger.error(
        `User ${user.email} not allowed to sign in as they are not in the allowed users list`,
      );
      logger.error(`User object: ${JSON.stringify(user)}`);
      logger.error(`Account object: ${JSON.stringify(account)}`);
      logger.error(`Profile object: ${JSON.stringify(profile)}`);

      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          user: {
            ...user,
          },
        };
      }

      //logger.info(`JWT callback: ${token.email}`);
      //logger.info(`User object: ${JSON.stringify(user)}`);

      return token;
    },
    async session({ session, token }) {
      session.user = { email: token.email };
      //logger.info(`Session callback: ${session.user?.email}`);
      //logger.info(`Token object: ${JSON.stringify(token)}`);

      return session;
    },
  },
};

export default NextAuth(authOptions);
