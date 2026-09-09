import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import TeamService from '../../services/team/teamService';

const Avatar = ({ user, size = 36, style }) => {
  const [err, setErr] = useState(false);
  if (!user) return null;
  const color    = TeamService.getColor(user.id || user.user_id);
  const initials = user.initials ||
    (user.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  if (user.avatar_url && !err) {
    return (
      <Image source={{ uri: user.avatar_url }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        onError={() => setErr(true)} />
    );
  }
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, alignItems: 'center', justifyContent: 'center',
    }, style]}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: '#fff' }}>{initials}</Text>
    </View>
  );
};

export const AvatarStack = ({ users = [], size = 28, max = 4 }) => {
  const visible = users.slice(0, max);
  const extra   = users.length - max;
  const overlap = Math.round(size * 0.3);
  return (
    <View style={{ flexDirection: 'row', height: size }}>
      {visible.map((u, i) => (
        <View key={u.id || u.user_id || i} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: visible.length - i }}>
          <Avatar user={u} size={size} style={{ borderWidth: 1.5, borderColor: '#fff' }} />
        </View>
      ))}
      {extra > 0 && (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#888', alignItems: 'center', justifyContent: 'center', marginLeft: -overlap }}>
          <Text style={{ fontSize: size * 0.32, color: '#fff', fontWeight: '700' }}>+{extra}</Text>
        </View>
      )}
    </View>
  );
};

export default Avatar;
