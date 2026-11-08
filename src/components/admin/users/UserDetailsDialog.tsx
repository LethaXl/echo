"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { StatusLabel } from "@/components/admin/content/ContentStatusLabel";
import { ERROR_NOTE } from "@/components/admin/content/styles";
import { buttonClassName } from "@/components/ButtonLink";
import Dialog, { DialogCloseButton } from "@/components/Dialog";
import SubmitButton from "@/components/forms/SubmitButton";
import { CheckIcon, CopyIcon, ShieldCheckIcon, SpinnerIcon } from "@/components/icons";
import { loadUserDetails, setUserActive, type UserActionState } from "@/lib/admin/user-actions";
import { displayName, planLabel, type AdminSubscription, type AdminUserDetails } from "@/lib/admin/users";
import { initialFormState } from "@/lib/auth/form-state";
import { APP_NAME } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { AdminIcon, UserAvatar } from "./UserIdentity";

const LOAD_ERROR = "This account couldn't be loaded. Close this and try again.";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</h3>
      <dl className="mt-2 divide-y divide-line/60 rounded-lg bg-elevated/50 px-4 text-sm">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 py-2.5 max-md:grid-cols-1 max-md:gap-1">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right max-md:text-left max-md:[overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function AccountStatus({ deactivated }: { deactivated: boolean }) {
  return deactivated ? (
    <StatusLabel tone="danger">Deactivated</StatusLabel>
  ) : (
    <StatusLabel tone="accent">Active</StatusLabel>
  );
}

const COPY_RESET_MS = 1500;

/** The account ID, shortened to fit, with a button that copies all of it. */
function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPY_RESET_MS);
  }

  return (
    <span className="flex min-w-0 items-center justify-end gap-1.5 max-md:justify-start">
      <span title={id} className="truncate font-mono text-xs text-muted max-md:whitespace-normal max-md:[overflow-wrap:anywhere]">
        {id}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Account ID copied" : "Copy account ID"}
        title={copied ? "Copied" : "Copy account ID"}
        className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors max-md:size-11 duration-150 hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
          copied ? "text-accent" : "text-muted hover:text-foreground"
        }`}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </span>
  );
}

/** Only facts the subscription records; a renewal that's due but not yet applied says so. */
function SubscriptionRows({ subscription }: { subscription: AdminSubscription }) {
  const { scheduledChange, currentPeriodEnd } = subscription;
  const periodEnd = formatDate(currentPeriodEnd);
  const ends = scheduledChange === "cancel" || scheduledChange === "downgrade";
  const renewalDue = !ends && new Date(currentPeriodEnd) <= new Date();

  let status = "Renews automatically";
  if (scheduledChange === "cancel") status = "Cancels at period end";
  else if (scheduledChange === "downgrade") status = "Moves to Free at period end";
  else if (scheduledChange === "switch_plan") status = `Switches to ${planLabel(subscription.scheduledPlan)} at renewal`;

  return (
    <>
      <Row label="Status">{status}</Row>
      <Row label="Started">{formatDate(subscription.startedAt)}</Row>
      <Row label={ends ? "Ends on" : renewalDue ? "Renewal due" : "Renews on"}>{periodEnd}</Row>
    </>
  );
}

/** US-63 to US-65: an account's details, with deactivate or reactivate for regular accounts. */
export default function UserDetailsDialog({
  account,
  onClose,
}: {
  account: { id: string; name: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    loadUserDetails(account.id)
      .then((result) => {
        if (!current) return;
        if (result.ok) setDetails(result.user);
        else setLoadError(result.message);
      })
      .catch(() => {
        if (current) setLoadError(LOAD_ERROR);
      });
    return () => {
      current = false;
    };
  }, [account.id]);

  const [, formAction, pending] = useActionState<UserActionState, FormData>(async (previous, formData) => {
    const result = await setUserActive(previous, formData).catch(
      (): UserActionState => ({ status: "error", message: "The change couldn't be saved. Please try again." }),
    );
    if (result.status !== "success") {
      setActionError(result.message ?? null);
      return result;
    }
    // Saved; if the fresh details couldn't be read, show the new status without inventing a date.
    const nowActive = formData.get("active") === "true";
    setDetails((shown) => result.user ?? (shown && { ...shown, deactivated: !nowActive, deactivatedAt: null }));
    setNotice(result.message ?? null);
    setConfirming(false);
    router.refresh();
    return result;
  }, initialFormState);

  const name = details ? displayName(details) : account.name;
  const named = details ? Boolean(details.name?.trim()) : true;
  const deactivating = details ? !details.deactivated : false;
  const canChange = details !== null && (details.deactivated || !details.isAdmin);

  if (confirming && details) {
    return (
      <Dialog labelledBy={titleId} busy={pending} size="compact-panel" onClose={onClose} mobileOptimized>
        <form action={formAction} className="flex min-h-0 flex-1 flex-col max-md:flex-none">
          <input type="hidden" name="userId" value={details.id} />
          <input type="hidden" name="active" value={deactivating ? "false" : "true"} />
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-2 text-center text-sm max-md:flex-none max-md:overflow-visible max-md:px-4 max-md:pt-4">
            <h2 id={titleId} className="text-xl font-semibold tracking-tight text-foreground">
              {deactivating ? "Deactivate account?" : "Reactivate account?"}
            </h2>
            <p className="mt-2 text-muted">
              {deactivating
                ? `${name} will lose access to ${APP_NAME}. Their subscription, watchlist, ratings and viewing history will be preserved.`
                : `${name} will regain access to ${APP_NAME} with their existing account information and subscription.`}
            </p>
            {actionError && (
              <p role="alert" className={`${ERROR_NOTE} mt-4 px-4 py-3`}>
                {actionError}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 px-6 pt-4 pb-6 max-md:grid-cols-1 max-md:px-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              autoFocus
              disabled={pending}
              onClick={() => {
                setConfirming(false);
                setActionError(null);
              }}
              className={buttonClassName("secondary")}
            >
              Cancel
            </button>
            <SubmitButton
              size="md"
              variant={deactivating ? "danger" : "primary"}
              pendingLabel={deactivating ? "Deactivating…" : "Reactivating…"}
            >
              {deactivating ? "Deactivate Account" : "Reactivate Account"}
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    );
  }

  return (
    <Dialog labelledBy={titleId} busy={pending} size="compact-panel" onClose={onClose} mobileOptimized>
      <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center max-md:shrink-0 max-md:px-4 max-md:py-4">
        {details ? (
          <UserAvatar id={details.id} name={details.name} email={details.email} size="lg" />
        ) : (
          <span aria-hidden="true" className="size-14 shrink-0 rounded-full bg-elevated" />
        )}
        <div className="mt-3 flex max-w-full items-center gap-1.5">
          <h2
            id={titleId}
            className={`truncate text-xl font-semibold tracking-tight max-md:whitespace-normal max-md:[overflow-wrap:anywhere] ${named ? "" : "text-muted"}`}
          >
            {name}
          </h2>
          {details?.isAdmin && <AdminIcon className="size-4" />}
        </div>
        <p className="mt-0.5 max-w-full truncate text-sm text-muted max-md:whitespace-normal max-md:[overflow-wrap:anywhere]">{details ? details.email : "Loading…"}</p>
        {details && (
          <div className="mt-3 flex items-center gap-3">
            <AccountStatus deactivated={details.deactivated} />
            {details.isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                <ShieldCheckIcon className="size-3.5" />
                Admin
              </span>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 max-md:flex-none max-md:overflow-visible max-md:px-4">
        {notice && (
          <p
            role="status"
            className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-foreground"
          >
            {notice}
          </p>
        )}
        {details ? (
          <div className="flex flex-col gap-5">
            <Section title="Account">
              <Row label="Account ID">
                <CopyableId id={details.id} />
              </Row>
              <Row label="Joined">{formatDate(details.joinedAt)}</Row>
              <Row label="Role">{details.isAdmin ? "Admin" : "User"}</Row>
              <Row label="Status">
                {details.deactivated
                  ? details.deactivatedAt
                    ? `Deactivated on ${formatDate(details.deactivatedAt)}`
                    : "Deactivated"
                  : "Active"}
              </Row>
            </Section>
            <Section title="Subscription">
              <Row label="Plan">{planLabel(details.plan)}</Row>
              {details.subscription && <SubscriptionRows subscription={details.subscription} />}
            </Section>
          </div>
        ) : loadError ? (
          <p role="alert" className={`${ERROR_NOTE} px-4 py-3`}>
            {loadError}
          </p>
        ) : (
          <p className="flex h-56 items-center justify-center gap-2 text-sm text-muted">
            <SpinnerIcon className="size-4" />
            Loading account…
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-6 pt-4 pb-6 max-md:shrink-0 max-md:flex-col max-md:px-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:[&>button]:w-full max-md:[&>button]:min-w-0">
        <DialogCloseButton data-autofocus autoFocus className={`${buttonClassName("secondary")} min-w-36`}>
          Close
        </DialogCloseButton>
        {canChange && (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setActionError(null);
              setConfirming(true);
            }}
            className={`${buttonClassName(details.deactivated ? "primary" : "danger")} min-w-36`}
          >
            {details.deactivated ? "Reactivate Account" : "Deactivate Account"}
          </button>
        )}
      </div>
    </Dialog>
  );
}
