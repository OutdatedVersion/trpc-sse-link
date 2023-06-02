import { createNextApiHandler } from "@trpc/server/adapters/next";
import { NextApiRequest, NextApiResponse } from "next";
import { AnyProcedure } from "@trpc/server";
import { isObservable } from "@trpc/server/observable";
import { rootRouter } from "@/server/router";
import { createContext } from "@/server/context";

const defaultHandler = createNextApiHandler({
  createContext,
  router: rootRouter,
  onError: (opts) => {
    console.error(`Unhandled error for '${opts.path}'`, opts.error);
  },
});

const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  // https://github.com/trpc/trpc/blob/7ad695ea33810a162808c43b6fba1fb920e05325/packages/server/src/adapters/next.ts#L23
  // https://github.com/trpc/trpc/blob/7ad695ea33810a162808c43b6fba1fb920e05325/packages/server/src/core/router.ts#L345
  const procedure = rootRouter._def.procedures[request.query.trpc as string] as
    | AnyProcedure
    | undefined;
  if (request.method === "GET" && procedure?._def.subscription) {
    const ctx = await createContext({ req: request, res: response });

    try {
      // TODO: support POST
      // https://github.com/trpc/trpc/blob/7ad695ea33810a162808c43b6fba1fb920e05325/packages/server/src/http/resolveHTTPResponse.ts#L25
      // TODO https://github.com/trpc/trpc/blob/7ad695ea33810a162808c43b6fba1fb920e05325/packages/server/src/http/resolveHTTPResponse.ts#L141-L145
      // https://gist.github.com/OutdatedVersion/8ea31e6790d6514094487e2f76e1b652
      const input = request.query.input
        ? JSON.parse(request.query.input as string)
        : undefined;

      const call = {
        type: "subscription",
        ctx,
        path: request.query.trpc as string,
        input,
        rawInput: input,
      } as const;

      const res = await procedure(call);

      if (!isObservable(res)) {
        response.end();
        throw new Error(`subscription must return observable`);
      }

      response.writeHead(200, {
        Connection: "keep-alive",
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/event-stream;charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      response.flushHeaders();

      // https://github.com/trpc/trpc/blob/7ad695ea33810a162808c43b6fba1fb920e05325/packages/server/src/http/resolveHTTPResponse.ts#L189-L193
      const subscription = res.subscribe({
        next(value) {
          console.log(
            "server subscription next",
            value,
            "closed",
            response.closed,
            "destroyed",
            response.destroyed,
            "writable",
            response.writable,
            {
              closed: request.closed,
              complete: request.complete,
              destroyed: request.destroyed,
              aborted: request.aborted,
            }
          );
          // https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events
          response.write(`event:data\ndata: ${JSON.stringify(value)}\n\n`);
        },
        error(err) {
          console.log("server subscription error", err);
          response.end();
        },
        complete() {
          console.log("server subscription complete");
          response.end("event:end\ndata: {}\n\n");
        },
      });

      response.on("close", () => {
        console.log("unsubscribe: response closed");
        subscription.unsubscribe();
      });
      response.on("abort", () => {
        console.log("unsubscribe: response aborted");
        subscription.unsubscribe();
      });

      request.on("close", () => {
        console.log("unsubscribe: request closed");
        subscription.unsubscribe();
      });
      request.on("end", () => {
        console.log("unsubscribe: request end");
        subscription.unsubscribe();
      });
      request.on("error", () => console.log("request error"));
      request.on("pause", () => console.log("request paused"));
    } catch (error) {
      // https://github.com/trpc/trpc/blob/7ad695ea33810a162808c43b6fba1fb920e05325/packages/server/src/http/resolveHTTPResponse.ts#L198-L202
      console.error("Uncaught subscription error", error);
      response.end();
    }
    return;
  }

  return defaultHandler(request, response);
};

export default handler;
