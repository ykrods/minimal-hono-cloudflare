import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { DurableObject } from "cloudflare:workers"

interface SSESession {
  id: string,
  timeoutId: ReturnType<typeof setTimeout>
  readable: ReadableStream
  writable: WritableStream
}

interface SSEMessage<T = Record<string, any>> {
  event: string
  data: T
}

export class SSEHub extends DurableObject {
  sessions = new Map<string, SSESession>()

  async subscribe(id) {
    if (!this.sessions.has(id)) {
      const { readable, writable } = new TransformStream()

      const timeoutId = setTimeout(async () => {
        if (this.sessions.has(id)) {
          const { writable } = this.sessions.get(id)
          this.sessions.delete(id)
          try {
            const writer = writable.getWriter()
            await writer.close() // force close
          } catch(e) {
            console.error(e)
          }
          this.broadcastConnections()
        }
      }, 1000 * 600)

      this.sessions.set(id, { id, timeoutId, readable, writable })
    }
    this.broadcastConnections()

    return this.sessions.get(id).readable
  }

  payload({ event, data }: SSEMessage<any>): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  }

  async broadcast<T>(message: SSEMessage<T>) {
    const encoder = new TextEncoder()

    const survivors = new Map<string, SSESession>()
    for (const session of this.sessions.values()) {
      const writer = session.writable.getWriter()

      try {
        await writer.write(encoder.encode(this.payload(message)))
        survivors.set(session.id, session)
      } catch (e) {
        console.error(e)
        writer.close()
        clearTimeout(session.timeoutId)
      } finally {
        writer.releaseLock()
      }
    }
    const changed = survivors.size !== this.sessions.size
    this.sessions = survivors

    if (changed) {
      this.broadcastConnections()
    }
  }

  async broadcastConnections() {
    await this.broadcast({
      event: "connections",
      data: { size: this.sessions.size },
    })
  }
}

const app = new Hono()

app.get("/api/events", async (c) => {
  const objectId = c.env.SSE_HUB.idFromName("shared")
  const stub = c.env.SSE_HUB.get(objectId)

  const id = (new Date()).getTime().toString()
  const readable = await stub.subscribe(id)

  return streamSSE(c, async (stream) => {
    stream.onAbort(() => console.log("aborted!"))

    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ id }),
    })

    await stream.pipe(readable)
  })
})

export default app
