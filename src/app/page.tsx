import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import FormMessage from "@/components/forms/FormMessage";
import { APP_NAME } from "@/lib/brand";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { accountDeleted } = await searchParams;

  return (
    <section className="flex flex-col items-start gap-4 py-16">
      {accountDeleted === "1" && (
        <div className="mb-4 w-full max-w-xl">
          <FormMessage state={{ status: "success", message: "Your account has been deleted." }} />
        </div>
      )}
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
