import { APP_NAME } from "@/lib/brand";

export default function EchoPlus() {
  return (
    <span className="font-semibold text-foreground">
      {APP_NAME}
      <span className="text-accent">+</span>
    </span>
  );
}
