
export type ApplicationStatus = 'Applied' | 'Screening' | 'Interviewing' | 'Offer' | 'Rejected' | 'Ghosted';

export type JobPlatform = 
  | 'LinkedIn' 
  | 'Indeed' 
  | 'Glassdoor' 
  | 'Company Site' 
  | 'Referral' 
  | 'Greenhouse' 
  | 'Lever' 
  | 'Other';

export interface UserProfile {
  resumeText: string;
}

export interface AtsReport {
  score: number;
  missingKeywords: string[];
  strengths: string[];
  suggestions: string;
}

export interface JobApplication {
  id: string;
  jobTitle: string;
  companyName: string;
  platform: JobPlatform;
  status: ApplicationStatus;
  appliedDate: string; // YYYY-MM-DD
  jobUrl?: string;
  notes?: string;
  location?: string;
  salary?: string;
  jobDescription?: string;
  atsReport?: AtsReport;
}

export interface ApplicationStats {
  today: number;
  week: number;
  month: number;
  year: number;
}
