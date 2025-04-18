import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'

const app = new Hono()

app.get("/api/events", async (c) => {
  let n = 0

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: 'connected',
      data: '{}',
    })

    while(true) {
      await stream.writeSSE({
        event: "evt",
        data: JSON.stringify({ n }),
      })
      await stream.sleep(1000)
      n++
    }
  })
})

export default app
