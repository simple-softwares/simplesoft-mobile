import api from '../../services/api/httpClient';
import RNFS from 'react-native-fs';
import { authStorage } from '../../services/storage/storageRegistry';

const MIME_ICONS = {
  'application/pdf':   'document-outline',
  'application/msword': 'document-text-outline',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document-text-outline',
  'application/vnd.ms-excel':  'document-outline',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document-outline',
  'application/vnd.ms-powerpoint': 'document-outline',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document-outline',
  'text/plain':   'document-outline',
  'image/jpeg':   'image-outline',
  'image/png':    'image-outline',
  'image/gif':    'image-outline',
  'image/webp':   'image-outline',
  'video/mp4':    'film-outline',
  'video/quicktime': 'film-outline',
  'audio/mpeg':   'musical-note-outline',
  'audio/wav':    'musical-note-outline',
  'application/zip': 'folder-outline',
  'application/x-rar-compressed': 'folder-outline',
};

class FilesService {

  async getDirectories(parentId = null) {
    try {
      const params = parentId ? { parent_id: parentId } : { root: true };
      const { data } = await api.get('/files/directories', { params });
      return data || [];
    } catch { return []; }
  }

  async getFiles(directoryId, { search = '', limit = 80, offset = 0 } = {}) {
    try {
      const { data } = await api.get('/files', {
        params: { directory_id: directoryId, search: search || undefined, limit, offset },
      });
      return data || [];
    } catch { return []; }
  }

  async getRecentFiles({ limit = 60 } = {}) {
    try {
      const { data } = await api.get('/files/recent', { params: { limit } });
      return data || [];
    } catch { return []; }
  }

  async uploadFile(fileUri, fileName, mimeType, directoryId, onProgress) {
    const base64Content = await RNFS.readFile(fileUri, 'base64');
    const { data } = await api.post('/files/upload', {
      name:         fileName,
      mime_type:    mimeType,
      directory_id: directoryId,
      content_b64:  base64Content,
    });
    if (onProgress) onProgress(100);
    return data?.id;
  }

  async downloadFile(fileId, fileName) {
    const localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    const token = authStorage.getString('access_token') || '';
    const base = require('../../config').API_BASE_URL || 'http://10.0.2.2:8000/api';
    await RNFS.downloadFile({
      fromUrl: `${base}/files/${fileId}/download`,
      toFile:  localPath,
      headers: { Authorization: `Bearer ${token}` },
    }).promise;
    return localPath;
  }

  async deleteFile(fileId) {
    await api.delete(`/files/${fileId}`);
    return true;
  }

  getMimeIcon(mimetype) {
    if (!mimetype) return 'document-outline';
    return MIME_ICONS[mimetype] || 'document-outline';
  }

  formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  isPreviewable(mimetype) {
    return mimetype?.startsWith('image/') ||
           mimetype === 'application/pdf' ||
           mimetype?.startsWith('text/');
  }
}

export default new FilesService();
