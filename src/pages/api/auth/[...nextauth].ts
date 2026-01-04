import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

import { logger } from "@/services/logger";

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const hostName = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000")
  .hostname;

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
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: hostName === "localhost" ? undefined : "." + hostName,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: hostName === "localhost" ? undefined : "." + hostName,
      },
    },
    csrfToken: {
      name: `${useSecureCookies ? "__Host-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    nonce: {
      name: `${cookiePrefix}next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  // Enable debug mode in development or when DEBUG env var is set
  debug:
    process.env.NODE_ENV === "development" ||
    process.env.NEXTAUTH_DEBUG === "true",
  callbacks: {
    async signIn({ user, account, profile }) {
      const allowedUsers =
        process.env.ALLOWED_USERS?.split(",").map((email) =>
          email.trim().toLowerCase(),
        ) ?? [];

      const userEmail = user.email?.toLowerCase();

      logger.info(
        `Sign-in attempt: ${userEmail}, provider: ${account?.provider}`,
      );

      // If no allowed users configured, deny all (or change to allow all if preferred)
      if (allowedUsers.length === 0) {
        logger.error("No ALLOWED_USERS configured in environment variables");

        return false;
      }

      if (userEmail && allowedUsers.includes(userEmail)) {
        logger.info(`User ${userEmail} allowed to sign in`);

        return true;
      }

      logger.error(
        `User ${userEmail} not allowed to sign in as they are not in the allowed users list: [${allowedUsers.join(", ")}]`,
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
