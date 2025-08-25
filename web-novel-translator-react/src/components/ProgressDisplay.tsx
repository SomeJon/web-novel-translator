/**
 * Component for displaying translation progress and status
 */

import React from 'react';

export interface ProgressDisplayProps {
    status: string;
    isTranslating: boolean;
    progress: number;
    numChapters: number;
}

export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
    status,
    isTranslating,
    progress,
    numChapters
}) => {
    return (
        <>
            <div id="status" className="status">{status}</div>
            
            {isTranslating && numChapters > 0 && (
                <div className="progress-bar-container">
                    <div 
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                    >
                        {progress > 0 ? `${progress}% translated` : '0% translated'}
                    </div>
                </div>
            )}
        </>
    );
};
