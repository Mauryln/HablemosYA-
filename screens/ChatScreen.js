import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, Image, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { ref, onValue, push, set, serverTimestamp, update, remove } from 'firebase/database';
import { database } from '../firebaseConfig';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import { Send, Edit, Trash2, ArrowLeft } from 'lucide-react-native';

const ChatScreen = ({ route }) => {
  const { userId, chatUser, chatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [editMessageId, setEditMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const flatListRef = useRef(null);
  const isUserActive = useRef(false);

  const updateUserScreen = useCallback(() => {
    const userRef = ref(database, `users/${userId}`);
    update(userRef, {
      currentScreen: 'chat',
      currentChatId: chatId,
    });
  }, [userId, chatId]);

  useEffect(() => {
    if (isFocused) {
      isUserActive.current = true;
      updateUserScreen();
    } else {
      isUserActive.current = false;
    }
    
    return () => {
      isUserActive.current = false;
      const userRef = ref(database, `users/${userId}`);
      update(userRef, {
        currentScreen: 'home',
        currentChatId: null,
      });
    };
  }, [isFocused, updateUserScreen, userId]);

  useEffect(() => {
    const messagesRef = ref(database, `chats/${chatId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const messageList = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      setMessages(messageList.sort((a, b) => a.timestamp - b.timestamp));
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (isUserActive.current) {
      const unreadMessages = messages.filter(msg => msg.senderId === chatUser.id && !msg.read);
      unreadMessages.forEach(msg => {
        const messageRef = ref(database, `chats/${chatId}/${msg.id}`);
        update(messageRef, { read: true });
      });
    }
  }, [messages, chatId, chatUser.id, userId]);

  const sendMessage = () => {
    if (messageText.trim()) {
      const newMessageRef = push(ref(database, `chats/${chatId}`));
      set(newMessageRef, {
        senderId: userId,
        message: messageText,
        timestamp: serverTimestamp(),
        read: false, 
      });
      setMessageText('');
    }
  };

  const startEditMessage = (messageId, currentMessage) => {
    if (currentMessage.senderId === userId) {
      setEditMessageId(messageId);
      setEditText(currentMessage.message);
      setSelectedMessageId(messageId);
    } else {
      Alert.alert('Error', 'No puedes editar los mensajes de otros usuarios.');
    }
  };

  const saveEditedMessage = () => {
    if (editText.trim()) {
      const messageRef = ref(database, `chats/${chatId}/${editMessageId}`);
      update(messageRef, { message: editText }).then(() => {
        Alert.alert('Éxito', 'El mensaje fue actualizado.');
        setEditMessageId(null);
        setEditText('');
        setSelectedMessageId(null);
      }).catch((error) => {
        Alert.alert('Error', 'No se pudo actualizar el mensaje.');
        console.error(error);
      });
    }
  };

  const handleDeleteMessage = (messageId) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar este mensaje?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: () => deleteMessage(messageId), style: "destructive" }
      ]
    );
  };

  const deleteMessage = (messageId) => {
    const messageRef = ref(database, `chats/${chatId}/${messageId}`);
    remove(messageRef).then(() => {
      Alert.alert('Éxito', 'El mensaje ha sido eliminado.');
      setSelectedMessageId(null);
    }).catch((error) => {
      Alert.alert('Error', 'No se pudo eliminar el mensaje.');
      console.error(error);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FF9800" barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
          <Image
            source={{ uri: `https://raw.githubusercontent.com/Mauryln/contents/main/images/${chatUser.id}.png` }}
            style={styles.headerImage}
          />
          <Text style={styles.headerTitle}>{chatUser.username}</Text>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GestureHandlerRootView>
              <LongPressGestureHandler
                onHandlerStateChange={({ nativeEvent }) => {
                  if (nativeEvent.state === State.ACTIVE) {
                    setSelectedMessageId(item.id);
                  }
                }}
              >
                <TouchableOpacity>
                  <View
                    style={[styles.messageItem, item.senderId === userId ? styles.sentMessage : styles.receivedMessage]}
                  >
                    <Text style={styles.messageText}>{item.message}</Text>
                    {selectedMessageId === item.id && item.senderId === userId && (
                      <View style={styles.messageActions}>
                        <TouchableOpacity onPress={() => startEditMessage(item.id, item)} style={styles.actionButton}>
                          <Edit color="#FF9800" size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteMessage(item.id)} style={styles.actionButton}>
                          <Trash2 color="#FF9800" size={20} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={styles.readStatus}>
                      {item.read ? 'Leído' : 'No leído'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </LongPressGestureHandler>
            </GestureHandlerRootView>
          )}
          onContentSizeChange={() =>
            flatListRef.current.scrollToEnd({ animated: true })
          }
        />
        {editMessageId ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Editar mensaje"
              value={editText}
              onChangeText={setEditText}
            />
            <TouchableOpacity onPress={saveEditedMessage} style={styles.sendButton}>
              <Edit color="#FFF" size={24} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje"
              value={messageText}
              onChangeText={setMessageText}
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Send color="#FFF" size={24} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF9800',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FF9800',
  },
  backButton: {
    marginRight: 10,
  },
  headerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  messageItem: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    marginHorizontal: 10,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFE0B2',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
  },
  messageText: {
    fontSize: 16,
    color: '#212121',
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  actionButton: {
    marginLeft: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#FF9800',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readStatus: {
    fontSize: 12,
    color: '#757575',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
});

export default ChatScreen;

