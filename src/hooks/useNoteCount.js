import { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import NotesService from '../services/notes/notesService';

export const useNoteCount = () => {
  const [count, setCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      setCount(NotesService.count());
    }, [])
  );

  return count;
};
