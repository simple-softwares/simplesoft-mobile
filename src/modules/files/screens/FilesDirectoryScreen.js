import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, ActionSheetIOS,
  Platform, Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import FilesService from '../filesService';
import { useTheme } from '../../../theme/ThemeContext';
import { SkeletonList } from '../../../components/common/SkeletonLoader';

const DirectoryRow = ({ directory, onPress, colors }) => {
  return (
    <TouchableOpacity
      style={[styles.directoryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.folderIcon, { backgroundColor: colors.primary + '15' }]}>
        <Icon name="folder-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.directoryName, { color: colors.text }]} numberOfLines={1}>
          {directory.name}
        </Text>
        <Text style={[styles.dirInfo, { color: colors.textSecondary }]}>
          {directory.count_files || 0} files · {directory.count_directories || 0} folders
        </Text>
      </View>
      <Icon name="chevron-forward" size={20} color={colors.textLight} />
    </TouchableOpacity>
  );
};

const FileRow = ({ file, onPress, onDownload, colors }) => {
  const icon = FilesService.getMimeIcon(file.mimetype);
  const size = FilesService.formatSize(file.size);

  return (
    <TouchableOpacity
      style={[styles.fileRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.fileIcon, { backgroundColor: colors.primary + '15' }]}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
          {size} · {new Date(file.write_date).toLocaleDateString('en-IN')}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDownload(file)}>
        <Icon name="download-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const BreadcrumbItem = ({ name, onPress, isLast, colors }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={onPress} disabled={isLast}>
        <Text
          style={[
            styles.breadcrumbText,
            {
              color: isLast ? colors.textSecondary : colors.primary,
              fontWeight: isLast ? '500' : '600',
            },
          ]}
        >
          {name}
        </Text>
      </TouchableOpacity>
      {!isLast && <Text style={[styles.breadcrumbSeparator, { color: colors.textLight }]}> / </Text>}
    </View>
  );
};

const FilesDirectoryScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([{ id: null, name: 'Files' }]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const currentDirectoryId = breadcrumb[breadcrumb.length - 1]?.id;

  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [currentDirectoryId])
  );

  const loadContent = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const dirs = await FilesService.getDirectories(currentDirectoryId);
      const fileList = currentDirectoryId
        ? await FilesService.getFiles(currentDirectoryId)
        : await FilesService.getRecentFiles();

      setDirectories(dirs);
      setFiles(fileList);
    } catch (e) {
      Alert.alert('Error', 'Failed to load content');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDirectoryPress = (directory) => {
    setBreadcrumb([...breadcrumb, { id: directory.id, name: directory.name }]);
  };

  const handleBreadcrumbPress = (index) => {
    setBreadcrumb(breadcrumb.slice(0, index + 1));
  };

  const handleSearch = (text) => {
    setSearch(text);
    // Could implement client-side filtering here
  };

  const handlePickFile = async () => {
    try {
      const picked = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });

      if (!currentDirectoryId) {
        Alert.alert('Error', 'Please navigate to a folder to upload');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      await FilesService.uploadFile(
        picked.uri,
        picked.name,
        picked.type,
        currentDirectoryId,
        (progress) => setUploadProgress(progress)
      );

      Alert.alert('Success', 'File uploaded');
      await loadContent(false);
    } catch (e) {
      if (e.code !== 'DOCUMENT_PICKER_CANCELLED') {
        Alert.alert('Error', 'Failed to upload file');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });

      if (!result.assets || result.assets.length === 0) return;
      const photo = result.assets[0];

      if (!currentDirectoryId) {
        Alert.alert('Error', 'Please navigate to a folder to upload');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      await FilesService.uploadFile(
        photo.uri,
        photo.filename || 'photo.jpg',
        photo.type,
        currentDirectoryId,
        (progress) => setUploadProgress(progress)
      );

      Alert.alert('Success', 'Photo uploaded');
      await loadContent(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUploadPress = () => {
    if (!currentDirectoryId) {
      Alert.alert('Info', 'Please navigate to a folder to upload files');
      return;
    }

    const options = ['Cancel', 'Choose File', 'Choose Photo'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0, userInterfaceStyle: 'dark' },
        (idx) => {
          if (idx === 1) handlePickFile();
          if (idx === 2) handlePickPhoto();
        }
      );
    } else {
      Alert.alert('Upload', 'Choose upload method', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose File', onPress: handlePickFile },
        { text: 'Choose Photo', onPress: handlePickPhoto },
      ]);
    }
  };

  const handleDownload = async (file) => {
    try {
      const localPath = await FilesService.downloadFile(file.id, file.name);
      Alert.alert('Success', 'File saved', [
        {
          text: 'Share',
          onPress: () => Share.share({ url: 'file://' + localPath, title: file.name }),
        },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to download file');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Breadcrumb */}
      <View style={[styles.breadcrumb, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {breadcrumb.map((item, index) => (
            <BreadcrumbItem
              key={item.id}
              name={item.name}
              onPress={() => handleBreadcrumbPress(index)}
              isLast={index === breadcrumb.length - 1}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search-outline" size={20} color={colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search..."
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Upload Progress */}
      {uploading && uploadProgress > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
          <View style={[styles.progressFill, { width: `${uploadProgress}%`, backgroundColor: colors.primary }]} />
          <Text style={[styles.progressText, { color: colors.text }]}>
            {uploadProgress}%
          </Text>
        </View>
      )}

      {/* Content List */}
      <FlatList
        data={[...directories, ...files]}
        keyExtractor={(item) => `${item.id}-${item.name}`}
        renderItem={({ item }) => {
          // Check if it's a directory
          if (item.is_root_directory !== undefined || item.count_files !== undefined) {
            return (
              <DirectoryRow
                directory={item}
                onPress={() => handleDirectoryPress(item)}
                colors={colors}
              />
            );
          }
          // It's a file
          return (
            <FileRow
              file={item}
              onPress={() => {
                if (FilesService.isPreviewable(item.mimetype)) {
                  navigation.navigate('FilePreview', {
                    fileId: item.id,
                    fileName: item.name,
                    mimetype: item.mimetype,
                  });
                }
              }}
              onDownload={handleDownload}
              colors={colors}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="folder-open-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text }]}>This folder is empty</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadContent()} />}
        scrollEnabled={true}
        style={{ flex: 1 }}
      />

      {/* FAB Upload */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }, uploading && { opacity: 0.6 }]}
        onPress={handleUploadPress}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Icon name="cloud-upload-outline" size={28} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  breadcrumb: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  breadcrumbText: { fontSize: 13 },
  breadcrumbSeparator: { marginHorizontal: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 4, marginHorizontal: 4 },
  progressBar: { height: 4, margin: 12, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressText: { position: 'absolute', right: 12, top: -20, fontSize: 10, fontWeight: '600' },
  directoryRow: { flexDirection: 'row', alignItems: 'center', margin: 8, marginHorizontal: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  folderIcon: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  directoryName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  dirInfo: { fontSize: 11 },
  fileRow: { flexDirection: 'row', alignItems: 'center', margin: 8, marginHorizontal: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  fileIcon: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fileName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  fileSize: { fontSize: 11 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
});

export default FilesDirectoryScreen;
