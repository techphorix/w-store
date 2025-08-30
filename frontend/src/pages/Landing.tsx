import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileAlt, faGlobe, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import tiktokLogo from '../assets/tiktok-logo.png';
import tiktokBackground from '../assets/tiktok-background.jpg';

const Landing = () => {
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  
  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'ES', name: 'Español' },
    { code: 'FR', name: 'Français' },
    { code: 'DE', name: 'Deutsch' },
    { code: 'IT', name: 'Italiano' },
    { code: 'PT', name: 'Português' },
    { code: 'RU', name: 'Русский' },
    { code: 'ZH', name: '中文' },
    { code: 'JA', name: '日本語' },
    { code: 'KO', name: '한국어' },
    { code: 'AR', name: 'العربية' },
    { code: 'HI', name: 'हिन्दी' }
  ];

  const translations = {
    EN: {
      title: 'TIKTOK SHOP',
      register: 'Register',
      login: 'Login',
      service: 'Service',
      downloadApp: 'Download App',
      howToInstall: 'How to Install the App',
      step1: 'Click the Download App button above.',
      step2: 'Once downloaded, open the APK file.',
      step3: 'If prompted, allow installation from unknown sources.',
      step4: 'Follow the on-screen instructions to complete installation.',
      step5: 'Open the app and register your account.'
    },
    ES: {
      title: 'TIENDA TIKTOK',
      register: 'Registrarse',
      login: 'Iniciar Sesión',
      service: 'Servicio',
      downloadApp: 'Descargar App',
      howToInstall: 'Cómo Instalar la App',
      step1: 'Haz clic en el botón Descargar App arriba.',
      step2: 'Una vez descargado, abre el archivo APK.',
      step3: 'Si se solicita, permite la instalación desde fuentes desconocidas.',
      step4: 'Sigue las instrucciones en pantalla para completar la instalación.',
      step5: 'Abre la app y registra tu cuenta.'
    },
    FR: {
      title: 'BOUTIQUE TIKTOK',
      register: 'S\'inscrire',
      login: 'Se Connecter',
      service: 'Service',
      downloadApp: 'Télécharger App',
      howToInstall: 'Comment Installer l\'App',
      step1: 'Cliquez sur le bouton Télécharger App ci-dessus.',
      step2: 'Une fois téléchargé, ouvrez le fichier APK.',
      step3: 'Si demandé, autorisez l\'installation depuis des sources inconnues.',
      step4: 'Suivez les instructions à l\'écran pour terminer l\'installation.',
      step5: 'Ouvrez l\'app et créez votre compte.'
    },
    DE: {
      title: 'TIKTOK SHOP',
      register: 'Registrieren',
      login: 'Anmelden',
      service: 'Service',
      downloadApp: 'App Herunterladen',
      howToInstall: 'So Installieren Sie die App',
      step1: 'Klicken Sie oben auf die Schaltfläche App Herunterladen.',
      step2: 'Öffnen Sie nach dem Download die APK-Datei.',
      step3: 'Falls aufgefordert, erlauben Sie die Installation aus unbekannten Quellen.',
      step4: 'Folgen Sie den Anweisungen auf dem Bildschirm, um die Installation abzuschließen.',
      step5: 'Öffnen Sie die App und registrieren Sie Ihr Konto.'
    },
    ZH: {
      title: 'TIKTOK商店',
      register: '注册',
      login: '登录',
      service: '服务',
      downloadApp: '下载应用',
      howToInstall: '如何安装应用',
      step1: '点击上方的下载应用按钮。',
      step2: '下载完成后，打开APK文件。',
      step3: '如果提示，允许从未知来源安装。',
      step4: '按照屏幕上的说明完成安装。',
      step5: '打开应用并注册您的账户。'
    }
  };

  const currentLang = translations[currentLanguage as keyof typeof translations] || translations.EN;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* TikTok Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${tiktokBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>
      
      {/* Optional overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-10"></div>

      {/* Language Converter - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg px-4 py-2 shadow-lg hover:bg-white transition-all">
            <FontAwesomeIcon icon={faGlobe} className="w-4 h-4 text-black mr-2" />
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
              className="appearance-none bg-transparent text-sm font-medium text-gray-900 cursor-pointer outline-none pr-6"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-black" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md w-full">
                    {/* TikTok Logo and Title */}
          <div className="mb-12">
            <div className="flex items-center justify-center mb-6">
              {/* Official TikTok Logo from assets */}
              <img
                src={tiktokLogo}
                alt="TikTok Logo"
                className="w-[100px] h-[100px] mr-0"
              />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                {currentLang.title}
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Register Button */}
            <Link
              to="/register"
              className="block w-full py-4 px-8 bg-black text-white font-semibold text-lg rounded-full hover:bg-gray-800 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              {currentLang.register}
            </Link>

            {/* Login Button */}
                  <Link
              to="/login"
              className="block w-full py-4 px-8 bg-white text-gray-900 font-semibold text-lg rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all transform hover:scale-[1.02] shadow-lg"
                  >
              {currentLang.login}
                  </Link>

            {/* Service Button */}
                  <Link
              to="/admin/dashboard"
              className="block w-full py-4 px-8 bg-red-500 text-white font-semibold text-lg rounded-full hover:bg-red-600 transition-all transform hover:scale-[1.02] shadow-lg"
                  >
              {currentLang.service}
                  </Link>
                </div>



          {/* How to Install Section */}
          <div className="mt-16 bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {currentLang.howToInstall}
            </h2>
            <div className="text-left space-y-3 text-gray-700">
              <div className="flex items-start">
                <span className="font-semibold text-gray-900 mr-2 mt-0.5">1.</span>
                <span>{currentLang.step1}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-900 mr-2 mt-0.5">2.</span>
                <span>{currentLang.step2}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-900 mr-2 mt-0.5">3.</span>
                <span>{currentLang.step3}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-900 mr-2 mt-0.5">4.</span>
                <span>{currentLang.step4}</span>
            </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-900 mr-2 mt-0.5">5.</span>
                <span>{currentLang.step5}</span>
        </div>
      </div>

            {/* Download App Button - positioned after the instructions */}
            <div className="mt-6">
              <button
                className="flex items-center justify-center w-full py-4 px-8 bg-black text-white font-semibold text-lg rounded-full hover:bg-gray-800 transition-all transform hover:scale-[1.02] shadow-lg"
                onClick={() => alert('App download will be available soon!')}
              >
                <FontAwesomeIcon icon={faMobileAlt} className="w-5 h-5 mr-3" />
                {currentLang.downloadApp}
          </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;