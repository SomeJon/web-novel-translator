/**
 * Component for displaying translated chapters with table of contents and preview
 */

import React from 'react';
import type { TranslatedChapter } from '../storage';

export interface ChaptersDisplayProps {
    chapters: TranslatedChapter[];
    selectedChapter: number | null;
    setSelectedChapter: (chapterNumber: number | null) => void;
    editingChapter: number | null;
    editText: string;
    setEditText: (text: string) => void;
    onEditChapter: (chapterNumber: number) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDeleteChapter: (chapterNumber: number) => void;
}

export const ChaptersDisplay: React.FC<ChaptersDisplayProps> = ({
    chapters,
    selectedChapter,
    setSelectedChapter,
    editingChapter,
    editText,
    setEditText,
    onEditChapter,
    onSaveEdit,
    onCancelEdit,
    onDeleteChapter
}) => {
    if (chapters.length === 0) return null;

    const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    const selectedChapterData = chapters.find(ch => ch.chapterNumber === selectedChapter);

    return (
        <div className="preview-text-container">
            <h2>Translated Chapters</h2>
            
            {/* Table of Contents */}
            <div className="table-of-contents">
                <h3>Table of Contents</h3>
                <div className="chapter-list">
                    {sortedChapters.map(chapter => (
                        <div key={chapter.chapterNumber} className="chapter-item">
                            <div className="chapter-info">
                                <span className="chapter-title">Chapter {chapter.chapterNumber}</span>
                                <span className="chapter-length">
                                    {chapter.translatedText.length.toLocaleString()} characters
                                </span>
                            </div>
                            <div className="chapter-actions">
                                <button 
                                    className="view-button"
                                    onClick={() => setSelectedChapter(chapter.chapterNumber)}
                                >
                                    View
                                </button>
                                <button 
                                    className="delete-button"
                                    onClick={() => onDeleteChapter(chapter.chapterNumber)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Chapter Selector */}
            <div className="chapter-selector">
                <label htmlFor="chapterSelect">Select Chapter to View:</label>
                <select 
                    id="chapterSelect" 
                    value={selectedChapter || ''}
                    onChange={(e) => setSelectedChapter(e.target.value ? parseInt(e.target.value) : null)}
                >
                    <option value="">-- Select a chapter --</option>
                    {sortedChapters.map(chapter => (
                        <option key={chapter.chapterNumber} value={chapter.chapterNumber}>
                            Chapter {chapter.chapterNumber}
                        </option>
                    ))}
                </select>
            </div>
            
            {/* Chapter Content */}
            {selectedChapter && selectedChapterData && (
                <div className="chapter-content">
                    <div className="chapter-header">
                        <h3>Chapter {selectedChapter}</h3>
                        <button 
                            className="edit-button"
                            onClick={() => onEditChapter(selectedChapter)}
                            disabled={editingChapter !== null}
                        >
                            {editingChapter === selectedChapter ? 'Editing...' : 'Edit Chapter'}
                        </button>
                    </div>
                    
                    {editingChapter === selectedChapter ? (
                        <div className="edit-container">
                            <textarea
                                className="edit-textarea"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={20}
                            />
                            <div className="edit-buttons">
                                <button onClick={onSaveEdit} className="save-button">
                                    Save Changes
                                </button>
                                <button onClick={onCancelEdit} className="cancel-button">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <pre className="chapter-text">
                            {selectedChapterData.translatedText}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
};
