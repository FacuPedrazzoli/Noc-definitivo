'use client';

import { useReadingMode } from './Providers';
import TOC from './TOC';
import type { TocHeading } from './TOC';

interface Props {
  headings: TocHeading[];
}

export default function TocPanel({ headings }: Props) {
  const { active } = useReadingMode();

  if (active || headings.length <= 1) return null;

  return (
    <aside className="hidden xl:block w-60 shrink-0 py-12 pl-4 pr-2">
      <div className="sticky top-20">
        <TOC headings={headings} />
      </div>
    </aside>
  );
}
