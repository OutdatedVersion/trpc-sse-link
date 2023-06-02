import { randomUUID } from "node:crypto";
import { observable } from "@trpc/server/observable";
import z from "zod";
import { t } from "../trpc";

export const numbers = t.procedure
  .input(
    z.object({
      count: z.number(),
    })
  )
  .subscription(async ({ input }) => {
    return observable<{ id: string; idk: number }>((sub) => {
      let i = 0;
      setInterval(() => {
        if (i++ === input.count) {
          sub.complete();
        } else {
          sub.next({ id: randomUUID(), idk: Math.round(Math.random() * 5000) });
        }
      }, 1000);
    });
  });
