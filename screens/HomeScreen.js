import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { ref, onValue, get, update, set } from 'firebase/database';
import { database } from '../firebaseConfig';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { Search, Edit, LogOut } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({ route }) => {
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState({});
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const { userId, username, phone } = JSON.parse(userData);
          setUserId(userId);
          setUsername(username);
          setPhone(phone);
          
          const userRef = ref(database, `users/${userId}`);
          const snapshot = await get(userRef);
          if (!snapshot.exists()) {
            await set(userRef, {
              username,
              phone,
              profileImage: null,
              currentScreen: 'home',
            });
          } else {
            const existingData = snapshot.val();
            setProfileImage(existingData.profileImage);
          }
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please try logging in again.');
      }
    };

    loadUserData();
  }, [navigation]);

  const updateUserScreen = useCallback((screenName) => {
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { currentScreen: screenName, currentChatId: null });
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      updateUserScreen('home');
      return () => updateUserScreen('away');
    }, [updateUserScreen])
  );

  useEffect(() => {
    if (!userId) return;

    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const userList = Object.keys(data || {}).map((key) => ({
        id: key,
        ...data[key],
      }));
      const filteredUsers = userList.filter((user) => user.id !== userId);
      setUsers(filteredUsers);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const chatsRef = ref(database, 'chats');
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      const unreadCounts = {};
      Object.keys(data || {}).forEach((chatId) => {
        if (chatId.includes(userId)) {
          const otherUserId = chatId.replace(userId, '').replace('_', '');
          const messages = Object.values(data[chatId] || {});
          const unreadCount = messages.filter(
            (message) => message.senderId !== userId && !message.read
          ).length;
          if (unreadCount > 0) {
            unreadCounts[otherUserId] = unreadCount;
          }
        }
      });
      setUnreadMessagesCount(unreadCounts);
    });
    return () => unsubscribe();
  }, [userId]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      const usersRef = ref(database, 'users');
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        const userList = Object.keys(data || {}).map((key) => ({
          id: key,
          ...data[key],
        }));
        const filteredUsers = userList.filter((user) => user.id !== userId);
        setUsers(filteredUsers);
      });
      return;
    }
    const filteredUsers = users.filter(
      (user) =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.phone.includes(query)
    );
    setUsers(filteredUsers);
  };

  const handleEditProfile = () => {
    navigation.navigate('UserManagement', { userId, username, phone });
  };

  const handleChat = (chatUser) => {
    const chatId = [userId, chatUser.id].sort().join('_');
    navigation.navigate('Chat', { userId, chatUser, chatId });
  };

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Sí, cerrar sesión", 
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('user');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión. Por favor, inténtalo de nuevo.');
            }
          }
        }
      ]
    );
  };

  const defaultImageUri = 'https://raw.githubusercontent.com/Mauryln/contents/main/images/default.png';

  if (!userId) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FF9800" barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>HablemosYa!</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={handleEditProfile} style={styles.iconButton}>
              <Edit size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
              <LogOut size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search style={styles.searchIcon} size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
        </View>

        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const unreadCount = unreadMessagesCount[item.id] || 0;
            
            return (
              <TouchableOpacity style={styles.userItem} onPress={() => handleChat(item)}>
                <Image
                  source={{ uri: item.profileImage || defaultImageUri }}
                  style={styles.userImage}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userText}>{item.username}</Text>
                  <Text style={styles.phoneText}>{item.phone}</Text>
                </View>
                {unreadCount > 0 && (
                  <View style={styles.notification}>
                    <Text style={styles.notificationText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
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
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    margin: 10,
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#212121',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  phoneText: {
    fontSize: 14,
    color: '#757575',
  },
  notification: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  notificationText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;

