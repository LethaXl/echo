"use client";

import { useState } from "react";
import { buttonClassName, type ButtonVariant } from "@/components/ButtonLink";
import Toast from "@/components/forms/Toast";

/**
 * Placeholder for choosing an Echo+ plan. Subscribing is US-24 (Sprint 2), so this only
 * explains that; it never creates or changes a subscription.
 */
export default function PlanChoiceButton({
  label,
  variant,
}: {
  label: string;
  variant: ButtonVariant;
}) {
  const [noticeId, setNoticeId] = useState<number | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setNoticeId(Date.now())}
        className={`${buttonClassName(variant)} w-full`}
      >
        {label}
      </button>
      {noticeId !== null && (
        <Toast
          key={noticeId}
          tone="info"
          message="Subscription selection will be available soon. No subscription has been created."
          onDismiss={() => setNoticeId(null)}
        />
      )}
    </>
  );
}
