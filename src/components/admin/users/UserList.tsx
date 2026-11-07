"use client";

import { use } from "react";
import { StatusLabel } from "@/components/admin/content/ContentStatusLabel";
import { PANEL } from "@/components/admin/content/styles";
import { ChevronRightIcon } from "@/components/icons";
import { displayName, planLabel, type AdminUser } from "@/lib/admin/users";
import { formatDate } from "@/lib/format";
import { OpenAccountContext } from "./open-account";
import { AdminIcon, UserAvatar } from "./UserIdentity";

/** Columns shared by the header and every row; smaller screens drop Subscription, then Joined. */
const GRID =
  "grid grid-cols-[minmax(0,1fr)_6.5rem_1rem] items-center gap-4 sm:grid-cols-[minmax(0,1fr)_8.5rem_6.5rem_1rem] md:grid-cols-[minmax(0,1fr)_8.5rem_6.5rem_9.5rem_1rem]";

function UserRow({ user }: { user: AdminUser }) {
  const open = use(OpenAccountContext);
  const name = displayName(user);
  const named = Boolean(user.name?.trim());

  return (
    <li>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => open({ id: user.id, name })}
        className={`${GRID} group w-full px-4 py-2.5 text-left transition-colors duration-150 hover:bg-elevated/60 focus-visible:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-inset`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <UserAvatar id={user.id} name={user.name} email={user.email} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className={`truncate text-sm font-medium ${named ? "" : "text-muted"}`}>{name}</span>
              {user.isAdmin && <AdminIcon />}
            </span>
            <span className="block truncate text-xs text-muted">{user.email}</span>
          </span>
        </span>
        <span className="hidden truncate text-sm sm:block">{planLabel(user.plan)}</span>
        <span>
          {user.deactivated ? (
            <StatusLabel tone="danger">Deactivated</StatusLabel>
          ) : (
            <StatusLabel tone="accent">Active</StatusLabel>
          )}
        </span>
        <span className="hidden text-sm whitespace-nowrap text-muted md:block">{formatDate(user.joinedAt)}</span>
        <ChevronRightIcon className="size-4 text-muted/50 transition-colors duration-150 group-hover:text-foreground group-focus-visible:text-foreground" />
      </button>
    </li>
  );
}

/** US-61: one page of accounts. Selecting a row opens its details (US-63). */
export default function UserList({ users }: { users: AdminUser[] }) {
  return (
    <div className={`${PANEL} overflow-hidden`}>
      <div aria-hidden="true" className={`${GRID} border-b border-line px-4 py-2.5 text-xs font-medium text-muted`}>
        <span>User</span>
        <span className="hidden sm:block">Subscription</span>
        <span>Status</span>
        <span className="hidden md:block">Joined</span>
        <span />
      </div>
      <ul aria-label="Echo accounts, newest first" className="divide-y divide-line">
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </ul>
    </div>
  );
}
