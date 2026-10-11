"use client";

import { useSyncExternalStore } from "react";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import { readBrowseHref } from "@/lib/browse";

const subscribe = () => () => {};

/** Links back to Browse with the search and filters the user last had in this tab. */
export default function BrowseBackLink({ label }: { label: string }) {
  const href = useSyncExternalStore(subscribe, readBrowseHref, () => "/browse");
  return <DetailsBackLink href={href} label={label} />;
}
