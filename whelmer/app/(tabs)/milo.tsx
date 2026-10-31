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
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/Colors';
import { askMilo } from '../../src/services/ai';
import type { ChatTurn } from '../../src/services/ai';
import { normalizeMiloText } from '../../src/utils/miloText';
import { updateUserProfile } from '../../src/services/userService';
import { useTasks } from '../../src/hooks/useTasks';
import { FormattedMiloText } from '../../src/components/MiloMarkdown';
import { useAuth } from '../../src/context/AuthContext';
const milo = require('../../assets/milo/chatAvatar.png');

interface Message {
  id: string;
  sender: 'milo' | 'user';
  text: string;
  timestamp: string;
  isActionable?: boolean;
  savedToTasks?: boolean;
}

export default function MiloChatScreen() {
  const insets = useSafeAreaInsets();
  const { saveMiloResponse } = useTasks();
  const { user, profile } = useAuth();

  // "Milo can be wrong" notice: shown once per account until accepted, and on tap of the header note
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const disclaimerChecked = useRef(false);
  React.useEffect(() => {
    if (disclaimerChecked.current || !profile) return;
    disclaimerChecked.current = true;
    if (!profile.aiDisclaimerAcceptedAt) setDisclaimerOpen(true);
  }, [profile]);
  const acceptDisclaimer = () => {
    setDisclaimerOpen(false);
    if (user && !profile?.aiDisclaimerAcceptedAt) {
      updateUserProfile(user.uid, { aiDisclaimerAcceptedAt: Date.now() }).catch(() => {});
    }
  };
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
      // Send recent conversation so Milo remembers context ("try again", "continue")
      const history: ChatTurn[] = messages
        .filter((m) => m.id !== '1')
        .map((m) => ({ role: m.sender === 'milo' ? 'assistant' : 'user', content: m.text }));
      const responseText = await askMilo(query, profile, history);
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
    await Clipboard.setStringAsync(normalizeMiloText(text));
    Alert.alert('Copied!', 'Milo’s message has been copied to your clipboard.');
  };

  // Copy the whole conversation, e.g. to paste it into a note or a new chat
  const handleCopyChat = async () => {
    const transcript = messages
      .map((m) => `${m.sender === 'milo' ? 'Milo' : 'Me'}: ${m.sender === 'milo' ? normalizeMiloText(m.text) : m.text}`)
      .join('\n\n');
    await Clipboard.setStringAsync(transcript);
    Alert.alert('Chat copied', 'The whole conversation is on your clipboard.');
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({
        message: normalizeMiloText(text),
        title: 'Milo ADHD Support Step Breakdown',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToTasks = (messageId: string, text: string) => {
    // Use what the user asked Milo (the message just before this reply) as the heading
    const replyIndex = messages.findIndex((m) => m.id === messageId);
    const userRequest = messages
      .slice(0, replyIndex === -1 ? messages.length : replyIndex)
      .reverse()
      .find((m) => m.sender === 'user')?.text;

    const saved = saveMiloResponse(text, userRequest);
    if (saved) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, savedToTasks: true } : msg))
      );
      Alert.alert('Success!', `${saved.subSteps.length} micro-steps added to your Tasks screen.`);
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
            <Image source={milo} style={{ width: 28, height: 28, borderRadius: 100 }} />
          </View>
        )}
        <View style={[styles.bubble, isMilo ? styles.miloBubble : styles.userBubble]}>
          {isMilo ? (
            <FormattedMiloText text={item.text} />
          ) : (
            <Text selectable style={styles.userText}>{item.text}</Text>
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
            <Image source={milo} style={{ width: 40, height: 40, borderRadius: 100 }} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Milo</Text>
            <TouchableOpacity onPress={() => setDisclaimerOpen(true)} accessibilityRole="button">
              <Text style={styles.headerSubtitle}>AI Companion · can make mistakes ⓘ</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleCopyChat}
          accessibilityLabel="Copy whole chat"
        >
          <Ionicons name="copy-outline" size={20} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      {/* AI disclaimer */}
      <Modal visible={disclaimerOpen} transparent animationType="fade" onRequestClose={acceptDisclaimer}>
        <View style={styles.disclaimerOverlay}>
          <View style={styles.disclaimerCard}>
            <Image source={milo} style={{ width: 56, height: 56, borderRadius: 28, alignSelf: 'center' }} />
            <Text style={styles.disclaimerTitle}>Before we chat</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={styles.disclaimerText}>
                Milo is an AI coach, not a person, doctor or therapist. Milo can misunderstand you or get things wrong, so
                treat every suggestion as a starting point you can change.
              </Text>
              <Text style={styles.disclaimerText}>
                <Text style={{ fontWeight: '700' }}>Milo can't give medical advice.</Text> For anything about your health,
                ADHD diagnosis or medication, please speak to a doctor, psychologist or other qualified professional.
              </Text>
              <Text style={styles.disclaimerText}>
                <Text style={{ fontWeight: '700' }}>If you're in crisis or thinking about harming yourself,</Text> please
                reach out now to someone you trust, call the SADAG Suicide Crisis Helpline on 0800 567 567, or dial 112 for
                emergencies.
              </Text>
              <Text style={styles.disclaimerText}>
                Your messages are sent to an AI service to create Milo's replies. Don't share passwords or ID numbers.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.disclaimerBtn} onPress={acceptDisclaimer}>
              <Text style={styles.disclaimerBtnText}>I understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  disclaimerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  disclaimerCard: { backgroundColor: '#F3F5E9', borderRadius: 24, padding: 22, gap: 10 },
  disclaimerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textDark, textAlign: 'center' },
  disclaimerText: { fontSize: 14, lineHeight: 21, color: '#2C3E35', marginBottom: 10 },
  disclaimerBtn: {
    backgroundColor: '#7EC2C6',
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disclaimerBtnText: { fontSize: 15, fontWeight: '700', color: '#1B3C3E' },
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
  italicText: { fontStyle: 'italic' },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14, backgroundColor: '#F9FAF3' },
  mdH1: { fontSize: 18, lineHeight: 24, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  mdH3: { fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  mdListRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2 },
  mdMarker: { width: 22 },
  mdListText: { flex: 1 },
  mdSpacer: { height: 6 },
  mdRule: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 8 },
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