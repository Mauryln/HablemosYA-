import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, update, get } from 'firebase/database';
import { database } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { Camera, UserCircle, ArrowLeft } from 'lucide-react-native';

const UserManagementScreen = ({ route }) => {
  const { userId } = route.params;
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUsername(userData.username || '');
          setPhone(userData.phone || '');
          setImageUri(userData.profileImage || null);
        }
      } catch (error) {
        console.error('Error al cargar los datos del usuario:', error);
      }
    };

    loadUserData();
  }, [userId]);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso denegado',
          'Es necesario acceder a la galería para seleccionar una imagen.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        base64: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedImage = result.assets[0];
        const uniqueImageUri = `${pickedImage.uri}?t=${new Date().getTime()}`;
        setImageUri(uniqueImageUri); // Actualización inmediata en la UI
        setImageBase64(pickedImage.base64);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const handleSaveChanges = async () => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        username,
        phone,
      });
  
      if (imageBase64) {
        const githubFilePath = `contents/images/${userId}.png`;
        const githubApiUrl = `https://api.github.com/repos/Mauryln/contents/${githubFilePath}`;
        let existingSha = null;
  
        // Verificar si el archivo ya existe
        const checkFileResponse = await fetch(githubApiUrl, {
          headers: {
            Authorization: 'Aspsada',
          },
        });
  
        if (checkFileResponse.ok) {
          const fileData = await checkFileResponse.json();
          existingSha = fileData.sha; // Obtén el SHA del archivo existente
        }
  
        // Subir o sobrescribir el archivo
        const uploadResponse = await fetch(githubApiUrl, {
          method: 'PUT',
          headers: {
            Authorization: 'API KEY XDD',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Actualizar imagen de perfil para usuario ${userId}`,
            content: imageBase64,
            sha: existingSha || undefined, // Solo incluye el SHA si ya existe
          }),
        });
  
        if (uploadResponse.ok) {
          const data = await uploadResponse.json();
          const imageUrl = `${data.content.download_url}?t=${new Date().getTime()}`;
  
          // Actualizar la URL de la imagen en Firebase
          await update(userRef, { profileImage: imageUrl });
          setImageUri(imageUrl); // Actualización inmediata
          Alert.alert('Éxito', 'Perfil actualizado con éxito.');
        } else {
          Alert.alert('Error', 'Hubo un problema al subir la imagen.');
        }
      } else {
        Alert.alert('Éxito', 'Perfil actualizado con éxito.');
      }
    } catch (error) {
      console.error('Error al guardar los cambios:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    }
  };
  

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FF9800" barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Editar Perfil</Text>
        </View>
        
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <UserCircle color="#FF9800" size={150} />
          )}
          <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
            <Camera color="#FFF" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nombre de usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollView: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF9800',
    borderRadius: 20,
    padding: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 15,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default UserManagementScreen;
