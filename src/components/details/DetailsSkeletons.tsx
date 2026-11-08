const BLOCK = "rounded-md bg-elevated motion-safe:animate-pulse";

export function TitleSkeleton({ seasons = false }: { seasons?: boolean }) {
  return (
    <div data-layout="wide" aria-busy="true" className="pt-2 pb-8">
      <span className="sr-only">Loading title details…</span>
      <div className={`h-5 w-32 max-md:h-11 ${BLOCK}`} />
      <div className="mt-6 grid gap-10 max-md:mt-4 max-md:grid-cols-[clamp(6rem,26vw,7rem)_minmax(0,1fr)] max-md:gap-x-4 max-md:gap-y-5 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-13 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-14">
        <div className={`aspect-[2/3] w-full max-w-[14rem] max-md:col-start-1 max-md:row-start-1 max-md:max-w-none md:max-w-none ${BLOCK}`} />
        <div className="max-w-[52rem] max-md:contents">
          <div className="contents max-md:col-start-2 max-md:row-start-1 max-md:block max-md:min-w-0">
          <div className={`h-3 w-16 ${BLOCK}`} />
          <div className={`mt-4 h-12 w-2/3 max-md:mt-2 max-md:h-9 ${BLOCK}`} />
          <div className={`mt-5 h-4 w-1/2 max-md:mt-3 ${BLOCK}`} />
          <div className={`mt-2 hidden h-5 w-36 max-md:block max-md:max-w-full ${BLOCK}`} />
          </div>
          <div className="contents max-md:col-span-2 max-md:block">
          <div className="hidden grid-cols-3 gap-2 max-md:grid">
            <div className={`col-span-3 h-11 ${BLOCK}`} />
            {[0, 1, 2].map((key) => <div key={key} className={`h-11 ${BLOCK}`} />)}
          </div>
          <div className={`mt-10 h-4.5 w-full max-md:mt-5 ${BLOCK}`} />
          <div className={`mt-3 h-4.5 w-full ${BLOCK}`} />
          <div className={`mt-3 h-4.5 w-3/5 ${BLOCK}`} />
          </div>
        </div>
      </div>
      {seasons && (
        <div className="mt-8 hidden max-md:block">
          <div className={`mb-3 h-6 w-24 ${BLOCK}`} />
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {Array.from({ length: 6 }, (_, key) => <div key={key}>
              <div className={`aspect-[2/3] ${BLOCK}`} />
              <div className={`mt-2 h-4 w-3/4 ${BLOCK}`} />
              <div className={`mt-1 h-3 w-1/2 ${BLOCK}`} />
            </div>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function SeasonSkeleton() {
  return (
    <div data-layout="wide" aria-busy="true" className="pt-2 pb-8">
      <span className="sr-only">Loading episodes…</span>
      <div className={`h-5 w-32 max-md:h-11 ${BLOCK}`} />
      <div className="mt-6 grid grid-cols-[9rem_minmax(0,1fr)] gap-8 max-md:mt-4 max-md:grid-cols-[6rem_minmax(0,1fr)] max-md:grid-rows-[auto_auto_1fr] max-md:gap-x-4 max-md:gap-y-2 xl:grid-cols-[10rem_minmax(0,1fr)]">
        <div className={`aspect-[2/3] max-md:row-span-3 ${BLOCK}`} />
        <div className="pt-1 max-md:contents">
          <div className={`h-3 w-28 max-md:col-start-2 max-md:row-start-1 max-md:max-w-full ${BLOCK}`} />
          <div className={`mt-4 h-8 w-48 max-md:col-start-2 max-md:row-start-2 max-md:mt-0 max-md:w-full max-md:max-w-40 ${BLOCK}`} />
          <div className={`mt-3 h-4 w-32 max-md:col-start-2 max-md:row-start-3 max-md:mt-0 max-md:max-w-full ${BLOCK}`} />
        </div>
        <div className="hidden space-y-2 max-md:col-span-2 max-md:mt-2 max-md:block">
          <div className={`h-4 w-full ${BLOCK}`} /><div className={`h-4 w-4/5 ${BLOCK}`} />
        </div>
      </div>
      <div className="mt-12 flex flex-col gap-5 max-md:mt-6 max-md:gap-8">
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-[13rem_minmax(0,1fr)] gap-6 max-md:grid-cols-[6rem_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-3 xl:grid-cols-[16rem_minmax(0,1fr)]">
            <div className={`aspect-video ${BLOCK}`} />
            <div className="pt-1 max-md:contents">
              <div className="contents max-md:col-start-2 max-md:row-start-1 max-md:block">
                <div className={`h-4 w-1/3 max-md:w-full ${BLOCK}`} />
                <div className={`mt-3 h-3 w-24 max-md:max-w-full ${BLOCK}`} />
              </div>
              <div className="contents max-md:col-span-2 max-md:block">
                <div className={`mt-4 h-3.5 w-full max-w-3xl max-md:mt-0 ${BLOCK}`} />
                <div className={`mt-2 h-3.5 w-2/3 ${BLOCK}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
