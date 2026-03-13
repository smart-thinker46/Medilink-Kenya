import { Tabs } from "expo-router";
import { useAppTheme } from "@/components/ThemeProvider";
import {
  Home,
  Calendar,
  FileText,
  ShoppingBag,
  User,
  Search,
  MessageCircle,
  AlertTriangle,
  CreditCard,
  Settings,
  Video,
  Bell,
  Sparkles,
  Mic,
  Briefcase,
  LayoutDashboard,
  Hospital,
  Users,
} from "lucide-react-native";
import ResponsiveTabBar from "@/components/ResponsiveTabBar";
import { useNotifications } from "@/utils/useNotifications";
import { useChatUnreadCount } from "@/utils/useChatUnreadCount";
import { useAuthStore } from "@/utils/auth/store";

export default function PatientTabLayout() {
  const { theme } = useAppTheme();
  const { auth } = useAuthStore();
  const isSuperAdmin = String(auth?.user?.role || "").toUpperCase() === "SUPER_ADMIN";
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChatUnreadCount();
  const overflowBadgeCount = unreadCount + chatUnreadCount;

  const primaryLinks = [
    { key: "home", title: "Home", href: "/(app)/(patient)", icon: Home },
    { key: "search", title: "Search Medic", href: "/(app)/(patient)/search-medics", icon: Search },
    { key: "appointments", title: "My Appointments", href: "/(app)/(patient)/appointments", icon: Calendar },
    { key: "profile", title: "Profile", href: "/(app)/(patient)/profile", icon: User },
  ];

  const moreLinks = [
    ...(isSuperAdmin
      ? [{ key: "back-admin", title: "Back to Admin", href: "/(app)/(admin)", icon: LayoutDashboard }]
      : []),
    { key: "online-users", title: "Online Users", href: "/(app)/(shared)/online-users", icon: Users },
    { key: "ai-assistant", title: "AI Assistant", href: "/(app)/(patient)/ai-assistant", icon: Sparkles },
    { key: "jobs", title: "Jobs", href: "/(app)/(shared)/jobs", icon: Briefcase },
    { key: "ai-voice", title: "Voice Assistant", href: "/(app)/(patient)/ai-voice", icon: Mic },
    { key: "pharmacy", title: "Pharmacy", href: "/(app)/(patient)/pharmacy", icon: ShoppingBag },
    { key: "hospital-services", title: "Hospital Services", href: "/(app)/(patient)/hospital-services", icon: Hospital },
    { key: "records", title: "Records", href: "/(app)/(patient)/medical-history", icon: FileText },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "notifications", title: "Notifications", href: "/(app)/(shared)/notifications", icon: Bell },
    { key: "emergency", title: "Emergency", href: "/(app)/(patient)/emergency", icon: AlertTriangle },
    { key: "medical-info", title: "Medical Info", href: "/(app)/(patient)/medical-info", icon: FileText },
    { key: "pharmacy-location", title: "Pharmacy Location", href: "/(app)/(patient)/pharmacy-location", icon: ShoppingBag },
    { key: "payment-requests", title: "Payment Requests", href: "/(app)/(patient)/payment-requests", icon: CreditCard },
    { key: "payments", title: "Payment Methods", href: "/(app)/(patient)/payment-methods", icon: CreditCard },
    { key: "edit-profile", title: "Edit Profile", href: "/(app)/(patient)/edit-profile", icon: Settings },
    { key: "video-call", title: "Video Call", href: "/(app)/(patient)/video-call", icon: Video },
  ];

  return (
    <Tabs
      tabBar={(props) => (
        <ResponsiveTabBar
          {...props}
          theme={theme}
          primaryLinks={primaryLinks}
          moreLinks={moreLinks}
          badgeCount={overflowBadgeCount}
          badgeCounts={{ notifications: unreadCount, chat: chatUnreadCount }}
          maxVisibleLinks={5}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bottomArea,
          borderTopWidth: 1,
          borderTopColor: theme.bottomBorder,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.iconColor,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Inter_500Medium",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="search-medics"
        options={{
          title: "Search Medic",
          tabBarIcon: ({ color }) => <Search color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "My Appointments",
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="ai-assistant" options={{ href: null }} />
      <Tabs.Screen name="ai-voice" options={{ href: null }} />
      <Tabs.Screen name="book-appointment" options={{ href: null }} />
      <Tabs.Screen name="cart" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="emergency" options={{ href: null }} />
      <Tabs.Screen name="medical-history" options={{ href: null }} />
      <Tabs.Screen name="medical-info" options={{ href: null }} />
      <Tabs.Screen name="medic-profile" options={{ href: null }} />
      <Tabs.Screen name="medical-record/[id]" options={{ href: null }} />
      <Tabs.Screen name="payment-methods" options={{ href: null }} />
      <Tabs.Screen name="payment-requests" options={{ href: null }} />
      <Tabs.Screen name="pharmacy" options={{ href: null }} />
      <Tabs.Screen name="pharmacy-location" options={{ href: null }} />
      <Tabs.Screen name="hospital-services" options={{ href: null }} />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
      <Tabs.Screen name="video-call" options={{ href: null }} />
    </Tabs>
  );
}
