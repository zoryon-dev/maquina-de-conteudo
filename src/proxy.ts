import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas protegidas - requerem autenticação
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/library(.*)",
  "/calendar(.*)",
  "/sources(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Redirecionar usuário autenticado da home para dashboard
  if (request.nextUrl.pathname === "/" && (await auth()).userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return Response.redirect(url);
  }

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
