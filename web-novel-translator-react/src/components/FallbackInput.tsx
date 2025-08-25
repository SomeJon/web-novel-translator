/**
 * Fallback input component for manual text entry when translation fails
 */

import React from 'react';

export interface FallbackInputProps {
    show: boolean;
    chapterNumber: number;
    text: string;
    setText: (value: string) => void;
    type: 'japanese' | 'english';
    setType: (value: 'japanese' | 'english') => void;
    onSubmit: () => void;
    onCancel: () => void;
}

export const FallbackInput: React.FC<FallbackInputProps> = ({
    show,
    chapterNumber,
    text,
    setText,
    type,
    setType,
    onSubmit,
    onCancel
}) => {
    if (!show) return null;

    const handleTryAgain = () => {
        setType('japanese');
        setText('');
    };

    return (
        <div className="fallback-input-container">
            <h3>Manual Text Input for Chapter {chapterNumber}</h3>
            <p>Translation failed for this chapter. Please provide the text below:</p>
            
            <div className="fallback-type-selector">
                <label>
                    <input
                        type="radio"
                        value="japanese"
                        checked={type === 'japanese'}
                        onChange={(e) => setType(e.target.value as 'japanese' | 'english')}
                    />
                    Japanese text (will be translated)
                </label>
                <label>
                    <input
                        type="radio"
                        value="english"
                        checked={type === 'english'}
                        onChange={(e) => setType(e.target.value as 'japanese' | 'english')}
                    />
                    English text (already translated)
                </label>
            </div>
            
            <textarea
                className="fallback-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={type === 'japanese' ? "Paste Japanese text here..." : "Paste English translation here..."}
                rows={10}
            />
            
            <div className="fallback-buttons">
                <button onClick={onSubmit} disabled={!text.trim()}>
                    {type === 'japanese' ? 'Translate Text' : 'Add Text'}
                </button>
                {type === 'english' && text.trim() && (
                    <button 
                        onClick={handleTryAgain} 
                        className="retry-button"
                    >
                        Try Again (Translate from Japanese)
                    </button>
                )}
                <button onClick={onCancel} className="cancel-button">
                    Cancel
                </button>
            </div>
        </div>
    );
};
