import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas protegidas - requerem autenticação
const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
  "/library(.*)",
  "/calendar(.*)",
  "/sources(.*)",
  "/settings(.*)",
]);

// Rotas públicas - acessíveis sem autenticação
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)", // Webhooks devem ser públicos
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
