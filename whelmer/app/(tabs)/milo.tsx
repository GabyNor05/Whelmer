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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/Colors';
import { askMilo } from '../../src/services/ai';
import { useTasks } from '../../src/hooks/useTasks';
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

// Renders the inline markdown Milo uses: **bold**, *italic* / _italic_, `code`
const renderInline = (line: string, keyPrefix: string) => {
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g);
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return <Text key={key} style={styles.boldText}>{tok.slice(2, -2)}</Text>;
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return <Text key={key} style={styles.codeText}>{tok.slice(1, -1)}</Text>;
    }
    if ((tok.startsWith('*') && tok.endsWith('*')) || (tok.startsWith('_') && tok.endsWith('_'))) {
      if (tok.length > 2) return <Text key={key} style={styles.italicText}>{tok.slice(1, -1)}</Text>;
    }
    // Strip any stray markdown symbols left over
    return tok.replace(/\*\*/g, '').replace(/`/g, '');
  });
};

// Block-level markdown: headings, bullet and numbered lists, rules, paragraphs
const FormattedMiloText = ({ text }: { text: string }) => {
  const lines = text.replace(/\r/g, '').split('\n');

  return (
    <View>
      {lines.map((raw, idx) => {
        const line = raw.trim();
        const key = `l${idx}`;

        if (!line) return <View key={key} style={styles.mdSpacer} />;

        // Horizontal rule: ---, ***, ___
        if (/^([-*_])\1{2,}$/.test(line)) return <View key={key} style={styles.mdRule} />;

        // Headings: # to ######
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length;
          const content = heading[2].replace(/#+\s*$/, '').replace(/\*\*/g, '');
          return (
            <Text key={key} style={[styles.miloText, level <= 2 ? styles.mdH1 : styles.mdH3]}>
              {renderInline(content, key)}
            </Text>
          );
        }

        // Bullets: -, *, +, •
        const bullet = raw.match(/^(\s*)[-*+•]\s+(.*)$/);
        if (bullet) {
          const indent = Math.min(Math.floor(bullet[1].replace(/\t/g, '  ').length / 2), 3);
          return (
            <View key={key} style={[styles.mdListRow, { paddingLeft: indent * 14 }]}>
              <Text style={[styles.miloText, styles.mdMarker]}>•</Text>
              <Text style={[styles.miloText, styles.mdListText]}>{renderInline(bullet[2], key)}</Text>
            </View>
          );
        }

        // Numbered: 1. or 1)
        const numbered = raw.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
        if (numbered) {
          const indent = Math.min(Math.floor(numbered[1].length / 2), 3);
          return (
            <View key={key} style={[styles.mdListRow, { paddingLeft: indent * 14 }]}>
              <Text style={[styles.miloText, styles.mdMarker, styles.boldText]}>{numbered[2]}.</Text>
              <Text style={[styles.miloText, styles.mdListText]}>{renderInline(numbered[3], key)}</Text>
            </View>
          );
        }

        // Blockquote
        const quote = line.match(/^>\s?(.*)$/);
        if (quote) {
          return (
            <Text key={key} style={[styles.miloText, styles.italicText]}>
              {renderInline(quote[1], key)}
            </Text>
          );
        }

        return (
          <Text key={key} style={styles.miloText}>
            {renderInline(line, key)}
          </Text>
        );
      })}
    </View>
  );
};

export default function MiloChatScreen() {
  const insets = useSafeAreaInsets();
  const { saveMiloResponse } = useTasks();
  const { profile } = useAuth();
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
      const responseText = await askMilo(query, profile);
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
            <Image source={milo} style={{ width: 40, height: 40, borderRadius: 100 }} />
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