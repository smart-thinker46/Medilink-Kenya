import AsyncStorage from "@react-native-async-storage/async-storage";

const getQueueKey = (userId) => `medilink:queued_messages:${userId}`;

export const getQueuedMessages = async (userId) => {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(getQueueKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
};

export const getQueuedCount = async (userId) => {
  const queue = await getQueuedMessages(userId);
  return queue.length;
};

export const enqueueMessage = async (userId, message) => {
  if (!userId) return;
  const queue = await getQueuedMessages(userId);
  queue.push(message);
  await AsyncStorage.setItem(getQueueKey(userId), JSON.stringify(queue));
};

export const removeQueuedMessage = async (userId, tempId) => {
  if (!userId) return;
  const queue = await getQueuedMessages(userId);
  const next = queue.filter((item) => item.tempId !== tempId);
  await AsyncStorage.setItem(getQueueKey(userId), JSON.stringify(next));
};
