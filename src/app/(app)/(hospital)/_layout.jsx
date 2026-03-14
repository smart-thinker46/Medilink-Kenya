import { Tabs } from "expo-router";
import { useAppTheme } from "@/components/ThemeProvider";
import {
  Home,
  Briefcase,
  Users,
  Calendar,
  Building2,
  MessageCircle,
  Video,
  CreditCard,
  Pill,
  Settings,
  Bell,
  PieChart,
  LayoutDashboard,
  ClipboardList,
  Heart,
} from "lucide-react-native";
import ResponsiveTabBar from "@/components/ResponsiveTabBar";
import { useNotifications } from "@/utils/useNotifications";
import { useChatUnreadCount } from "@/utils/useChatUnreadCount";
import { useAuthStore } from "@/utils/auth/store";

export default function HospitalTabLayout() {
  const { theme } = useAppTheme();
  const { auth } = useAuthStore();
  const isSuperAdmin = String(auth?.user?.role || "").toUpperCase() === "SUPER_ADMIN";
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChatUnreadCount();
  const overflowBadgeCount = unreadCount + chatUnreadCount;

  const primaryLinks = [
    { key: "home", title: "Home", href: "/(app)/(hospital)", icon: Home },
    { key: "jobs", title: "Jobs", href: "/(app)/(hospital)/jobs", icon: Briefcase },
    { key: "medics", title: "Medics", href: "/(app)/(hospital)/medics", icon: Users },
    { key: "appointments", title: "Appointments", href: "/(app)/(hospital)/appointments", icon: Calendar },
  ];

  const moreLinks = [
    ...(isSuperAdmin
      ? [{ key: "back-admin", title: "Back to Admin", href: "/(app)/(admin)", icon: LayoutDashboard }]
      : []),
    { key: "online-users", title: "Online Users", href: "/(app)/(shared)/online-users", icon: Users },
    { key: "health-hub", title: "Health Hub", href: "/(app)/(shared)/patient-health-hub-picker", icon: Heart },
    { key: "staffing", title: "Staffing", href: "/(app)/(hospital)/staffing", icon: Briefcase },
    { key: "profile", title: "Profile", href: "/(app)/(hospital)/profile", icon: Building2 },
    { key: "services", title: "Services", href: "/(app)/(hospital)/services", icon: ClipboardList },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "notifications", title: "Notifications", href: "/(app)/(shared)/notifications", icon: Bell },
    { key: "video", title: "Video", href: "/(app)/(hospital)/video-call", icon: Video },
    { key: "payments", title: "Payments", href: "/(app)/(hospital)/payments", icon: CreditCard },
    { key: "analytics", title: "Analytics", href: "/(app)/(hospital)/analytics", icon: PieChart },
    { key: "pharmacy", title: "Pharmacy", href: "/(app)/(hospital)/pharmacy", icon: Pill },
    { key: "job-create", title: "Post Job", href: "/(app)/(hospital)/job-create", icon: Briefcase },
    { key: "edit-profile", title: "Edit Profile", href: "/(app)/(hospital)/edit-profile", icon: Settings },
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
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="shifts" options={{ href: null }} />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color }) => <Briefcase color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="medics"
        options={{
          title: "Medics",
          tabBarIcon: ({ color }) => <Users color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Requests",
          tabBarIcon: ({ color }) => <Calendar color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="video-call" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="pharmacy" options={{ href: null }} />
      <Tabs.Screen name="pharmacy-marketplace" options={{ href: null }} />
      <Tabs.Screen name="inventory-products" options={{ href: null }} />
      <Tabs.Screen name="inventory-pos" options={{ href: null }} />
      <Tabs.Screen name="job-create" options={{ href: null }} />
      <Tabs.Screen name="shift-create" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="staffing" options={{ href: null }} />
    </Tabs>
  );
}
