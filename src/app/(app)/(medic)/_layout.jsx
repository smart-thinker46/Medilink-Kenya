import { Tabs } from "expo-router";
import { useAppTheme } from "@/components/ThemeProvider";
import {
  Home,
  Users,
  Briefcase,
  Calendar,
  User,
  MessageCircle,
  Video,
  CreditCard,
  Settings,
  FileText,
  Bell,
  ShoppingCart,
} from "lucide-react-native";
import ResponsiveTabBar from "@/components/ResponsiveTabBar";
import { useNotifications } from "@/utils/useNotifications";
import { useChatUnreadCount } from "@/utils/useChatUnreadCount";
import { useAuthStore } from "@/utils/auth/store";

export default function MedicTabLayout() {
  const { theme } = useAppTheme();
  const { auth } = useAuthStore();
  const isSuperAdmin = String(auth?.user?.role || "").toUpperCase() === "SUPER_ADMIN";
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChatUnreadCount();
  const overflowBadgeCount = unreadCount + chatUnreadCount;

  const primaryLinks = [
    { key: "home", title: "Home", href: "/(app)/(medic)", icon: Home },
    { key: "patients", title: "Patients", href: "/(app)/(medic)/patients", icon: Users },
    { key: "shifts", title: "Shifts", href: "/(app)/(medic)/shifts", icon: Briefcase },
    { key: "jobs", title: "Jobs", href: "/(app)/(medic)/jobs", icon: Briefcase },
    { key: "appointments", title: "Appointments", href: "/(app)/(medic)/appointments", icon: Calendar },
  ];

  const moreLinks = [
    { key: "profile", title: "Profile", href: "/(app)/(medic)/profile", icon: User },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "notifications", title: "Notifications", href: "/(app)/(shared)/notifications", icon: Bell },
    { key: "video", title: "Video", href: "/(app)/(medic)/video-call", icon: Video },
    { key: "pharmacy", title: "Pharmacy", href: "/(app)/(medic)/pharmacy-marketplace", icon: ShoppingCart },
    { key: "payments", title: "Payments", href: "/(app)/(medic)/payments", icon: CreditCard },
    { key: "edit", title: "Edit", href: "/(app)/(medic)/edit-profile", icon: Settings },
    { key: "patient-details", title: "Patient Details", href: "/(app)/(medic)/patient-details", icon: FileText },
  ];
  const visibleMoreLinks = isSuperAdmin
    ? moreLinks.filter((item) => item.key !== "edit")
    : moreLinks;

  return (
    <Tabs
      tabBar={(props) => (
        <ResponsiveTabBar
          {...props}
          theme={theme}
          primaryLinks={primaryLinks}
          moreLinks={visibleMoreLinks}
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
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) => <Users color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: "Shifts",
          tabBarIcon: ({ color }) => <Briefcase color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color }) => <Briefcase color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Sessions",
          tabBarIcon: ({ color }) => <Calendar color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="video-call" options={{ href: null }} />
      <Tabs.Screen name="pharmacy-marketplace" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="patient-details" options={{ href: null }} />
    </Tabs>
  );
}
