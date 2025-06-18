import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string; // e.g., 'text-blue-500'
  message?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'text-primary',
  message,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${color} border-t-transparent`}
        style={{ borderTopColor: 'transparent' }} // Ensure tailwind JIT picks this up or use a custom animation
      ></div>
      {message && <p className={`mt-2 text-sm ${color}`}>{message}</p>}
    </div>
  );
};

export default Spinner;