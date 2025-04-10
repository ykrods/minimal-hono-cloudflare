import { Hono } from 'hono'

const app = new Hono()

// omotta yori mendokusakute warota
function getZone(date: Date) {
  const offset_h = ((-1) * date.getTimezoneOffset()) / 60
  const offset_m = date.getTimezoneOffset() % 60
  const f_h = new Intl.NumberFormat('en', {
    minimumIntegerDigits: 2,
    signDisplay: 'always',
  })
  const f_m = new Intl.NumberFormat('en', {
    minimumIntegerDigits: 2,
    signDisplay: 'never',
  })
  return f_h.format(offset_h) + ':' + f_m.format(offset_m)
}

app.get('/api/now', (c) => {
  const date = new Date()
  return c.json({ now: date.toISOString(), zone: getZone(date) })
})

export default app
