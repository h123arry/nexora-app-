export type Locale = 'en' | 'fr' | 'ar' | 'pt';

export interface TranslationSet {
  brandDescription: string;
  homeFeed: string;
  worldPulse: string;
  vohAi: string;
  activityLabel: string;
  myProfile: string;
  searchPlaceholder: string;
  quickActions: string;
  currentPulse: string;
  createPost: string;
  premiumFootnote: string;
  adminPanel: string;
  watchSession: string;
  forgotPassword: string;
  onboardingTitle: string;
  preferredLanguage: string;
  topicsLike: string;
  communitiesWanted: string;
  nextStep: string;
  finishOnboarding: string;
  reportsHeader: string;
  reportAction: string;
  blockAction: string;
  hideAction: string;
  notInterested: string;
  saveCollection: string;
  savedCollectionsTitle: string;
  backupExport: string;
  backupDownload: string;
  appHealthTitle: string;
  errorLogger: string;
  registeredAdmins: string;
  recoveryEmailLabel: string;
  recoveryPhoneLabel: string;
  deviceVerificationLabel: string;
  getAccessKey: string;
  successMessage: string;
}

export const TRANSLATIONS: Record<Locale, TranslationSet> = {
  en: {
    brandDescription: "Discover people. Build communities. Shape what's happening.",
    homeFeed: "Home Feed",
    worldPulse: "World Pulse",
    vohAi: "VOH AI Assistant",
    activityLabel: "Activity Feed",
    myProfile: "My Profile",
    searchPlaceholder: "Search NEXORA...",
    quickActions: "Quick Actions",
    currentPulse: "Current Pulse",
    createPost: "➕ Create Post",
    premiumFootnote: "NEXORA Network • Premium",
    adminPanel: "🛡️ Admin Dashboard",
    watchSession: "👁️ Watch Session",
    forgotPassword: "Forgot Password?",
    onboardingTitle: "NEXORA Alignment Protocol",
    preferredLanguage: "Preferred Language",
    topicsLike: "Topics You Like",
    communitiesWanted: "Communities You Want",
    nextStep: "Generate Alignments",
    finishOnboarding: "Activate Account",
    reportsHeader: "System Moderation",
    reportAction: "Report Post",
    blockAction: "Block User",
    hideAction: "Hide Post",
    notInterested: "Not Interested",
    saveCollection: "Save to Collection",
    savedCollectionsTitle: "Saved Collections",
    backupExport: "Data Backup & Privacy",
    backupDownload: "Download App Data Archive",
    appHealthTitle: "Developer App Health Logging",
    errorLogger: "Crash & Speed Logs",
    registeredAdmins: "Registered Founders & Admins",
    recoveryEmailLabel: "Enter your registered Email",
    recoveryPhoneLabel: "Enter phone number (SMS token)",
    deviceVerificationLabel: "Verify via logged device fingerprint",
    getAccessKey: "Recover Access Key",
    successMessage: "Operation verified and logged successfully"
  },
  fr: {
    brandDescription: "Découvrez des gens. Créez des communautés. Façonnez l'avenir.",
    homeFeed: "Fil d'actualité",
    worldPulse: "Pulse Mondial",
    vohAi: "Assistant IA VOH",
    activityLabel: "Notifications",
    myProfile: "Mon Profil",
    searchPlaceholder: "Rechercher sur NEXORA...",
    quickActions: "Actions Rapides",
    currentPulse: "Vibrations Actuelles",
    createPost: "➕ Créer un Post",
    premiumFootnote: "Réseau NEXORA • Premium",
    adminPanel: "🛡️ Panneau d'Administration",
    watchSession: "👁️ Boucles Visionnées",
    forgotPassword: "Code d'accès oublié?",
    onboardingTitle: "Protocole d'Alignement NEXORA",
    preferredLanguage: "Langue Préférée",
    topicsLike: "Sujets que vous aimez",
    communitiesWanted: "Communautés souhaitées",
    nextStep: "Générer les Alignements",
    finishOnboarding: "Activer le Compte",
    reportsHeader: "Modération du Système",
    reportAction: "Signaler le Post",
    blockAction: "Bloquer l'utilisateur",
    hideAction: "Masquer le Post",
    notInterested: "Pas intéressé",
    saveCollection: "Enregistrer dans la Collection",
    savedCollectionsTitle: "Collections Enregistrées",
    backupExport: "Sauvegarde & Données Privées",
    backupDownload: "Télécharger l'Archive des Données",
    appHealthTitle: "Journal de Santé de l'Application",
    errorLogger: "Journal des pannes",
    registeredAdmins: "Fondateurs et administrateurs",
    recoveryEmailLabel: "Entrez votre adresse email enregistrée",
    recoveryPhoneLabel: "Entrez le numéro de téléphone (code SMS)",
    deviceVerificationLabel: "Vérifier via l'empreinte de l'appareil",
    getAccessKey: "Récupérer la clé d'accès",
    successMessage: "Opération vérifiée et enregistrée avec succès"
  },
  ar: {
    brandDescription: "اكتشف الأشخاص. ابنِ المجتمعات. شكّل ملامح ما يحدث.",
    homeFeed: "الخلاصة الرئيسية",
    worldPulse: "النبض العالمي",
    vohAi: "مساعد الذكاء الاصطناعي VOH",
    activityLabel: "خلاصة الأنشطة",
    myProfile: "الملف الشخصي",
    searchPlaceholder: "البحث في نيكسورا...",
    quickActions: "الإجراءات السريعة",
    currentPulse: "النبض الحالي",
    createPost: "➕ إنشاء منشور",
    premiumFootnote: "شبكة نيكسورا • مميز",
    adminPanel: "🛡️ لوحة التحكم الإدارية",
    watchSession: "👁️ حلقات المشاهدة",
    forgotPassword: "نسيت كلمة المرور؟",
    onboardingTitle: "بروتوكول محاذاة نيكسورا",
    preferredLanguage: "اللغة المفضلة",
    topicsLike: "المواضيع التي تفضلها",
    communitiesWanted: "المجتمعات التي ترغب بها",
    nextStep: "إنتاج المحاذاة المشتركة",
    finishOnboarding: "تنشيط الحساب",
    reportsHeader: "نظام الإشراف والمراجعة",
    reportAction: "الإبلاغ عن المنشور",
    blockAction: "حظْر المستخدم",
    hideAction: "إخفاء المنشور",
    notInterested: "غير مهتم",
    saveCollection: "حفظ في المجموعات",
    savedCollectionsTitle: "المجموعات المحفوظة",
    backupExport: "نسخ البيانات الاحتياطي والخصوصية",
    backupDownload: "تحميل أرشيف البيانات الكامل",
    appHealthTitle: "مؤشرات صحة وجودة التطبيق",
    errorLogger: "سجل الأعطال ومعدلات السرعة",
    registeredAdmins: "المؤسسون والمدراء المعتمدون",
    recoveryEmailLabel: "أدخل بريدك الإلكتروني المسجل",
    recoveryPhoneLabel: "أدخل رقم الهاتف للتحقق عبر رمز SMS",
    deviceVerificationLabel: "التحقق من بصمة الجهاز النشط",
    getAccessKey: "استعادة مفتاح الدخول",
    successMessage: "تم التحقق من العملية وتسجيلها بنجاح"
  },
  pt: {
    brandDescription: "Descubra pessoas. Construa comunidades. Moldar o que acontece.",
    homeFeed: "Feed Principal",
    worldPulse: "Pulso Global",
    vohAi: "Assistente IA VOH",
    activityLabel: "Feed de Atividades",
    myProfile: "Meu Perfil",
    searchPlaceholder: "Pesquisar no NEXORA...",
    quickActions: "Ações Rápidas",
    currentPulse: "Pulso Atual",
    createPost: "➕ Criar Publicação",
    premiumFootnote: "Rede NEXORA • Premium",
    adminPanel: "🛡️ Painel Administrativo",
    watchSession: "👁️ Sessão de Visualização",
    forgotPassword: "Esqueceu a senha?",
    onboardingTitle: "Protocolo de Alinhamento NEXORA",
    preferredLanguage: "Idioma Preferido",
    topicsLike: "Tópicos de Interesse",
    communitiesWanted: "Comunidades Desejadas",
    nextStep: "Gerar Alinhamentos",
    finishOnboarding: "Ativar Conta",
    reportsHeader: "Moderação do Sistema",
    reportAction: "Reportar Publicação",
    blockAction: "Bloquear Usuário",
    hideAction: "Ocultar Publicação",
    notInterested: "Não Tenho Interesse",
    saveCollection: "Salvar na Coleção",
    savedCollectionsTitle: "Coleções Salvas",
    backupExport: "Backup de Dados & Privacidade",
    backupDownload: "Baixar Arquivo de Dados",
    appHealthTitle: "Métricas de Saúde do App",
    errorLogger: "Logs de Falhas & Desempenho",
    registeredAdmins: "Fundadores & Administradores",
    recoveryEmailLabel: "Insira seu e-mail cadastrado",
    recoveryPhoneLabel: "Insira seu telefone (Token SMS)",
    deviceVerificationLabel: "Verificar via celular confiável",
    getAccessKey: "Recuperar Chave de Acesso",
    successMessage: "Operação verificada e registrada com sucesso"
  }
};
