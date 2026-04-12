# okxie-link

[![npm version](https://img.shields.io/npm/v/okxie-link)](https://www.npmjs.com/package/okxie-link)
[![npm downloads](https://img.shields.io/npm/dm/okxie-link)](https://www.npmjs.com/package/okxie-link)
[![license](https://img.shields.io/npm/l/okxie-link)](https://www.npmjs.com/package/okxie-link)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

`okxie-link` is a TypeScript-first HTTP client core.

It is not just another thin wrapper around `fetch`. It is designed around three goals:

- simple, result-oriented APIs for everyday requests
- middleware as the primary extension model
- transport abstraction instead of locking the whole client to `fetch`

Current capabilities:

- core HTTP requests and common methods
- three return levels: `Response`, parsed JSON, and business data
- onion-style middleware pipeline
- unified business response middleware
- `FormData` and file upload helpers
- structured error types
- working `fetch` transport

## Why This Exists

Many HTTP libraries fall into one of two extremes:

- too thin, mostly just syntax sugar over `fetch`
- too heavy, mixing business protocol handling, plugin systems, and upload concerns directly into the core

`okxie-link` aims to sit in the middle:

- easier to use than raw `fetch`
- more extensible than a simple helper wrapper
- more evolvable than a client hard-wired to a single runtime implementation

It is a good fit when:

- you want one consistent request style across a project
- your backend uses a stable business response shape
- you need file upload without turning the core into a large framework
- you want the option to swap the underlying transport later

## Installation

```sh
pnpm add okxie-link
npm install okxie-link
yarn add okxie-link
```

Your runtime should provide standard Web APIs such as `fetch`, `Headers`, `FormData`, `Blob`, and `File`.

## Quick Start

```ts
import { HttpClient } from 'okxie-link'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer token',
  },
  timeout: 5000,
})

const response = await client.get('/users/1')
const user = await client.getJson<{ id: number; name: string }>('/users/1')
```

If your backend returns a unified response shape like this:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "name": "Tom"
  }
}
```

you can attach business middleware once:

```ts
import { HttpClient, createBizMiddleware } from 'okxie-link'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
})

client.use(
  createBizMiddleware<ApiResponse<{ id: number; name: string }>, number>({
    isSuccess: (payload) => payload.code === 0,
    getMessage: (payload) => payload.message,
    getCode: (payload) => payload.code,
    getData: (payload) => payload.data,
  }),
)

const user = await client.getData<{ id: number; name: string }>('/users/1')
```

## High-Level Design

```text
User API
  -> HttpClient
  -> Middleware Pipeline
  -> HttpContext
  -> Transport
  -> Network
```

Design principles:

- normal users work with results, not `ctx`
- advanced behavior belongs in middleware
- transport stays abstract so `xhr` can be added cleanly later

## Three Return Levels

### `request()` / `get()` / `post()`

Returns the raw `Response`.

```ts
const response = await client.get('/users/1')
const text = await response.text()
```

### `requestJson()` / `getJson()` / `postJson()`

Returns the parsed JSON payload.

```ts
const payload = await client.getJson<{
  code: number
  message: string
  data: { id: number; name: string }
}>('/users/1')
```

Notes:

- `204 No Content` returns `undefined`
- this returns the full JSON payload, not `payload.data`

### `requestData()` / `getData()` / `postData()`

Returns `ctx.data` written by middleware.

```ts
const user = await client.getData<{ id: number; name: string }>('/users/1')
```

Notes:

- `getData()` depends on middleware
- if no middleware writes `ctx.data`, the result is usually `undefined`

In one sentence:

- `getJson()` returns the full parsed JSON
- `getData()` returns business data extracted by middleware

## Core API

### Create a Client

```ts
import { HttpClient } from 'okxie-link'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
})
```

### Common Methods

```ts
await client.get('/users')

await client.post('/users', {
  body: {
    name: 'Tom',
  },
})

await client.put('/users/1', {
  body: {
    name: 'Jerry',
  },
})

await client.patch('/users/1', {
  body: {
    nickname: 'JT',
  },
})

await client.delete('/users/1')
await client.head('/users/1')
await client.options('/users')
```

### Request Config

`RequestConfig` currently supports these core fields:

- `url`
- `baseUrl`
- `method`
- `query`
- `headers`
- `body`
- `timeout`
- `signal`
- other standard `RequestInit` fields

```ts
await client.get('/users', {
  query: {
    page: 1,
    keyword: 'tom',
  },
  headers: {
    'X-Trace-Id': 'trace-1',
  },
})
```

### Body Handling Rules

`okxie-link` applies a few basic body rules automatically:

- `string`: sent as-is
- `FormData`: sent as-is, without manually setting `Content-Type`
- `null` / `undefined`: no body is sent
- arrays and plain objects: automatically `JSON.stringify`-ed and sent with `Content-Type: application/json`
- other `BodyInit` values: sent through as native request bodies

## Middleware

Middleware is the main extension model in this architecture.

```ts
import { HttpClient, type HttpMiddleware } from 'okxie-link'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
})

const logger: HttpMiddleware = async (ctx, next) => {
  const startedAt = Date.now()

  await next()

  const duration = Date.now() - startedAt
  console.log(ctx.request.method, ctx.request.url, duration)
}

const dispose = client.use(logger)

dispose()
```

Middleware can:

- read and modify `ctx.request`
- run logic before and after `await next()`
- inspect `ctx.response`
- read cached response content via `ctx.json()` and `ctx.text()`
- write business results to `ctx.data`
- share state across middleware via `ctx.state`
- short-circuit the pipeline by not calling `next()`

### Onion Model

Middleware execution follows the onion model:

```text
middleware A before
  middleware B before
    transport request
  middleware B after
middleware A after
```

Example:

```ts
client.use(async (_ctx, next) => {
  console.log('A before')
  await next()
  console.log('A after')
})

client.use(async (_ctx, next) => {
  console.log('B before')
  await next()
  console.log('B after')
})
```

A single request runs in this order:

```text
A before
B before
transport request
B after
A after
```

This means:

- request preparation usually lives before `await next()`
- response processing usually lives after `await next()`
- unified error handling is usually written as `try { await next() } catch {}`
- `next()` may only be called once

### Common Middleware Patterns

Modify the request before sending:

```ts
client.use(async (ctx, next) => {
  ctx.request.headers.set('Authorization', 'Bearer token')
  await next()
})
```

Process the response after sending:

```ts
client.use(async (ctx, next) => {
  await next()
  const payload = await ctx.json()
  console.log(payload)
})
```

Handle errors in one place:

```ts
import { BizError } from 'okxie-link'

client.use(async (_ctx, next) => {
  try {
    await next()
  } catch (error) {
    if (error instanceof BizError) {
      console.error('biz error:', error.message)
      return
    }

    throw error
  }
})
```

## Business Response Middleware

`createBizMiddleware()` is designed for unified business response handling.

It can:

- validate whether a business response is successful
- throw `BizError` on business failure
- write business data into `ctx.data` on success
- run centralized business error handling
- decide whether an error should continue to bubble up

### Basic Usage

```ts
import { BizError, HttpClient, createBizMiddleware } from 'okxie-link'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
})

client.use(
  createBizMiddleware<ApiResponse<{ id: number; name: string }>, number>({
    isSuccess: (payload) => payload.code === 0,
    getMessage: (payload) => payload.message,
    getCode: (payload) => payload.code,
    getData: (payload) => payload.data,
  }),
)

try {
  const user = await client.getData<{ id: number; name: string }>('/users/1')
  console.log(user)
} catch (error) {
  if (error instanceof BizError) {
    console.log(error.code)
    console.log(error.message)
    console.log(error.payload)
  }
}
```

### Centralized Business Error Handling

If you want all business errors to go through a unified handler first, use `onError` and `throwOnError`.

```ts
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

client.use(
  createBizMiddleware<ApiResponse<unknown>, number>({
    isSuccess: (payload) => payload.code === 0,
    getMessage: (payload) => payload.message,
    getCode: (payload) => payload.code,
    getData: (payload) => payload.data,
    onError: (error, ctx) => {
      if (error.code === 40101) {
        ctx.state.redirectTo = '/login'
        return
      }

      console.error('biz error:', error.message)
    },
    throwOnError: false,
  }),
)
```

In this case:

- `onError` handles business errors in one place
- `throwOnError: false` means the error will not be rethrown afterward

### Let Some Errors Bubble Up

```ts
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

client.use(
  createBizMiddleware<ApiResponse<null>, number>({
    isSuccess: (payload) => payload.code === 0,
    getMessage: (payload) => payload.message,
    getCode: (payload) => payload.code,
    onError: (error) => {
      console.error('handled:', error.message)
    },
    throwOnError: (error) => error.code !== 40101,
  }),
)
```

This means:

- every business error still goes through `onError`
- `40101` is handled and swallowed
- other business errors continue to bubble up to the request caller

### When `createBizMiddleware()` Runs

This is a response-phase middleware. It calls `await next()` first, then:

- reads `ctx.response`
- calls `ctx.json()`
- checks whether the business response is successful
- runs `onError`
- decides whether to rethrow based on `throwOnError`

## File Upload

File upload is built in. No extra plugin is required.

### `upload()`

```ts
const file = new File(['avatar'], 'avatar.png', {
  type: 'image/png',
})

await client.upload('/upload', {
  file,
  data: {
    userId: 123,
    tags: ['avatar', 'profile'],
  },
})
```

### `uploadJson()`

```ts
const result = await client.uploadJson<{ url: string }>('/upload', {
  file,
  data: {
    userId: 'u-1',
  },
})
```

### `uploadData()`

This is useful together with `createBizMiddleware()`.

```ts
const asset = await client.uploadData<{ url: string }>('/upload', {
  file,
  data: {
    userId: 'u-1',
  },
})
```

### Multiple Files

```ts
await client.upload('/upload', {
  files: [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')],
  data: {
    folder: 'docs',
  },
})
```

Default rules:

- when using `file`, the default field name is `file`
- when using `files`, the default field name is `files`
- you can override it with `fileFieldName`
- upload methods use `POST`

### Build `FormData` Manually

```ts
import { toFormData } from 'okxie-link'

const body = toFormData({
  userId: 123,
  enabled: true,
  tags: ['sdk', 'upload'],
  createdAt: new Date('2026-04-12T08:00:00.000Z'),
  file,
})

await client.post('/upload', {
  body,
})
```

`toFormData()` rules:

- `string`, `number`, `boolean`, and `bigint` become strings
- `Date` becomes an ISO string
- arrays are appended as repeated keys
- `Blob` and `File` are appended directly
- `null` and `undefined` are skipped

## Error Types

Built-in structured errors:

- `HttpError`
- `NetworkError`
- `TimeoutError`
- `AbortError`
- `BizError`

```ts
import { AbortError, BizError, HttpError, NetworkError, TimeoutError } from 'okxie-link'

try {
  await client.getData('/users/1')
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
  } else if (error instanceof BizError) {
    console.log(error.code)
    console.log(error.payload)
  }
}
```

## Transport

The default transport is `fetch`.

```ts
import { HttpClient, createFetchTransport } from 'okxie-link'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  transport: createFetchTransport(),
})
```

An `xhr` transport entry point is also reserved:

```ts
import { HttpClient, createXhrTransport } from 'okxie-link'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  transport: createXhrTransport(),
})
```

Current status:

- `fetch` transport is ready to use
- `xhr` transport is not implemented yet for real request execution
- it exists because upload progress and similar features fit better at the `xhr` layer

## Current Exports

Main exports include:

- `HttpClient`
- `createBizMiddleware`
- `createFetchTransport`
- `createXhrTransport`
- `toFormData`
- `appendUploadFile`
- `AbortError`
- `BizError`
- `HttpError`
- `NetworkError`
- `TimeoutError`
- related type definitions

## Docs

- [Design Document](./docs/design.md)
- [Implementation Plan](./docs/implementation-plan.md)

## Development

```sh
pnpm build
pnpm lint
pnpm test
pnpm format:check
```

In this repository, if you run Vitest directly, prefer:

```sh
pnpm vitest run --pool=threads
```

## Roadmap

The focus is still on kernel quality, not on stuffing business logic into the core too early:

- complete `xhr` transport
- add more official middleware
- keep tightening the boundary between core and extensions
- add more realistic end-to-end examples

## License

ISC
