# Frontend Logs API

This document lists the logs endpoints and response types for the frontend.

Base path: `/admin/logs`

## 1) Chat Response Logs
**Endpoint**
`GET /admin/logs/chat-response`

**Query params**
- `chatId` (uuid, optional)
- `startAt` (ISO datetime, optional)
- `endAt` (ISO datetime, optional)
- `skip` (number, optional)
- `take` (number, optional)
- `orderBy` (createdAt | updatedAt, optional)
- `order` (ASC | DESC, optional)

**Response type**
```
{
  "total": number,
  "skip": number,
  "take": number,
  "data": [
    {
      "id": string,
      "chatId": string,
      "toolsUsed": string[],
      "totalLatency": number,
      "toolRouterLatency": number,
      "textGenerationLatency": number,
      "createdAt": string
    }
  ]
}
```

## 2) LLM Calls
**Endpoint**
`GET /admin/logs/llm-calls`

**Query params**
- `chatId` (uuid, optional)
- `type` (tool_planner | chat | image, optional)
- `model` (string, optional)
- `startAt` (ISO datetime, optional)
- `endAt` (ISO datetime, optional)
- `skip` (number, optional)
- `take` (number, optional)
- `orderBy` (createdAt | updatedAt, optional)
- `order` (ASC | DESC, optional)

**Response type**
```
{
  "total": number,
  "skip": number,
  "take": number,
  "data": [
    {
      "id": string,
      "chatId": string,
      "type": "tool_planner" | "chat" | "image",
      "model": string,
      "inputTokens": number,
      "outputTokens": number,
      "price": number,
      "latency": number,
      "createdAt": string
    }
  ]
}
```

## 3) Image Generation Logs
**Endpoint**
`GET /admin/logs/img-gen`

**Query params**
- `chatId` (uuid, optional)
- `startAt` (ISO datetime, optional)
- `endAt` (ISO datetime, optional)
- `skip` (number, optional)
- `take` (number, optional)
- `orderBy` (createdAt | updatedAt, optional)
- `order` (ASC | DESC, optional)

**Response type**
```
{
  "total": number,
  "skip": number,
  "take": number,
  "data": [
    {
      "id": string,
      "chatId": string,
      "promptLatency": number,
      "generationLatency": number,
      "uploadLatency": number,
      "totalLatency": number,
      "createdAt": string
    }
  ]
}
```

## 4) Error Logs
**Endpoint**
`GET /admin/logs/errors`

**Query params**
- `code` (telegram | llm | runpod | be | other, optional)
- `startAt` (ISO datetime, optional)
- `endAt` (ISO datetime, optional)
- `skip` (number, optional)
- `take` (number, optional)
- `orderBy` (createdAt | updatedAt, optional)
- `order` (ASC | DESC, optional)

**Response type**
```
{
  "total": number,
  "skip": number,
  "take": number,
  "data": [
    {
      "id": string,
      "code": string,
      "message": string,
      "details": object | null,
      "createdAt": string
    }
  ]
}
```
