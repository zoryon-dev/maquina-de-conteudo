import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Rotas protegidas - requerem autenticação
const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
  "/wizard(.*)",
  "/library(.*)",
  "/calendar(.*)",
  "/sources(.*)",
  "/settings(.*)",
]);

// Worker endpoint uses its own auth (WORKER_SECRET), bypass Clerk
const isWorkerRoute = (request: Request) => {
  const url = new URL(request.url);
  return url.pathname === "/api/workers";
};

export default clerkMiddleware(async (auth, request) => {
  // Allow worker endpoint to bypass Clerk auth (uses WORKER_SECRET instead)
  if (isWorkerRoute(request)) {
    return NextResponse.next();
  }

  // Redirecionar usuário autenticado da home para dashboard
  if (request.nextUrl.pathname === "/" && (await auth()).userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
