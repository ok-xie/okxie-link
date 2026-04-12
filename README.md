# okxie-link

[![npm version](https://img.shields.io/npm/v/okxie-link)](https://www.npmjs.com/package/okxie-link)
[![npm downloads](https://img.shields.io/npm/dm/okxie-link)](https://www.npmjs.com/package/okxie-link)
[![license](https://img.shields.io/npm/l/okxie-link)](https://www.npmjs.com/package/okxie-link)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

`okxie-link` 是一个 TypeScript 优先的 HTTP 客户端内核。

它不是单纯再包一层 `fetch`，而是围绕这 3 个目标来设计：

- 对普通调用者，API 简单直接
- 对复杂场景，使用 middleware 扩展
- 对底层执行，保留 transport 抽象，而不是把能力写死在 `fetch`

当前已经支持：

- 基础 HTTP 请求与常用方法
- `Response` / JSON / business data 三层返回模型
- middleware 洋葱模型
- 统一业务响应处理中间件
- `FormData` 与文件上传
- 结构化错误类型
- `fetch` transport

## 为什么做它

很多 HTTP 库会落在两个极端：

- 要么太薄，只是 `fetch` 语法糖
- 要么太重，把业务协议、插件体系、上传能力全耦合在一个核心里

`okxie-link` 的目标是做一个中间层：

- 比原生 `fetch` 更易用
- 比简单封装更可扩展
- 比绑定单一实现的方案更可演进

它更适合这些场景：

- 你想统一项目中的请求方式
- 你有稳定的业务响应格式，希望统一处理
- 你需要文件上传，但不想把 core 做得很重
- 你希望未来可以替换底层 transport

## 安装

```sh
pnpm add okxie-link
npm install okxie-link
yarn add okxie-link
```

运行时需要提供标准 Web API，比如 `fetch`、`Headers`、`FormData`、`Blob`、`File`。

## 快速开始

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

如果你的后端返回统一业务结构：

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

可以直接挂一个业务中间件：

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

## 设计概览

```text
User API
  -> HttpClient
  -> Middleware Pipeline
  -> HttpContext
  -> Transport
  -> Network
```

设计原则：

- 普通用户拿结果，不直接操作 `ctx`
- 高级能力放到 middleware
- transport 独立抽象，方便未来接入 `xhr`

## 三层返回模型

### `request()` / `get()` / `post()`

返回原始 `Response`，适合你自己决定如何解析响应。

```ts
const response = await client.get('/users/1')
const text = await response.text()
```

### `requestJson()` / `getJson()` / `postJson()`

返回解析后的 JSON。

```ts
const payload = await client.getJson<{
  code: number
  message: string
  data: { id: number; name: string }
}>('/users/1')
```

说明：

- `204 No Content` 时返回 `undefined`
- 返回的是完整 JSON payload，不会自动取 `payload.data`

### `requestData()` / `getData()` / `postData()`

返回 middleware 写入的 `ctx.data`，适合有统一业务协议的接口。

```ts
const user = await client.getData<{ id: number; name: string }>('/users/1')
```

说明：

- `getData()` 依赖 middleware
- 如果没有 middleware 给 `ctx.data` 赋值，结果通常是 `undefined`

一句话区分：

- `getJson()` 拿完整 JSON
- `getData()` 拿 middleware 处理后的业务数据

## 核心 API

### 创建客户端

```ts
import { HttpClient } from 'okxie-link'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
})
```

### 常用方法

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

### 请求配置

`RequestConfig` 目前支持这些核心字段：

- `url`
- `baseUrl`
- `method`
- `query`
- `headers`
- `body`
- `timeout`
- `signal`
- 其他原生 `RequestInit` 字段

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

### body 处理规则

`okxie-link` 会根据 `body` 类型做基础处理：

- `string`：原样发送
- `FormData`：原样发送，不手动设置 `Content-Type`
- `null` / `undefined`：不发送 body
- `Array` / 普通对象：自动 `JSON.stringify`，并设置 `Content-Type: application/json`
- 其他 `BodyInit`：按原生请求体发送

## Middleware

middleware 是当前架构里的主扩展模型。

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

middleware 可以做的事情：

- 读取和修改 `ctx.request`
- 在 `await next()` 前后处理逻辑
- 读取 `ctx.response`
- 通过 `ctx.json()` / `ctx.text()` 读取缓存后的响应内容
- 给 `ctx.data` 写入业务结果
- 使用 `ctx.state` 在多个 middleware 间共享状态
- 选择不调用 `next()`，直接短路后续流程

### 洋葱模型

middleware 的执行顺序是洋葱模型：

```text
middleware A before
  middleware B before
    transport request
  middleware B after
middleware A after
```

对应代码：

```ts
client.use(async (ctx, next) => {
  console.log('A before')
  await next()
  console.log('A after')
})

client.use(async (ctx, next) => {
  console.log('B before')
  await next()
  console.log('B after')
})
```

发起一次请求时，执行顺序是：

```text
A before
B before
transport request
B after
A after
```

这意味着：

- 请求前处理通常写在 `await next()` 之前
- 响应后处理通常写在 `await next()` 之后
- 统一异常处理通常写成 `try { await next() } catch {}`
- `next()` 最多只能调用一次

### 常见 middleware 写法

请求前修改：

```ts
client.use(async (ctx, next) => {
  ctx.request.headers.set('Authorization', 'Bearer token')
  await next()
})
```

响应后处理：

```ts
client.use(async (ctx, next) => {
  await next()
  const payload = await ctx.json()
  console.log(payload)
})
```

统一异常处理：

```ts
import { BizError } from 'okxie-link'

client.use(async (ctx, next) => {
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

## 业务响应处理中间件

`createBizMiddleware()` 用来处理统一业务响应。

它可以：

- 判断业务是否成功
- 在失败时抛出 `BizError`
- 在成功时把业务数据写入 `ctx.data`
- 在失败时执行统一业务异常处理
- 决定处理后是否继续抛出异常

### 最基础的用法

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

### 统一处理业务异常

如果你希望业务异常先统一处理，再决定是否继续抛出，可以用 `onError` 和 `throwOnError`。

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

这时：

- `onError` 负责统一处理业务异常
- `throwOnError: false` 表示处理后不再继续抛出

### 让部分异常继续穿透到调用方

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

这表示：

- 所有业务异常都会先统一进入 `onError`
- `40101` 会被处理并吞掉
- 其他业务异常会继续抛到发起请求的地方

### `createBizMiddleware()` 的工作时机

这个中间件属于“响应后处理型”中间件，所以它会先 `await next()`，等请求返回后再：

- 读取 `ctx.response`
- 调用 `ctx.json()`
- 判断业务成功与否
- 执行 `onError`
- 根据 `throwOnError` 决定是否继续抛出

## 文件上传

文件上传是内置能力，不需要额外插件。

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

适合和 `createBizMiddleware()` 一起使用。

```ts
const asset = await client.uploadData<{ url: string }>('/upload', {
  file,
  data: {
    userId: 'u-1',
  },
})
```

### 多文件上传

```ts
await client.upload('/upload', {
  files: [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')],
  data: {
    folder: 'docs',
  },
})
```

默认规则：

- `file` 时默认字段名是 `file`
- `files` 时默认字段名是 `files`
- 可以通过 `fileFieldName` 自定义字段名
- 上传默认使用 `POST`

### 手动构建 `FormData`

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

`toFormData()` 规则：

- `string`、`number`、`boolean`、`bigint` 会转成字符串
- `Date` 会转成 ISO 字符串
- 数组会按同名字段重复追加
- `Blob` / `File` 会直接追加
- `null` / `undefined` 会跳过

## 错误类型

当前内置的结构化错误：

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

当前默认 transport 是 `fetch`。

```ts
import { HttpClient, createFetchTransport } from 'okxie-link'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  transport: createFetchTransport(),
})
```

也已经预留了 `xhr` transport 的位置：

```ts
import { HttpClient, createXhrTransport } from 'okxie-link'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  transport: createXhrTransport(),
})
```

但要注意：

- `fetch` transport 当前可直接使用
- `xhr` transport 目前还没有完成实际请求实现
- 保留它，是因为上传进度等能力未来更适合在 `xhr` 层实现

## 当前导出

当前主导出包括：

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
- 相关类型定义

## 文档

- [设计文档](./docs/design.md)
- [实现计划](./docs/implementation-plan.md)

## 开发

```sh
pnpm build
pnpm lint
pnpm test
pnpm format:check
```

当前仓库里如果直接跑 Vitest，建议使用：

```sh
pnpm vitest run --pool=threads
```

## Roadmap

接下来的重点仍然是内核能力，不会过早把业务逻辑塞进 core：

- 完善 `xhr` transport
- 增加更通用的官方 middleware
- 继续收敛 core 与扩展层边界
- 补足更多面向真实项目的示例

## License

ISC
