import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';

const VIDEOS = [
  {
    id: 1,
    title: 'Natural Language Queries',
    description: 'Ask complex questions about your workspace in plain English',
    icon: 'chatbubble-outline',
    duration: '8s',
  },
  {
    id: 2,
    title: 'Invoice Generation',
    description: 'Create professional invoices with a single command',
    icon: 'document-outline',
    duration: '9s',
  },
  {
    id: 3,
    title: 'Smart Insights',
    description: 'Discover patterns and recommendations from your data',
    icon: 'trending-up-outline',
    duration: '10s',
  },
];

const AIFeaturesShowcase = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVideoPress = (video) => {
    setSelectedVideo(video);
    setLoading(true);
    // Simulate loading delay (video file loading)
    setTimeout(() => setLoading(false), 500);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
    setLoading(false);
  };

  if (!visible) return null;

  // Full-screen video player
  if (selectedVideo) {
    return (
      <Modal
        visible={true}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCloseVideo}>
        <View style={[s.fullscreen, { backgroundColor: colors.background }]}>
          {/* Video placeholder — in production, use react-native-video */}
          <View style={[s.videoContainer, { backgroundColor: '#000' }]}>
            {loading ? (
              <ActivityIndicator size="large" color="#7C3AED" />
            ) : (
              <>
                <View style={s.videoPlaceholder}>
                  <Icon name="play-circle-outline" size={60} color="#7C3AED" />
                  <Text style={s.videoTitle}>{selectedVideo.title}</Text>
                </View>
              </>
            )}
          </View>

          {/* Controls */}
          <View style={[s.videoControls, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={handleCloseVideo} style={s.closeControl}>
              <Icon name="chevron-back" size={24} color={colors.text} />
              <Text style={[s.controlText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
            <Text style={[s.videoDuration, { color: colors.textSecondary }]}>
              {selectedVideo.duration}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Video gallery
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={[s.container, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: colors.text }]}>
              AI Features
            </Text>
            <Text style={[s.headerSubtitle, { color: colors.textSecondary }]}>
              Discover what's possible with SimpleSoft AI
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Gallery */}
        <ScrollView style={s.gallery} showsVerticalScrollIndicator={false}>
          <View style={s.videoGrid}>
            {VIDEOS.map(video => (
              <TouchableOpacity
                key={video.id}
                style={[s.videoCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => handleVideoPress(video)}
                activeOpacity={0.7}>
                {/* Icon area */}
                <View style={[s.videoCardIcon, { backgroundColor: '#7C3AED15' }]}>
                  <Icon name={video.icon} size={32} color="#7C3AED" />
                  <View style={[s.playBadge, { backgroundColor: '#7C3AED' }]}>
                    <Icon name="play" size={10} color="#fff" />
                  </View>
                </View>

                {/* Info */}
                <View style={s.videoCardInfo}>
                  <Text style={[s.videoCardTitle, { color: colors.text }]}>
                    {video.title}
                  </Text>
                  <Text
                    style={[s.videoCardDesc, { color: colors.textSecondary }]}
                    numberOfLines={2}>
                    {video.description}
                  </Text>
                  <Text style={[s.videoCardDuration, { color: colors.textLight }]}>
                    {video.duration}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer info */}
          <View style={[s.footerInfo, { backgroundColor: colors.background }]}>
            <Icon name="bulb-outline" size={20} color="#7C3AED" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.infoTitle, { color: colors.text }]}>
                Workspace AI Capabilities
              </Text>
              <Text style={[s.infoText, { color: colors.textSecondary }]}>
                Query your data in natural language, automate document creation, and
                unlock insights with your dedicated workspace AI.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  gallery: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  videoGrid: {
    gap: 12,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  videoCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  playBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCardInfo: {
    flex: 1,
  },
  videoCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoCardDesc: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 6,
  },
  videoCardDuration: {
    fontSize: 10,
    fontWeight: '500',
  },
  footerInfo: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Video player styles
  fullscreen: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
    gap: 16,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  closeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '500',
  },
  videoDuration: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default AIFeaturesShowcase;
