import type { inferAsyncReturnType } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";

// Context used by tRPC routers
// https://trpc.io/docs/context
export const createContext = async (opts: CreateNextContextOptions) => {
  return {
    request: opts.req,
    response: opts.res,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;
