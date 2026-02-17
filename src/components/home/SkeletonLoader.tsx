// src/components/home/SkeletonLoader.tsx
interface SkeletonLoaderProps {
  type: 'movie' | 'person';
}

export default function SkeletonLoader({ type }: SkeletonLoaderProps) {
  if (type === 'movie') {
    return (
      <div className="animate-pulse">
        <div className="aspect-[2/3] rounded-sm bg-muted/30" />
        <div className="mt-2.5 h-3.5 bg-muted/30 rounded" />
        <div className="mt-1.5 h-3 bg-muted/30 rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className="animate-pulse text-center">
      <div className="aspect-square w-full rounded-full bg-muted/30 mx-auto" />
      <div className="mt-2.5 h-3 bg-muted/30 rounded" />
      <div className="mt-1 h-2.5 bg-muted/30 rounded w-3/4 mx-auto" />
    </div>
  );
}
