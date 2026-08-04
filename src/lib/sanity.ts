import { createClient } from '@sanity/client';
import defaults from '../data/default-content.json';

export interface SiteSettings {
  linkedinUrl: string;
  xUrl: string;
  terraPoolUrl: string;
  reactorUrl: string;
  numisUrl: string;
}

export interface AboutPageContent {
  eyebrow: string;
  title: string;
  intro: string;
  coreTitle: string;
  coreDescription: string;
  corePlusTitle: string;
  corePlusDescription: string;
  milestonesTitle: string;
  coreImageUrl?: string;
  corePlusImageUrl?: string;
  milestonesImageUrl?: string;
}

export interface ContactPageContent {
  title: string;
  intro: string;
  companyName: string;
  address: string;
  generalEmail: string;
  privacyEmail: string;
  consentText: string;
}

export interface PresentationContent {
  title: string;
  description: string;
  publishedAt: string;
  embedUrl: string;
  pdfUrl: string;
}

export interface FinancialDocument {
  _id: string;
  title: string;
  year: number;
  category: string;
  externalUrl?: string;
  fileUrl?: string;
  note?: string;
  sortOrder?: number;
}

export interface InvestorUpdate {
  _id: string;
  kind: 'operational' | 'event';
  title: string;
  date?: string;
  endDate?: string;
  summary?: string;
  location?: string;
  url?: string;
  internalPath?: string;
}

export interface LegalPageContent {
  title: string;
  slug: string;
  sourceUrl?: string;
  blocks: Array<{ _key?: string; style: 'heading' | 'paragraph'; text: string }>;
}

const projectId = import.meta.env.SANITY_PROJECT_ID || 'xhkhh5nl';
const dataset = import.meta.env.SANITY_DATASET || 'production';
const token = import.meta.env.SANITY_API_TOKEN;

const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2026-08-04',
  useCdn: false,
  token,
  perspective: 'published',
});

async function safeFetch<T>(query: string, params: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    return (await sanityClient.fetch<T>(query, params)) ?? fallback;
  } catch (error) {
    console.warn(`Sanity query failed; using bundled content. ${error instanceof Error ? error.message : ''}`);
    return fallback;
  }
}

let siteSettingsRequest: Promise<SiteSettings> | undefined;

export function getSiteSettings() {
  siteSettingsRequest ??= safeFetch<Partial<SiteSettings>>(
    `*[_type == "siteSettings"][0]{linkedinUrl,xUrl,terraPoolUrl,reactorUrl,numisUrl}`,
    {},
    {},
  ).then((content) => ({ ...defaults.siteSettings, ...content }));
  return siteSettingsRequest;
}

export async function getAboutPage(): Promise<AboutPageContent> {
  const content = await safeFetch<Partial<AboutPageContent>>(
    `*[_type == "aboutPage"][0]{eyebrow,title,intro,coreTitle,coreDescription,corePlusTitle,corePlusDescription,milestonesTitle,"coreImageUrl":coreImage.asset->url,"corePlusImageUrl":corePlusImage.asset->url,"milestonesImageUrl":milestonesImage.asset->url}`,
    {},
    {},
  );
  return { ...defaults.about, ...content };
}

export async function getContactPage(): Promise<ContactPageContent> {
  const content = await safeFetch<Partial<ContactPageContent>>(
    `*[_type == "contactPage"][0]{title,intro,companyName,address,generalEmail,privacyEmail,consentText}`,
    {},
    {},
  );
  return { ...defaults.contact, ...content };
}

export async function getPresentation(): Promise<PresentationContent> {
  const content = await safeFetch<Partial<PresentationContent>>(
    `*[_type == "presentation"] | order(publishedAt desc)[0]{title,description,publishedAt,embedUrl,"pdfUrl":coalesce(pdf.asset->url,pdfUrl)}`,
    {},
    {},
  );
  return { ...defaults.presentation, ...content };
}

export function getFinancialDocuments(): Promise<FinancialDocument[]> {
  return safeFetch(
    `*[_type == "financialDocument"] | order(year desc, sortOrder asc, title asc){_id,title,year,category,externalUrl,"fileUrl":file.asset->url,note,sortOrder}`,
    {},
    [],
  );
}

export function getInvestorUpdates(kind: InvestorUpdate['kind']): Promise<InvestorUpdate[]> {
  return safeFetch(
    `*[_type == "investorUpdate" && kind == $kind] | order(date desc){_id,kind,title,date,endDate,summary,location,url,internalPath}`,
    { kind },
    [],
  );
}

export function getLegalPage(slug: string): Promise<LegalPageContent | null> {
  return safeFetch(
    `*[_type == "legalPage" && slug.current == $slug][0]{title,"slug":slug.current,sourceUrl,blocks[]{_key,style,text}}`,
    { slug },
    null,
  );
}

export function documentUrl(document: Pick<FinancialDocument, 'fileUrl' | 'externalUrl'>) {
  return document.fileUrl || document.externalUrl || '#';
}

export function downloadUrl(url: string) {
  const driveId = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)?.[1];
  if (driveId) return `https://drive.google.com/uc?export=download&id=${driveId}`;
  if (url.includes('cdn.sanity.io/files/')) return `${url}?dl=`;
  return url;
}

export function presentationEmbedUrl(presentation: PresentationContent) {
  if (presentation.embedUrl) return presentation.embedUrl;
  const driveId = presentation.pdfUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/)?.[1];
  return driveId ? `https://drive.google.com/file/d/${driveId}/preview` : presentation.pdfUrl;
}
