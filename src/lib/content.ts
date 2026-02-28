import fs from 'fs';
import path from 'path';

export interface Subsection {
  id: string;
  title: string;
}

export interface Section {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  subsections: Subsection[];
  order: number;
}

export interface ContentData {
  title: string;
  description: string;
  lastUpdated: string;
  totalSections: number;
  sections: Section[];
}

let _cache: ContentData | null = null;

export function getContent(): ContentData {
  if (_cache) return _cache;
  try {
    const filePath = path.join(process.cwd(), 'src', 'content', 'sections.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    _cache = JSON.parse(raw) as ContentData;
    return _cache;
  } catch {
    return {
      title: 'La Guía Definitiva del NOC',
      description: 'Cargando contenido…',
      lastUpdated: '',
      totalSections: 0,
      sections: [],
    };
  }
}

export const getAllSections = (): Section[] => getContent().sections;

export const getSectionBySlug = (slug: string): Section | undefined =>
  getAllSections().find((s) => s.slug === slug);

export const getAdjacentSections = (slug: string) => {
  const sections = getAllSections();
  const idx = sections.findIndex((s) => s.slug === slug);
  return {
    prev: idx > 0 ? sections[idx - 1] : null,
    next: idx < sections.length - 1 ? sections[idx + 1] : null,
  };
};

export type SectionMeta = Pick<Section, 'id' | 'slug' | 'title' | 'subsections'>;

export const getAllSectionsMeta = (): SectionMeta[] =>
  getAllSections().map(({ id, slug, title, subsections }) => ({
    id,
    slug,
    title,
    subsections,
  }));
