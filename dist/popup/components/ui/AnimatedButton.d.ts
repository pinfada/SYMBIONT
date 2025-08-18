import React, { ButtonHTMLAttributes } from 'react';
interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'quantum' | 'neural';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    glowing?: boolean;
    ripple?: boolean;
    icon?: string;
}
export declare const AnimatedButton: React.FC<AnimatedButtonProps>;
export {};
//# sourceMappingURL=AnimatedButton.d.ts.map