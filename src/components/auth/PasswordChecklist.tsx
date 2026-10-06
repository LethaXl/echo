import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { PASSWORD_RULES } from "@/lib/auth/validation";

type RequirementsToggleProps = {
  open: boolean;
  onToggle: () => void;
  controls: string;
};

export function RequirementsToggle({ open, onToggle, controls }: RequirementsToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="flex items-center gap-1 rounded-sm text-xs text-muted transition-colors hover:text-foreground"
    >
      Requirements
      <ChevronDownIcon
        className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

type PasswordChecklistProps = {
  id: string;
  open: boolean;
  password: string;
};

export default function PasswordChecklist({ id, open, password }: PasswordChecklistProps) {
  return (
    <div
      className={`-mt-1.5 grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden" inert={!open}>
        <ul
          id={id}
          aria-label="Password requirements"
          className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs"
        >
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-1 transition-colors ${
                  met ? "text-foreground" : "text-muted"
                }`}
              >
                <CheckIcon
                  className={`size-3.5 shrink-0 transition-colors ${met ? "text-accent" : "text-muted/40"}`}
                />
                <span className="sr-only">{met ? "Met: " : "Not met: "}</span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function PasswordMatchIndicator({ matches }: { matches: boolean }) {
  return (
    <>
      <CheckIcon
        className={`size-4 text-accent transition-opacity duration-200 ${
          matches ? "opacity-100" : "opacity-0"
        }`}
      />
      <span className="sr-only" aria-live="polite">
        {matches ? "Passwords match" : ""}
      </span>
    </>
  );
}
