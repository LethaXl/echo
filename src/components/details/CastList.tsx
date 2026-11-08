import scrollStyles from "@/components/media/MobileScroll.module.css";
import { UserIcon } from "@/components/icons";
import TmdbImage from "@/components/details/TmdbImage";
import type { CastMember } from "@/types/media";

export default function CastList({ cast, headingId = "cast-heading" }: { cast: CastMember[]; headingId?: string }) {
  if (cast.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-5 max-md:mb-3 text-xl font-semibold tracking-tight">
        Cast
      </h2>
      <ul className={`${scrollStyles.scroller} -mx-1 flex gap-6 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin] max-md:gap-3 max-md:overscroll-x-contain`}>
        {cast.map((member) => (
          <li key={member.id} className="w-28 shrink-0 text-center max-md:w-[clamp(5rem,25vw,6rem)]">
            <TmdbImage
              path={member.profilePath}
              size="w185"
              sizes="(max-width: 767px) 96px, 7rem"
              shape="circle"
              className="mx-auto size-28 max-md:aspect-square max-md:h-auto max-md:w-full ring-1 ring-line"
              imageClassName="object-[center_20%]"
              fallback={<UserIcon className="size-8" />}
            />
            <p className="mt-3 max-md:mt-2 truncate text-sm max-md:text-xs font-medium" title={member.name}>
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
