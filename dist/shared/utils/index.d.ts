export { safeAverage, safeRatio, safeGetClasses, safeGetSelection, safeSplit, safeLength, safeJsonParse, safeGet, safeLimitArray, safeArrayOperation } from './safeOperations';
export { validateVariable, validateLengthProperty, validateSplitOperation, enableErrorValidation, runErrorTests } from './errorValidation';
export { SecureRandom, secureRandom, secureRandomInt, secureRandomFloat } from './secureRandom';
export { SecureLogger, LogLevel, logger, secureLog, secureWarn, secureError, secureDebug } from './secureLogger';
export { generateUUID, generateSecureUUID, isCryptoUUIDAvailable } from './uuid';
export type SafeOperationConfig = {
    isDevelopment?: boolean;
    enableLogging?: boolean;
    maxArraySize?: number;
};
export declare const DEFAULT_SAFE_CONFIG: SafeOperationConfig;
export declare function initializeSafeOperations(config?: SafeOperationConfig): void;
export * as SafeOps from './safeOperations';
export * as ErrorValidation from './errorValidation';
//# sourceMappingURL=index.d.ts.map