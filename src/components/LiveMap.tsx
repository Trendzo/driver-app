// Real map for the navigation steps. Uses react-native-maps (bundled in Expo
// Go — Apple Maps on iOS, Google Maps on Android). Everything is wrapped in an
// error boundary that degrades to the brutalist grid panel, so a missing
// native module or map failure can never crash the delivery flow.
import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, SP, BORDER } from '../theme/brutal';
import { MapPanel } from './Brutal';
import type { LatLng } from '../data/mockData';

// react-native-maps on Android requires a Google Maps API key; on iOS it uses
// Apple Maps with no key. Since this build ships without a key, we use the real
// map only on iOS and fall back to the brutalist panel on Android — identical
// UX, zero risk of a blank/broken map or a missing-key crash.
const USE_NATIVE_MAP = Platform.OS === 'ios';

let RNMaps: any = null;
if (USE_NATIVE_MAP) {
  try { RNMaps = require('react-native-maps'); } catch { RNMaps = null; }
}

const MapView = RNMaps?.default;
const Marker = RNMaps?.Marker;
const Polyline = RNMaps?.Polyline;

class MapErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function regionFor(a: LatLng, b: LatLng) {
  const midLat = (a.latitude + b.latitude) / 2;
  const midLng = (a.longitude + b.longitude) / 2;
  const dLat = Math.abs(a.latitude - b.latitude) * 2.2 + 0.01;
  const dLng = Math.abs(a.longitude - b.longitude) * 2.2 + 0.01;
  return { latitude: midLat, longitude: midLng, latitudeDelta: dLat, longitudeDelta: dLng };
}

type Props = {
  origin: LatLng;
  destination: LatLng;
  height?: number;
  label?: string;
  toTag?: string;       // STORE | DROP
};

export function LiveMap({ origin, destination, height = 200, label = 'LIVE NAVIGATION', toTag = 'STORE' }: Props) {
  const fallback = <MapPanel height={height} label={label} from="YOU" to={toTag} />;
  if (!MapView) return fallback;

  return (
    <MapErrorBoundary fallback={fallback}>
      <View style={[{ height, overflow: 'hidden' }, BORDER(2)]}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={regionFor(origin, destination)}
          showsUserLocation={false}
          showsCompass={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          pointerEvents="none"
        >
          {Polyline && (
            <Polyline
              coordinates={[origin, destination]}
              strokeColor={C.ink}
              strokeWidth={4}
              lineDashPattern={[2, 6]}
            />
          )}
          {Marker && (
            <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink }} />
              </View>
            </Marker>
          )}
          {Marker && (
            <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }}>
              <View style={{ width: 30, height: 30, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="map-pin" size={16} color={C.white} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* brutalist label overlay */}
        <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.ink }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: C.white, letterSpacing: 1 }}>{label}</Text>
        </View>
        <View style={{ position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', gap: 6 }}>
          <View style={{ paddingHorizontal: 6, paddingVertical: 3, backgroundColor: C.white, borderWidth: 1, borderColor: C.ink }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: C.ink }}>YOU</Text>
          </View>
          <Feather name="arrow-right" size={12} color={C.ink} style={{ alignSelf: 'center' }} />
          <View style={{ paddingHorizontal: 6, paddingVertical: 3, backgroundColor: C.ink }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: C.white }}>{toTag}</Text>
          </View>
        </View>
      </View>
    </MapErrorBoundary>
  );
}
