import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user');
  const handleLogin = () => {
    router.replace("/login");
  }
  const handleRegister = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin!');
      return;
    }

    try {
      const response = await axios.post('http://10.0.2.2:5000/register', {
        name: name,
        email: email,
        phone_number: phone,
        password: password,
        role: role
      });
      Alert.alert('Thành công', response.data.message);
      router.replace('/login');
    } catch (error) {
      Alert.alert('Lỗi', 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng ký</Text>
      <TextInput
        style={styles.input}
        placeholder="Tên người mua hoặc cửa hàng người bán"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Số điện thoại"
        keyboardType="phone-pad"
        autoCapitalize="none"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Text style={styles.roleLabel}>Chọn vai trò:</Text>
      <View style={styles.roleContainer}>
        {['Người mua', 'Người bán'].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleButton, role === r && styles.selectedRole]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.roleText, role === r && styles.selectedRoleText]}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Đăng ký</Text>
      </TouchableOpacity>
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Đã có tài khoản? </Text>
        <TouchableOpacity onPress={handleLogin}>
          <Text style={styles.loginButton}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  roleLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4e8cff',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedRole: {
    backgroundColor: '#4e8cff',
  },
  roleText: {
    fontSize: 16,
    color: '#4e8cff',
    fontWeight: 'bold',
  },
  selectedRoleText: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#4e8cff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#555',
  },
  loginButton: {
    fontSize: 16,
    color: '#4e8cff',
    fontWeight: 'bold',
  },
});
