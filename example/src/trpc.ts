import { createTRPCNext } from "@trpc/next";
import { httpBatchLink, splitLink } from "@trpc/client";
import { AppRouter } from "./server/router";
import { httpSseLink } from "trpc-sse-link";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env["VERCEL_URL"]) return `https://${process.env["VERCEL_URL"]}`; // SSR should use vercel url

  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

export const trpcClient = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        // Send things using `useSubscription` via SSE
        splitLink({
          condition(op) {
            return op.type === "subscription";
          },
          true: httpSseLink({
            baseUrl: `${getBaseUrl()}/api/trpc`,
          }),
          false: httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
          }),
        }),
      ],
    };
  },
  ssr: false,
});
