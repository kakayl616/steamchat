import { serialize } from "cookie"

export default function handler(req, res) {
  res.setHeader("Set-Cookie", serialize("sb-access-token", "", { path:"/", maxAge: -1 }))
  res.setHeader("Set-Cookie", serialize("sb-refresh-token", "", { path:"/", maxAge: -1 }))
  res.json({ ok:true })
}
