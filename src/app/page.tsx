import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import { APP_NAME } from "@/lib/brand";

export default function Home() {
  return (
    <section className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-[2.625rem] leading-tight font-bold tracking-tight">{APP_NAME}</h1>
      <p className="max-w-xl text-lg text-muted">
        Discover movies and shows in one place.
      </p>
      <p className="max-w-xl text-muted">
        Subscribe to <EchoPlus /> to unlock the full experience.
      </p>
      <div className="mt-4 flex gap-3">
        <ButtonLink href="/browse">Browse</ButtonLink>
        <ButtonLink href="/plans" variant="secondary">
          View Plans
        </ButtonLink>
      </div>
    </section>
  );
}
