import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Share, Platform, Image as RNImage,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import FilesService from '../filesService';
import { useTheme } from '../../../theme/ThemeContext';

const FilePreviewScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { fileId, fileName, mimeType, localPath: initialPath } = route.params || {};

  const [localPath, setLocalPath] = useState(initialPath);
  const [loading, setLoading] = useState(!initialPath);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initialPath) {
      downloadFile();
    }
  }, [fileId, fileName]);

  const downloadFile = async () => {
    try {
      setLoading(true);
      const path = await FilesService.downloadFile(fileId, fileName);
      setLocalPath(path);
      setError(null);
    } catch (e) {
      setError('Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: 'file://' + localPath,
        title: fileName,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share file');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {fileName}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Downloading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {fileName}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={48} color={colors.border} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={downloadFile}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // PDF and HTML preview
  if (mimeType === 'application/pdf' || mimeType === 'text/html') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {fileName}
          </Text>
          <TouchableOpacity onPress={handleShare}>
            <Icon name="share-social-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: 'file://' + localPath }}
          style={{ flex: 1 }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
      </View>
    );
  }

  // Image preview
  if (mimeType?.startsWith('image/')) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {fileName}
          </Text>
          <TouchableOpacity onPress={handleShare}>
            <Icon name="share-social-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.imageContainer}>
          <RNImage
            source={{ uri: 'file://' + localPath }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  // Other file types - show Open with button
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {fileName}
        </Text>
        <TouchableOpacity onPress={handleShare}>
          <Icon name="share-social-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.center}>
        <Icon name={FilesService.getMimeIcon(mimeType)} size={64} color={colors.border} />
        <Text style={[styles.fileNameText, { color: colors.text }]}>{fileName}</Text>
        <Text style={[styles.mimeText, { color: colors.textSecondary }]}>{mimeType || 'Unknown type'}</Text>
        <TouchableOpacity
          style={[styles.openButton, { backgroundColor: colors.primary }]}
          onPress={handleShare}
        >
          <Icon name="open-outline" size={20} color="#fff" />
          <Text style={styles.openButtonText}>Open with...</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginHorizontal: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  loadingText: { fontSize: 14, marginTop: 12 },
  errorText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { flex: 1, width: '100%', height: '100%' },
  fileNameText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  mimeText: { fontSize: 13, marginTop: 4 },
  openButton: { marginTop: 20, flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  openButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 8 },
});

export default FilePreviewScreen;
