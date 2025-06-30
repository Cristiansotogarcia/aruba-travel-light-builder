import React from 'react';
interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    message?: string;
    className?: string;
}
declare const Spinner: React.FC<SpinnerProps>;
export default Spinner;
