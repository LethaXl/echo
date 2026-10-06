const BLOCK = "rounded-md bg-elevated motion-safe:animate-pulse";

export function TitleSkeleton() {
  return (
    <div data-layout="wide" aria-busy="true" className="pt-2 pb-8">
      <span className="sr-only">Loading title details…</span>
      <div className={`h-5 w-32 ${BLOCK}`} />
      <div className="mt-6 grid gap-10 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-13 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-14">
        <div className={`aspect-[2/3] w-full max-w-[14rem] md:max-w-none ${BLOCK}`} />
        <div className="max-w-[52rem]">
          <div className={`h-3 w-16 ${BLOCK}`} />
          <div className={`mt-4 h-12 w-2/3 ${BLOCK}`} />
          <div className={`mt-5 h-4 w-1/2 ${BLOCK}`} />
          <div className={`mt-10 h-4.5 w-full ${BLOCK}`} />
          <div className={`mt-3 h-4.5 w-full ${BLOCK}`} />
          <div className={`mt-3 h-4.5 w-3/5 ${BLOCK}`} />
        </div>
      </div>
    </div>
  );
}

export function SeasonSkeleton() {
  return (
    <div data-layout="wide" aria-busy="true" className="pt-2 pb-8">
      <span className="sr-only">Loading episodes…</span>
      <div className={`h-5 w-32 ${BLOCK}`} />
      <div className="mt-6 grid grid-cols-[9rem_minmax(0,1fr)] gap-8 xl:grid-cols-[10rem_minmax(0,1fr)]">
        <div className={`aspect-[2/3] ${BLOCK}`} />
        <div className="pt-1">
          <div className={`h-3 w-28 ${BLOCK}`} />
          <div className={`mt-4 h-8 w-48 ${BLOCK}`} />
          <div className={`mt-3 h-4 w-32 ${BLOCK}`} />
        </div>
      </div>
      <div className="mt-12 flex flex-col gap-5">
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-[13rem_minmax(0,1fr)] gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
            <div className={`aspect-video ${BLOCK}`} />
            <div className="pt-1">
              <div className={`h-4 w-1/3 ${BLOCK}`} />
              <div className={`mt-3 h-3 w-24 ${BLOCK}`} />
              <div className={`mt-4 h-3.5 w-full max-w-3xl ${BLOCK}`} />
              <div className={`mt-2 h-3.5 w-2/3 ${BLOCK}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
