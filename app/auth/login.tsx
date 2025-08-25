import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Phone, MessageSquare, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react-native';

interface LoginFormData {
  phoneNumber: string;
  otp: string;
}

interface FormErrors {
  phoneNumber?: string;
  otp?: string;
  general?: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    phoneNumber: '',
    otp: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [showOtp, setShowOtp] = useState(false);

  // Timer for OTP resend
useEffect(() => {
  if (otpTimer <= 0) return;

  const id: ReturnType<typeof setInterval> = setInterval(() => {
    setOtpTimer(prev => Math.max(0, prev - 1)); // never go negative
  }, 1000);

  return () => clearInterval(id);
}, [otpTimer]);

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    // Myanmar phone number validation (9 digits after country code)
    const phoneRegex = /^9\d{8,9}$/;
    return phoneRegex.test(phone);
  };

  // OTP validation
  const validateOtp = (otp: string): boolean => {
    return otp.length === 6 && /^\d{6}$/.test(otp);
  };

  // Handle phone number input change
  const handlePhoneChange = (text: string) => {
    // Remove any non-digit characters and limit length
    const cleanText = text.replace(/\D/g, '');
    if (cleanText.length <= 10) {
      setFormData(prev => ({ ...prev, phoneNumber: cleanText }));
      // Clear phone number error when user starts typing
      if (errors.phoneNumber) {
        setErrors(prev => ({ ...prev, phoneNumber: undefined }));
      }
    }
  };

  // Handle OTP input change
  const handleOtpChange = (text: string) => {
    // Only allow digits and limit to 6 characters
    const cleanText = text.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, otp: cleanText }));
    // Clear OTP error when user starts typing
    if (errors.otp) {
      setErrors(prev => ({ ...prev, otp: undefined }));
    }
  };

  // Send OTP
  const handleSendOtp = async () => {
    // Validate phone number first
    if (!validatePhoneNumber(formData.phoneNumber)) {
      setErrors(prev => ({
        ...prev,
        phoneNumber: 'Please enter a valid Myanmar phone number (9 digits)',
      }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call to send OTP
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, make API call here
      // const response = await sendOtpApi(`+95${formData.phoneNumber}`);
      
      setIsOtpSent(true);
      setOtpTimer(60); // 60 seconds timer
      Alert.alert(
        'OTP Sent',
        `Verification code has been sent to +95 ${formData.phoneNumber}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: 'Failed to send OTP. Please try again.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleLogin = async () => {
    const newErrors: FormErrors = {};

    // Validate phone number
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Myanmar phone number';
    }

    // Validate OTP
    if (!formData.otp) {
      newErrors.otp = 'OTP is required';
    } else if (!validateOtp(formData.otp)) {
      newErrors.otp = 'Please enter a valid 6-digit OTP';
    }

    // Check if OTP was sent
    if (!isOtpSent) {
      newErrors.otp = 'Please request OTP first';
    }

    setErrors(newErrors);

    // If there are errors, don't proceed
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call for login verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, verify OTP with backend
      // const response = await verifyOtpApi(`+95${formData.phoneNumber}`, formData.otp);
      
      // Simulate successful login
      if (formData.otp === '123456') { // Demo OTP
        Alert.alert(
          'Login Successful',
          'Welcome to White Heart Driver!',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to main app (orders list)
                router.replace('/(tabs)/');
              },
            },
          ]
        );
      } else {
        setErrors(prev => ({
          ...prev,
          otp: 'Invalid OTP. Please try again.',
        }));
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: 'Login failed. Please try again.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to register
  const handleNavigateToRegister = () => {
    router.push('/auth/register');
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact support for password recovery assistance.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Contact Support', onPress: () => {
          // In real app, open support contact
          Alert.alert('Support', 'Contact: +95 9 123 456 789');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your driver account</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Phone Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <Phone size={20} color="#6B7280" />
                  <Text style={styles.countryCodeText}>+95</Text>
                </View>
                <TextInput
                  style={[
                    styles.phoneInput,
                    errors.phoneNumber && styles.inputError,
                  ]}
                  placeholder="9 123 456 789"
                  value={formData.phoneNumber}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoComplete="tel"
                  accessibilityLabel="Phone number input"
                  accessibilityHint="Enter your Myanmar phone number starting with 9"
                />
              </View>
              {errors.phoneNumber && (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              )}
            </View>

            {/* OTP Input */}
            <View style={styles.inputGroup}>
              <View style={styles.otpHeader}>
                <Text style={styles.label}>Verification Code</Text>
                <TouchableOpacity
                  style={[
                    styles.otpButton,
                    (isLoading || otpTimer > 0) && styles.otpButtonDisabled,
                  ]}
                  onPress={handleSendOtp}
                  disabled={isLoading || otpTimer > 0}
                >
                  <MessageSquare size={16} color="white" />
                  <Text style={styles.otpButtonText}>
                    {otpTimer > 0 ? `Resend (${otpTimer}s)` : 'Get OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.otpInputContainer}>
                <TextInput
                  style={[
                    styles.otpInput,
                    errors.otp && styles.inputError,
                  ]}
                  placeholder="Enter 6-digit code"
                  value={formData.otp}
                  onChangeText={handleOtpChange}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry={!showOtp}
                  autoComplete="one-time-code"
                  accessibilityLabel="OTP input"
                  accessibilityHint="Enter the 6-digit verification code"
                />
                <TouchableOpacity
                  style={styles.otpToggle}
                  onPress={() => setShowOtp(!showOtp)}
                >
                  {showOtp ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
              
              {errors.otp && (
                <Text style={styles.errorText}>{errors.otp}</Text>
              )}
              
              {isOtpSent && !errors.otp && (
                <Text style={styles.successText}>
                  OTP sent to +95 {formData.phoneNumber}
                </Text>
              )}
            </View>

            {/* General Error */}
            {errors.general && (
              <Text style={styles.generalError}>{errors.general}</Text>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityLabel="Login button"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Login</Text>
                  <ArrowRight size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleNavigateToRegister}>
              <View style={styles.registerLink}>
                <UserPlus size={16} color="#3B82F6" />
                <Text style={styles.registerLinkText}>Register here</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Demo Instructions */}
          <View style={styles.demoInstructions}>
            <Text style={styles.demoTitle}>Demo Instructions:</Text>
            <Text style={styles.demoText}>• Enter any valid Myanmar phone number</Text>
            <Text style={styles.demoText}>• Use OTP: 123456 for demo login</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    gap: 8,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  otpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  otpButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  otpButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  otpInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  otpInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
    letterSpacing: 2,
  },
  otpToggle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 4,
  },
  generalError: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
  },
  registerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  registerLinkText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  demoInstructions: {
    backgroundColor: '#EBF4FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
});