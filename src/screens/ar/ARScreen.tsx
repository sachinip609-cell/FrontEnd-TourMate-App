import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';

let Camera: any = null;
let _useCamDevice: (pos: 'back' | 'front') => any = () => null;
let _useCamPermission: () => {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
} = () => ({ hasPermission: false, requestPermission: async () => false });
let _useCodeScannerFn: ((opts: any) => any) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vc = require('react-native-vision-camera');
  Camera = vc?.Camera ?? null;
  _useCamDevice = vc?.useCameraDevice ?? (() => null);
  _useCamPermission =
    vc?.useCameraPermission ??
    (() => ({ hasPermission: false, requestPermission: async () => false }));
  _useCodeScannerFn = vc?.useCodeScanner ?? null;
} catch {
  // Camera features unavailable on this device/build
}

function useCameraDevice(pos: 'back' | 'front') {
  return _useCamDevice(pos);
}
function useCameraPermission() {
  return _useCamPermission();
}
// Returns null when worklets native module is not linked (no crash).
function useSafeCodeScanner(opts: any) {
  if (!_useCodeScannerFn) return null;
  return _useCodeScannerFn(opts);
}
import { Colors, Spacing } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { HEADER_BASE_HEIGHT } from '../../components/common/AppHeader';
import ErrorBoundary from '../../components/common/ErrorBoundary';

let ViroARSceneNavigator: any = null;
let ViroARScene: any = null;
let Viro3DObject: any = null;
let ViroAmbientLight: any = null;
let ViroDirectionalLight: any = null;
let ViroARPlaneSelector: any = null;
let ViroNode: any = null;
let ViroSpotLight: any = null;
/** Anchors AR content to a detected physical image */
let ViroARImageMarker: any = null;
/** Registers image tracking targets */
let ViroARTrackingTargets: any = null;
let viroLoadError: string | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require('@reactvision/react-viro');
  const viro = m?.default ?? m;
  ViroARSceneNavigator = viro?.ViroARSceneNavigator ?? null;
  ViroARScene = viro?.ViroARScene ?? null;
  Viro3DObject = viro?.Viro3DObject ?? null;
  ViroAmbientLight = viro?.ViroAmbientLight ?? null;
  ViroDirectionalLight = viro?.ViroDirectionalLight ?? null;
  ViroARPlaneSelector = viro?.ViroARPlaneSelector ?? null;
  ViroNode = viro?.ViroNode ?? null;
  ViroSpotLight = viro?.ViroSpotLight ?? null;
  ViroARImageMarker = viro?.ViroARImageMarker ?? null;
  ViroARTrackingTargets = viro?.ViroARTrackingTargets ?? null;
} catch (e: any) {
  viroLoadError = e?.message ?? 'Unknown error loading ViroReact';
}

const VIRO_READY =
  !!ViroARSceneNavigator &&
  !!ViroARScene &&
  !!Viro3DObject &&
  !!ViroAmbientLight &&
  !!ViroDirectionalLight &&
  !!ViroNode &&
  !!ViroSpotLight;

/** True when QR image-marker tracking is available on this device/build */
const MARKER_AR_READY =
  VIRO_READY && !!ViroARImageMarker && !!ViroARTrackingTargets;

// ─── Authentication key encoded in AR_QR.png ─────────────────────────────────
const AR_VALID_KEY = 'AR_KEY_2024_XJKP92_VALID';
const AR_QR_TARGET = 'tourMateQR';

// Register the physical QR image as an AR tracking target (idempotent).
if (MARKER_AR_READY) {
  try {
    ViroARTrackingTargets.createTargets({
      [AR_QR_TARGET]: {
        source: require('../../assets/AR_QR.png'),
        orientation: 'Up',
        physicalWidth: 0.15,
      },
    });
  } catch {}
}

interface ModelInfo {
  name: string;
  emoji: string;
  description: string;
  guidance: { icon: string; title: string; detail: string }[];
}

const HOUSE_MODEL_INFO: ModelInfo = {
  name: 'Kandy Museum',
  emoji: '🏛️',
  description:
    'A showcase of Kandyan-era artifacts, traditional textiles, and cultural exhibits highlighting the history and heritage of Kandy and the central highlands.',
  guidance: [
    {
      icon: '🕐',
      title: 'Opening Hours',
      detail: 'Daily 9:00 AM – 5:00 PM',
    },
    {
      icon: '🎟️',
      title: 'Admission',
      detail: 'Adults LKR 300 | Students LKR 150\nChildren under 12 Free',
    },
    {
      icon: '🗺️',
      title: 'Getting There',
      detail:
        'Located in central Kandy near Kandy Lake; short walk from the Temple of the Tooth. Street parking and local tuk-tuks are available.',
    },
    {
      icon: '📸',
      title: 'Photography',
      detail:
        'Photography is permitted in most galleries; please avoid flash in sensitive exhibit areas.',
    },
    {
      icon: '♿',
      title: 'Accessibility',
      detail:
        'Ground-level access and ramps available; some galleries may have steps.',
    },
  ],
};

const PSX_HOUSE_MODEL_INFO: ModelInfo = {
  name: 'Temple of the Tooth',
  emoji: '🛕',
  description:
    "Sri Dalada Maligawa (Temple of the Sacred Tooth) is one of Sri Lanka's most venerated Buddhist shrines, housing a relic believed to be the tooth of the Buddha.",
  guidance: [
    {
      icon: '🕐',
      title: 'Opening Hours',
      detail: 'Daily 5:30 AM – 8:30 PM',
    },
    {
      icon: '🎟️',
      title: 'Admission',
      detail:
        'Ticketed entry for visitors; donations are appreciated.\nSpecial puja times may have separate access rules.',
    },
    {
      icon: '🗺️',
      title: 'Getting There',
      detail:
        'Situated in Kandy city centre adjacent to the Royal Palace complex and Kandy Lake; easiest reached on foot or by tuk-tuk.',
    },
    {
      icon: '👘',
      title: 'Dress Code',
      detail:
        'Modest attire required — shoulders and knees should be covered. Remove shoes and hats before entering inner shrine areas.',
    },
    {
      icon: '♿',
      title: 'Accessibility',
      detail:
        'Temple grounds include steps; wheelchair access is limited in some areas.',
    },
  ],
};

const MODEL_INFO_MAP: Record<string, ModelInfo> = {
  house: HOUSE_MODEL_INFO,
  psx: PSX_HOUSE_MODEL_INFO,
};

interface ARSceneProps {
  sceneNavigator: {
    viroAppProps: {
      arMode: 'marker' | 'forced';
      onMarkerFound: () => void;
      onMarkerLost: () => void;
      onModelLoaded: () => void;
      onModelError: () => void;
      onModelTapped: (id: string) => void;
      /** fires once the user taps a detected plane (forced mode) */
      onPlaneSelected: () => void;
    };
  };
}

const AR_BASE_SCALE = 0.045;
const AR_MIN_SCALE = 0.012;
const AR_MAX_SCALE = 0.18;
const arClamp = (v: number) =>
  Math.min(AR_MAX_SCALE, Math.max(AR_MIN_SCALE, v));

function HouseARScene({ sceneNavigator }: ARSceneProps) {
  const {
    arMode,
    onMarkerFound,
    onMarkerLost,
    onModelLoaded,
    onModelError,
    onModelTapped,
    onPlaneSelected,
  } = sceneNavigator?.viroAppProps ?? {};
  const Scene = ViroARScene;
  const Ambient = ViroAmbientLight;
  const Directional = ViroDirectionalLight;
  const NodeComp = ViroNode;
  const Spot = ViroSpotLight;
  const Model = Viro3DObject;
  const ImageMarker = ViroARImageMarker;
  // ViroARPlaneSelector: anchors models to a user-tapped real-world surface
  const PlaneSelector = ViroARPlaneSelector;

  // ── Shared scale + per-model Y-rotation state ───────────────────────────
  // Single shared scale keeps both models the same size at all times.
  // Pinch gesture on either model resizes both together.
  const [modelScale, setModelScale] = useState(AR_BASE_SCALE);
  const [houseRotY, setHouseRotY] = useState(0);
  const [psxRotY, setPsxRotY] = useState(0);
  /** id of model currently showing its tap-pulse animation, or null */
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Track scale at pinch-gesture start so we multiply relative to it
  const pinchStart = useRef(AR_BASE_SCALE);

  // Shared pinch-to-scale handler — applies to whichever model the user pinches
  const handlePinch = useCallback(
    (_src: any, factor: number, state: number) => {
      if (state === 1) {
        pinchStart.current = modelScale;
      } else {
        setModelScale(arClamp(pinchStart.current * factor));
      }
    },
    [modelScale],
  );

  const handleHouseRotate = useCallback(
    (_src: any, deg: number, state: number) => {
      if (state === 2 || state === 3) setHouseRotY(prev => prev - deg);
    },
    [],
  );
  const handlePsxRotate = useCallback(
    (_src: any, deg: number, state: number) => {
      if (state === 2 || state === 3) setPsxRotY(prev => prev - deg);
    },
    [],
  );

  useEffect(() => {
    if (arMode !== 'marker' && !PlaneSelector) {
      onPlaneSelected?.();
    }
  }, [arMode, onPlaneSelected]);

  const handleModelTap = useCallback(
    (id: string) => {
      setHighlightId(id);
      setTimeout(() => {
        setHighlightId(null);
        onModelTapped?.(id);
      }, 280);
    },
    [onModelTapped],
  );

  const modelContent = (
    <>
      {/* ── Kandy Museum (Heritage House) ── */}
      <NodeComp position={[-0.38, 0, 0]}>
        <Spot
          innerAngle={5}
          outerAngle={20}
          direction={[0, -1, 0]}
          position={[0, 4, 0]}
          color="#ffffff"
          castsShadow
          shadowMapSize={2048}
          shadowNearZ={2}
          shadowFarZ={5}
          shadowOpacity={0.5}
        />
        <Model
          source={{ uri: 'file:///android_asset/models/House_gltf.glb' }}
          type="GLB"
          scale={[
            modelScale * (highlightId === 'house' ? 1.15 : 1),
            modelScale * (highlightId === 'house' ? 1.15 : 1),
            modelScale * (highlightId === 'house' ? 1.15 : 1),
          ]}
          position={[0, 0, 0]}
          // -90° on X corrects Blender Z-up → ViroReact Y-up so model stands upright
          rotation={[-90, houseRotY, 0]}
          onLoadEnd={onModelLoaded}
          onError={onModelError}
          onClick={() => handleModelTap('house')}
          onPinch={handlePinch}
          onRotate={handleHouseRotate}
        />
      </NodeComp>

      {/* ── Temple of the Tooth (PSX House) ── */}
      <NodeComp position={[0.38, 0, 0]}>
        <Spot
          innerAngle={5}
          outerAngle={20}
          direction={[0, -1, 0]}
          position={[0, 4, 0]}
          color="#fff8e1"
          castsShadow
          shadowMapSize={2048}
          shadowNearZ={2}
          shadowFarZ={5}
          shadowOpacity={0.5}
        />
        <Model
          source={{
            uri: 'file:///android_asset/models/psx_japanese_house.glb',
          }}
          type="GLB"
          scale={[
            modelScale * (highlightId === 'psx' ? 1.15 : 1),
            modelScale * (highlightId === 'psx' ? 1.15 : 1),
            modelScale * (highlightId === 'psx' ? 1.15 : 1),
          ]}
          position={[0, 0, 0]}
          // -90° on X corrects Blender Z-up → ViroReact Y-up so model stands upright
          rotation={[-90, psxRotY, 0]}
          onLoadEnd={onModelLoaded}
          onError={onModelError}
          onClick={() => handleModelTap('psx')}
          onPinch={handlePinch}
          onRotate={handlePsxRotate}
        />
      </NodeComp>
    </>
  );

  return (
    <Scene>
      {/* Neutral ambient — low so model PBR textures dominate */}
      <Ambient color="#ffffff" intensity={100} />
      {/* Key light: pure white from above-left */}
      <Directional
        color="#ffffff"
        direction={[-0.5, -0.8, -0.3]}
        intensity={250}
        castsShadow
        shadowFarZ={6}
        shadowNearZ={0.01}
        shadowOpacity={0.4}
        shadowMapSize={2048}
      />
      {/* Subtle neutral fill — no blue tint */}
      <Directional
        color="#ffffff"
        direction={[0.5, -0.3, 0.8]}
        intensity={60}
      />

      {arMode === 'marker' && MARKER_AR_READY ? (
        // Marker-based: models anchor to the physical QR in the real world
        <ImageMarker
          target={AR_QR_TARGET}
          onAnchorFound={onMarkerFound}
          onAnchorRemoved={onMarkerLost}
        >
          {/* Lift models slightly above the QR plane */}
          <NodeComp position={[0, 0.05, 0]}>{modelContent}</NodeComp>
        </ImageMarker>
      ) : PlaneSelector ? (
        // alignment="Horizontal" restricts detection to floors/tables only;
        // minWidth/minHeight filter out small noisy plane fragments.
        <PlaneSelector
          alignment="Horizontal"
          minWidth={0.2}
          minHeight={0.2}
          maxPlanes={3}
          onPlaneSelected={() => onPlaneSelected?.()}
        >
          {modelContent}
        </PlaneSelector>
      ) : (
        <NodeComp position={[0, -0.2, -1.5]}>{modelContent}</NodeComp>
      )}
    </Scene>
  );
}

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H = Math.round(SCREEN_H * 0.55); // 55 % of screen height

interface ModelInfoSheetProps {
  visible: boolean;
  info: ModelInfo;
  onClose: () => void;
}

const ModelInfoSheet: React.FC<ModelInfoSheetProps> = ({
  visible,
  info,
  onClose,
}) => {
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SHEET_H,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }, [visible, translateY]);

  // Keep rendered (but slid off-screen) so the slide-out animation plays
  return (
    <>
      {/* Backdrop */}
      {visible && (
        <TouchableOpacity
          style={s.sheetBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={s.sheetHandle} />

        {/* Close button */}
        <TouchableOpacity style={s.sheetClose} onPress={onClose}>
          <Text style={s.sheetCloseTxt}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.sheetScroll}
          bounces={false}
        >
          {/* Header */}
          <Text style={s.sheetEmoji}>{info.emoji}</Text>
          <Text style={s.sheetName}>{info.name}</Text>
          <Text style={s.sheetDesc}>{info.description}</Text>

          {/* Divider */}
          <View style={s.sheetDivider} />

          {/* Visitor guidance rows */}
          <Text style={s.sheetGuidanceTitle}>Visitor Information</Text>
          {info.guidance.map((g, i) => (
            <View key={i} style={s.guidanceRow}>
              <Text style={s.guidanceIcon}>{g.icon}</Text>
              <View style={s.guidanceText}>
                <Text style={s.guidanceRowTitle}>{g.title}</Text>
                <Text style={s.guidanceRowDetail}>{g.detail}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </>
  );
};

// ---------------------------------------------------------------------------
// Camera + QR Scanner layer
// Isolated into its own component so that vision-camera hook failures on
// unsupported/low-end devices cannot crash the parent ARScreen.
// Wrap the usage site with <ErrorBoundary> for full safety.
// ---------------------------------------------------------------------------
const QR_SZ = 220;
type AppState = 'idle' | 'arActive';

interface CameraQRLayerProps {
  /** true while appState === 'idle' (AR viewer is not active) */
  isActive: boolean;
  canScan: boolean;
  scanLineY: Animated.AnimatedInterpolation<number>;
  /** called after a valid AR key QR is scanned */
  onValidQR: () => void;
  onGoBack: () => void;
  /** called when user wants to enter the key manually */
  onManualEntry: () => void;
}

const CameraQRLayer: React.FC<CameraQRLayerProps> = ({
  isActive,
  canScan,
  scanLineY,
  onValidQR,
  onGoBack,
  onManualEntry,
}) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [camGranted, setCamGranted] = useState(hasPermission);
  const [camDenied, setCamDenied] = useState(false);
  const [invalidQR, setInvalidQR] = useState(false);
  const invalidQRRef = useRef(false);

  useEffect(() => {
    if (hasPermission) {
      setCamGranted(true);
    } else {
      requestPermission().then(ok =>
        ok ? setCamGranted(true) : setCamDenied(true),
      );
    }
  }, [hasPermission, requestPermission]);

  const codeScanner = useSafeCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes: { value?: string }[]) => {
      if (codes.length === 0 || !isActive || !canScan) return;
      const value = (codes[0].value ?? '').trim();
      if (value === AR_VALID_KEY) {
        onValidQR();
      } else if (!invalidQRRef.current) {
        // Show invalid-QR feedback for 2 s, debounced
        invalidQRRef.current = true;
        setInvalidQR(true);
        setTimeout(() => {
          invalidQRRef.current = false;
          setInvalidQR(false);
        }, 2000);
      }
    },
  });

  // ── permission denied ──
  if (camDenied) {
    return (
      <View style={[StyleSheet.absoluteFill, s.centred]}>
        <StatusBar barStyle="light-content" />
        <Text style={s.permEmoji}>📵</Text>
        <Text style={s.permTitle}>Camera Required</Text>
        <Text style={s.permText}>
          Camera permission is needed for QR scanning. You can still enter the
          AR access key manually.
        </Text>
        <TouchableOpacity style={s.keyActivateBtn} onPress={onManualEntry}>
          <Text style={s.keyActivateBtnTxt}>🔑 Enter Key Manually</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.goBackBtn} onPress={onGoBack}>
          <Text style={s.goBackTxt}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── awaiting permission ──
  if (!camGranted) {
    return (
      <View style={[StyleSheet.absoluteFill, s.centred]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={s.permText}>Requesting camera permission…</Text>
      </View>
    );
  }

  // ── AR viewer is active, camera not needed ──
  if (!isActive) return null;

  return (
    <>
      {/* Camera preview */}
      {Camera && device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo={false}
          video={false}
          audio={false}
          {...(codeScanner != null ? { codeScanner } : {})}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.camLoading]}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      )}
      {/* QR viewfinder overlay */}
      <View style={s.qrLayer} pointerEvents="box-none">
        <View style={[s.qrBox, invalidQR && s.qrBoxInvalid]}>
          <View style={[s.qrCorner, s.qrCTL, invalidQR && s.qrCornerInvalid]} />
          <View style={[s.qrCorner, s.qrCTR, invalidQR && s.qrCornerInvalid]} />
          <View style={[s.qrCorner, s.qrCBL, invalidQR && s.qrCornerInvalid]} />
          <View style={[s.qrCorner, s.qrCBR, invalidQR && s.qrCornerInvalid]} />
          <Animated.View
            style={[s.scanBar, { transform: [{ translateY: scanLineY }] }]}
          />
        </View>
        {invalidQR ? (
          <Text style={s.qrInvalidTxt}>
            ❌ Wrong QR — use the TourMate AR code
          </Text>
        ) : (
          <Text style={s.qrHint}>Scan the TourMate AR QR code to begin</Text>
        )}
        <TouchableOpacity style={s.manualBtn} onPress={onManualEntry}>
          <Text style={s.manualBtnTxt}>🔑 Can't scan? Enter key manually</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

// ---------------------------------------------------------------------------
// Manual Key Entry — fallback when QR scanning is unavailable
// (camera denied, no camera hardware, or user physically can't scan)
// ---------------------------------------------------------------------------
interface ManualKeyEntryProps {
  onValidKey: () => void;
  onGoBack: () => void;
}

const ManualKeyEntry: React.FC<ManualKeyEntryProps> = ({
  onValidKey,
  onGoBack,
}) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = useCallback(() => {
    if (key.trim() === AR_VALID_KEY) {
      setError('');
      setAccepted(true);
      setTimeout(onValidKey, 400);
    } else {
      setError('Invalid access key. Please check and try again.');
    }
  }, [key, onValidKey]);

  return (
    <View style={[StyleSheet.absoluteFill, s.centred]}>
      <StatusBar barStyle="light-content" />
      <Text style={s.permEmoji}>🔑</Text>
      <Text style={s.permTitle}>Enter AR Access Key</Text>
      <Text style={s.permText}>
        Find the access key on your TourMate AR card or printed guide booklet.
      </Text>
      <TextInput
        style={[
          s.keyInput,
          error ? s.keyInputError : null,
          accepted ? s.keyInputSuccess : null,
        ]}
        value={key}
        onChangeText={v => {
          setKey(v);
          setError('');
        }}
        placeholder="AR_KEY_…"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        editable={!accepted}
      />
      {error ? <Text style={s.keyError}>{error}</Text> : null}
      {accepted ? (
        <Text style={s.keySuccess}>✓ Key accepted! Starting AR…</Text>
      ) : null}
      <TouchableOpacity
        style={[s.keyActivateBtn, accepted && s.keyActivateBtnDisabled]}
        onPress={handleSubmit}
        disabled={accepted || !key.trim()}
        activeOpacity={0.85}
      >
        <Text style={s.keyActivateBtnTxt}>Activate AR ▶</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.goBackBtn} onPress={onGoBack}>
        <Text style={s.goBackTxt}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
interface ARScreenProps {
  initialPlaceId?: number;
}

const ARScreen: React.FC<ARScreenProps> = () => {
  const nav = useAppNavigation();
  const insets = useSafeAreaInsets();
  const topBarTop = (insets.top ?? 0) + HEADER_BASE_HEIGHT + 6; // place top bar below app header
  // useState instead of useRef avoids a null-ref crash on low-end devices
  // where vision-camera hooks can corrupt React's hook state on first render.
  const [scanLine] = useState(() => new Animated.Value(0));

  const [appState, setAppState] = useState<AppState>('idle');
  const [canScan, setCanScan] = useState(true);
  /** 'marker' = QR image tracking  |  'forced' = fixed world-position fallback */
  const [arMode, setArMode] = useState<'marker' | 'forced'>('marker');
  const [markerFound, setMarkerFound] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  // null = sheet closed; string key = which model was tapped
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  /** true once user has tapped a real-world plane in forced AR mode */
  const [planeSelected, setPlaneSelected] = useState(false);

  // (auto-place timer removed — marker mode anchors to QR; forced mode places immediately)

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine]);

  /** Valid QR scan → launch marker-anchored AR (falls back to forced if unsupported) */
  const activateARWithMarker = useCallback(() => {
    if (!canScan) return;
    setCanScan(false);
    setMarkerFound(false);
    setModelLoaded(false);
    setModelError(false);
    setArMode(MARKER_AR_READY ? 'marker' : 'forced');
    setAppState('arActive');
  }, [canScan]);

  /** Manual key entry → launch fixed-position AR */
  const activateARForced = useCallback(() => {
    if (!canScan) return;
    setCanScan(false);
    setMarkerFound(false);
    setModelLoaded(false);
    setModelError(false);
    setArMode('forced');
    setShowManualEntry(false);
    setAppState('arActive');
  }, [canScan]);

  const closeAR = useCallback(() => {
    setActiveModelId(null);
    setAppState('idle');
    setCanScan(true);
    setMarkerFound(false);
    setModelLoaded(false);
    setArMode('marker');
    setPlaneSelected(false);
  }, []);

  const scanLineY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [0, QR_SZ - 4],
  });

  const arHintText = modelError
    ? 'Model failed to load'
    : !modelLoaded
    ? 'Loading models…'
    : arMode === 'marker' && !markerFound
    ? '🔍 Point camera at the TourMate QR code'
    : arMode === 'marker'
    ? '✓ QR detected — models anchored to QR'
    : !planeSelected
    ? '👆 Tap a flat surface to place the models'
    : '✓ Models placed — walk around to explore';

  // ── ViroReact / ARCore not available on this device ──
  if (!VIRO_READY) {
    return (
      <View style={s.centred}>
        <StatusBar barStyle="light-content" />
        <Text style={s.permEmoji}>🤖</Text>
        <Text style={s.permTitle}>AR Not Supported</Text>
        <Text style={s.permText}>
          {viroLoadError
            ? `AR engine error: ${viroLoadError}`
            : 'This device does not support augmented reality features.'}
        </Text>
        <TouchableOpacity style={s.goBackBtn} onPress={() => nav.goBack()}>
          <Text style={s.goBackTxt}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const Navigator = ViroARSceneNavigator;

  return (
    <View style={s.root}>
      <StatusBar hidden />

      {/* Camera + QR scanning layer — isolated in ErrorBoundary so a
          vision-camera crash on unsupported devices cannot kill this screen */}
      {appState === 'idle' && !showManualEntry && (
        <ErrorBoundary screenName="Camera">
          <CameraQRLayer
            isActive
            canScan={canScan}
            scanLineY={scanLineY}
            onValidQR={activateARWithMarker}
            onGoBack={() => {
              closeAR();
              nav.goBack();
            }}
            onManualEntry={() => setShowManualEntry(true)}
          />
        </ErrorBoundary>
      )}

      {/* Manual key entry — fallback for no-camera / unsupported devices */}
      {appState === 'idle' && showManualEntry && (
        <ManualKeyEntry
          onValidKey={activateARForced}
          onGoBack={() => setShowManualEntry(false)}
        />
      )}

      {/* ── AR active ── */}
      {appState === 'arActive' && (
        <Navigator
          autofocus
          hdrScene={false}
          initialScene={{ scene: HouseARScene }}
          viroAppProps={{
            arMode,
            onMarkerFound: () => setMarkerFound(true),
            onMarkerLost: () => setMarkerFound(false),
            onModelLoaded: () => setModelLoaded(true),
            onModelError: () => setModelError(true),
            onModelTapped: (id: string) => setActiveModelId(id),
            onPlaneSelected: () => setPlaneSelected(true),
          }}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* ── Top bar ── */}
      <View style={[s.topBar, { top: topBarTop }]} pointerEvents="box-none">
        <TouchableOpacity
          style={s.backCircle}
          onPress={() => {
            closeAR();
            nav.goBack();
          }}
        >
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>AR Explorer</Text>
        {appState === 'idle' ? (
          <View style={s.statusPill}>
            <Text style={s.statusTxt}>Scan QR</Text>
          </View>
        ) : (
          <TouchableOpacity style={s.exitBtn} onPress={closeAR}>
            <Text style={s.exitTxt}>✕ Exit</Text>
          </TouchableOpacity>
        )}
      </View>

      {appState === 'arActive' && (
        <View style={s.arHintBar}>
          <Text style={s.arHintTxt}>{arHintText}</Text>
        </View>
      )}

      <ModelInfoSheet
        visible={activeModelId !== null}
        info={
          activeModelId
            ? MODEL_INFO_MAP[activeModelId] ?? HOUSE_MODEL_INFO
            : HOUSE_MODEL_INFO
        }
        onClose={() => setActiveModelId(null)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },

  centred: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permEmoji: { fontSize: 44, marginBottom: Spacing.md },
  permTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  permText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.sm,
  },
  goBackBtn: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  goBackTxt: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },
  topTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statusPill: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusTxt: { color: '#fff', fontSize: 12 },
  exitBtn: {
    backgroundColor: 'rgba(229,57,53,0.75)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  exitTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  qrLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    width: QR_SZ,
    height: QR_SZ,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  qrCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  qrCTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  qrCTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  qrCBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  qrCBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  scanBar: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.85,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 1,
  },
  qrHint: {
    color: '#fff',
    fontSize: 13,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  demoBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  demoBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Invalid QR feedback ─────────────────────────────────────────────
  qrBoxInvalid: { borderColor: '#E53935', borderWidth: 1.5 },
  qrCornerInvalid: { borderColor: '#E53935' },
  qrInvalidTxt: {
    color: '#FF5252',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Manual entry button (in QR viewfinder) ───────────────────────────
  manualBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  manualBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // ── Manual key entry screen ───────────────────────────────────────
  keyInput: {
    width: '100%',
    marginTop: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    letterSpacing: 1,
    textAlign: 'center',
  },
  keyInputError: { borderColor: Colors.error },
  keyInputSuccess: { borderColor: '#27AE60' },
  keyError: {
    color: Colors.error,
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  keySuccess: {
    color: '#27AE60',
    fontSize: 13,
    marginTop: Spacing.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  keyActivateBtn: {
    marginTop: Spacing.lg,
    width: '100%',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
  },
  keyActivateBtnDisabled: { opacity: 0.5 },
  keyActivateBtnTxt: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  arHintBar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  arHintTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Bottom sheet ──────────────────────────────────────────────────────────
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 20,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    zIndex: 21,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sheetClose: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  sheetCloseTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sheetScroll: { paddingHorizontal: 20, paddingBottom: 32 },
  sheetEmoji: {
    fontSize: 40,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  sheetName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  sheetDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  sheetGuidanceTitle: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  guidanceIcon: { fontSize: 22, marginRight: 12, marginTop: 1 },
  guidanceText: { flex: 1 },
  guidanceRowTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  guidanceRowDetail: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ARScreen;
