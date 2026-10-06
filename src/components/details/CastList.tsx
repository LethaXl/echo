import { UserIcon } from "@/components/icons";
import TmdbImage from "@/components/details/TmdbImage";
import type { CastMember } from "@/types/media";

export default function CastList({ cast }: { cast: CastMember[] }) {
  if (cast.length === 0) return null;

  return (
    <section aria-labelledby="cast-heading">
      <h2 id="cast-heading" className="mb-5 text-xl font-semibold tracking-tight">
        Cast
      </h2>
      <ul className="-mx-1 flex gap-6 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]">
        {cast.map((member) => (
          <li key={member.id} className="w-28 shrink-0 text-center">
            <TmdbImage
              path={member.profilePath}
              size="w185"
              sizes="7rem"
              shape="circle"
              className="mx-auto size-28 ring-1 ring-line"
              imageClassName="object-[center_20%]"
              fallback={<UserIcon className="size-8" />}
            />
            <p className="mt-3 truncate text-sm font-medium" title={member.name}>
              {member.name}
            </p>
            {member.character && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted" title={member.character}>
                {member.character}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
