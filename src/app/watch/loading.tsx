import { ViewerLayout } from "@/components/viewer/ViewerFrame";

const BLOCK = "rounded-md bg-elevated motion-safe:animate-pulse";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading the viewer" className="flex flex-1 flex-col">
      <ViewerLayout top={<div className={`h-5 w-40 ${BLOCK}`} />}>
        <div className={`aspect-video w-full rounded-xl ${BLOCK}`} />
      </ViewerLayout>
    </div>
  );
}
