import type { AuthUser } from "./jwt";

export type RequestContext = {
  user: AuthUser | null;
};