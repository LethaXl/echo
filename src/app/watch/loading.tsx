import { ViewerLayout } from "@/components/viewer/ViewerFrame";

const BLOCK = "rounded-md bg-elevated motion-safe:animate-pulse";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading the viewer" className="flex flex-1 flex-col">
      <ViewerLayout top={<div className={`h-5 w-40 ${BLOCK}`} />}>
        <div className={`aspect-video w-full rounded-xl ${BLOCK}`} />
        <div className="mt-2 hidden space-y-2 max-md:block" aria-hidden="true">
          <div className={`h-11 w-full ${BLOCK}`} />
          <div className={`h-11 w-full ${BLOCK}`} />
          <div className={`ml-auto h-11 w-32 ${BLOCK}`} />
        </div>
      </ViewerLayout>
    </div>
  );
}
