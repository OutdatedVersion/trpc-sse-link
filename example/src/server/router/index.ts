import { t } from "../trpc";
import { numbers } from "./numbers";

export const rootRouter = t.router({
  numbers,
});

export type AppRouter = typeof rootRouter;
