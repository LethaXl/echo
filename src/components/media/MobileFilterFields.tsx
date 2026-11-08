import { Children, isValidElement, type ReactNode } from "react";
import { ArrowUpDownIcon, CalendarIcon, EyeIcon, TagIcon } from "@/components/icons";
import type { ContentType } from "@/lib/browse";
import { ContentTypeToggle } from "./ContentTypeToggle";
import { FilterMenu, MenuOption } from "./EchoFilterMenu";

export function MobileContentType({ value, onChange }: { value: ContentType; onChange: (value: ContentType) => void }) {
  return <ContentTypeToggle value={value} onChange={onChange} className="max-md:[&_svg]:block" />;
}

/** Uses Echo's existing menu and option controls, with a bounded scrolling list. */
export function MobileFilterSelect({ label, value, onChange, children }: {
  label: string; value: string; onChange: (value: string) => void; children: ReactNode;
}) {
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children: ReactNode }>(child) || child.type !== "option") return [];
    return [{ value: String(child.props.value ?? ""), label: child.props.children }];
  });
  const selected = options.find((option) => option.value === value);
  const Icon = label === "Genre" ? TagIcon : label === "Year" ? CalendarIcon : label === "Sort" ? ArrowUpDownIcon : EyeIcon;
  const displayValue = value === "" && label === "Genre" ? "All" : value === "" && label === "Year" ? "Any" : String(selected?.label ?? "");
  return <div className="min-w-0 w-full">
    <FilterMenu icon={<Icon className="size-3.5" />} label={label} value={displayValue} active={label === "Sort" || value !== options[0]?.value}
      ariaLabel={`${label}: ${displayValue}`} floating
      triggerClassName="w-full max-w-full px-2! [&>span:first-child]:shrink-0 [&>span:nth-child(2)]:shrink-0 [&>span:last-of-type]:min-w-0 [&>span:last-of-type]:truncate [&>svg]:ml-auto [&>svg]:shrink-0"
      panelClassName="w-full max-h-40 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--color-accent)_var(--color-surface)]">
      {options.map((option) => <MenuOption key={option.value} selected={value === option.value} onSelect={() => onChange(option.value)}>{option.label}</MenuOption>)}
    </FilterMenu>
  </div>;
}
