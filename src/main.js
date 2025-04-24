const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const cors = require('cors')
const https = require('https')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
})

const tmdbGraphQLProxy = createProxyMiddleware({
  target: 'https://tmdb.apps.quintero.io/',
  changeOrigin: true,
  secure: false, // Disable SSL verification
  agent: httpsAgent,
  onProxyReq: (proxyReq, req, res) => {
    const token = process.env.TMDB_API_TOKEN
    if (token) {
      proxyReq.setHeader('Authorization', `Bearer ${token}`)
    }
  },
})

app.use('/graphql', tmdbGraphQLProxy)

app.get('/health', (req, res) => {
  res.status(200).send('Proxy server is running')
})

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`)
})
