export const getTimeGreeting = (date = new Date()) => {
  const hour = new Date(date).getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
};

export const getFirstName = (user, fallback = "User") => {
  const firstName = String(user?.firstName || "").trim();
  if (firstName) return firstName;

  const fullName = String(user?.fullName || "").trim();
  if (fullName) {
    const [first] = fullName.split(/\s+/);
    if (first) return first;
  }

  const email = String(user?.email || "").trim();
  if (email.includes("@")) {
    const [prefix] = email.split("@");
    if (prefix) return prefix;
  }

  return fallback;
};

