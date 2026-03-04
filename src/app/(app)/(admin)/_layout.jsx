import { Tabs } from "expo-router";
import { useAppTheme } from "@/components/ThemeProvider";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Bell,
  Video,
  Settings,
  FileText,
  CreditCard,
  MessageCircle,
  History,
  ShieldAlert,
  Mail,
} from "lucide-react-native";
import ResponsiveTabBar from "@/components/ResponsiveTabBar";
import { useNotifications } from "@/utils/useNotifications";

export default function AdminTabLayout() {
  const { theme } = useAppTheme();
  const { unreadCount } = useNotifications();

  const primaryLinks = [
    { key: "overview", title: "Overview", href: "/(app)/(admin)", icon: LayoutDashboard },
    { key: "users", title: "Users", href: "/(app)/(admin)/users", icon: Users },
    { key: "analytics", title: "Analytics", href: "/(app)/(admin)/analytics", icon: BarChart3 },
    { key: "notifications", title: "Notify", href: "/(app)/(admin)/notifications", icon: Bell },
  ];

  const moreLinks = [
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "email-center", title: "Email Center", href: "/(app)/(admin)/email-center", icon: Mail },
    { key: "video-call", title: "Video Call", href: "/(app)/(admin)/video-call", icon: Video },
    { key: "control-center", title: "Control Center", href: "/(app)/(admin)/control-center", icon: ShieldAlert },
    { key: "settings", title: "Settings", href: "/(app)/(admin)/settings", icon: Settings },
    { key: "subscriptions", title: "Subscriptions", href: "/(app)/(admin)/subscriptions", icon: CreditCard },
    { key: "audit", title: "Audit Logs", href: "/(app)/(admin)/audit-logs", icon: FileText },
    { key: "complaints", title: "Complaints", href: "/(app)/(admin)/complaints", icon: MessageCircle },
    { key: "history", title: "History", href: "/(app)/complaints-history", icon: History },
  ];

  return (
    <Tabs
      tabBar={(props) => (
        <ResponsiveTabBar
          {...props}
          theme={theme}
          primaryLinks={primaryLinks}
          moreLinks={moreLinks}
          badgeCount={unreadCount}
          badgeCounts={{ notifications: unreadCount }}
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
          title: "Overview",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => <Users color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notify",
          tabBarIcon: ({ color, size }) => <Bell color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="audit-logs" options={{ href: null }} />
      <Tabs.Screen name="complaints" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="email-center" options={{ href: null }} />
      <Tabs.Screen name="video-call" options={{ href: null }} />
      <Tabs.Screen name="control-center" options={{ href: null }} />
    </Tabs>
  );
}
