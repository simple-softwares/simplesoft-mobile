import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
 
const ReadOnlyBanner = ({ onUpgrade }) => {
  const { colors }    = useTheme();
  const isReadOnly    = useSelector(s => s.plan.is_read_only);

  // Only show banner when premium has expired (is_read_only)
  if (!isReadOnly) return null;

  return (
    <View style={[s.banner, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
      <Icon name="lock-closed-outline" size={16} color={colors.error} />
      <Text style={[s.text, { color: colors.error }]}>
        Premium expired — renew to add modules
      </Text>
      <TouchableOpacity style={[s.btn, { backgroundColor: colors.error }]} onPress={onUpgrade}>
        <Text style={s.btnText}>Renew</Text>
      </TouchableOpacity>
    </View>
  );
};
 
const S = StyleSheet;
const s = S.create({
  banner: { flexDirection:'row', alignItems:'center', gap:8, margin:12, padding:10, borderRadius:10, borderWidth:1 },
  text:   { flex:1, fontSize:13, fontWeight:'500' },
  btn:    { borderRadius:8, paddingHorizontal:12, paddingVertical:6 },
  btnText:{ color:'#fff', fontSize:12, fontWeight:'700' },
});
 
export default ReadOnlyBanner;
