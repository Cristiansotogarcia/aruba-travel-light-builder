/**
 * Generates a random temporary password (OTP)
 * @param length - Length of the password (default: 8)
 * @returns Random password string
 */
export declare const generateTempPassword: (length?: number) => string;
/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export declare const validatePassword: (password: string) => {
    isValid: boolean;
    message: string;
};
