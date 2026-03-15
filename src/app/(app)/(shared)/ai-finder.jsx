import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mic, Search, Sparkles, Pill, Store, Stethoscope } from "lucide-react-native";
import { useAudioRecorder, useAudioRecorderState, RecordingPresets } from "expo-audio";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";

const SCOPES = [
  {
    id: "medicine",
    label: "Medicines",
    icon: Pill,
    hint: "e.g. find amoxicillin near westlands",
  },
  {
    id: "pharmacy",
    label: "Pharmacies",
    icon: Store,
    hint: "e.g. pharmacies in nairobi open now",
  },
  {
    id: "medic",
    label: "Medics",
    icon: Stethoscope,
    hint: "e.g. cardiologist in mombasa",
  },
];

const COMMON_LOCATIONS = [
  "nairobi",
  "mombasa",
  "kisumu",
  "nakuru",
  "eldoret",
  "thika",
  "naivasha",
  "nanyuki",
  "malindi",
  "ukunda",
  "ruiru",
  "kikuyu",
  "kitale",
  "kakamega",
  "kericho",
  "nyahururu",
  "migori",
  "garissa",
  "isiolo",
  "marsabit",
  "lamu",
  "kilifi",
  "kwale",
  "narok",
  "embu",
  "meru",
  "nyeri",
  "muranga",
  "kirinyaga",
  "nyandarua",
  "laikipia",
  "kajiado",
  "machakos",
  "makueni",
  "kitui",
  "bungoma",
  "busia",
  "siaya",
  "homabay",
  "homa bay",
  "kisii",
  "nyamira",
  "taita",
  "taveta",
  "taita taveta",
  "tana river",
  "tharaka",
  "tharaka nithi",
  "trans nzoia",
  "uasin gishu",
  "nandi",
  "bomet",
  "baringo",
  "elgeyo marakwet",
  "samburu",
  "turkana",
  "west pokot",
  "wajir",
  "mandera",
];

const MEDIC_QUERY_TERMS = [
  "medic",
  "doctor",
  "physician",
  "clinician",
  "specialist",
  "consultant",
  "clinic",
  "general practitioner",
  "family physician",
  "internal medicine",
  "hospitalist",
  "cardiologist",
  "interventional cardiologist",
  "cardiac surgeon",
  "vascular surgeon",
  "hematologist",
  "hematology-oncologist",
  "neurologist",
  "neurosurgeon",
  "neurophysiologist",
  "stroke specialist",
  "psychiatrist",
  "child psychiatrist",
  "addiction psychiatrist",
  "orthopedic surgeon",
  "sports medicine",
  "rheumatologist",
  "physical medicine",
  "pediatrician",
  "neonatologist",
  "pediatric cardiologist",
  "pediatric neurologist",
  "gynecologist",
  "obstetrician",
  "fertility specialist",
  "maternal-fetal",
  "dermatologist",
  "dermatologic surgeon",
  "ophthalmologist",
  "optometrist",
  "retinal specialist",
  "ent specialist",
  "otolaryngologist",
  "audiologist",
  "head and neck surgeon",
  "gastroenterologist",
  "hepatologist",
  "colorectal surgeon",
  "nephrologist",
  "urologist",
  "urologic surgeon",
  "pulmonologist",
  "respiratory specialist",
  "sleep medicine",
  "medical oncologist",
  "radiation oncologist",
  "surgical oncologist",
  "general surgeon",
  "trauma surgeon",
  "laparoscopic surgeon",
  "endocrinologist",
  "diabetologist",
  "infectious disease",
  "tropical disease",
  "emergency medicine",
  "intensive care",
  "trauma emergency",
  "pain management",
  "palliative care",
  "dentist",
  "orthodontist",
  "oral surgeon",
  "radiologist",
  "interventional radiologist",
  "pathologist",
  "clinical pathologist",
  "microbiologist",
  "anesthesiologist",
  "pain anesthesiologist",
  "physiotherapist",
  "occupational therapist",
  "epidemiologist",
  "public health",
  "geneticist",
  "allergist",
  "immunologist",
  "geriatrician",
  "plastic surgeon",
  "cosmetic surgeon",
  "toxicologist",
  "aviation medicine",
  "hyperbaric medicine",
  "sports physician",
  "bariatric surgeon",
  "transplant surgeon",
  "hand surgeon",
  "spine surgeon",
  "pediatric surgeon",
  "thoracic surgeon",
  "craniofacial surgeon",
  "clinical pharmacologist",
  "rehabilitation physician",
  "occupational health",
  "travel medicine",
  "preventive medicine",
  "lifestyle medicine",
  "telemedicine",
  "integrative medicine",
  // Swahili phrases
  "daktari",
  "daktari wa kawaida",
  "daktari wa familia",
  "daktari wa magonjwa ya ndani",
  "daktari wa wagonjwa waliolazwa hospitalini",
  "daktari wa moyo",
  "daktari wa matibabu ya moyo kwa upasuaji mdogo",
  "daktari wa upasuaji wa moyo",
  "daktari wa mishipa ya damu",
  "daktari wa magonjwa ya damu",
  "daktari wa magonjwa ya damu na saratani",
  "daktari wa neva",
  "daktari wa upasuaji wa ubongo na neva",
  "mtaalamu wa mfumo wa neva",
  "daktari wa kiharusi",
  "daktari wa afya ya akili",
  "daktari wa afya ya akili ya watoto",
  "daktari wa uraibu wa dawa za kulevya",
  "daktari wa mifupa",
  "daktari wa majeraha ya michezo",
  "daktari wa magonjwa ya viungo",
  "daktari wa tiba ya mwili",
  "daktari wa watoto",
  "daktari wa watoto wachanga",
  "daktari wa moyo wa watoto",
  "daktari wa neva wa watoto",
  "daktari wa wanawake",
  "daktari wa uzazi",
  "daktari wa uzazi na uwezo wa kupata mtoto",
  "daktari wa ujauzito hatarishi",
  "daktari wa ngozi",
  "daktari wa upasuaji wa ngozi",
  "daktari wa macho",
  "mtaalamu wa macho",
  "daktari wa retina ya jicho",
  "daktari wa masikio, pua na koo",
  "mtaalamu wa kusikia",
  "daktari wa upasuaji wa kichwa na shingo",
  "daktari wa tumbo na mfumo wa chakula",
  "daktari wa ini",
  "daktari wa utumbo mpana",
  "daktari wa figo",
  "daktari wa mfumo wa mkojo",
  "daktari wa upasuaji wa mfumo wa mkojo",
  "daktari wa mapafu",
  "mtaalamu wa kupumua",
  "daktari wa matatizo ya usingizi",
  "daktari wa saratani",
  "daktari wa tiba ya mionzi kwa saratani",
  "daktari wa upasuaji wa saratani",
  "daktari wa upasuaji wa kawaida",
  "daktari wa majeraha makubwa",
  "daktari wa upasuaji mdogo wa matundu",
  "daktari wa homoni",
  "daktari wa kisukari",
  "daktari wa magonjwa ya kuambukiza",
  "daktari wa magonjwa ya kitropiki",
  "daktari wa dharura",
  "daktari wa wagonjwa mahututi",
  "daktari wa ajali na dharura",
  "daktari wa matibabu ya maumivu",
  "daktari wa huduma za wagonjwa mahututi",
  "daktari wa meno",
  "daktari wa kusahihisha meno",
  "daktari wa upasuaji wa mdomo",
  "daktari wa picha za matibabu",
  "daktari wa upasuaji kwa kutumia picha za matibabu",
  "daktari wa uchunguzi wa maabara",
  "daktari wa maabara ya kliniki",
  "mtaalamu wa vijidudu",
  "daktari wa usingizi wa upasuaji",
  "daktari wa usingizi na maumivu",
  "mtaalamu wa tiba ya viungo",
  "mtaalamu wa kurejesha uwezo wa kufanya kazi",
  "mtaalamu wa utafiti wa magonjwa",
  "mtaalamu wa afya ya jamii",
  "daktari wa magonjwa ya kurithi",
  "daktari wa mzio",
  "daktari wa kinga ya mwili",
  "daktari wa wazee",
  "daktari wa upasuaji wa kurekebisha mwili",
  "daktari wa upasuaji wa urembo",
  "daktari wa sumu",
  "daktari wa afya ya usafiri wa anga",
  "daktari wa matibabu ya oksijeni maalum",
  "daktari wa michezo",
  "daktari wa upasuaji wa kupunguza uzito",
  "daktari wa upasuaji wa kupandikiza viungo",
  "daktari wa upasuaji wa mkono",
  "daktari wa upasuaji wa uti wa mgongo",
  "daktari wa upasuaji wa watoto",
  "daktari wa upasuaji wa kifua",
  "daktari wa upasuaji wa uso na fuvu",
  "daktari wa dawa za tiba",
  "daktari wa tiba ya kurejesha afya",
  "daktari wa afya kazini",
  "daktari wa afya ya wasafiri",
  "daktari wa kinga ya magonjwa",
  "daktari wa mtindo wa maisha",
  "daktari wa tiba kwa njia ya mtandao",
  "daktari wa tiba shirikishi",
  "mtaalamu wa moyo",
  "mtaalamu wa watoto",
  "mtaalamu wa akili",
  "mtaalamu wa meno",
  "mtaalamu wa ngozi",
  "mtaalamu wa macho",
  "mtaalamu wa masikio",
  "mtaalamu wa pua",
  "mtaalamu wa koo",
  "mtaalamu wa mifupa",
  "mtaalamu wa upasuaji",
  "mtaalamu wa figo",
  "mtaalamu wa ini",
  "mtaalamu wa damu",
  "mtaalamu wa kisukari",
  "mtaalamu wa shinikizo",
  "mtaalamu wa uzazi",
  "mtaalamu wa majeraha",
  "mtaalamu wa magonjwa ya ndani",
  "mtaalamu wa moyo na mishipa",
  "mtaalamu wa mfumo wa neva",
  "mtaalamu wa saratani",
];

const emptyIfNotArray = (value) => (Array.isArray(value) ? value : []);

const getTimeGreeting = (date = new Date(), locale = "en") => {
  const hour = Number(date.getHours() || 0);
  const lang = String(locale || "en").toLowerCase();
  const isSwahili = lang.startsWith("sw");
  if (isSwahili) {
    if (hour < 12) return "Habari za asubuhi";
    if (hour < 17) return "Habari za mchana";
    if (hour < 22) return "Habari za jioni";
    return "Habari";
  }
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Hello";
};

const resolveDisplayName = (user) => {
  const fullName =
    String(user?.fullName || user?.name || user?.firstName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] || "";
  if (fullName) return fullName;
  const email = String(user?.email || "").trim();
  if (!email.includes("@")) return "";
  return email.split("@")[0];
};

const inferScopeFromQuery = (text) => {
  const query = String(text || "").toLowerCase();
  if (MEDIC_QUERY_TERMS.some((term) => query.includes(term))) {
    return "medic";
  }
  if (/(pharmacy|chemist|drugstore|pharmac(y|ist)|famasia|duka la dawa)/i.test(query))
    return "pharmacy";
  if (
    /(medicine|medication|drug|tablet|pill|capsule|syrup|panadol|paracetamol|cetirizine|centrizine|amoxicillin|ibuprofen|metformin|omeprazole|losartan|insulin|salbutamol|azithromycin|ors|dawa|kidonge|sindano|syrupu)/.test(
      query,
    )
  ) {
    return "medicine";
  }
  return "";
};

const hasLocationHint = (text) => {
  const query = String(text || "").toLowerCase();
  if (!query) return false;
  if (/\b(near|around|close to|closest to)\s+me\b/.test(query)) return false;
  if (/\b(karibu na|jirani na)\s+mimi\b/.test(query)) return false;
  if (/\bnearby\b/.test(query)) return false;
  if (/\b(in|from|near|around|within|at|katika|kwenye|kutoka|karibu na|eneo la|jirani na)\s+[a-z]/.test(query))
    return true;
  return COMMON_LOCATIONS.some((loc) => query.includes(loc));
};

const extractLocationFromQuery = (text) => {
  const query = String(text || "").toLowerCase();
  if (!query) return "";
  const match = query.match(
    /\b(?:in|from|near|around|within|at|katika|kwenye|kutoka|karibu na|eneo la|jirani na)\s+([a-z\s]{2,40})/i,
  );
  if (match?.[1]) return match[1].trim();
  const explicit = COMMON_LOCATIONS.find((loc) => query.includes(loc));
  return explicit || "";
};

const extractProductQuery = (text) => {
  const raw = String(text || "").toLowerCase();
  if (!raw) return "";
  const stopwords = new Set([
    "find",
    "search",
    "nearest",
    "closest",
    "near",
    "nearby",
    "around",
    "within",
    "at",
    "in",
    "from",
    "to",
    "me",
    "my",
    "tafuta",
    "nitafutie",
    "karibu",
    "karibu na",
    "kwenye",
    "katika",
    "kutoka",
    "mimi",
    "angu",
    "sell",
    "selling",
    "stock",
    "stocks",
    "have",
    "has",
    "having",
    "available",
    "dawa",
    "duka",
    "famasia",
    "hospitali",
    "kliniki",
    "daktari",
    "muuguzi",
    "mtaalamu",
    "tabibu",
    "mganga",
    "watoto",
    "moyo",
    "akili",
    "meno",
    "macho",
    "masikio",
    "pua",
    "koo",
    "mifupa",
    "upasuaji",
    "figo",
    "ini",
    "damu",
    "kisukari",
    "shinikizo",
    "uzazi",
    "majeraha",
    "saratani",
    "neva",
    "ndani",
    "ngozi",
    "pharmacy",
    "chemist",
    "drugstore",
    "pharmacist",
    "pharmacy",
    "medicine",
    "medication",
    "drug",
    "tablet",
    "pill",
    "capsule",
    "syrup",
    "please",
  ]);
  const cleaned = raw.replace(/[^a-z0-9\s]/g, " ");
  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopwords.has(token));
  const meaningful = tokens.filter((token) => !COMMON_LOCATIONS.includes(token));
  if (!meaningful.length) return raw.trim();
  return Array.from(new Set(meaningful)).join(" ");
};

export default function AiFinderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const [scope, setScope] = useState("medicine");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [resultNotes, setResultNotes] = useState("");
  const [detectedSpecializations, setDetectedSpecializations] = useState([]);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [autoLocationLabel, setAutoLocationLabel] = useState("");
  const [allowPatientSearch, setAllowPatientSearch] = useState(false);
  const autoLocationPromiseRef = useRef(null);

  const ExpoLocation = Platform.OS === "web" ? null : require("expo-location");

  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const webMediaRecorderRef = React.useRef(null);
  const webMediaStreamRef = React.useRef(null);
  const webAudioChunksRef = React.useRef([]);
  const webSilenceCleanupRef = React.useRef(null);
  const silenceLastSoundAtRef = useRef(0);
  const silenceStartedAtRef = useRef(0);
  const autoStopInFlightRef = useRef(false);

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "ai-finder", auth?.user?.role],
    queryFn: () => apiClient.aiGetSettings(),
  });
  const voiceStatusQuery = useQuery({
    queryKey: ["ai-voice-local-status", "ai-finder"],
    queryFn: () => apiClient.aiVoiceLocalStatus(),
    enabled: Boolean(auth?.token || auth?.jwt || auth?.accessToken),
  });
  const selectedVoiceLanguage = useMemo(() => {
    const tts = voiceStatusQuery.data?.tts || {};
    const options = Array.isArray(tts?.options) ? tts.options : [];
    const selectedModel = String(tts?.selectedModel || "").trim();
    const selectedOption =
      options.find((option) => option.model === selectedModel) ||
      options.find((option) => option.isDefault);
    return String(selectedOption?.language || "en").toLowerCase();
  }, [voiceStatusQuery.data]);
  const isSwahiliVoice = selectedVoiceLanguage.startsWith("sw");
  const canUseAi = Boolean(aiSettingsQuery.data?.canUse);
  const isPremium = Boolean(aiSettingsQuery.data?.isPremium);
  const blockedReason = String(aiSettingsQuery.data?.blockedReason || "");
  const role = String(auth?.user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const displayName = useMemo(() => resolveDisplayName(auth?.user), [auth?.user]);
  const hasRedirectedToPaymentRef = useRef(false);
  const [hasTriggeredGreeting, setHasTriggeredGreeting] = useState(false);

  const { speak: speakGreeting, stop: stopGreeting, isSpeaking: isGreetingSpeaking } = useAiSpeechPlayer({
    preferDeviceSpeech: false,
    defaultLanguage: "en",
  });

  useEffect(() => {
    return () => {
      stopGreeting().catch(() => undefined);
    };
  }, [stopGreeting]);

  useEffect(() => {
    if (!aiSettingsQuery.isSuccess) return;
    if (canUseAi) return;
    if (isPremium) return;
    if (hasRedirectedToPaymentRef.current) return;
    hasRedirectedToPaymentRef.current = true;
    showToast("AI is a premium feature. Complete payment to continue.", "info");
    router.replace({
      pathname: "/(app)/(shared)/subscription-checkout",
      params: { role },
    });
  }, [aiSettingsQuery.isSuccess, canUseAi, isPremium, role, router, showToast]);

  React.useEffect(() => {
    return () => {
      if (isVoiceRecording) {
        audioRecorder.stop().catch(() => undefined);
      }
      try {
        if (webMediaRecorderRef.current?.state === "recording") {
          webMediaRecorderRef.current.stop();
        }
      } catch {
        // ignore cleanup errors
      }
      const stream = webMediaStreamRef.current;
      if (stream?.getTracks) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (webSilenceCleanupRef.current) {
        webSilenceCleanupRef.current();
        webSilenceCleanupRef.current = null;
      }
    };
  }, [audioRecorder, isVoiceRecording]);

  React.useEffect(() => {
    if (!isVoiceRecording || Platform.OS === "web") {
      silenceLastSoundAtRef.current = 0;
      silenceStartedAtRef.current = 0;
      autoStopInFlightRef.current = false;
      return;
    }
    const metering = recorderState?.metering;
    if (typeof metering !== "number") return;
    const now = Date.now();
    if (!silenceStartedAtRef.current) {
      silenceStartedAtRef.current = now;
    }
    const threshold = metering >= 0 && metering <= 1 ? 0.02 : -45;
    const isSilent = metering <= threshold;
    if (!silenceLastSoundAtRef.current) {
      silenceLastSoundAtRef.current = now;
    }
    if (!isSilent) {
      silenceLastSoundAtRef.current = now;
      return;
    }
    const silentFor = now - silenceLastSoundAtRef.current;
    const recordedFor = now - silenceStartedAtRef.current;
    if (recordedFor > 1200 && silentFor > 1200 && !autoStopInFlightRef.current) {
      autoStopInFlightRef.current = true;
      stopNativeRecordingAndTranscribe();
    }
  }, [isVoiceRecording, recorderState?.metering]);

  const resolveAutoLocationLabel = React.useCallback(async () => {
    if (autoLocationLabel) return autoLocationLabel;
    if (autoLocationPromiseRef.current) return autoLocationPromiseRef.current;

    autoLocationPromiseRef.current = (async () => {
      let label = "";

      if (Platform.OS === "web" && globalThis?.navigator?.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            globalThis.navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
            });
          });
          const coords = position?.coords;
          if (coords?.latitude && coords?.longitude) {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`;
            const response = await fetch(url, { headers: { Accept: "application/json" } });
            const data = await response.json();
            const address = data?.address || {};
            label =
              address.city ||
              address.town ||
              address.county ||
              address.state ||
              data?.display_name?.split(",")?.[0] ||
              "";
          }
        } catch {}
      } else if (ExpoLocation) {
        try {
          const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const current = await ExpoLocation.getCurrentPositionAsync({});
            const coords = current?.coords;
            if (coords?.latitude && coords?.longitude) {
              const reverse = await ExpoLocation.reverseGeocodeAsync({
                latitude: coords.latitude,
                longitude: coords.longitude,
              });
              const info = reverse?.[0] || {};
              label =
                info.city ||
                info.subregion ||
                info.region ||
                info.district ||
                info.street ||
                info.name ||
                "";
            }
          }
        } catch {}
      }

      if (!label) {
        try {
          const response = await apiClient.getMyLocation();
          const location = response?.location || response;
          label =
            location?.address ||
            location?.city ||
            location?.area ||
            location?.county ||
            location?.townCity ||
            location?.locationAddress ||
            "";
        } catch {}
      }

      label = String(label || "").trim();
      if (label) setAutoLocationLabel(label);
      return label;
    })();

    const resolved = await autoLocationPromiseRef.current;
    autoLocationPromiseRef.current = null;
    return resolved;
  }, [ExpoLocation, autoLocationLabel]);

  const appendLocationIfMissing = React.useCallback(
    async (text) => {
      const base = String(text || "").trim();
      if (!base) return "";
      const forceLocation =
        /\b(near|around|close to|closest to)\s+me\b/.test(base.toLowerCase()) ||
        /\bnearby\b/.test(base.toLowerCase());
      if (!forceLocation && hasLocationHint(base)) return base;
      const label = await resolveAutoLocationLabel();
      if (!label) return base;
      return `${base} in ${label}`;
    },
    [resolveAutoLocationLabel],
  );

  const voiceToTextMutation = useMutation({
    mutationFn: (input) => {
      if (Platform.OS === "web") {
        if (typeof Blob !== "undefined" && input instanceof Blob) {
          return apiClient.aiVoiceStt({
            file: input,
            name: "ai-finder-query.webm",
            type: input.type || "audio/webm",
            language: "auto",
          });
        }
        throw new Error("Voice recording not captured.");
      }
      const uri = String(input || "").trim();
      if (!uri) throw new Error("Voice recording not captured.");
      return apiClient.aiVoiceStt({
        uri,
        name: "ai-finder-query.m4a",
        type: "audio/m4a",
        language: "auto",
      });
    },
    onSuccess: async (data) => {
      const text = String(data?.text || "").trim();
      if (!text) {
        showToast("No speech transcript returned.", "warning");
        return;
      }
      const enrichedText = await appendLocationIfMissing(text);
      const inferredScope = inferScopeFromQuery(enrichedText);
      if (inferredScope && inferredScope !== scope) {
        setScope(inferredScope);
      }
      setQuery(enrichedText);
      finderMutation.mutate({ text: enrichedText, scope: inferredScope || scope });
    },
    onError: (error) => {
      showToast(error?.message || "Voice transcription failed.", "error");
    },
  });

  const finderMutation = useMutation({
    mutationFn: async ({ text, scope: nextScope }) => {
      const normalizedQuery = String(text || "").trim();
      if (!normalizedQuery) {
        return { results: [], notes: "Type or speak your query first." };
      }

      if (nextScope === "medicine") {
        const location = extractLocationFromQuery(normalizedQuery);
        const productQuery = extractProductQuery(normalizedQuery);
        const response = await apiClient.aiVoiceTool({
          toolName: "search_pharmacy_products",
          args: {
            productName: productQuery || normalizedQuery,
            location: location || "",
          },
        });
        const products = emptyIfNotArray(response?.result || response?.results || response);
        return {
          results: products.map((item) => ({
            id: item?.id || item?.productId || `${item?.name || "product"}-${Math.random()}`,
            type: "medicine",
            name: item?.name || item?.productName || "Medicine",
            subtitle: [
              item?.price ? `KES ${Number(item.price).toLocaleString()}` : "",
              item?.stock !== undefined ? `Stock: ${item.stock}` : "",
              item?.pharmacy?.name || item?.pharmacyName || "",
              item?.pharmacy?.location || item?.location || "",
            ]
              .filter(Boolean)
              .join(" | "),
          })),
          notes: String(response?.notes || "Medicine search complete."),
        };
      }

      const include = nextScope === "medic" ? ["medic"] : ["pharmacy"];
      const includeWithProducts =
        nextScope === "medicine" ? ["product", "pharmacy"] : include;
      const wantsPatient =
        isSuperAdmin &&
        allowPatientSearch &&
        /(patient|patients|client|clients|member|members)/i.test(normalizedQuery);
      const includeWithPatients = wantsPatient
        ? Array.from(new Set([...includeWithProducts, "patient"]))
        : includeWithProducts;
      const response = await apiClient.aiSearch({
        query: normalizedQuery,
        include: includeWithPatients,
        limit: 12,
        allowPatientSearch: wantsPatient,
      });
      const searchResults = emptyIfNotArray(response?.results);
      return {
        results: searchResults,
        notes: String(response?.notes || ""),
      };
    },
    onSuccess: (data) => {
      const rows = emptyIfNotArray(data?.results);
      setResults(rows);
      setResultNotes(String(data?.notes || ""));
      setDetectedSpecializations(emptyIfNotArray(data?.hints?.specializationTerms));
      if (!rows.length) {
        showToast("No matches found. Try a clearer query.", "warning");
      } else {
        showToast(`Found ${rows.length} match(es).`, "success");
      }
    },
    onError: (error) => {
      showToast(error?.message || "AI finder failed.", "error");
    },
  });

  const selectedScope = useMemo(
    () => SCOPES.find((item) => item.id === scope) || SCOPES[0],
    [scope],
  );

  const runFinder = async () => {
    if (!canUseAi) {
      showToast(blockedReason || "AI is currently unavailable for this account.", "warning");
      return;
    }
    const enrichedQuery = await appendLocationIfMissing(query);
    const inferredScope = inferScopeFromQuery(enrichedQuery);
    if (inferredScope && inferredScope !== scope) {
      setScope(inferredScope);
    }
    setQuery(enrichedQuery);
    finderMutation.mutate({ text: enrichedQuery, scope: inferredScope || scope });
  };

  const triggerAiVoiceGreeting = () => {
    if (!canUseAi) {
      showToast(blockedReason || "AI is currently unavailable for this account.", "warning");
      return;
    }
    if (isGreetingSpeaking) {
      stopGreeting().catch(() => undefined);
      return;
    }
    const greeting = getTimeGreeting(new Date(), isSwahiliVoice ? "sw" : "en");
    const introText = isSwahiliVoice
      ? [
          `${greeting}${displayName ? `, ${displayName}` : ""}.`,
          "Mimi ni Medilink AI.",
          "Ninakusaidia kupata dawa, famasia, na madaktari kwa haraka kwa kutumia maandishi au sauti.",
          "Tafadhali eleza unachotaka nikutafutie.",
        ].join(" ")
      : [
          `${greeting}${displayName ? `, ${displayName}` : ""}.`,
          "Hi. I am Medilink AI.",
          "I help you find medicines, pharmacies, and medics quickly using text or voice.",
          "Please describe what you want me to find.",
        ].join(" ");
    setHasTriggeredGreeting(true);
    speakGreeting(introText, {
      forceServer: true,
      language: isSwahiliVoice ? "sw" : "en",
    });
  };

  const startWebSilenceMonitor = (stream, onSilence) => {
    if (typeof window === "undefined") return () => {};
    const AudioContextApi = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextApi) return () => {};
    const audioContext = new AudioContextApi();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let lastSoundAt = Date.now();
    let startedAt = Date.now();
    const interval = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const value = (data[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = Date.now();
      if (rms > 0.02) {
        lastSoundAt = now;
      }
      const silentFor = now - lastSoundAt;
      const recordedFor = now - startedAt;
      if (recordedFor > 1200 && silentFor > 1200) {
        onSilence?.();
      }
    }, 200);
    return () => {
      clearInterval(interval);
      try {
        source.disconnect();
      } catch {}
      try {
        audioContext.close();
      } catch {}
    };
  };

  const stopWebRecorder = async () => {
    const recorder = webMediaRecorderRef.current;
    if (!recorder) throw new Error("Recorder not ready.");
    const stream = webMediaStreamRef.current;
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const audioBlob = new Blob(webAudioChunksRef.current || [], {
            type: recorder.mimeType || "audio/webm",
          });
          webAudioChunksRef.current = [];
          webMediaRecorderRef.current = null;
          if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
          webMediaStreamRef.current = null;
          if (webSilenceCleanupRef.current) {
            webSilenceCleanupRef.current();
            webSilenceCleanupRef.current = null;
          }
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };
      recorder.onerror = () => {
        if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
        webMediaStreamRef.current = null;
        webMediaRecorderRef.current = null;
        if (webSilenceCleanupRef.current) {
          webSilenceCleanupRef.current();
          webSilenceCleanupRef.current = null;
        }
        reject(new Error("Web recorder failed."));
      };
      try {
        recorder.stop();
      } catch (error) {
        if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
        webMediaStreamRef.current = null;
        webMediaRecorderRef.current = null;
        if (webSilenceCleanupRef.current) {
          webSilenceCleanupRef.current();
          webSilenceCleanupRef.current = null;
        }
        reject(error);
      }
    });
  };

  const startWebRecorder = async () => {
    const mediaDevices = globalThis?.navigator?.mediaDevices;
    const MediaRecorderApi = globalThis?.MediaRecorder;
    if (!mediaDevices?.getUserMedia || !MediaRecorderApi) {
      throw new Error("Browser voice recording is not supported.");
    }
    const stream = await mediaDevices.getUserMedia({ audio: true });
    const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    const selectedMime = mimeCandidates.find((mime) => {
      try {
        return typeof MediaRecorderApi.isTypeSupported === "function"
          ? MediaRecorderApi.isTypeSupported(mime)
          : false;
      } catch {
        return false;
      }
    });
    webMediaStreamRef.current = stream;
    try {
      const recorder = selectedMime
        ? new MediaRecorderApi(stream, { mimeType: selectedMime })
        : new MediaRecorderApi(stream);
      webAudioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event?.data && event.data.size > 0) {
          webAudioChunksRef.current.push(event.data);
        }
      };
      recorder.start();
      webMediaRecorderRef.current = recorder;
      if (webSilenceCleanupRef.current) {
        webSilenceCleanupRef.current();
      }
      webSilenceCleanupRef.current = startWebSilenceMonitor(stream, async () => {
        if (autoStopInFlightRef.current) return;
        if (webMediaRecorderRef.current?.state !== "recording") return;
        autoStopInFlightRef.current = true;
        try {
          const audioBlob = await stopWebRecorder();
          setIsVoiceRecording(false);
          voiceToTextMutation.mutate(audioBlob);
        } catch (error) {
          setIsVoiceRecording(false);
          showToast(error?.message || "Failed to stop web recording.", "error");
        } finally {
          autoStopInFlightRef.current = false;
        }
      });
    } catch (error) {
      if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
      webMediaStreamRef.current = null;
      webMediaRecorderRef.current = null;
      throw error;
    }
  };

  const stopNativeRecordingAndTranscribe = async () => {
    try {
      const recorded = await audioRecorder.stop();
      setIsVoiceRecording(false);
      const uri = String(recorded?.uri || "").trim();
      if (!uri) {
        showToast("No recording captured. Try again.", "warning");
        return;
      }
      voiceToTextMutation.mutate(uri);
    } catch (error) {
      setIsVoiceRecording(false);
      showToast(error?.message || "Failed to stop recording.", "error");
    } finally {
      autoStopInFlightRef.current = false;
    }
  };

  const toggleVoiceQuery = async () => {
    if (!canUseAi) {
      showToast(blockedReason || "AI is currently unavailable for this account.", "warning");
      return;
    }
    if (voiceToTextMutation.isPending || finderMutation.isPending) return;

    if (Platform.OS === "web") {
      if (isVoiceRecording) {
        try {
          const audioBlob = await stopWebRecorder();
          setIsVoiceRecording(false);
          voiceToTextMutation.mutate(audioBlob);
        } catch (error) {
          setIsVoiceRecording(false);
          showToast(error?.message || "Failed to stop web recording.", "error");
        }
        return;
      }
      try {
        await startWebRecorder();
        setIsVoiceRecording(true);
        autoStopInFlightRef.current = false;
        showToast("Listening... click mic again to stop.", "info");
      } catch (error) {
        setIsVoiceRecording(false);
        showToast(error?.message || "Unable to start web recording.", "error");
      }
      return;
    }

    if (isVoiceRecording) {
      await stopNativeRecordingAndTranscribe();
      return;
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsVoiceRecording(true);
      silenceLastSoundAtRef.current = Date.now();
      silenceStartedAtRef.current = Date.now();
      autoStopInFlightRef.current = false;
      showToast("Listening... tap mic again to stop.", "info");
    } catch (error) {
      setIsVoiceRecording(false);
      showToast(error?.message || "Unable to start voice recording.", "error");
    }
  };

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (role === "PATIENT") {
      router.replace("/(app)/(patient)");
      return;
    }
    if (role === "MEDIC") {
      router.replace("/(app)/(medic)");
      return;
    }
    if (role === "HOSPITAL_ADMIN") {
      router.replace("/(app)/(hospital)");
      return;
    }
    if (role === "PHARMACY_ADMIN") {
      router.replace("/(app)/(pharmacy)");
      return;
    }
    router.replace("/(app)/(admin)");
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={safeBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.surface,
              marginRight: 12,
            }}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
              Medilink AI Finder
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
              Find medicines, pharmacies, and medics using text or voice.
            </Text>
          </View>
        </View>

        {!!blockedReason && !canUseAi && (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{blockedReason}</Text>
          </View>
        )}

        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>
            AI voice remains silent until you tap the button below.
          </Text>
          <TouchableOpacity
            onPress={triggerAiVoiceGreeting}
            disabled={!canUseAi}
            style={{
              height: 38,
              borderRadius: 10,
              backgroundColor: theme.primary,
              opacity: canUseAi ? 1 : 0.7,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
          >
            <Sparkles color="#fff" size={14} />
            <Text
              style={{
                marginLeft: 6,
                color: "#fff",
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {isGreetingSpeaking
                ? "Stop AI Voice"
                : hasTriggeredGreeting
                  ? "Replay AI Voice"
                  : "Start AI Voice"}
            </Text>
          </TouchableOpacity>
        </View>

        {isSuperAdmin && (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              padding: 10,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Allow patient search
              </Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: theme.textSecondary }}>
                Admin-only. Enables explicit patient lookup in AI results.
              </Text>
            </View>
            <Switch
              value={allowPatientSearch}
              onValueChange={setAllowPatientSearch}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={allowPatientSearch ? "#fff" : theme.card}
            />
          </View>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {SCOPES.map((item) => {
            const Icon = item.icon;
            const active = scope === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setScope(item.id);
                  setResults([]);
                  setResultNotes("");
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}1A` : theme.card,
                }}
              >
                <Icon color={active ? theme.primary : theme.iconColor} size={14} />
                <Text
                  style={{
                    marginLeft: 6,
                    color: active ? theme.primary : theme.textSecondary,
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Search color={theme.iconColor} size={18} />
            <TextInput
              placeholder={selectedScope?.hint || "Describe what you are looking for"}
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              style={{
                marginLeft: 10,
                flex: 1,
                color: theme.text,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
              }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              onPress={runFinder}
              disabled={!canUseAi || !query.trim() || finderMutation.isPending || voiceToTextMutation.isPending}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                opacity:
                  !canUseAi || !query.trim() || finderMutation.isPending || voiceToTextMutation.isPending
                    ? 0.7
                    : 1,
              }}
            >
              <Sparkles color="#fff" size={14} />
              <Text
                style={{
                  marginLeft: 6,
                  color: "#fff",
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {finderMutation.isPending ? "Finding..." : "Find with AI"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleVoiceQuery}
              disabled={!canUseAi || finderMutation.isPending || voiceToTextMutation.isPending}
              style={{
                width: 46,
                height: 40,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isVoiceRecording ? theme.error : theme.border,
                backgroundColor: isVoiceRecording ? `${theme.error}22` : theme.card,
                alignItems: "center",
                justifyContent: "center",
                opacity: !canUseAi || finderMutation.isPending || voiceToTextMutation.isPending ? 0.7 : 1,
              }}
            >
              <Mic color={isVoiceRecording ? theme.error : theme.iconColor} size={16} />
            </TouchableOpacity>
          </View>
          {(isVoiceRecording || voiceToTextMutation.isPending) && (
            <Text style={{ marginTop: 8, color: theme.textSecondary, fontSize: 11 }}>
              {isVoiceRecording ? "Recording voice query..." : "Transcribing voice query..."}
            </Text>
          )}
        </View>

        {!!resultNotes && (
          <Text style={{ marginBottom: 8, color: theme.textSecondary, fontSize: 12 }}>{resultNotes}</Text>
        )}
        {detectedSpecializations.length > 0 && (
          <View
            style={{
              marginBottom: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              padding: 10,
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 6 }}>
              Detected specialization
              {detectedSpecializations.length > 1 ? "s" : ""}:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {detectedSpecializations.map((item, idx) => (
                <View
                  key={`${String(item)}-${idx}`}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: `${theme.primary}22`,
                    borderWidth: 1,
                    borderColor: `${theme.primary}66`,
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.primary }}>
                    {String(item)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ gap: 8 }}>
          {finderMutation.isPending && (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                padding: 12,
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={theme.primary} />
              <Text style={{ marginTop: 6, color: theme.textSecondary, fontSize: 12 }}>
                Processing AI search...
              </Text>
            </View>
          )}

          {!finderMutation.isPending &&
            results.map((item, index) => (
              <View
                key={item?.id || `${item?.name || "result"}-${index}`}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  padding: 12,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                  {String(item?.name || "Result")}
                </Text>
                {!!String(item?.subtitle || "").trim() && (
                  <Text style={{ marginTop: 4, color: theme.textSecondary, fontSize: 12 }}>
                    {String(item?.subtitle || "").trim()}
                  </Text>
                )}
                {!!String(item?.reason || "").trim() && (
                  <Text style={{ marginTop: 4, color: theme.textSecondary, fontSize: 11 }}>
                    Why: {String(item?.reason || "").trim()}
                  </Text>
                )}
              </View>
            ))}

          {!finderMutation.isPending && !results.length && (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                padding: 12,
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                No results yet. Enter a query and run AI Finder.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
