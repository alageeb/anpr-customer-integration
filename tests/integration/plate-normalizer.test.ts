import { parsePlate, normalizePlate, validatePlateFormat } from '../../src/integration/utils/plate-normalizer';

describe('Plate Normalizer - Kuwait Plates', () => {
  describe('parsePlate', () => {
    describe('valid Kuwait plates - with separator', () => {
      it('should parse "40-00000"', () => {
        const result = parsePlate('40-00000');
        expect(result).toEqual({
          plateNumber: '40-00000',
          platePrefix: '40',
          plateSerial: '00000',
          normalizedPlate: '4000000',
        });
      });

      it('should parse "40 00000" (space separator)', () => {
        const result = parsePlate('40 00000');
        expect(result).toEqual({
          plateNumber: '40-00000',
          platePrefix: '40',
          plateSerial: '00000',
          normalizedPlate: '4000000',
        });
      });

      it('should parse "40 / 00000" (slash separator)', () => {
        const result = parsePlate('40 / 00000');
        expect(result).toEqual({
          plateNumber: '40-00000',
          platePrefix: '40',
          plateSerial: '00000',
          normalizedPlate: '4000000',
        });
      });

      it('should parse "٤٠-٠٠٠٠٠" (Arabic numerals)', () => {
        const result = parsePlate('٤٠-٠٠٠٠٠');
        expect(result).toEqual({
          plateNumber: '40-00000',
          platePrefix: '40',
          plateSerial: '00000',
          normalizedPlate: '4000000',
        });
      });

      it('should parse "25-64831"', () => {
        const result = parsePlate('25-64831');
        expect(result).toEqual({
          plateNumber: '25-64831',
          platePrefix: '25',
          plateSerial: '64831',
          normalizedPlate: '2564831',
        });
      });

      it('should parse "4-66759"', () => {
        const result = parsePlate('4-66759');
        expect(result).toEqual({
          plateNumber: '4-66759',
          platePrefix: '4',
          plateSerial: '66759',
          normalizedPlate: '466759',
        });
      });

      it('should parse with leading spaces', () => {
        const result = parsePlate(' 40-00000');
        expect(result).toEqual({
          plateNumber: '40-00000',
          platePrefix: '40',
          plateSerial: '00000',
          normalizedPlate: '4000000',
        });
      });

      it('should parse with trailing spaces', () => {
        const result = parsePlate('40-00000 ');
        expect(result).toEqual({
          plateNumber: '40-00000',
          platePrefix: '40',
          plateSerial: '00000',
          normalizedPlate: '4000000',
        });
      });

      it('should parse mixed Arabic and English numerals', () => {
        const result = parsePlate('٢٥-٦٤٨٣١');
        expect(result).toEqual({
          plateNumber: '25-64831',
          platePrefix: '25',
          plateSerial: '64831',
          normalizedPlate: '2564831',
        });
      });

      it('should preserve leading zeros in serial', () => {
        const result = parsePlate('1-00001');
        expect(result).toEqual({
          plateNumber: '1-00001',
          platePrefix: '1',
          plateSerial: '00001',
          normalizedPlate: '100001',
        });
      });
    });

    describe('valid Kuwait plates - no separator (ANPR multi-line read)', () => {
      it('should parse "466759" (single digit prefix + 5 digit serial)', () => {
        const result = parsePlate('466759');
        expect(result).toEqual({
          plateNumber: '4-66759',
          platePrefix: '4',
          plateSerial: '66759',
          normalizedPlate: '466759',
        });
      });

      it('should parse "2564831" (two digit prefix + 5 digit serial)', () => {
        const result = parsePlate('2564831');
        expect(result).toEqual({
          plateNumber: '25-64831',
          platePrefix: '25',
          plateSerial: '64831',
          normalizedPlate: '2564831',
        });
      });

      it('should parse "4000000" (two digit prefix + 5 zeros)', () => {
        const result = parsePlate('4000000');
        expect(result).toEqual({
          plateNumber: '40-00000',
          platePrefix: '40',
          plateSerial: '00000',
          normalizedPlate: '4000000',
        });
      });

      it('should parse "12366759" (three digit prefix + 5 digit serial)', () => {
        const result = parsePlate('12366759');
        expect(result).toEqual({
          plateNumber: '123-66759',
          platePrefix: '123',
          plateSerial: '66759',
          normalizedPlate: '12366759',
        });
      });

      it('should parse no-separator with Arabic numerals', () => {
        const result = parsePlate('٤٦٦٧٥٩');
        expect(result).toEqual({
          plateNumber: '4-66759',
          platePrefix: '4',
          plateSerial: '66759',
          normalizedPlate: '466759',
        });
      });
    });

    describe('invalid plates', () => {
      it('should reject empty string', () => {
        expect(parsePlate('')).toBeNull();
      });

      it('should reject null', () => {
        expect(parsePlate(null)).toBeNull();
      });

      it('should reject undefined', () => {
        expect(parsePlate(undefined)).toBeNull();
      });

      it('should reject plate with letters', () => {
        expect(parsePlate('AB-12345')).toBeNull();
      });

      it('should reject plate with mixed letters and numbers', () => {
        expect(parsePlate('A4-12345')).toBeNull();
      });

      it('should reject plate without separator and wrong total digits', () => {
        expect(parsePlate('40000')).toBeNull(); // 5 digits - too few
        expect(parsePlate('400000000')).toBeNull(); // 9 digits - too many
      });

      it('should reject plate with serial less than 5 digits after split', () => {
        expect(parsePlate('40-12')).toBeNull();
      });

      it('should reject plate with only prefix and separator', () => {
        expect(parsePlate('40-')).toBeNull();
      });

      it('should reject plate with special characters', () => {
        expect(parsePlate('40@12345')).toBeNull();
      });

      it('should reject plate with multiple dashes', () => {
        expect(parsePlate('4-0-12345')).toBeNull();
      });

      it('should reject 5 digits (no prefix)', () => {
        expect(parsePlate('66759')).toBeNull();
      });

      it('should reject 9 digits (too many)', () => {
        expect(parsePlate('123466759')).toBeNull();
      });
    });
  });

  describe('normalizePlate', () => {
    it('should return normalized form for valid plate', () => {
      expect(normalizePlate('40-00000')).toBe('4000000');
    });

    it('should return normalized form for Arabic input', () => {
      expect(normalizePlate('٤٠-٠٠٠٠٠')).toBe('4000000');
    });

    it('should return normalized form for no-separator input', () => {
      expect(normalizePlate('466759')).toBe('466759');
    });

    it('should return empty for invalid input', () => {
      expect(normalizePlate('')).toBe('');
      expect(normalizePlate(null)).toBe('');
      expect(normalizePlate(undefined)).toBe('');
      expect(normalizePlate('ABC-123')).toBe('');
    });
  });

  describe('validatePlateFormat', () => {
    it('should return true for valid plate number format', () => {
      expect(validatePlateFormat('40-00000')).toBe(true);
      expect(validatePlateFormat('25-64831')).toBe(true);
      expect(validatePlateFormat('4-66759')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(validatePlateFormat('')).toBe(false);
    });

    it('should return false for missing separator', () => {
      expect(validatePlateFormat('4000000')).toBe(false);
    });

    it('should return false for serial not exactly 5 digits', () => {
      expect(validatePlateFormat('40-12')).toBe(false);
      expect(validatePlateFormat('40-1234')).toBe(false);
      expect(validatePlateFormat('40-123456')).toBe(false);
    });

    it('should return false for letters', () => {
      expect(validatePlateFormat('AB-12345')).toBe(false);
    });
  });
});
