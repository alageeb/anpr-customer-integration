const ARABIC_NUMERAL_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export interface KuwaitPlate {
  plateNumber: string;
  platePrefix: string;
  plateSerial: string;
  normalizedPlate: string;
}

export function convertArabicNumerals(input: string): string {
  let result = input;
  for (const [arabic, english] of Object.entries(ARABIC_NUMERAL_MAP)) {
    result = result.split(arabic).join(english);
  }
  return result;
}

export function parsePlate(rawInput: string | null | undefined): KuwaitPlate | null {
  if (!rawInput || typeof rawInput !== 'string') {
    return null;
  }

  // Step 1: Convert Arabic numerals to English
  let input = convertArabicNumerals(rawInput);

  // Step 2: Check for letters - reject if any
  if (/[a-zA-Z]/.test(input)) {
    return null;
  }

  // Step 3: Try dash or slash separator with optional surrounding spaces
  // e.g., "40-00000", "40 / 00000", " 40-00000 ", "40- 00000"
  const dashMatch = input.match(/^\s*(\d+)\s*[-\/]\s*(\d+)\s*$/);
  if (dashMatch) {
    return buildPlate(dashMatch[1], dashMatch[2]);
  }

  // Step 4: Try space-only separator (e.g., "40 00000")
  const spaceMatch = input.match(/^\s*(\d+)\s+(\d+)\s*$/);
  if (spaceMatch) {
    return buildPlate(spaceMatch[1], spaceMatch[2]);
  }

  // Step 5: Try no-separator (e.g., "466759", "2564831", "4000000")
  // Kuwait plates: prefix 1-3 digits, serial exactly 5 digits
  // Total digits: 6 (1+5), 7 (2+5), or 8 (3+5)
  const digitsOnly = input.replace(/\s/g, '');
  if (/^\d{6,8}$/.test(digitsOnly)) {
    const serialLength = 5;
    const prefix = digitsOnly.slice(0, digitsOnly.length - serialLength);
    const serial = digitsOnly.slice(digitsOnly.length - serialLength);
    return buildPlate(prefix, serial);
  }

  // Step 6: No valid format found
  return null;
}

function buildPlate(prefix: string, serial: string): KuwaitPlate | null {
  // Validate: prefix 1-3 digits, serial exactly 5 digits
  if (prefix.length < 1 || prefix.length > 3 || serial.length !== 5) {
    return null;
  }

  return {
    plateNumber: `${prefix}-${serial}`,
    platePrefix: prefix,
    plateSerial: serial,
    normalizedPlate: `${prefix}${serial}`,
  };
}

export function normalizePlate(rawInput: string | null | undefined): string {
  const result = parsePlate(rawInput);
  return result ? result.normalizedPlate : '';
}

export function validatePlateFormat(plate: string): boolean {
  if (!plate || plate.length === 0) {
    return false;
  }
  return /^\d{1,3}-\d{5}$/.test(plate);
}
