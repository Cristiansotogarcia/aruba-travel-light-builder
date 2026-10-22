// E.164 phone composition for the booking contact field.
//
// The booking form stores one E.164 string ("+2975551234") in
// `customerInfo.phone` so every downstream consumer (booking-create.ts,
// booking-create-staff.ts, admin views, confirmation emails) keeps working
// unchanged. This module only handles presenting that string as a
// country-code dropdown + local-number input and composing it back.

export interface CountryCallingCode {
  iso2: string;
  dial: string; // e.g. '+297', always includes the leading '+'
  name: string;
}

export const DEFAULT_DIAL_CODE = '+297'; // Aruba

// Common origin countries of tourists booking in Aruba, shown first in the dropdown.
export const PRIORITY_COUNTRY_CODES: CountryCallingCode[] = [
  { iso2: 'AW', dial: '+297', name: 'Aruba' },
  { iso2: 'US', dial: '+1', name: 'United States' },
  { iso2: 'CA', dial: '+1', name: 'Canada' },
  { iso2: 'NL', dial: '+31', name: 'Netherlands' },
  { iso2: 'CO', dial: '+57', name: 'Colombia' },
  { iso2: 'VE', dial: '+58', name: 'Venezuela' },
  { iso2: 'BR', dial: '+55', name: 'Brazil' },
  { iso2: 'GB', dial: '+44', name: 'United Kingdom' },
  { iso2: 'DE', dial: '+49', name: 'Germany' },
];

// Remaining countries, alphabetical by name, shown below the priority group.
export const OTHER_COUNTRY_CODES: CountryCallingCode[] = [
  { iso2: 'AF', dial: '+93', name: 'Afghanistan' },
  { iso2: 'AL', dial: '+355', name: 'Albania' },
  { iso2: 'DZ', dial: '+213', name: 'Algeria' },
  { iso2: 'AD', dial: '+376', name: 'Andorra' },
  { iso2: 'AO', dial: '+244', name: 'Angola' },
  { iso2: 'AI', dial: '+1264', name: 'Anguilla' },
  { iso2: 'AG', dial: '+1268', name: 'Antigua and Barbuda' },
  { iso2: 'AR', dial: '+54', name: 'Argentina' },
  { iso2: 'AM', dial: '+374', name: 'Armenia' },
  { iso2: 'AU', dial: '+61', name: 'Australia' },
  { iso2: 'AT', dial: '+43', name: 'Austria' },
  { iso2: 'AZ', dial: '+994', name: 'Azerbaijan' },
  { iso2: 'BS', dial: '+1242', name: 'Bahamas' },
  { iso2: 'BH', dial: '+973', name: 'Bahrain' },
  { iso2: 'BD', dial: '+880', name: 'Bangladesh' },
  { iso2: 'BB', dial: '+1246', name: 'Barbados' },
  { iso2: 'BY', dial: '+375', name: 'Belarus' },
  { iso2: 'BE', dial: '+32', name: 'Belgium' },
  { iso2: 'BZ', dial: '+501', name: 'Belize' },
  { iso2: 'BM', dial: '+1441', name: 'Bermuda' },
  { iso2: 'BO', dial: '+591', name: 'Bolivia' },
  { iso2: 'BA', dial: '+387', name: 'Bosnia and Herzegovina' },
  { iso2: 'BQ', dial: '+599', name: 'Bonaire, Sint Eustatius and Saba' },
  { iso2: 'BG', dial: '+359', name: 'Bulgaria' },
  { iso2: 'KH', dial: '+855', name: 'Cambodia' },
  { iso2: 'CV', dial: '+238', name: 'Cabo Verde' },
  { iso2: 'KY', dial: '+1345', name: 'Cayman Islands' },
  { iso2: 'CL', dial: '+56', name: 'Chile' },
  { iso2: 'CN', dial: '+86', name: 'China' },
  { iso2: 'CR', dial: '+506', name: 'Costa Rica' },
  { iso2: 'HR', dial: '+385', name: 'Croatia' },
  { iso2: 'CU', dial: '+53', name: 'Cuba' },
  { iso2: 'CW', dial: '+599', name: 'Curacao' },
  { iso2: 'CY', dial: '+357', name: 'Cyprus' },
  { iso2: 'CZ', dial: '+420', name: 'Czech Republic' },
  { iso2: 'DK', dial: '+45', name: 'Denmark' },
  { iso2: 'DM', dial: '+1767', name: 'Dominica' },
  { iso2: 'DO', dial: '+1809', name: 'Dominican Republic' },
  { iso2: 'EC', dial: '+593', name: 'Ecuador' },
  { iso2: 'EG', dial: '+20', name: 'Egypt' },
  { iso2: 'SV', dial: '+503', name: 'El Salvador' },
  { iso2: 'EE', dial: '+372', name: 'Estonia' },
  { iso2: 'FI', dial: '+358', name: 'Finland' },
  { iso2: 'FR', dial: '+33', name: 'France' },
  { iso2: 'GE', dial: '+995', name: 'Georgia' },
  { iso2: 'GH', dial: '+233', name: 'Ghana' },
  { iso2: 'GR', dial: '+30', name: 'Greece' },
  { iso2: 'GD', dial: '+1473', name: 'Grenada' },
  { iso2: 'GT', dial: '+502', name: 'Guatemala' },
  { iso2: 'GY', dial: '+592', name: 'Guyana' },
  { iso2: 'HT', dial: '+509', name: 'Haiti' },
  { iso2: 'HN', dial: '+504', name: 'Honduras' },
  { iso2: 'HK', dial: '+852', name: 'Hong Kong' },
  { iso2: 'HU', dial: '+36', name: 'Hungary' },
  { iso2: 'IS', dial: '+354', name: 'Iceland' },
  { iso2: 'IN', dial: '+91', name: 'India' },
  { iso2: 'ID', dial: '+62', name: 'Indonesia' },
  { iso2: 'IE', dial: '+353', name: 'Ireland' },
  { iso2: 'IL', dial: '+972', name: 'Israel' },
  { iso2: 'IT', dial: '+39', name: 'Italy' },
  { iso2: 'JM', dial: '+1876', name: 'Jamaica' },
  { iso2: 'JP', dial: '+81', name: 'Japan' },
  { iso2: 'JO', dial: '+962', name: 'Jordan' },
  { iso2: 'KZ', dial: '+7', name: 'Kazakhstan' },
  { iso2: 'KE', dial: '+254', name: 'Kenya' },
  { iso2: 'KR', dial: '+82', name: 'South Korea' },
  { iso2: 'KW', dial: '+965', name: 'Kuwait' },
  { iso2: 'LV', dial: '+371', name: 'Latvia' },
  { iso2: 'LB', dial: '+961', name: 'Lebanon' },
  { iso2: 'LI', dial: '+423', name: 'Liechtenstein' },
  { iso2: 'LT', dial: '+370', name: 'Lithuania' },
  { iso2: 'LU', dial: '+352', name: 'Luxembourg' },
  { iso2: 'MO', dial: '+853', name: 'Macau' },
  { iso2: 'MY', dial: '+60', name: 'Malaysia' },
  { iso2: 'MT', dial: '+356', name: 'Malta' },
  { iso2: 'MX', dial: '+52', name: 'Mexico' },
  { iso2: 'MC', dial: '+377', name: 'Monaco' },
  { iso2: 'MA', dial: '+212', name: 'Morocco' },
  { iso2: 'MS', dial: '+1664', name: 'Montserrat' },
  { iso2: 'NZ', dial: '+64', name: 'New Zealand' },
  { iso2: 'NI', dial: '+505', name: 'Nicaragua' },
  { iso2: 'NG', dial: '+234', name: 'Nigeria' },
  { iso2: 'NO', dial: '+47', name: 'Norway' },
  { iso2: 'OM', dial: '+968', name: 'Oman' },
  { iso2: 'PK', dial: '+92', name: 'Pakistan' },
  { iso2: 'PA', dial: '+507', name: 'Panama' },
  { iso2: 'PY', dial: '+595', name: 'Paraguay' },
  { iso2: 'PE', dial: '+51', name: 'Peru' },
  { iso2: 'PH', dial: '+63', name: 'Philippines' },
  { iso2: 'PL', dial: '+48', name: 'Poland' },
  { iso2: 'PT', dial: '+351', name: 'Portugal' },
  { iso2: 'PR', dial: '+1787', name: 'Puerto Rico' },
  { iso2: 'QA', dial: '+974', name: 'Qatar' },
  { iso2: 'RO', dial: '+40', name: 'Romania' },
  { iso2: 'RU', dial: '+7', name: 'Russia' },
  { iso2: 'KN', dial: '+1869', name: 'Saint Kitts and Nevis' },
  { iso2: 'LC', dial: '+1758', name: 'Saint Lucia' },
  { iso2: 'VC', dial: '+1784', name: 'Saint Vincent and the Grenadines' },
  { iso2: 'SA', dial: '+966', name: 'Saudi Arabia' },
  { iso2: 'RS', dial: '+381', name: 'Serbia' },
  { iso2: 'SG', dial: '+65', name: 'Singapore' },
  { iso2: 'SX', dial: '+1721', name: 'Sint Maarten' },
  { iso2: 'SK', dial: '+421', name: 'Slovakia' },
  { iso2: 'SI', dial: '+386', name: 'Slovenia' },
  { iso2: 'ZA', dial: '+27', name: 'South Africa' },
  { iso2: 'ES', dial: '+34', name: 'Spain' },
  { iso2: 'LK', dial: '+94', name: 'Sri Lanka' },
  { iso2: 'SE', dial: '+46', name: 'Sweden' },
  { iso2: 'CH', dial: '+41', name: 'Switzerland' },
  { iso2: 'TW', dial: '+886', name: 'Taiwan' },
  { iso2: 'TH', dial: '+66', name: 'Thailand' },
  { iso2: 'TT', dial: '+1868', name: 'Trinidad and Tobago' },
  { iso2: 'TR', dial: '+90', name: 'Turkey' },
  { iso2: 'TC', dial: '+1649', name: 'Turks and Caicos Islands' },
  { iso2: 'UA', dial: '+380', name: 'Ukraine' },
  { iso2: 'AE', dial: '+971', name: 'United Arab Emirates' },
  { iso2: 'UY', dial: '+598', name: 'Uruguay' },
  { iso2: 'VN', dial: '+84', name: 'Vietnam' },
];

export const ALL_COUNTRY_CODES: CountryCallingCode[] = [
  ...PRIORITY_COUNTRY_CODES,
  ...OTHER_COUNTRY_CODES,
];

// Mirrors the validation pattern in useBooking.ts (validateBookingData) so a
// composed value either passes both or fails both.
const E164_PATTERN = /^[+]?[1-9]\d{0,15}$/;

export function isValidE164Phone(value: string): boolean {
  if (!value?.trim()) return false;
  return E164_PATTERN.test(value.replace(/[\s()-]/g, ''));
}

export function composeE164(dial: string, localNumber: string): string {
  const digits = (localNumber || '').replace(/\D/g, '');
  return `${dial}${digits}`;
}

// Finds the longest known dial-code prefix so '+1' doesn't shadow '+1876'.
export function splitE164(value: string): { dial: string; local: string } {
  const trimmed = (value || '').trim();
  if (!trimmed.startsWith('+')) {
    return { dial: DEFAULT_DIAL_CODE, local: trimmed.replace(/\D/g, '') };
  }

  const byLongestDial = [...ALL_COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of byLongestDial) {
    if (trimmed.startsWith(country.dial)) {
      return { dial: country.dial, local: trimmed.slice(country.dial.length) };
    }
  }

  return { dial: DEFAULT_DIAL_CODE, local: trimmed.replace(/^\+/, '') };
}
