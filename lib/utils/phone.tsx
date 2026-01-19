/**
 * Phone number formatting and validation utilities.
 *
 * Standard format: (XXX)XXX-XXXX
 * All phone numbers across the application should use this consistent format.
 */

/**
 * Standard phone number regex pattern.
 * Matches format: (XXX)XXX-XXXX (no space after area code)
 */
export const PHONE_REGEX = /^\(\d{3}\)\d{3}-\d{4}$/;

/**
 * Formats a phone number to (XXX)XXX-XXXX format as the user types.
 * Handles partial input gracefully (e.g., "555" -> "(555").
 *
 * @param value - Raw phone number input (may contain non-numeric characters)
 * @returns Formatted phone number string
 *
 * @example
 * formatPhoneNumber('5551234567') // Returns: '(555)123-4567'
 * formatPhoneNumber('555-123-4567') // Returns: '(555)123-4567'
 * formatPhoneNumber('(555) 123-4567') // Returns: '(555)123-4567'
 * formatPhoneNumber('555') // Returns: '(555'
 * formatPhoneNumber('555123') // Returns: '(555)123'
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters
  const phoneNumber = value.replace(/\D/g, '');

  // Limit to 10 digits
  const limited = phoneNumber.slice(0, 10);

  // Format as (XXX)XXX-XXXX (no space after area code)
  if (limited.length === 0) {
    return '';
  } else if (limited.length <= 3) {
    return `(${limited}`;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)})${limited.slice(3)}`;
  } else {
    return `(${limited.slice(0, 3)})${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
}

/**
 * Validates a phone number against the standard format.
 *
 * @param phone - Phone number to validate
 * @returns true if phone matches (XXX)XXX-XXXX format, false otherwise
 *
 * @example
 * validatePhoneFormat('(555)123-4567') // Returns: true
 * validatePhoneFormat('(555) 123-4567') // Returns: false (has space)
 * validatePhoneFormat('555-123-4567') // Returns: false (wrong format)
 */
export function validatePhoneFormat(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}
