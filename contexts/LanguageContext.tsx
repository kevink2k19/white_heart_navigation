import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'my';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setCurrentLanguage] = useState<Language>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'my')) {
        setCurrentLanguage(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('app_language', lang);
      setCurrentLanguage(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    console.error('useLanguage must be used within a LanguageProvider');
    // Return a fallback object to prevent crashes
    return {
      language: 'en' as Language,
      setLanguage: async () => {},
      t: (key: string) => key,
    };
  }
  return context;
};

// Translation mappings
const translations: Record<Language, Record<string, string>> = {
  en: {
    // App Name
    'app.name': 'White Heart',
    
    // Navigation
    'nav.bookRide': 'Book Ride',
    'nav.trips': 'Trips',
    'nav.call': 'Call',
    'nav.settings': 'Settings',
    
    // Home Screen
    'home.title': 'White Heart',
    'home.subtitle': 'Where would you like to go?',
    'home.currentLocation': 'Current Location',
    'home.whereToGo': 'Where would you like to go?',
    'home.bookRide': 'Book a Car',
    'home.recentDestinations': 'Recent Destinations',
    'home.distance': 'Distance',
    'home.estimatedTime': 'Estimated Time',
    'home.estimatedFare': 'Estimated Fare',
    'home.minutes': 'minutes',
    'home.searchLocation': 'Search location...',
    'home.interactiveRoute': 'Interactive Route Animation',
    'home.webVersion': 'Web Version - Simulated Map',
    
    // Ride Status
    'ride.searchingDriver': 'Searching for driver...',
    'ride.pleaseWait': 'Please wait a moment',
    'ride.driverFound': 'Driver found!',
    'ride.driverComing': 'Driver is coming',
    'ride.estimatedArrival': 'Estimated arrival in 5 minutes',
    'ride.driverArrived': 'Driver has arrived!',
    'ride.getInCar': 'Please get in the car',
    'ride.tripStarted': 'Trip started',
    'ride.tripCompleted': 'Trip completed!',
    'ride.thankYou': 'Thank you',
    'ride.totalFare': 'Total Fare',
    'ride.duration': 'Duration',
    'ride.cancel': 'Cancel',
    'ride.changeDirection': 'Change Direction',
    'ride.addNewLocation': 'Add New Location',
    'ride.ok': 'OK',
    
    // Trips Screen
    'trips.title': 'Trip History',
    'trips.completedTrips': 'completed trips',
    'trips.today': 'Today',
    'trips.yesterday': 'Yesterday',
    'trips.cancelled': 'Cancelled',
    'trips.driver': 'Driver',
    'trips.tripDetails': 'Trip Details',
    'trips.baseFare': 'Base fare',
    'trips.distance': 'Distance',
    'trips.time': 'Time',
    'trips.serviceFee': 'Service fee',
    'trips.total': 'Total',
    'trips.paidWith': 'Paid with',
    
    // Call Screen
    'call.title': 'Call for Taxi',
    'call.subtitle': 'Call by phone for taxi',
    'call.howToBook': 'How to Book by Phone',
    'call.instructions': '1. Choose a taxi service from the list below\n2. Tap the phone number to call directly\n3. Provide your pickup location and destination\n4. Confirm your booking details',
    'call.premiumServices': 'Premium Services',
    'call.standardServices': 'Standard Services',
    'call.airportServices': 'Airport Services',
    'call.emergencyServices': 'Emergency Services',
    'call.tapToCall': 'Tap to Call',
    'call.available247': '24/7 Available',
    'call.businessHours': 'Business Hours',
    'call.emergencyNotice': 'For medical emergencies, call 192\nFor police emergencies, call 199',
    'call.premiumTaxiService': 'Premium taxi service with luxury vehicles',
    'call.vipService': 'VIP service for business travelers',
    'call.reliableCity': 'Reliable city transportation',
    'call.fastAffordable': 'Fast and affordable rides',
    'call.metroSpecialist': 'Downtown and metro area specialist',
    'call.airportTransfers': 'Specialized airport transfers',
    'call.airportPickup': 'Airport pickup and drop-off service',
    'call.emergencyTransport': 'Emergency transportation service',
    'call.callNotSupported': 'Call Not Supported',
    'call.deviceNotSupportCall': 'Your device does not support making phone calls.',
    'call.callFailed': 'Call Failed',
    'call.unableToCall': 'Unable to call',
    'call.pleaseTryAgain': 'Please try again.',
    
    // Profile Screen
    'profile.title': 'Profile',
    'profile.totalTrips': 'Total Trips',
    'profile.rating': 'Rating',
    'profile.memberSince': 'Member Since',
    'profile.contactInfo': 'Contact Information',
    'profile.account': 'Account',
    'profile.savedPlaces': 'Saved Places',
    'profile.savedPlacesDesc': 'Home, Work, and more',
    'profile.paymentMethods': 'Payment Methods',
    'profile.paymentMethodsDesc': 'Manage cards and wallets',
    'profile.notifications': 'Notifications',
    'profile.notificationsDesc': 'Push notifications settings',
    'profile.safety': 'Safety',
    'profile.safetyDesc': 'Emergency contacts and safety',
    'profile.helpSupport': 'Help & Support',
    'profile.helpSupportDesc': 'Get help and contact us',
    'profile.settings': 'Settings',
    'profile.settingsDesc': 'App preferences and privacy',
    'profile.cancel': 'Cancel',
    'profile.saveChanges': 'Save Changes',
    'profile.version': 'Version',
    'profile.enterName': 'Enter your name',
    'profile.enterEmail': 'Enter email',
    'profile.enterPhone': 'Enter phone number',
    'profile.profileUpdated': 'Profile updated successfully!',
    
    // Settings Screen
    'settings.title': 'Settings',
    'settings.notifications': 'Notifications',
    'settings.pushNotifications': 'Push Notifications',
    'settings.pushNotificationsDesc': 'Receive ride updates and offers',
    'settings.soundEffects': 'Sound Effects',
    'settings.soundEffectsDesc': 'Play sounds for app interactions',
    'settings.privacySecurity': 'Privacy & Security',
    'settings.locationServices': 'Location Services',
    'settings.locationServicesDesc': 'Allow app to access your location',
    'settings.safetySettings': 'Safety Settings',
    'settings.safetySettingsDesc': 'Emergency contacts and safety features',
    'settings.appPreferences': 'App Preferences',
    'settings.darkMode': 'Dark Mode',
    'settings.darkModeDesc': 'Use dark theme for the app',
    'settings.language': 'Language',
    'settings.languageDesc': 'English (Myanmar available)',
    'settings.ridePreferences': 'Ride Preferences',
    'settings.autoAcceptRides': 'Auto Accept Rides',
    'settings.autoAcceptRidesDesc': 'Automatically accept matched rides',
    'settings.ridePreferencesDesc': 'Set default ride type and preferences',
    'settings.account': 'Account',
    'settings.paymentMethods': 'Payment Methods',
    'settings.paymentMethodsDesc': 'Manage cards and payment options',
    'settings.deviceSettings': 'Device Settings',
    'settings.deviceSettingsDesc': 'App permissions and device settings',
    'settings.support': 'Support',
    'settings.helpSupport': 'Help & Support',
    'settings.helpSupportDesc': 'Get help and contact support',
    'settings.termsPrivacy': 'Terms & Privacy',
    'settings.termsPrivacyDesc': 'Read our terms and privacy policy',
    'settings.logout': 'Logout',
    'settings.logoutConfirm': 'Are you sure you want to logout?',
    'settings.logoutSuccess': 'You have been logged out successfully',
    'settings.buildText': 'Build',
    
    // Common
    'common.success': 'Success',
    'common.error': 'Error',
    'common.cancel': 'Cancel',
    'common.ok': 'OK',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'common.retry': 'Retry',
    'common.close': 'Close',
  },
  my: {
    // App Name
    'app.name': 'White Heart',
    
    // Navigation
    'nav.bookRide': 'ကားခေါ်ရန်',
    'nav.trips': 'ခရီးစဉ်များ',
    'nav.call': 'ဖုန်းခေါ်ရန်',
    'nav.settings': 'ဆက်တင်များ',
    
    // Home Screen
    'home.title': 'White Heart',
    'home.subtitle': 'ဘယ်ကိုသွားမလဲ?',
    'home.currentLocation': 'လက်ရှိတည်နေရာ',
    'home.whereToGo': 'ဘယ်ကိုသွားမလဲ?',
    'home.bookRide': 'ကားခေါ်မည်',
    'home.recentDestinations': 'လတ်တလောသွားခဲ့သောနေရာများ',
    'home.distance': 'အကွာအဝေး',
    'home.estimatedTime': 'ခန့်မှန်းချိန်',
    'home.estimatedFare': 'ခန့်မှန်းခ',
    'home.minutes': 'မိနစ်',
    'home.searchLocation': 'နေရာရှာရန်...',
    'home.interactiveRoute': 'လမ်းကြောင်းပြသမှု',
    'home.webVersion': 'ဝဘ်ဗားရှင်း - တုပမြင်ကွင်း',
    
    // Ride Status
    'ride.searchingDriver': 'ယာဉ်မောင်းရှာနေသည်...',
    'ride.pleaseWait': 'ကျေးဇူးပြု၍ ခဏစောင့်ပါ',
    'ride.driverFound': 'ယာဉ်မောင်းတွေ့ပြီ!',
    'ride.driverComing': 'ယာဉ်မောင်းလာနေသည်',
    'ride.estimatedArrival': 'ခန့်မှန်းချိန် ၅ မိနစ်',
    'ride.driverArrived': 'ယာဉ်မောင်းရောက်ပြီ!',
    'ride.getInCar': 'ကားထဲတက်ပါ',
    'ride.tripStarted': 'ခရီးစဉ်စတင်ပြီ',
    'ride.tripCompleted': 'ခရီးစဉ်ပြီးဆုံးပြီ!',
    'ride.thankYou': 'ကျေးဇူးတင်ပါသည်',
    'ride.totalFare': 'စုစုပေါင်းခ',
    'ride.duration': 'ကြာချိန်',
    'ride.cancel': 'ပယ်ဖျက်မည်',
    'ride.changeDirection': 'လမ်းကြောင်းပြောင်းမည်',
    'ride.addNewLocation': 'နေရာအသစ်ထည့်မည်',
    'ride.ok': 'OK',
    'ride.currentDistance': 'လက်ရှိအကွာအဝေး',
    'ride.currentFare': 'လက်ရှိခ',
    'ride.callDriver': 'ယာဉ်မောင်းကိုခေါ်ရန်',
    'ride.contactDriver': 'ယာဉ်မောင်းကို ဆက်သွယ်ရန်',
    
    // Trips Screen
    'trips.title': 'ခရီးစဉ်မှတ်တမ်း',
    'trips.completedTrips': 'ပြီးဆုံးသောခရီးစဉ်များ',
    'trips.today': 'ယနေ့',
    'trips.yesterday': 'မနေ့က',
    'trips.cancelled': 'ပယ်ဖျက်ခဲ့သည်',
    'trips.driver': 'ယာဉ်မောင်း',
    'trips.tripDetails': 'ခရီးစဉ်အသေးစိတ်',
    'trips.baseFare': 'အခြေခံခ',
    'trips.distance': 'အကွာအဝေး',
    'trips.time': 'အချိန်',
    'trips.serviceFee': 'ဝန်ဆောင်မှုခ',
    'trips.total': 'စုစုပေါင်း',
    'trips.paidWith': 'ပေးချေသည့်နည်းလမ်း',
    
    // Call Screen
    'call.title': 'ဖုန်းဖြင့် တက္ကစီခေါ်ရန်',
    'call.subtitle': 'ဖုန်းဖြင့် တက္ကစီခေါ်ရန်',
    'call.howToBook': 'ဖုန်းဖြင့် ကြိုတင်မှာယူနည်း',
    'call.instructions': '၁။ အောက်ပါစာရင်းမှ တက္ကစီဝန်ဆောင်မှုကို ရွေးချယ်ပါ\n၂။ ဖုန်းနံပါတ်ကို နှိပ်၍ တိုက်ရိုက်ခေါ်ဆိုပါ\n၃။ သင့်ရဲ့ တက်မည့်နေရာနှင့် သွားမည့်နေရာကို ပြောပါ\n၄။ မှာယူမှုအသေးစိတ်များကို အတည်ပြုပါ',
    'call.premiumServices': 'ပရီမီယံဝန်ဆောင်မှုများ',
    'call.standardServices': 'ပုံမှန်ဝန်ဆောင်မှုများ',
    'call.airportServices': 'လေဆိပ်ဝန်ဆောင်မှုများ',
    'call.emergencyServices': 'အရေးပေါ်ဝန်ဆောင်မှုများ',
    'call.tapToCall': 'နှိပ်၍ခေါ်ဆိုရန်',
    'call.available247': '၂၄ နာရီ ဝန်ဆောင်မှု',
    'call.businessHours': 'လုပ်ငန်းချိန်များ',
    'call.emergencyNotice': 'ဆေးဘက်ဆိုင်ရာ အရေးပေါ်အတွက် ၁၉၂ ကို ခေါ်ဆိုပါ\nရဲအရေးပေါ်အတွက် ၁၉၉ ကို ခေါ်ဆိုပါ',
    'call.premiumTaxiService': 'ဇိမ်ခံယာဉ်များဖြင့် ပရီမီယံတက္ကစီဝန်ဆောင်မှု',
    'call.vipService': 'စီးပွားရေးခရီးသွားများအတွက် VIP ဝန်ဆောင်မှု',
    'call.reliableCity': 'ယုံကြည်ရသော မြို့တွင်းသယ်ယူပို့ဆောင်ရေး',
    'call.fastAffordable': 'မြန်ဆန်ပြီး တတ်နိုင်သောခရီးများ',
    'call.metroSpecialist': 'မြို့လယ်နှင့် မက်ထရိုဧရိယာ အထူးကျွမ်းကျင်သူ',
    'call.airportTransfers': 'လေဆိပ်သယ်ယူပို့ဆောင်ရေး အထူးဝန်ဆောင်မှု',
    'call.airportPickup': 'လေဆိပ်တက်ချ ဝန်ဆောင်မှု',
    'call.emergencyTransport': 'အရေးပေါ်သယ်ယူပို့ဆောင်ရေး ဝန်ဆောင်မှု',
    'call.callNotSupported': 'ခေါ်ဆိုမှု မပံ့ပိုးပါ',
    'call.deviceNotSupportCall': 'သင့်စက်ပစ္စည်းသည် ဖုန်းခေါ်ဆိုမှုကို မပံ့ပိုးပါ',
    'call.callFailed': 'ခေါ်ဆိုမှု မအောင်မြင်ပါ',
    'call.unableToCall': 'ခေါ်ဆို၍ မရပါ',
    'call.pleaseTryAgain': 'ကျေးဇူးပြု၍ ထပ်ကြိုးစားပါ',
    
    // Profile Screen
    'profile.title': 'ကိုယ်ရေးအချက်အလက်',
    'profile.totalTrips': 'စုစုပေါင်းခရီးစဉ်များ',
    'profile.rating': 'အဆင့်သတ်မှတ်ချက်',
    'profile.memberSince': 'အဖွဲ့ဝင်ဖြစ်ချိန်',
    'profile.contactInfo': 'ဆက်သွယ်ရန်အချက်အလက်များ',
    'profile.account': 'အကောင့်',
    'profile.savedPlaces': 'သိမ်းဆည်းထားသောနေရာများ',
    'profile.savedPlacesDesc': 'အိမ်၊ ရုံးနှင့် အခြားနေရာများ',
    'profile.paymentMethods': 'ငွေပေးချေမှုနည်းလမ်းများ',
    'profile.paymentMethodsDesc': 'ကတ်များနှင့် ပိုက်ဆံအိတ်များ စီမံခန့်ခွဲရန်',
    'profile.notifications': 'အကြောင်းကြားချက်များ',
    'profile.notificationsDesc': 'Push အကြောင်းကြားချက် ဆက်တင်များ',
    'profile.safety': 'ဘေးကင်းရေး',
    'profile.safetyDesc': 'အရေးပေါ်ဆက်သွယ်ရန်နှင့် ဘေးကင်းရေး',
    'profile.helpSupport': 'အကူအညီနှင့် ပံ့ပိုးမှု',
    'profile.helpSupportDesc': 'အကူအညီရယူပြီး ကျွန်ုပ်တို့ကို ဆက်သွယ်ပါ',
    'profile.settings': 'ဆက်တင်များ',
    'profile.settingsDesc': 'အက်ပ်ရွေးချယ်မှုများနှင့် ကိုယ်ရေးကိုယ်တာ',
    'profile.cancel': 'ပယ်ဖျက်ရန်',
    'profile.saveChanges': 'ပြောင်းလဲမှုများ သိမ်းဆည်းရန်',
    'profile.version': 'ဗားရှင်း',
    'profile.enterName': 'သင့်နာမည်ကို ရိုက်ထည့်ပါ',
    'profile.enterEmail': 'အီးမေးလ်ကို ရိုက်ထည့်ပါ',
    'profile.enterPhone': 'ဖုန်းနံပါတ်ကို ရိုက်ထည့်ပါ',
    'profile.profileUpdated': 'ကိုယ်ရေးအချက်အလက် အောင်မြင်စွာ အပ်ဒိတ်လုပ်ပြီးပါပြီ!',
    
    // Settings Screen
    'settings.title': 'ဆက်တင်များ',
    'settings.notifications': 'အကြောင်းကြားချက်များ',
    'settings.pushNotifications': 'Push အကြောင်းကြားချက်များ',
    'settings.pushNotificationsDesc': 'ခရီးစဉ်အပ်ဒိတ်များနှင့် ကမ်းလှမ်းချက်များ လက်ရှိရယူရန်',
    'settings.soundEffects': 'အသံအကျိုးသက်ရောက်မှုများ',
    'settings.soundEffectsDesc': 'အက်ပ်အပြန်အလှန်တုံ့ပြန်မှုများအတွက် အသံများ ဖွင့်ရန်',
    'settings.privacySecurity': 'ကိုယ်ရေးကိုယ်တာနှင့် လုံခြုံရေး',
    'settings.locationServices': 'တည်နေရာဝန်ဆောင်မှုများ',
    'settings.locationServicesDesc': 'အက်ပ်ကို သင့်တည်နေရာကို ရယူခွင့်ပြုရန်',
    'settings.safetySettings': 'ဘေးကင်းရေးဆက်တင်များ',
    'settings.safetySettingsDesc': 'အရေးပေါ်ဆက်သွယ်ရန်များနှင့် ဘေးကင်းရေးအင်္ဂါရပ်များ',
    'settings.appPreferences': 'အက်ပ်ရွေးချယ်မှုများ',
    'settings.darkMode': 'မှောင်မိုက်မုဒ်',
    'settings.darkModeDesc': 'အက်ပ်အတွက် မှောင်မိုက်အပြင်အဆင်ကို အသုံးပြုရန်',
    'settings.language': 'ဘာသာစကား',
    'settings.languageDesc': 'အင်္ဂလိပ် (မြန်မာရရှိနိုင်သည်)',
    'settings.ridePreferences': 'ခရီးစဉ်ရွေးချယ်မှုများ',
    'settings.autoAcceptRides': 'ခရီးစဉ်များ အလိုအလျောက်လက်ခံရန်',
    'settings.autoAcceptRidesDesc': 'တွဲဖက်ထားသောခရီးစဉ်များကို အလိုအလျောက်လက်ခံရန်',
    'settings.ridePreferencesDesc': 'မူလခရီးစဉ်အမျိုးအစားနှင့် ရွေးချယ်မှုများ သတ်မှတ်ရန်',
    'settings.account': 'အကောင့်',
    'settings.paymentMethods': 'ငွေပေးချေမှုနည်းလမ်းများ',
    'settings.paymentMethodsDesc': 'ကတ်များနှင့် ငွေပေးချေမှုရွေးချယ်စရာများ စီမံခန့်ခွဲရန်',
    'settings.deviceSettings': 'စက်ပစ္စည်းဆက်တင်များ',
    'settings.deviceSettingsDesc': 'အက်ပ်ခွင့်ပြုချက်များနှင့် စက်ပစ္စည်းဆက်တင်များ',
    'settings.support': 'ပံ့ပိုးမှု',
    'settings.helpSupport': 'အကူအညီနှင့် ပံ့ပိုးမှု',
    'settings.helpSupportDesc': 'အကူအညီရယူပြီး ပံ့ပိုးမှုကို ဆက်သွယ်ပါ',
    'settings.termsPrivacy': 'စည်းမျဉ်းများနှင့် ကိုယ်ရေးကိုယ်တာ',
    'settings.termsPrivacyDesc': 'ကျွန်ုပ်တို့၏ စည်းမျဉ်းများနှင့် ကိုယ်ရေးကိုယ်တာမူဝါဒကို ဖတ်ရှုပါ',
    'settings.logout': 'ထွက်ရန်',
    'settings.logoutConfirm': 'သင် အကောင့်မှ ထွက်လိုသည်မှာ သေချာပါသလား?',
    'settings.logoutSuccess': 'သင် အောင်မြင်စွာ အကောင့်မှ ထွက်ပြီးပါပြီ',
    'settings.buildText': 'တည်ဆောက်မှု',
    
    // Common
    'common.success': 'အောင်မြင်ပါသည်',
    'common.error': 'အမှား',
    'common.cancel': 'ပယ်ဖျက်ရန်',
    'common.ok': 'OK',
    'common.yes': 'ဟုတ်ကဲ့',
    'common.no': 'မဟုတ်ပါ',
    'common.save': 'သိမ်းဆည်းရန်',
    'common.edit': 'တည်းဖြတ်ရန်',
    'common.delete': 'ဖျက်ရန်',
    'common.loading': 'လုပ်ဆောင်နေသည်...',
    'common.retry': 'ပြန်လည်ကြိုးစားရန်',
    'common.close': 'ပိတ်ရန်',
  },
};