import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!username.trim() || !phone.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre de usuario y un teléfono.');
      return;
    }

    setLoading(true);
    const usersRef = ref(database, 'users');
    try {
      const snapshot = await get(usersRef);
      const users = snapshot.val();

      let userId;
      let existingUser = null;

      if (users) {
        // Check for existing user by username OR phone
        Object.entries(users).forEach(([key, value]) => {
          if (value.username === username || value.phone === phone) {
            existingUser = { id: key, ...value };
          }
        });
      }

      if (existingUser) {
        userId = existingUser.id;
        // Update existing user data
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, {
          username, // Update username in case it was matched by phone
          phone, // Update phone in case it was matched by username
          lastLogin: new Date().toISOString(),
          isActive: true,
          currentScreen: 'home',
        });
      } else {
        userId = generateUniqueId();
        const newUserRef = ref(database, `users/${userId}`);
        await set(newUserRef, {
          username,
          phone,
          isActive: true,
          profileImage: null,
          currentScreen: 'home',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      }

      const userData = {
        userId,
        username,
        phone,
        profileImage: existingUser ? existingUser.profileImage : null,
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home', params: userData }],
      });
    } catch (error) {
      console.error('Error during login:', error);
      Alert.alert('Error', 'Hubo un problema al iniciar sesión. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FF9800" barStyle="light-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Text style={styles.title}>HablemosYa!</Text>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://raw.githubusercontent.com/Mauryln/contents/refs/heads/main/images/welcome.png' }}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 30,
    textAlign: 'center',
  },
  logoContainer: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    marginBottom: 40,
    borderRadius: 90,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
  },
  input: {
    height: 55,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 27.5,
    marginBottom: 20,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#212121',
    backgroundColor: '#F5F5F5',
  },
  button: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 27.5,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;

