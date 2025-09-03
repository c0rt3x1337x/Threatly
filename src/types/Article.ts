export interface Article {
  _id: string;
  title: string;
  content?: string;
  link: string;
  isoDate: string | Date;
  source: string;
  feedUrl: string;
  author?: string;
  pubDate?: string;
  guid?: string;
  isodate?: string;
  name?: string;
  type?: string; // 'news' or 'forum'
  sector?: string;
  industry?: string;
  industries?: string[];
  severity?: string;
  spam?: number;
  isSpam?: boolean;
  adyen: number;
  automotive: number;
  samsung_sdi: number;
  read?: boolean;
  readAt?: string | Date;
  saved?: boolean;
  savedAt?: string | Date;
  processedAt?: string | Date;
  lastUpdated?: string | Date;
  alerts?: Record<string, number>;
  alertMatches?: (string | { _id: string; displayName?: string; name?: string })[];
  alertProcessedAt?: string | Date;
  // New threat fields
  threatLevel?: string; // 'HIGH', 'MEDIUM', 'LOW', 'NONE'
  threatType?: string; // 'malware', 'phishing', 'vulnerability', etc.
}