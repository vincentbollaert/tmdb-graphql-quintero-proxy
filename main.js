// simple-proxy.js
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const https = require('https')
const bodyParser = require('body-parser')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 2025
const TMDB_API_URL = 'https://tmdb.apps.quintero.io'

app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))

// In-memory cache for introspection results
let introspectionCache = null
let introspectionCacheTime = null
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const isIntrospectionQuery = (operationName, query) => {
  if (operationName === 'IntrospectionQuery') return true
  if (query && query.trim().match(/^\s*query\s+(\w+\s+)?\{\s*__schema\s*\{/)) return true
  return false
}

// Try to load cached introspection from disk on startup
try {
  const cacheFile = path.join(__dirname, 'introspection-cache.json')
  if (fs.existsSync(cacheFile)) {
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    if (cacheData && cacheData.timestamp && Date.now() - cacheData.timestamp < CACHE_DURATION_MS) {
      introspectionCache = cacheData.data
      introspectionCacheTime = cacheData.timestamp
    }
  }
} catch (error) {
  // Silently fail - will just fetch new introspection data if needed
}

// GraphQL proxy endpoint
app.post('/graphql', async (req, res) => {
  try {
    const { query, operationName } = req.body || {}
    const isIntrospection = isIntrospectionQuery(operationName, query)

    // Handle introspection query caching
    if (isIntrospection) {
      const now = Date.now()
      if (introspectionCache && introspectionCacheTime && now - introspectionCacheTime < CACHE_DURATION_MS) {
        return res.json(introspectionCache)
      }
    }

    // Forward request to TMDB API
    const response = await axios({
      method: 'post',
      url: TMDB_API_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && {
          Authorization: req.headers.authorization,
        }),
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    })

    // If this was an introspection query, cache the result
    if (isIntrospection && response.data) {
      introspectionCache = response.data
      introspectionCacheTime = Date.now()

      // Store to disk for persistence
      try {
        const cacheData = {
          timestamp: introspectionCacheTime,
          data: introspectionCache,
        }
        fs.writeFileSync(path.join(__dirname, 'introspection-cache.json'), JSON.stringify(cacheData))
      } catch (err) {
        // Silently fail - just won't have persistent cache
      }
    }

    // Send response back to client
    return res.status(response.status).json(response.data)
  } catch (error) {
    const status = error.response?.status || 500
    const message = error.response ? `TMDB API Error: ${error.message}` : `Proxy error: ${error.message}`

    return res.status(status).json({
      errors: [{ message }],
    })
  }
})

// GraphQL Playground
app.get('/graphql', (req, res) => {
  res.set('Content-Type', 'text/html')
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>TMDB GraphQL Playground</title>
      <meta charset="utf-8" />
      <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, width=device-width">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.22/build/static/css/index.css" />
      <link rel="shortcut icon" href="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.22/build/favicon.png" />
      <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.22/build/static/js/middleware.js"></script>
    </head>
    <body>
      <div id="root">
        <style>
          body {
            background-color: rgb(23, 42, 58);
            font-family: Open Sans, sans-serif;
            height: 90vh;
          }
          #root {
            height: 100%;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading {
            font-size: 32px;
            font-weight: 200;
            color: rgba(255, 255, 255, .6);
            margin-left: 20px;
          }
          img {
            width: 78px;
            height: 78px;
          }
          .title {
            font-weight: 400;
          }
        </style>
        <img src='https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.22/build/logo.png' alt=''>
        <div class="loading"> Loading
          <span class="title">TMDB GraphQL Playground</span>
        </div>
      </div>
      <script>window.addEventListener('load', function (event) {
          GraphQLPlayground.init(document.getElementById('root'), {
            endpoint: '/graphql',
            settings: {
              'schema.polling.enable': false
            }
          })
        })</script>
    </body>
    </html>
  `)
})

app.listen(PORT, () => {
  console.log(`TMDB GraphQL Proxy running at http://localhost:${PORT}`)
})
