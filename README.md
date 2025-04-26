# TMDB GraphQL Node Proxy

A Node.js proxy server for [nerdsupremacist's TMDB GraphQL API wrapper](https://github.com/nerdsupremacist/tmdb). This proxy was created to solve the original graphQL API's expired SSL certificate

## Purpose

The original TMDB GraphQL wrapper (https://github.com/nerdsupremacist/tmdb) has an expired SSL certificate. This proxy server allows you to bypass this issue by:

1. Handling the SSL certificate error on the server side
2. Providing a secure endpoint for your applications
3. Adding caching features to improve performance

## Features

- Securely proxies GraphQL requests to the TMDB GraphQL API despite its expired SSL certificate
- Caches introspection queries for 30 days for improved performance
- Includes a GraphQL Playground UI for testing queries
- Error handling and request forwarding

## Deployment

This service is hosted on render.com in the US East region. 

**Note:** Since this service is on a free tier, it goes to sleep after periods of inactivity and can take up to 1 minute to wake up on the first request. Subsequent requests will be processed normally.

## Installation

```bash
# Clone the repository
git clone https://github.com/vincentbollaert/tmdb-graphql-quintero-proxy.git
cd tmdb-graphql-node-proxy

# Install dependencies
npm install
# or with pnpm
pnpm install
```

## Usage

```bash
# Development mode
npm run dev
# or
pnpm dev

# Build for production
npm run build
# or
pnpm build

# Preview production build
npm run preview
# or
pnpm preview
```

Once running, the server is available at http://localhost:2025/graphql

## License

ISC
