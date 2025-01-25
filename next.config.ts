/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING:
      process.env.NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING,
    NEXT_PUBLIC_VERSION_TAG: process.env.NEXT_PUBLIC_VERSION_TAG,
  },
};

module.exports = nextConfig;
