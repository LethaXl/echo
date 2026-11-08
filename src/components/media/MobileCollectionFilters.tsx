"use client";

import type { ContentType } from "@/lib/browse";
import type { ViewingFilter } from "@/lib/viewing-status/model";
import MobileFilterModal from "./MobileFilterModal";
import { MobileContentType, MobileFilterSelect } from "./MobileFilterFields";

type Selection<S extends string> = { type: ContentType; sort: S; status?: ViewingFilter };

/** Only the controls already supported by each Cave collection. Search stays outside. */
export default function MobileCollectionFilters<S extends string>({ title, type, sort, sorts, defaultSort, status, onApply }: {
  title: string;
  type: ContentType;
  sort: S;
  sorts: Record<S, string>;
  defaultSort: S;
  status?: ViewingFilter;
  onApply: (selection: Selection<S>) => void;
}) {
  const value: Selection<S> = { type, sort, ...(status === undefined ? {} : { status }) };
  const defaults: Selection<S> = { type: "all", sort: defaultSort, ...(status === undefined ? {} : { status: "all" }) };
  const count = Number(type !== "all") + Number(sort !== defaultSort) + Number(status !== undefined && status !== "all");
  return <MobileFilterModal title={title} value={value} defaults={defaults} count={count} onApply={onApply}>
    {(draft, update) => <div className="space-y-5">
      <MobileContentType value={draft.type} onChange={(next) => update({ ...draft, type: next })} />
      {status !== undefined && <MobileFilterSelect label="Viewing status" value={draft.status ?? "all"}
        onChange={(next) => update({ ...draft, status: next as ViewingFilter })}>
        <option value="all">All</option><option value="watching">Watching</option><option value="completed">Completed</option>
      </MobileFilterSelect>}
      <div className="flex justify-center [&>div]:w-fit [&>div]:max-w-full">
      <MobileFilterSelect label="Sort" value={draft.sort} onChange={(next) => update({ ...draft, sort: next as S })}>
        {(Object.keys(sorts) as S[]).map((option) => <option key={option} value={option}>{sorts[option]}</option>)}
      </MobileFilterSelect>
      </div>
    </div>}
  </MobileFilterModal>;
}
