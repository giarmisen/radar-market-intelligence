import { NextRequest, NextResponse } from "next/server";

// Cierra la Brecha 3/5 (admin sin proteger, API abierta) para las rutas que
// escriben datos o llaman a APIs de pago (Claude, Gmail). El dashboard, el
// timeline y los perfiles de actor NO pasan por aqui: siguen publicos, son la
// pieza de portfolio. Ver `config.matcher` mas abajo para el alcance exacto.

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Radar admin"' },
  });
}

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

  if (process.env.RADAR_DEMO_MODE === "true") {
    return NextResponse.next();
  }

  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Fail closed: si no hay credenciales configuradas en el entorno, se
  // bloquea el acceso en vez de dejar pasar a todo el mundo en silencio.
  if (!adminUser || !adminPassword) {
    return unauthorized();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized();
  }

  let user = "";
  let password = "";
  try {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    user = decoded.slice(0, separatorIndex);
    password = decoded.slice(separatorIndex + 1);
  } catch {
    return unauthorized();
  }

  if (user !== adminUser || password !== adminPassword) {
    return unauthorized();
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
