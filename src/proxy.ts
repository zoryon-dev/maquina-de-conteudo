import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Rotas protegidas - requerem autenticação
const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
  "/library(.*)",
  "/calendar(.*)",
  "/sources(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Redirecionar usuário autenticado da home para chat
  if (request.nextUrl.pathname === "/" && (await auth()).userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
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
