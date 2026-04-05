# okxie-link

A lightweight fetch-based HTTP client focused on clear request flow and structured error handling.

## Why okxie-link

`okxie-link` is a small transport-focused HTTP client built on top of native `fetch`.

It provides:

- clear request configuration
- JSON request helpers
- timeout support
- structured error types
- simple, testable internal design

## Features

- Native `fetch` based
- Query string building
- JSON body serialization
- FormData support
- Request timeout support
- Structured error handling
- `request`, `requestJson`, `getJson`, `postJson`, `putJson`

## Installation

This project is currently under local development.

```sh
  pnpm install
```

## Development

```sh
  pnpm test
  pnpm lint
  pnpm build
```

## Quick Start

```js
import { HttpClient, HTTP_METHOD } from 'okxie-link'

const http = new HttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
})

const response = await http.request({
  url: '/users',
  method: HTTP_METHOD.GET,
  query: {
    page: 1,
  },
})
```

## JSON API

### GET JSON

```js
  const user = await http.getJson<{ id: number; name: string }>('/users/1')
```

### POST JSON

```js
 const created = await http.postJson<{ id: number; name: string }>('/users', {
    body: {
      name: 'Tom',
    },
  })
```

### PUT JSON

```js
  const updated = await http.putJson<{ id: number; name: string }>('/users/1', {
    body: {
      name: 'Jerry',
    },
  })
```

## Error Types

okxie-link provides structured error classes:

- HttpError
- NetworkError
- TimeoutError
- AbortError

Example:

```js
import { HttpError, NetworkError, TimeoutError, AbortError } from 'okxie-link'

try {
  await http.getJson('/users/1')
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('request timed out')
  } else if (error instanceof AbortError) {
    console.log('request aborted')
  } else if (error instanceof HttpError) {
    console.log(error.status)
  } else if (error instanceof NetworkError) {
    console.log(error.requestUrl)
  }
}
```

## Notes

- request() returns Response
- requestJson() returns parsed JSON
- requestJson() returns undefined for 204 No Content

  ## License

MIT

---
