# tRPC x Server-sent-events (SSE)

Supports sending tRPC's subscriptions over [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events).

Note: This is a proof-of-concept and not intended to be used directly.

## Components

- [`httpSseLink`](src/link.ts): Client-side [tRPC link](https://trpc.io/docs/links) bridging SSE HTTP connections to the tRPC API
- [Server ~~hack~~ shim](example/src/pages/api/trpc/%5Btrpc%5D.ts): Server-side logic converting `subscription` procedures to events in a SSE HTTP connection
- [tRPC link split](example/src/trpc.ts): Client-side configuration sending `subscription` procedures through `httpSseLink`

These then underly usage:

- [Server subscription producer](example/src/server/router/watch.ts)

  ```ts
  export const numbers = t.procedure
    .input(
      zod.object({
        count: zod.number(),
      })
    )
    .subscription(async ({ input }) => {
      return observable<{ id: string; idk: number }>((sub) => {
        let i = 0;
        setInterval(() => {
          if (i++ === input.count) {
            sub.complete();
          } else {
            sub.next({
              id: randomUUID(),
              idk: Math.round(Math.random() * 5000),
            });
          }
        }, 1000);
      });
    });
  ```

- [Client subscription consumer](example/src/pages/index.tsx)

  ```tsx
  const [messages, setMessages] = useState<Array<{ id: string; idk: number }>>(
    []
  );

  trpcClient.numbers.useSubscription(
    {
      max: 25,
    },
    {
      enabled: true,
      onData(data) {
        setMessages((prev) => [...prev, data]);
      },
    }
  );

  return (
    <div>
      {messages.map((m) => (
        <span key={m.id}>{m.idk}</span>
      ))}
    </div>
  );
  ```

## Issues

- Subscription continues if client closes the connection early
  - I thought this was covered by the server-side request/response event handlers but that seems to be a misunderstanding. Need to dig into it further.

## For the visual people

https://github.com/OutdatedVersion/trpc-sse-link/assets/11138610/4d5da1e1-c769-4775-9083-6c2f2b5447b4
