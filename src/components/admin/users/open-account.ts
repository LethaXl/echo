import { createContext } from "react";

export type OpenAccount = { id: string; name: string };

/** Opens the account details dialog hosted by UserBrowser. */
export const OpenAccountContext = createContext<(account: OpenAccount) => void>(() => {});
