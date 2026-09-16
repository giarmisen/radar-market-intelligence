import { NextRequest, NextResponse } from "next/server";

// Cierra la Brecha 3/5 (admin sin proteger, API abierta) para las rutas que
// escriben datos o llaman a APIs de pago (Claude, Gmail). El dashboard, el
// timeline y los perfiles de actor NO pasan por aqui: siguen publicos, son la
// pieza de portfolio. Ver `config.matcher` mas abajo para el alcance exacto.

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Vercel Cron llama a /api/ingest cada mañana. Si existe CRON_SECRET,
  // Vercel manda automaticamente "Authorization: Bearer <CRON_SECRET>" en esa
  // llamada. La dejamos pasar sin pedir usuario/contraseña.
  if (pathname.startsWith("/api/ingest")) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization") ?? "";
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/proposals/:path*",
    "/api/ingest/:path*",
    "/api/enrich/:path*",
    "/api/reports/:path*",
    "/api/seed/:path*",
    "/api/proposals/:path*",
    "/api/analysis/:path*",
  ],
};
