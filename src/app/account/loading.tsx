const BLOCK = "rounded-md bg-elevated motion-safe:animate-pulse";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading your account" className="mx-auto w-full max-w-xl">
      <div className={`mx-auto h-8 w-32 ${BLOCK}`} />
      <div className={`mt-5 h-9 ${BLOCK}`} />
      <div className={`mt-6 h-56 rounded-xl ${BLOCK}`} />
      <div className={`mt-8 h-4 w-40 ${BLOCK}`} />
      <div className={`mt-3 h-40 ${BLOCK}`} />
    </div>
  );
}
