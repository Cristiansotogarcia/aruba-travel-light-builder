import React from 'react';
import Spinner from './Spinner';

interface LoadingStateProps {
  /**
   * Whether the content is currently loading
   */
  isLoading: boolean;
  
  /**
   * Content to display when not loading
   */
  children: React.ReactNode;
  
  /**
   * Optional loading message to display
   */
  message?: string;
  
  /**
   * Size of the spinner
   */
  spinnerSize?: 'sm' | 'md' | 'lg';
  
  /**
   * Optional className for the container
   */
  className?: string;
  
  /**
   * Optional minimum height for the loading container
   */
  minHeight?: string;
  
  /**
   * Whether to overlay the spinner on top of the content
   */
  overlay?: boolean;
}

/**
 * A standardized component for handling loading states throughout the application.
 * Can be used as a wrapper around any content that might be in a loading state.
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  message = 'Loading...',
  spinnerSize = 'md',
  className = '',
  minHeight = '200px',
  overlay = false,
}) => {
  if (isLoading && !overlay) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ minHeight }}
      >
        <Spinner size={spinnerSize} message={message} />
      </div>
    );
  }
  
  if (isLoading && overlay) {
    return (
      <div className="relative">
        <div className="opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Spinner size={spinnerSize} message={message} />
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default LoadingState;