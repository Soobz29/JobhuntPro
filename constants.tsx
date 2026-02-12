
import React from 'react';
import { JobPlatform, ApplicationStatus } from './types';

export const STORAGE_KEYS = {
  APPLICATIONS: 'jobhunt_pro_apps_v1',
  USER_PROFILE: 'jobhunt_pro_profile_v1'
};

export const PLATFORMS: JobPlatform[] = [
  'LinkedIn', 'Indeed', 'Glassdoor', 'Company Site', 'Referral', 'Greenhouse', 'Lever', 'Other'
];

export const STATUSES: ApplicationStatus[] = [
  'Applied', 'Screening', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'
];

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  'Applied': 'bg-blue-100 text-blue-800',
  'Screening': 'bg-purple-100 text-purple-800',
  'Interviewing': 'bg-yellow-100 text-yellow-800',
  'Offer': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Ghosted': 'bg-gray-100 text-gray-800',
};
