import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/Colors';
import { askMilo } from '../../src/services/ai';
import { parseAndSaveMiloTasks } from '../../src/services/taskService';

interface Message {
  id: string;
  sender: 'milo' | 'user';
  text: string;
  timestamp: string;
  isActionable?: boolean;
  savedToTasks?: boolean;
}

const FormattedMiloText = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <Text style={styles.miloText}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} style={styles.boldText}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

export default function MiloChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'milo',
      text: "Hi, I'm Milo! How are you feeling today, or what can we work on together?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText.trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const responseText = await askMilo(query);
      const isActionable = /\d+\.\s/.test(responseText);

      const miloMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'milo',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isActionable,
      };
      setMessages((prev) => [...prev, miloMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Milo’s message has been copied to your clipboard.');
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({
        message: text,
        title: 'Milo ADHD Support Step Breakdown',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToTasks = (messageId: string, text: string) => {
    const saved = parseAndSaveMiloTasks(text);
    if (saved.length > 0) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, savedToTasks: true } : msg))
      );
      Alert.alert('Success!', `${saved.length} micro-steps added to your Tasks screen.`);
    } else {
      Alert.alert('Notice', 'No numbered steps were found in this response to extract as tasks.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMilo = item.sender === 'milo';
    return (
      <View style={[styles.messageRow, isMilo ? styles.miloRow : styles.userRow]}>
        {isMilo && (
          <View style={styles.avatarCircle}>
            <Ionicons name="sparkles" size={16} color={Colors.textDark} />
          </View>
        )}
        <View style={[styles.bubble, isMilo ? styles.miloBubble : styles.userBubble]}>
          {isMilo ? (
            <FormattedMiloText text={item.text} />
          ) : (
            <Text style={styles.userText}>{item.text}</Text>
          )}

          {isMilo && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, item.savedToTasks && styles.actionBtnDisabled]}
                disabled={item.savedToTasks}
                onPress={() => handleAddToTasks(item.id, item.text)}
              >
                <Ionicons
                  name={item.savedToTasks ? 'checkmark-circle' : 'add-circle-outline'}
                  size={16}
                  color={Colors.textDark}
                />
                <Text style={styles.actionBtnText}>
                  {item.savedToTasks ? 'Added' : 'Task'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(item.text)}>
                <Ionicons name="copy-outline" size={16} color={Colors.textDark} />
                <Text style={styles.actionBtnText}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item.text)}>
                <Ionicons name="share-social-outline" size={16} color={Colors.textDark} />
                <Text style={styles.actionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.timestampText}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={20} color={Colors.textDark} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Milo</Text>
            <Text style={styles.headerSubtitle}>AI Companion</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Message Stream */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Milo is thinking...</Text>
          </View>
        )}

        {/* Bottom Interactive Area */}
        <View style={[styles.bottomSection, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8 }]}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => handleSend('I feel overwhelmed')}
              disabled={isLoading}
            >
              <Text style={styles.chipText}>“I feel overwhelmed”</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => handleSend('Break down my task')}
              disabled={isLoading}
            >
              <Text style={styles.chipText}>“Break down my task”</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter message..."
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="paper-plane" size={18} color={Colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  headerSubtitle: { fontSize: 12, color: Colors.textDark, opacity: 0.8 },
  chatList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  miloRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  miloBubble: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userBubble: { backgroundColor: Colors.primary, borderTopRightRadius: 4 },
  miloText: { fontSize: 15, lineHeight: 22, color: Colors.textDark },
  boldText: { fontWeight: '700', color: Colors.textDark },
  userText: { fontSize: 15, color: Colors.textDark },
  timestampText: { fontSize: 10, color: Colors.textMuted, alignSelf: 'flex-end', marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: Colors.textDark },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  loadingText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  bottomSection: {
  backgroundColor: Colors.cardBg,
  borderTopWidth: 1,
  borderTopColor: Colors.border,
  paddingTop: 8,
},
  chipRow: { 
  flexDirection: 'row', 
  gap: 8, 
  paddingHorizontal: 16, 
  marginBottom: 6 
},
  chip: {
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textDark },
 inputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingTop: 2,
  paddingBottom: 4,
  gap: 10,
},
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.textDark,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
});