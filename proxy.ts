import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/friends/:path*",
    "/auth/:path*",
     "/((?!_next/static|_next/image|favicon.ico|opengraph-image.png|twitter-image.png|apple-icon.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};