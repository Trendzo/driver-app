// Delivery-proof photo capture. The rider snaps a photo of the handed-over
// order / doorstep; it's stored on the active delivery as proof. Uses
// expo-camera (bundled in Expo Go). Gracefully handles permission denial.
import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C, SP, BORDER } from '../theme/brutal';
import { BrutalButton, BrutalStatusBar } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { uploadPhoto } from '../api';

export default function ProofCameraScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  // Caller passes what the photo is FOR — drives the on-screen guidance.
  const title: string = route.params?.title ?? 'Delivery proof';
  const hint: string = route.params?.hint ?? 'Show the order at the doorstep';
  const { setProofPhoto, showToast } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      if (photo?.uri) {
        // Upload to Cloudinary so we store a hosted URL (the backend rejects local file uris).
        const url = await uploadPhoto(photo.uri);
        setProofPhoto(url);
        showToast('Proof captured', 'Photo attached to this delivery', 'camera');
        nav.goBack();
      }
    } catch {
      showToast('Upload failed', 'Could not save the photo, try again', 'camera-off');
    } finally {
      setBusy(false);
    }
  };

  // permission still loading
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }}><BrutalStatusBar light /></View>;
  }

  // permission not granted
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: SP.l, paddingTop: insets.top + 40, alignItems: 'center' }}>
        <BrutalStatusBar />
        <View style={[{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(2)]}>
          <Feather name="camera" size={40} color={C.white} />
        </View>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: C.ink, marginTop: SP.l, textAlign: 'center', letterSpacing: -0.5 }}>Camera access</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 18, color: C.dim, marginTop: 8, textAlign: 'center', lineHeight: 24 }}>
          Trendzo needs your camera to take a delivery-proof photo at the customer's door.
        </Text>
        <View style={{ width: '100%', marginTop: SP.xl, gap: 10 }}>
          <BrutalButton label="Allow camera" icon="camera" big block onPress={requestPermission} />
          <BrutalButton label="Skip photo" variant="outline" block onPress={() => nav.goBack()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <BrutalStatusBar light />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* top bar */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: SP.l, right: SP.l, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
          <Feather name="x" size={20} color={C.ink} />
        </Pressable>
        <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.white, borderRadius: 999 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.ink }}>{title}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* framing guide */}
      <View pointerEvents="none" style={{ position: 'absolute', top: '28%', left: '12%', right: '12%', bottom: '30%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center' }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' }}>{hint}</Text>
        </View>
      </View>

      {/* shutter */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 30, left: 0, right: 0, alignItems: 'center' }}>
        <Pressable onPress={capture} disabled={busy} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: busy ? C.faint : '#fff' }} />
        </Pressable>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff', letterSpacing: 1, marginTop: 12 }}>{busy ? 'SAVING…' : 'TAP TO CAPTURE'}</Text>
      </View>
    </View>
  );
}
