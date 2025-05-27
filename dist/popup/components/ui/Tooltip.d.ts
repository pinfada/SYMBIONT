import React from 'react';
interface TooltipProps {
    content: string | React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}
export declare const Tooltip: React.FC<TooltipProps>;
export {};
