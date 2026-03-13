import { Tabs } from "expo-router";
import { useAppTheme } from "@/components/ThemeProvider";
import {
  Home,
  ShoppingCart,
  Package,
  ClipboardList,
  Briefcase,
  PieChart,
  User,
  MessageCircle,
  Video,
  CreditCard,
  Settings,
  Bell,
  History,
  Sparkles,
  Users,
  Heart,
} from "lucide-react-native";
import ResponsiveTabBar from "@/components/ResponsiveTabBar";
import { useNotifications } from "@/utils/useNotifications";
import { useChatUnreadCount } from "@/utils/useChatUnreadCount";

export default function PharmacyTabLayout() {
  const { theme } = useAppTheme();
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChatUnreadCount();
  const overflowBadgeCount = unreadCount + chatUnreadCount;

  const primaryLinks = [
    { key: "home", title: "Home", href: "/(app)/(pharmacy)", icon: Home },
    { key: "pos", title: "POS", href: "/(app)/(pharmacy)/pos", icon: ShoppingCart },
    { key: "jobs", title: "Jobs", href: "/(app)/(pharmacy)/jobs", icon: Briefcase },
    { key: "products", title: "Products", href: "/(app)/(pharmacy)/products", icon: Package },
    { key: "orders", title: "Orders", href: "/(app)/(pharmacy)/orders", icon: ClipboardList },
  ];

  const moreLinks = [
    { key: "online-users", title: "Online Users", href: "/(app)/(shared)/online-users", icon: Users },
    { key: "health-hub", title: "Health Hub", href: "/(app)/(shared)/patient-health-hub-picker", icon: Heart },
    { key: "ai-assistant", title: "AI Assistant", href: "/(app)/(pharmacy)/ai-assistant", icon: Sparkles },
    { key: "profile", title: "Profile", href: "/(app)/(pharmacy)/profile", icon: User },
    { key: "analytics", title: "Analytics", href: "/(app)/(pharmacy)/analytics", icon: PieChart },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "notifications", title: "Notifications", href: "/(app)/(shared)/notifications", icon: Bell },
    { key: "video", title: "Video", href: "/(app)/(pharmacy)/video-call", icon: Video },
    { key: "payments", title: "Payments", href: "/(app)/(pharmacy)/payments", icon: CreditCard },
    { key: "stock-history", title: "Stock History", href: "/(app)/(pharmacy)/stock-movements", icon: History },
    { key: "edit", title: "Edit", href: "/(app)/(pharmacy)/edit-profile", icon: Settings },
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
      <Tabs.Screen
        name="pos"
        options={{
          title: "POS",
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color }) => <Package color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="jobs" options={{ href: null }} />
      <Tabs.Screen name="job-create" options={{ href: null }} />
      <Tabs.Screen name="shifts" options={{ href: null }} />
      <Tabs.Screen name="shift-create" options={{ href: null }} />
      <Tabs.Screen name="ai-assistant" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="video-call" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="stock-movements" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
    </Tabs>
  );
}
