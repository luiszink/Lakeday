import Image from 'next/image';

import type { AttractionDetailResponse } from '@lake/domain';

const placeholderStyles: Record<string, string> = {
  CULTURE: 'from-amber-200 via-orange-300 to-rose-400',
  NATURE: 'from-emerald-200 via-teal-300 to-cyan-500',
  default: 'from-slate-700 via-slate-600 to-cyan-800',
};

type ImageGalleryProps = Readonly<{
  categoryCode: string | undefined;
  images: AttractionDetailResponse['images'];
  locale: 'de' | 'en';
  placeholderLabel: string;
}>;

export function ImageGallery({
  categoryCode,
  images,
  locale,
  placeholderLabel,
}: ImageGalleryProps) {
  if (images.length === 0) {
    return (
      <div
        aria-label={placeholderLabel}
        className={`flex min-h-64 items-end rounded-lg bg-gradient-to-br p-5 ${placeholderStyles[categoryCode ?? ''] ?? placeholderStyles.default}`}
        role="img"
      >
        <span className="rounded-md bg-slate-950/75 px-3 py-2 text-sm font-medium text-white">
          {placeholderLabel}
        </span>
      </div>
    );
  }

  return (
    <figure>
      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((image, index) => (
          <div
            className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
            key={image.storagePath}
          >
            <Image
              alt={locale === 'de' ? image.altDe : image.altEn}
              className="h-64 w-full object-cover"
              height={640}
              loading={index === 0 ? 'eager' : 'lazy'}
              src={image.storagePath}
              unoptimized
              width={960}
            />
            <figcaption className="px-3 py-2 text-xs text-slate-300">
              {image.attributionText}
            </figcaption>
          </div>
        ))}
      </div>
    </figure>
  );
}
