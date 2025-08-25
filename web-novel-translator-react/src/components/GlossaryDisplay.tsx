/**
 * Component for displaying and editing character glossary
 */

import React, { useState } from 'react';
import type { Glossary, GlossaryCollection, Character } from '../types/glossary';

export interface GlossaryDisplayProps {
    glossary: Glossary | null; // Legacy support
    glossaryCollection: GlossaryCollection | null; // New segmented glossary
    onGenerateGlossary: () => void;
    onDeleteGlossary: () => void;
    onUpdateCharacter: (characterId: string, updates: Partial<Character>) => void;
    onAddCharacter: (character: Omit<Character, 'id' | 'lastModified'>) => void;
    onDeleteCharacter: (characterId: string) => void;
    onUpdateLastProcessedChapter: (chapter: number) => void;
    isGenerating: boolean;
    glossaryStartChapter: number;
    glossaryNumChapters: number;
    onGlossaryStartChapterChange: (chapter: number) => void;
    onGlossaryNumChaptersChange: (chapters: number) => void;
}

export const GlossaryDisplay: React.FC<GlossaryDisplayProps> = ({
    glossary,
    glossaryCollection,
    onGenerateGlossary,
    onDeleteGlossary,
    onUpdateCharacter,
    onAddCharacter,
    onDeleteCharacter,
    onUpdateLastProcessedChapter,
    isGenerating,
    glossaryStartChapter,
    glossaryNumChapters,
    onGlossaryStartChapterChange,
    onGlossaryNumChaptersChange
}) => {
    // Use new segmented glossary if available, otherwise fall back to legacy
    const displayCollection = glossaryCollection;
    const displayGlossary = glossary;
    const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Character>>({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState<Omit<Character, 'id' | 'lastModified'>>({
        japaneseName: '',
        englishName: '',
        age: '',
        gender: '',
        height: '',
        physicalAppearance: '',
        description: '',
        importance: 'minor',
        occurrenceCount: 1
    });

    const handleEditStart = (character: Character) => {
        setEditingCharacter(character.id);
        setEditForm(character);
    };

    const handleEditSave = () => {
        if (editingCharacter && editForm) {
            onUpdateCharacter(editingCharacter, editForm);
            setEditingCharacter(null);
            setEditForm({});
        }
    };

    const handleEditCancel = () => {
        setEditingCharacter(null);
        setEditForm({});
    };

    const handleDeleteCharacter = (characterId: string) => {
        if (window.confirm('Are you sure you want to delete this character?')) {
            onDeleteCharacter(characterId);
            if (editingCharacter === characterId) {
                setEditingCharacter(null);
                setEditForm({});
            }
        }
    };

    const handleAddSubmit = () => {
        if (addForm.japaneseName || addForm.englishName) {
            onAddCharacter({
                ...addForm,
                englishName: addForm.englishName || addForm.japaneseName,
                occurrenceCount: 1
            });
            setAddForm({
                japaneseName: '',
                englishName: '',
                age: '',
                physicalAppearance: '',
                description: '',
                importance: 'minor',
                occurrenceCount: 1
            });
            setShowAddForm(false);
        }
    };

    const getImportanceColor = (importance: string) => {
        switch (importance) {
            case 'major': return '#dc3545';
            case 'minor': return '#ffc107';
            case 'background': return '#6c757d';
            default: return '#6c757d';
        }
    };

    const getImportanceLabel = (importance: string) => {
        switch (importance) {
            case 'major': return 'Major Character';
            case 'minor': return 'Minor Character';
            case 'background': return 'Background Character';
            default: return 'Unknown';
        }
    };

    return (
        <div className="glossary-container">
            <div className="glossary-header">
                <h2>Character Glossary</h2>
            </div>

            <div className="glossary-range-controls" style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#495057' }}>📖 Glossary Analysis Range</h4>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label htmlFor="glossaryStartChapter" style={{ fontWeight: '500', color: '#495057' }}>Start Chapter:</label>
                        <input
                            id="glossaryStartChapter"
                            type="number"
                            min="1"
                            value={glossaryStartChapter}
                            onChange={(e) => onGlossaryStartChapterChange(parseInt(e.target.value) || 1)}
                            style={{
                                width: '80px',
                                padding: '0.5rem',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label htmlFor="glossaryNumChapters" style={{ fontWeight: '500', color: '#495057' }}>Number of Chapters:</label>
                        <input
                            id="glossaryNumChapters"
                            type="number"
                            min="1"
                            value={glossaryNumChapters}
                            onChange={(e) => onGlossaryNumChaptersChange(parseInt(e.target.value) || 1)}
                            style={{
                                width: '80px',
                                padding: '0.5rem',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#6c757d', fontStyle: 'italic' }}>
                        Will analyze chapters {glossaryStartChapter}-{glossaryStartChapter + glossaryNumChapters - 1} ({Math.ceil(glossaryNumChapters / 10)} segments)
                    </div>
                </div>
            </div>

            <div className="glossary-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button 
                    onClick={onGenerateGlossary}
                    disabled={isGenerating}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.1em',
                        background: isGenerating ? '#6c757d' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {isGenerating ? '🔄 Generating...' : '📚 Generate Glossary'}
                </button>
                
                {(displayCollection || displayGlossary) && (
                    <button
                        onClick={onDeleteGlossary}
                        disabled={isGenerating}
                        style={{
                            padding: '12px 24px',
                            fontSize: '1.1em',
                            background: isGenerating ? '#6c757d' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        🗑️ Delete Glossary
                    </button>
                )}
            </div>

            {!displayCollection && !displayGlossary && (
                <div className="no-glossary">
                    <p><strong>📚 Recommended Workflow:</strong></p>
                    <ol style={{textAlign: 'left', margin: '1rem 0', color: '#555'}}>
                        <li>Enter your series URL and chapter range above</li>
                        <li>Click "📚 Generate Glossary" to analyze original Japanese chapters</li>
                        <li>Review and edit character names as needed</li>
                        <li>Start translation - characters will be consistent across all chapters!</li>
                    </ol>
                    <div style={{background: '#d1ecf1', border: '1px solid #b8daff', borderRadius: '6px', padding: '1rem', margin: '1rem 0', fontSize: '0.9rem'}}>
                        <p style={{margin: 0, color: '#0c5460'}}><strong>📈 Progressive Segments:</strong> The glossary generator creates segments every 10 chapters, tracking character development over time. Characters age, relationships change, and new ones are introduced naturally!</p>
                    </div>
                    <p>Generate a character glossary from the original Japanese chapters to ensure consistent character names throughout your translation.</p>
                </div>
            )}

            {displayCollection ? (
                <div className="glossary-content">
                    <div className="glossary-info">
                        <p><strong>Series:</strong> {displayCollection.seriesName}</p>
                        <p><strong>Total Range:</strong> {displayCollection.totalChapterRange.start}-{displayCollection.totalChapterRange.end}</p>
                        <p><strong>Segments:</strong> {displayCollection.segments.length} (10 chapters each)</p>
                        <p><strong>Created:</strong> {new Date(displayCollection.createdAt).toLocaleString()}</p>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0'}}>
                            <strong>Last Processed Chapter:</strong>
                            <input
                                type="number"
                                min="1"
                                value={displayCollection.lastProcessedChapter}
                                onChange={(e) => onUpdateLastProcessedChapter(parseInt(e.target.value) || displayCollection.lastProcessedChapter)}
                                style={{width: '80px', padding: '0.25rem', border: '1px solid #ddd', borderRadius: '4px'}}
                            />
                            <span style={{fontSize: '0.85rem', color: '#666'}}>
                                (Continue from chapter {displayCollection.lastProcessedChapter + 1})
                            </span>
                        </div>
                    </div>

                    {/* Display all segments */}
                    {displayCollection.segments.map((segment) => (
                        <div key={segment.id} className="glossary-segment" style={{marginBottom: '2rem', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem'}}>
                            <div className="segment-header" style={{borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
                                <h3 style={{margin: 0, color: '#555'}}>
                                    📖 Segment {segment.segmentNumber}: Chapters {segment.chapterRange.start}-{segment.chapterRange.end}
                                </h3>
                                <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#777'}}>
                                    {segment.characters.length} characters • Generated {new Date(segment.generatedAt).toLocaleString()}
                                </p>
                            </div>

                            <div className="characters-list">
                                {segment.characters
                                    .sort((a, b) => {
                                        const importanceOrder = { major: 0, minor: 1, background: 2 };
                                        const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
                                        if (importanceDiff !== 0) return importanceDiff;
                                        const occurrenceDiff = b.occurrenceCount - a.occurrenceCount;
                                        if (occurrenceDiff !== 0) return occurrenceDiff;
                                        return a.englishName.localeCompare(b.englishName);
                                    })
                                    .map(character => (
                                        <div key={character.id} className="character-item" style={{marginBottom: '0.75rem', padding: '0.75rem', background: '#f9f9f9', borderRadius: '6px'}}>
                                            {editingCharacter === character.id ? (
                                                // Edit mode
                                                <div className="character-form edit-character-form">
                                                    <div className="form-row">
                                                        <input
                                                            type="text"
                                                            placeholder="Japanese Name"
                                                            value={editForm.japaneseName || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, japaneseName: e.target.value })}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="English Name"
                                                            value={editForm.englishName || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, englishName: e.target.value })}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Age (optional)"
                                                            value={editForm.age || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Gender (optional)"
                                                            value={editForm.gender || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Height (optional)"
                                                            value={editForm.height || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                                                        />
                                                        <select
                                                            value={editForm.importance || 'minor'}
                                                            onChange={(e) => setEditForm({ ...editForm, importance: e.target.value as 'major' | 'minor' | 'background' })}
                                                        >
                                                            <option value="major">Major</option>
                                                            <option value="minor">Minor</option>
                                                            <option value="background">Background</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            placeholder="Occurrences"
                                                            min="1"
                                                            value={editForm.occurrenceCount || 1}
                                                            onChange={(e) => setEditForm({ ...editForm, occurrenceCount: parseInt(e.target.value) || 1 })}
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Physical Appearance (optional)"
                                                        value={editForm.physicalAppearance || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, physicalAppearance: e.target.value })}
                                                    />
                                                    <textarea
                                                        placeholder="Character Description"
                                                        value={editForm.description || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                        rows={2}
                                                    />
                                                    <div className="form-buttons">
                                                        <button onClick={handleEditSave} className="save-button">Save</button>
                                                        <button onClick={handleEditCancel} className="cancel-button">Cancel</button>
                                                        <button onClick={() => handleDeleteCharacter(character.id)} className="delete-button">Delete</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Display mode
                                                <div className="character-display">
                                                    <div className="character-header">
                                                        <div className="character-names">
                                                            <h5 style={{margin: '0 0 0.25rem 0', fontSize: '1rem'}}>{character.englishName}</h5>
                                                            {character.japaneseName !== character.englishName && (
                                                                <span className="japanese-name" style={{fontSize: '0.8rem', color: '#666'}}>({character.japaneseName})</span>
                                                            )}
                                                            <div className="character-details" style={{fontSize: '0.75rem', color: '#888', marginTop: '0.25rem'}}>
                                                                {character.age && <span>Age: {character.age}</span>}
                                                                {character.age && character.gender && <span> • </span>}
                                                                {character.gender && <span>Gender: {character.gender}</span>}
                                                                {(character.gender || character.age) && character.height && <span> • </span>}
                                                                {character.height && <span>Height: {character.height}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="character-meta">
                                                            <span 
                                                                className="importance-badge"
                                                                style={{ 
                                                                    backgroundColor: character.importance === 'major' ? '#dc3545' : 
                                                                                     character.importance === 'minor' ? '#ffc107' : '#6c757d',
                                                                    color: 'white',
                                                                    padding: '0.2rem 0.4rem',
                                                                    borderRadius: '8px',
                                                                    fontSize: '0.7rem',
                                                                    textTransform: 'uppercase'
                                                                }}
                                                            >
                                                                {character.importance}
                                                            </span>
                                                            <span className="occurrence-badge" style={{
                                                                background: '#17a2b8',
                                                                color: 'white',
                                                                padding: '0.2rem 0.4rem',
                                                                borderRadius: '8px',
                                                                fontSize: '0.7rem'
                                                            }}>×{character.occurrenceCount}</span>
                                                            <button
                                                                onClick={() => handleEditStart(character)}
                                                                style={{
                                                                    background: '#28a745',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.7rem',
                                                                    cursor: 'pointer',
                                                                    marginLeft: '0.5rem'
                                                                }}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="character-description" style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', lineHeight: 1.4}}>{character.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : displayGlossary ? (
                <div className="glossary-content">
                    <div className="glossary-info">
                        <p><strong>Series:</strong> {displayGlossary.seriesName}</p>
                        <p><strong>Chapter Range:</strong> {displayGlossary.chapterRange.start}-{displayGlossary.chapterRange.end}</p>
                        <p><strong>Characters:</strong> {displayGlossary.characters.length}</p>
                        <p><strong>Generated:</strong> {new Date(displayGlossary.generatedAt).toLocaleString()}</p>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0'}}>
                            <strong>Last Processed Chapter:</strong>
                            <input
                                type="number"
                                min="1"
                                value={displayGlossary.lastProcessedChapter}
                                onChange={(e) => onUpdateLastProcessedChapter(parseInt(e.target.value) || displayGlossary.lastProcessedChapter)}
                                style={{width: '80px', padding: '0.25rem', border: '1px solid #ddd', borderRadius: '4px'}}
                            />
                            <span style={{fontSize: '0.85rem', color: '#666'}}>
                                (Continue from chapter {displayGlossary.lastProcessedChapter + 1})
                            </span>
                        </div>
                    </div>

                    <div className="characters-section">
                        <div className="characters-header">
                            <h3>Characters ({glossary.characters.length})</h3>
                            <button 
                                className="add-character-button"
                                onClick={() => setShowAddForm(true)}
                            >
                                ➕ Add Character
                            </button>
                        </div>

                        {showAddForm && (
                            <div className="character-form add-character-form">
                                <h4>Add New Character</h4>
                                <div className="form-row">
                                    <input
                                        type="text"
                                        placeholder="Japanese Name"
                                        value={addForm.japaneseName}
                                        onChange={(e) => setAddForm({ ...addForm, japaneseName: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="English Name"
                                        value={addForm.englishName}
                                        onChange={(e) => setAddForm({ ...addForm, englishName: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Age (optional)"
                                        value={addForm.age || ''}
                                        onChange={(e) => setAddForm({ ...addForm, age: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Gender (optional)"
                                        value={addForm.gender || ''}
                                        onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Height (optional)"
                                        value={addForm.height || ''}
                                        onChange={(e) => setAddForm({ ...addForm, height: e.target.value })}
                                    />
                                    <select
                                        value={addForm.importance}
                                        onChange={(e) => setAddForm({ ...addForm, importance: e.target.value as 'major' | 'minor' | 'background' })}
                                    >
                                        <option value="major">Major</option>
                                        <option value="minor">Minor</option>
                                        <option value="background">Background</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Occurrences"
                                        min="1"
                                        value={addForm.occurrenceCount}
                                        onChange={(e) => setAddForm({ ...addForm, occurrenceCount: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Physical Appearance (optional)"
                                    value={addForm.physicalAppearance || ''}
                                    onChange={(e) => setAddForm({ ...addForm, physicalAppearance: e.target.value })}
                                />
                                <textarea
                                    placeholder="Character Description"
                                    value={addForm.description}
                                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                    rows={2}
                                />
                                <div className="form-buttons">
                                    <button onClick={handleAddSubmit} className="save-button">Add Character</button>
                                    <button onClick={() => setShowAddForm(false)} className="cancel-button">Cancel</button>
                                </div>
                            </div>
                        )}

                        <div className="characters-list">
                            {displayGlossary.characters
                                .sort((a, b) => {
                                    const importanceOrder = { major: 0, minor: 1, background: 2 };
                                    const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
                                    if (importanceDiff !== 0) return importanceDiff;
                                    // Sort by occurrence count descending, then by name
                                    const occurrenceDiff = b.occurrenceCount - a.occurrenceCount;
                                    if (occurrenceDiff !== 0) return occurrenceDiff;
                                    return a.englishName.localeCompare(b.englishName);
                                })
                                .map(character => (
                                    <div key={character.id} className="character-item">
                                        {editingCharacter === character.id ? (
                                            <div className="character-form">
                                                <div className="form-row">
                                                    <input
                                                        type="text"
                                                        placeholder="Japanese Name"
                                                        value={editForm.japaneseName || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, japaneseName: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="English Name"
                                                        value={editForm.englishName || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, englishName: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Age (optional)"
                                                        value={editForm.age || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                                                    />
                                                    <select
                                                        value={editForm.importance || 'minor'}
                                                        onChange={(e) => setEditForm({ ...editForm, importance: e.target.value as 'major' | 'minor' | 'background' })}
                                                    >
                                                        <option value="major">Major</option>
                                                        <option value="minor">Minor</option>
                                                        <option value="background">Background</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        placeholder="Occurrences"
                                                        min="1"
                                                        value={editForm.occurrenceCount || 1}
                                                        onChange={(e) => setEditForm({ ...editForm, occurrenceCount: parseInt(e.target.value) || 1 })}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Physical Appearance (optional)"
                                                    value={editForm.physicalAppearance || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, physicalAppearance: e.target.value })}
                                                />
                                                <textarea
                                                    placeholder="Character Description"
                                                    value={editForm.description || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                    rows={2}
                                                />
                                                <div className="form-buttons">
                                                    <button onClick={handleEditSave} className="save-button">Save</button>
                                                    <button onClick={handleEditCancel} className="cancel-button">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="character-display">
                                                <div className="character-header">
                                                    <div className="character-names">
                                                        <h4>{character.englishName}</h4>
                                                        {character.japaneseName !== character.englishName && (
                                                            <span className="japanese-name">({character.japaneseName})</span>
                                                        )}
                                                    </div>
                                                    <div className="character-meta">
                                                        <span 
                                                            className="importance-badge"
                                                            style={{ backgroundColor: getImportanceColor(character.importance) }}
                                                        >
                                                            {getImportanceLabel(character.importance)}
                                                        </span>
                                                        {character.age && (
                                                            <span className="age-badge">Age: {character.age}</span>
                                                        )}
                                                        <span className="occurrence-badge">×{character.occurrenceCount}</span>
                                                    </div>
                                                </div>
                                                
                                                {character.physicalAppearance && (
                                                    <p className="physical-appearance">
                                                        <strong>Appearance:</strong> {character.physicalAppearance}
                                                    </p>
                                                )}
                                                
                                                <p className="character-description">{character.description}</p>
                                                
                                                <div className="character-actions">
                                                    <button 
                                                        onClick={() => handleEditStart(character)}
                                                        className="edit-character-button"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteCharacter(character.id)}
                                                        className="delete-character-button"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
