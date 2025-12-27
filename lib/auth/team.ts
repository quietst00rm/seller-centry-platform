/**
 * Team authorization utilities for the internal tool
 */

// Default team emails if TEAM_EMAILS environment variable is not set
const DEFAULT_TEAM_EMAILS = [
  'joe@sellercentry.com',
  'kristen@marketools.io',
  'info@sellercentry.com',
  'joe@marketools.io',
];

/**
 * Get the list of authorized team emails
 * Uses TEAM_EMAILS environment variable if present, otherwise falls back to default list
 * @returns Array of authorized team email addresses
 */
export function getTeamEmails(): string[] {
  const envEmails = process.env.TEAM_EMAILS;

  if (envEmails) {
    // Parse comma-separated list from environment variable
    return envEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);
  }

  return DEFAULT_TEAM_EMAILS;
}

/**
 * Check if an email address belongs to an authorized team member
 * @param email - The email address to check
 * @returns true if the email is in the team list, false otherwise
 */
export function isTeamMember(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const teamEmails = getTeamEmails();
  return teamEmails.includes(email.toLowerCase());
}
