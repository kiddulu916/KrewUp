'use client';

import { usePortfolioImages } from '../../hooks/use-portfolio-images';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

type PortfolioTabProps = {
  userId: string;
};

export function PortfolioTab({ userId }: PortfolioTabProps) {
  const { data: images, isLoading, error } = usePortfolioImages(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-krewup-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load portfolio images</p>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
        <ImageIcon className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No portfolio images yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {images.length} {images.length === 1 ? 'image' : 'images'}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
          >
            <Image
              src={image.image_url}
              alt={`Portfolio image ${image.display_order + 1}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 transition-opacity duration-300 group-hover:bg-opacity-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
