// src/components/home/SkeletonLoader.tsx
interface SkeletonLoaderProps {
  type: 'movie' | 'person';
}

export default function SkeletonLoader({ type }: SkeletonLoaderProps) {
  if (type === 'movie') {
    return (
      <div className="animate-pulse">
        <div className="aspect-[2/3] rounded-lg bg-gray-800 mb-2"></div>
        <div className="h-4 bg-gray-800 rounded mb-1"></div>
        <div className="h-3 bg-gray-800 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      <div className="w-24 h-24 rounded-full bg-gray-800 mx-auto mb-2"></div>
      <div className="h-4 bg-gray-800 rounded mb-1"></div>
      <div className="h-3 bg-gray-800 rounded w-3/4 mx-auto"></div>
    </div>
  );
}