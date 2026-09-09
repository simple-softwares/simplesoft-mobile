import NotesService from '../services/notes/notesService';

export const getLocalNoteCount = () => NotesService.count();
