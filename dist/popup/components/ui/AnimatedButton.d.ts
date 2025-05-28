import React, { ButtonHTMLAttributes } from 'react';
interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}
export declare const AnimatedButton: React.FC<AnimatedButtonProps>;
export {};
//# sourceMappingURL=AnimatedButton.d.ts.map