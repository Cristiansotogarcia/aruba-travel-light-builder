import React from 'react';
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
declare const LoadingState: React.FC<LoadingStateProps>;
export default LoadingState;
