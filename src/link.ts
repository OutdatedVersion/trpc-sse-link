import { TRPCLink } from "@trpc/client";
import { AnyRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";

export const httpSseLink = <TRouter extends AnyRouter>(opts: {
  baseUrl: string;
  EventSource?: typeof EventSource;
}): TRPCLink<TRouter> => {
  const open = ({
    url,
    handleEvent,
    handleError,
    handleCloseRequest,
    handleOpen,
  }: any) => {
    const es = opts.EventSource
      ? new opts.EventSource(url)
      : new EventSource(url);

    es.onopen = () => {
      // usually when the first packet is sent
      handleOpen();
    };

    es.onerror = (error) => {
      handleError(error);
    };

    es.addEventListener("data", ({ data }) => {
      handleEvent(JSON.parse(data.trim()));
    });
    es.addEventListener("end", () => {
      handleCloseRequest();
    });

    return {
      close: () => {
        es.close();
      },
    };
  };

  return (runtime) => {
    return ({ op }) => {
      if (op.type !== "subscription") {
        throw new Error("httpSseLink must use subscription type");
      }

      const getUrl = () => {
        let url = `${opts.baseUrl}/${op.path}`;
        if (op.input !== undefined) {
          url += `?input=${encodeURIComponent(JSON.stringify(op.input))}`;
        }
        return url;
      };

      return observable((observer) => {
        const handleEvent = (data: /*json*/ any) => {
          observer.next({ result: { type: "data", data }, context: {} });
        };

        const source = open({
          url: getUrl(),
          handleEvent,
          handleCloseRequest: () => {
            observer.next({ result: { type: "stopped" } });
            observer.complete();
          },
          handleOpen: () => {
            observer.next({ result: { type: "started" } });
          },
        });

        return () => {
          source.close();
        };
      });
    };
  };
};
