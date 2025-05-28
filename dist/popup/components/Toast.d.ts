import React from 'react';
interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
    onClose?: () => void;
}
export declare const Toast: React.FC<ToastProps>;
export default Toast;
//# sourceMappingURL=Toast.d.ts.map