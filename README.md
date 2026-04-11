# okxie-link

`okxie-link` is a lightweight HTTP client built on top of native `fetch`.

It focuses on a small, predictable API:

- clear request configuration
- query string building
- JSON request helpers
- timeout and abort support
- structured error handling
- file upload helpers built around `FormData`

## Features

- Native `fetch` based
- Query string serialization through `query`
- Automatic JSON serialization for plain objects and arrays
- `FormData`, `Blob`, `File`, and other `BodyInit` passthrough
- Upload helpers: `upload`, `uploadJson`, `toFormData`
- Request timeout support
- Structured error classes
- TypeScript-first API

## Installation

This project is currently under local development.

```sh
pnpm install
```

## Quick Start

```ts
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

const users = await response.json()
```

## Core API

### Create a client

```ts
import { HttpClient } from 'okxie-link'

const http = new HttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
})
```

### Send a GET request

```ts
const response = await http.get('/users', {
  query: {
    page: 1,
    keyword: 'tom',
  },
})
```

### Send JSON with POST

```ts
const response = await http.post('/users', {
  body: {
    name: 'Tom',
    age: 18,
  },
})
```

### Other HTTP methods

```ts
await http.put('/users/1', {
  body: {
    name: 'Jerry',
  },
})

await http.patch('/users/1', {
  body: {
    nickname: 'JT',
  },
})

await http.delete('/users/1')
await http.head('/users/1')
await http.options('/users')
```

## JSON Helpers

`requestJson()` parses the response body as JSON and returns `undefined` for `204 No Content`.

```ts
const user = await http.requestJson<{ id: number; name: string }>({
  url: '/users/1',
  method: HTTP_METHOD.GET,
})
```

Shortcut methods:

```ts
const profile = await http.getJson<{ id: number; name: string }>('/users/1')

const created = await http.postJson<{ id: number; name: string }>('/users', {
  body: {
    name: 'Tom',
  },
})

const updated = await http.putJson<{ id: number; name: string }>('/users/1', {
  body: {
    name: 'Jerry',
  },
})
```

## Upload API

`okxie-link` supports file upload in two ways:

1. Pass `FormData` directly through `body`
2. Use the upload helpers to build `FormData` for you

### Upload with plain `FormData`

```ts
const formData = new FormData()
formData.append('file', file)
formData.append('userId', '123')

await http.post('/upload', {
  body: formData,
})
```

### Upload with `upload()`

```ts
await http.upload('/upload', {
  file,
  data: {
    userId: 123,
    scene: 'avatar',
  },
})
```

### Upload multiple files

```ts
await http.upload('/upload', {
  files: [file1, file2],
  fileFieldName: 'attachments',
  data: {
    albumId: 'a-1',
  },
})
```

### Upload and parse JSON response

```ts
const result = await http.uploadJson<{ url: string }>('/upload', {
  file,
  data: {
    userId: 'u-1',
  },
})
```

### Build `FormData` with `toFormData()`

```ts
import { toFormData } from 'okxie-link'

const formData = toFormData({
  userId: 123,
  enabled: true,
  tags: ['sdk', 'upload'],
  createdAt: new Date('2026-04-12T08:00:00.000Z'),
  file,
})

await http.post('/upload', {
  body: formData,
})
```

`toFormData()` applies these rules:

- `string`, `number`, `boolean`, and `bigint` are converted to strings
- `Date` is converted with `toISOString()`
- arrays are appended as repeated keys
- `Blob` and `File` are appended directly
- `null` and `undefined` are skipped

`upload()` and `uploadJson()` apply these defaults:

- `fileFieldName` defaults to `file`
- when `files` is used, `fileFieldName` defaults to `files`
- the request method is always `POST`
- `Content-Type` is not manually set for `FormData`

## Error Handling

`okxie-link` throws structured error classes:

- `HttpError`
- `NetworkError`
- `TimeoutError`
- `AbortError`

```ts
import { AbortError, HttpError, NetworkError, TimeoutError } from 'okxie-link'

try {
  await http.getJson('/users/1')
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('request timed out')
  } else if (error instanceof AbortError) {
    console.log('request aborted')
  } else if (error instanceof HttpError) {
    console.log(error.status)
    console.log(error.requestUrl)
  } else if (error instanceof NetworkError) {
    console.log(error.requestUrl)
    console.log(error.cause)
  }
}
```

## Notes

- `request()` returns `Response`
- `requestJson()` returns parsed JSON
- `requestJson()` returns `undefined` for `204 No Content`
- `body` can be a plain object, `FormData`, `Blob`, `URLSearchParams`, string, or another supported `BodyInit`
- plain objects and arrays are serialized as JSON automatically

## Development

```sh
pnpm test
pnpm lint
pnpm build
pnpm format:check
```

## License

ISC
